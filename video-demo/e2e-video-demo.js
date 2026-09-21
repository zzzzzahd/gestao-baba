// video-demo/e2e-video-demo.js
// ─────────────────────────────────────────────────────────────────────────────
// GRAVADOR DE VÍDEO PROMOCIONAL — Draft Play
// ─────────────────────────────────────────────────────────────────────────────
// Script NOVO e ISOLADO. Não substitui nem altera e2e/*.spec.js nem
// playwright.config.js — roda com `node` puro, fora do runner do Playwright
// Test, exatamente como screenshots-playstore.js já faz hoje.
//
// USO:
//   npm run video:demo
//
// VARIÁVEIS DE AMBIENTE (veja .env.local ou exporte antes de rodar):
//   BASE_URL        URL do app (padrão: http://localhost:3000)
//   DEMO_EMAIL      e-mail da conta de demonstração (fallback: TEST_EMAIL)
//   DEMO_PASSWORD   senha da conta de demonstração  (fallback: TEST_PASSWORD)
//   DEMO_SPEED      'slow' | 'normal' | 'fast'       (padrão: normal)
//   VIDEO_FORMAT    'vertical' | 'desktop'           (padrão: vertical)
//
// SAÍDA:
//   video-demo/output/videos/            → vídeo final (.webm)
//   video-demo/output/error-screenshots/ → screenshot de qualquer cena que falhar
// ─────────────────────────────────────────────────────────────────────────────

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  BASE_URL, DEMO_SPEED, VIDEO_FORMAT,
  VIEWPORTS, RECORD_SIZE, DEMO_SCENES, OUTPUT_DIR, VIDEO_DIR,
  DEMO_GUEST_NAMES,
} from './demo-config.js';
import {
  log, sleep, injectFakeCursor, moveMouse, clickWithPause,
  typeSlowly, waitForVisible, ensureDir, runScene, dismissBlockingOverlays,
  closeByBackdropClick,
} from './demo-helpers.js';
import { login } from './demo-auth.js';

// ── Cena 01 — Abertura ────────────────────────────────────────────────────

async function sceneLanding(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  await page.mouse.move(200, 300, { steps: 20 });
  await sleep(1500);
}

// ── Cena 02 — Dashboard do baba ──────────────────────────────────────────

async function sceneBabaOverview(page) {
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  const settled = await waitForVisible(page.getByRole('tablist').first(), 15000);
  if (!settled) throw new Error('Dashboard não carregou (tablist não apareceu) — confira se a conta de demo tem um baba.');
  await sleep(1000);
  await dismissBlockingOverlays(page);
  await sleep(1200);

  // Mostra a lista de membros
  const membros = page.getByText('Lista de Membros', { exact: false }).first();
  if (await waitForVisible(membros, 4000)) {
    await clickWithPause(page, membros, { pauseAfter: 1800 });

    // Fecha o modal — o botão "X" dele não tem aria-label, então clicamos
    // no backdrop (fundo), que já fecha o modal por design do componente.
    const membrosHeading = page.getByText('Atletas', { exact: true }).first();
    await closeByBackdropClick(page);
    const closed = await membrosHeading.waitFor({ state: 'hidden', timeout: 4000 }).then(() => true).catch(() => false);
    if (!closed) {
      // Reforço: tenta Escape e, por último, um botão de fechar genérico.
      await page.keyboard.press('Escape').catch(() => {});
      const stillOpen = await membrosHeading.isVisible().catch(() => false);
      if (stillOpen) {
        const closeBtn = page.locator('[aria-label="Fechar"], [aria-label="Close"]').first();
        if (await waitForVisible(closeBtn, 1500)) {
          await clickWithPause(page, closeBtn, { pauseAfter: 600 });
        }
      }
    }
    // Trava de segurança: NUNCA segue pras próximas cenas com esse modal
    // ainda aberto (senão todo o resto do roteiro clica "por baixo" dele).
    // Último recurso: recarrega o dashboard do zero, o que sempre limpa
    // qualquer modal preso — assim, mesmo que esta cena seja marcada como
    // falha no relatório, as cenas seguintes não ficam travadas por ela.
    const stillOpenFinal = await membrosHeading.isVisible().catch(() => false);
    if (stillOpenFinal) {
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await sleep(1500);
      throw new Error('Modal "Atletas" (Lista de Membros) não fechou — página recarregada pra não travar as próximas cenas.');
    }
  }
  await sleep(800);
}

// ── Cena 03 — Confirmação de presença ────────────────────────────────────

async function sceneAttendance(page) {
  await dismissBlockingOverlays(page);

  const confirmBtn  = page.getByRole('button', { name: /confirmar presença/i }).first();
  const alreadyIn   = page.getByText('Você está confirmado', { exact: false }).first();
  const noGameDay   = page.getByText('Nenhum baba agendado', { exact: false }).first();

  if (await waitForVisible(noGameDay, 3000)) {
    log.skip('Nenhum baba agendado para a conta de demo — configure um próximo dia de jogo para esta cena aparecer.');
    return;
  }

  if (await waitForVisible(alreadyIn, 3000)) {
    log.info('Presença já estava confirmada — mostrando o estado sem reconfirmar.');
    await sleep(1500);
    return;
  }

  if (await waitForVisible(confirmBtn, 5000)) {
    await clickWithPause(page, confirmBtn, { pauseAfter: 1800 });
  } else {
    log.skip('Botão "Confirmar presença" não encontrado — confirmações podem estar encerradas.');
  }
}

// ── Cena 04 — Sorteio de times ───────────────────────────────────────────

/** Adiciona convidados avulsos (recurso já existente do app) até bater o mínimo pro sorteio. */
async function ensureEnoughGuestsForDraw(page) {
  const addGuestBtn = page.getByRole('button', { name: /^convidados/i }).first();
  if (!(await waitForVisible(addGuestBtn, 3000))) return; // painel de convidados não existe nessa versão

  let guestIndex = 0;
  // Tenta até 12 vezes (tamanho da lista de nomes de exemplo) — pára assim
  // que o botão "Sortear Times" estiver habilitado.
  for (let i = 0; i < DEMO_GUEST_NAMES.length; i++) {
    const sortearBtn = page.getByRole('button', { name: /sortear times/i }).first();
    const enabled = await sortearBtn.isEnabled().catch(() => false);
    if (enabled) return;

    if (!(await addGuestBtn.isVisible().catch(() => false))) break;
    // Abre o painel de convidados se ainda não estiver aberto
    const nameInput = page.getByPlaceholder('Nome (opcional)').first();
    if (!(await nameInput.isVisible().catch(() => false))) {
      await clickWithPause(page, addGuestBtn, { pauseAfter: 500 });
    }

    const input = page.getByPlaceholder('Nome (opcional)').first();
    if (await waitForVisible(input, 3000)) {
      await typeSlowly(page, input, DEMO_GUEST_NAMES[guestIndex % DEMO_GUEST_NAMES.length], { delay: 55 });
      guestIndex++;
      const addBtn = page.getByRole('button', { name: /adicionar convidado/i }).first();
      await clickWithPause(page, addBtn, { pauseAfter: 700 });
    } else {
      break;
    }
  }
}

async function sceneDraw(page, demoState) {
  await page.goto(`${BASE_URL}/draw`, { waitUntil: 'domcontentloaded' });
  await sleep(1500);

  // Uma execução anterior pode ter deixado uma partida "ao vivo" (isso fica
  // salvo no banco, não só no navegador — por isso persiste entre execuções
  // mesmo limpando localStorage). Não é um erro: só significa que o sorteio
  // dessa rodada já foi feito antes. Detecta e segue o roteiro a partir daí,
  // em vez de tentar (e falhar) achar telas que já passaram.
  const jaAoVivo = page.getByText('AO VIVO', { exact: false }).first();
  const finalizarBtnCheck = page.getByRole('button', { name: /finalizar partida/i }).first();
  if ((await waitForVisible(jaAoVivo, 2500)) || (await finalizarBtnCheck.isVisible().catch(() => false))) {
    demoState.matchAlreadyLive = true;
    log.info('Já existe uma partida AO VIVO de uma execução anterior — pulando o sorteio e seguindo direto pra partida em andamento.');
    await sleep(1500);
    return;
  }

  // Se o sorteio automático estiver ligado, precisa liberar o modo manual.
  const manualOverride = page.getByText('Sortear manualmente agora mesmo', { exact: false }).first();
  if (await waitForVisible(manualOverride, 3000)) {
    await clickWithPause(page, manualOverride, { pauseAfter: 800 });
  }

  const sortearBtn = page.getByRole('button', { name: /sortear times/i }).first();
  const gotConfigScreen = await waitForVisible(sortearBtn, 8000);
  if (!gotConfigScreen) {
    // Pode já estar direto na tela de times (sessão ativa) — segue o roteiro.
    log.info('Tela de configuração não apareceu — talvez já exista um sorteio ativo. Seguindo para a tela de times.');
  } else {
    await sleep(1200);
    await ensureEnoughGuestsForDraw(page);

    const enabledNow = await sortearBtn.isEnabled().catch(() => false);
    if (!enabledNow) {
      throw new Error('Jogadores confirmados insuficientes para sortear, mesmo após tentar adicionar convidados.');
    }
    await clickWithPause(page, sortearBtn, { pauseAfter: 2200 });
  }

  // Tela de times sorteados
  const iniciarBtn = page.getByRole('button', { name: /iniciar partida|ir pra partida ao vivo/i }).first();
  const teamsReady = await waitForVisible(iniciarBtn, 10000);
  if (!teamsReady) throw new Error('Tela de times sorteados não carregou.');
  await sleep(2500); // tempo pro espectador ver os times
}

// ── Cena 05 — Início da partida ──────────────────────────────────────────

async function sceneMatchStart(page, demoState) {
  if (!demoState.matchAlreadyLive) {
    const iniciarBtn = page.getByRole('button', { name: /iniciar partida|ir pra partida ao vivo/i }).first();
    await clickWithPause(page, iniciarBtn, { pauseAfter: 1200 });

    // Modal "Todos presentes?" — confirma e inicia a partida de fato.
    const confirmarEIniciar = page.getByRole('button', { name: /confirmar e iniciar partida/i }).first();
    if (await waitForVisible(confirmarEIniciar, 5000)) {
      await clickWithPause(page, confirmarEIniciar, { pauseAfter: 1500 });
    }
  }

  const placar = page.locator('text=/vs/i').first();
  await waitForVisible(placar, 10000);
  await sleep(1000);

  // Liga o cronômetro (só se ainda não estiver rodando)
  const startClock = page.getByRole('button', { name: /iniciar cronômetro/i }).first();
  if (await waitForVisible(startClock, 4000)) {
    await clickWithPause(page, startClock, { pauseAfter: 1200 });
  }
  await sleep(1500);
}

// ── Cena 06 — Gols ────────────────────────────────────────────────────────

async function scoreOneGoal(page, team) {
  // Os botões de placar são os próprios números — o primeiro é o time A, o
  // segundo o time B (ver StepMatch.jsx: handleGoalClick('A'|'B')).
  const scoreButtons = page.locator('button.text-5xl.font-black.tabular-nums');
  const btn = team === 'A' ? scoreButtons.first() : scoreButtons.last();
  await clickWithPause(page, btn, { pauseAfter: 900 });

  const scorerSelect = page.locator('select').first();
  if (await waitForVisible(scorerSelect, 4000)) {
    // Escolhe a primeira opção real (índice 1 — índice 0 é "Selecione...")
    const options = await scorerSelect.locator('option').all();
    if (options.length > 1) {
      const value = await options[1].getAttribute('value');
      await moveMouse(page, scorerSelect);
      await sleep(300);
      await scorerSelect.selectOption(value);
      await sleep(500);
    }
    const confirmarBtn = page.getByRole('button', { name: /^confirmar$/i }).first();
    await clickWithPause(page, confirmarBtn, { pauseAfter: 1200 });
  }
}

async function sceneGoals(page) {
  await scoreOneGoal(page, 'A');
  await sleep(1800); // deixa o "GOL!" respirar antes do próximo lance
  await scoreOneGoal(page, 'B');
  await sleep(1200);
  await scoreOneGoal(page, 'A');
  await sleep(1500);
}

// ── Cena 07 — Reações ─────────────────────────────────────────────────────

async function sceneReactions(page) {
  const reagirLabel = page.getByText('Reagir', { exact: true }).first();
  if (!(await waitForVisible(reagirLabel, 3000))) {
    log.skip('Reações em tempo real não fazem parte do modo atual deste baba.');
    return;
  }
  // Botões de emoji reais do MatchReactions.jsx — busca cada emoji
  // individualmente (evita problemas de classe de caracteres regex com
  // emojis fora do BMP, como 🔥 e 😱).
  const REAL_REACTION_EMOJIS = ['⚽', '🔥', '😱', '👑', '💪', '🤣', '😤', '🎯'];
  let clicked = 0;
  for (const emoji of REAL_REACTION_EMOJIS) {
    if (clicked >= 3) break;
    const btn = page.locator('button', { hasText: emoji }).first();
    if (await waitForVisible(btn, 1500)) {
      await clickWithPause(page, btn, { pauseAfter: 1300 });
      clicked++;
    }
  }
  if (clicked === 0) {
    log.skip('Nenhum botão de reação encontrado na tela.');
  }
}

// ── Cena 08 — Cronômetro (destaque) ──────────────────────────────────────

async function sceneClockHighlight(page) {
  const clockDisplay = page.locator('div.font-mono.tabular-nums').first();
  if (await waitForVisible(clockDisplay, 3000)) {
    await moveMouse(page, clockDisplay);
    await sleep(2500); // deixa o cronômetro correr visivelmente na tela
  } else {
    log.skip('Cronômetro não encontrado na tela atual.');
  }
}

// ── Cena 09 — Final da partida / pós-jogo ────────────────────────────────

async function dismissIfVisible(page, locator, label) {
  if (await waitForVisible(locator, 4000)) {
    await clickWithPause(page, locator, { pauseAfter: 1200 });
    log.info(`Fechou modal: ${label}`);
    return true;
  }
  return false;
}

async function sceneMatchEnd(page) {
  const finalizarBtn = page.getByRole('button', { name: /finalizar partida/i }).first();
  await clickWithPause(page, finalizarBtn, { pauseAfter: 2000 });

  // Sequência de modais opcionais pós-partida — mostra o que existir, pula o resto.
  await dismissIfVisible(page, page.getByRole('button', { name: /pular por agora/i }).first(), 'Foto do vencedor');
  await sleep(600);
  await dismissIfVisible(page, page.getByRole('button', { name: /pular votação/i }).first(), 'MVP do dia');
  await sleep(600);

  // Tela de resumo pós-jogo (placar final) — se ainda estiver aberta, dá um
  // tempo de tela e fecha.
  const fecharPosJogo = page.locator('[aria-label="Fechar"], [aria-label="Close"]').first();
  if (await waitForVisible(fecharPosJogo, 3000)) {
    await sleep(2500); // tempo pro espectador ver o placar final
    await clickWithPause(page, fecharPosJogo, { pauseAfter: 800 });
  }
}

// ── Cena 10 — Ranking / estatísticas ─────────────────────────────────────

async function sceneRankings(page) {
  await page.goto(`${BASE_URL}/rankings`, { waitUntil: 'domcontentloaded' });
  const loaded = await waitForVisible(page.locator('body'), 8000);
  if (!loaded) throw new Error('Página de rankings não carregou.');
  await sleep(2800);

  const comparar = page.getByText('Comparar jogadores', { exact: false }).first();
  if (await waitForVisible(comparar, 3000)) {
    await moveMouse(page, comparar);
    await sleep(1200);
  }
}

// ── Orquestração ──────────────────────────────────────────────────────────

async function main() {
  ensureDir(OUTPUT_DIR);
  ensureDir(VIDEO_DIR);

  const viewport = VIEWPORTS[VIDEO_FORMAT] || VIEWPORTS.vertical;
  const recordSize = RECORD_SIZE[VIDEO_FORMAT] || RECORD_SIZE.vertical;

  console.log('========================================');
  console.log('DRAFT PLAY — VIDEO DEMO');
  console.log('========================================');
  console.log(`URL base:      ${BASE_URL}`);
  console.log(`Conta:         ${EMAIL}`);
  console.log(`Velocidade:    ${DEMO_SPEED}`);
  console.log(`Formato:       ${VIDEO_FORMAT} (${recordSize.width}x${recordSize.height})`);
  console.log('========================================\n');

  // --disable-lcd-text: desliga o antialiasing de subpixel (ClearType/LCD).
  // Esse tipo de antialiasing deixa o texto ótimo numa tela normal, mas
  // gera uma franja colorida/embaçada quando a imagem é gravada em vídeo ou
  // reescalada — é isso que aparecia como "brilho" nos nomes/textos claros.
  // --force-color-profile=srgb: evita variação de cor entre máquinas.
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-lcd-text', '--force-color-profile=srgb'],
  });
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1, // viewport já é a resolução final (ver comentário em VIEWPORTS no demo-config.js)
    locale: 'pt-BR',
    // O app decide dark/light por localStorage OU, na ausência disso, pela
    // preferência de cor do sistema (prefers-color-scheme) — ver
    // src/hooks/useAppTheme.js. O Playwright, sem essa opção, simula
    // "light" por padrão numa aba nova, o que deixava os cards de
    // superfície brancos (tokens --color-bg-surface-*), com textos pensados
    // pra fundo escuro perdendo contraste. Isso NUNCA acontecia no uso
    // manual porque o navegador normal reporta a preferência real do SO.
    colorScheme: 'dark',
    recordVideo: { dir: VIDEO_DIR, size: recordSize },
  });

  const page = await context.newPage();
  await injectFakeCursor(page);

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`   [Browser Error]: ${msg.text()}`);
  });

  // Limpa qualquer estado de sorteio de uma execução anterior (localStorage),
  // pra sempre começar do Step 1 do wizard.
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.evaluate(() => {
    try { localStorage.removeItem('draft_play_draw_wizard'); } catch {}
  }).catch(() => {});

  const results = [];
  const demoState = { matchAlreadyLive: false };

  results.push(await runScene(page, { number: 1, title: 'ABERTURA DO APP' }, () => sceneLanding(page)));

  results.push(await runScene(page, { number: 2, title: 'LOGIN' }, () => login(page)));

  if (DEMO_SCENES.babaOverview) {
    results.push(await runScene(page, { number: 3, title: 'BABA — VISÃO GERAL' }, () => sceneBabaOverview(page)));
  }

  if (DEMO_SCENES.attendance) {
    results.push(await runScene(page, { number: 4, title: 'CONFIRMAÇÃO DE PRESENÇA' }, () => sceneAttendance(page)));
  }

  let drawOk = false;
  if (DEMO_SCENES.draw) {
    const r = await runScene(page, { number: 5, title: 'SORTEIO DE TIMES' }, () => sceneDraw(page, demoState));
    results.push(r);
    drawOk = r.ok;
  }

  let matchOk = false;
  if (DEMO_SCENES.matchStart && drawOk) {
    const r = await runScene(page, { number: 6, title: 'INÍCIO DA PARTIDA' }, () => sceneMatchStart(page, demoState));
    results.push(r);
    matchOk = r.ok;
  } else if (DEMO_SCENES.matchStart) {
    log.skip('Início da partida pulado — sorteio não foi concluído.');
  }

  if (DEMO_SCENES.goals && matchOk) {
    results.push(await runScene(page, { number: 7, title: 'GOLS', optional: true }, () => sceneGoals(page)));
  }

  if (DEMO_SCENES.reactions && matchOk) {
    results.push(await runScene(page, { number: 8, title: 'REAÇÕES', optional: true }, () => sceneReactions(page)));
  }

  if (DEMO_SCENES.clock && matchOk) {
    results.push(await runScene(page, { number: 9, title: 'CRONÔMETRO', optional: true }, () => sceneClockHighlight(page)));
  }

  let dayFinished = false;
  if (DEMO_SCENES.matchEnd && matchOk) {
    const r = await runScene(page, { number: 10, title: 'FINAL DA PARTIDA / PÓS-JOGO' }, () => sceneMatchEnd(page));
    results.push(r);
    dayFinished = r.ok;
  }

  if (DEMO_SCENES.rankings) {
    results.push(await runScene(page, { number: 11, title: 'RANKING / ESTATÍSTICAS', optional: true }, () => sceneRankings(page)));
  }

  await sleep(1500);
  await context.close();
  await browser.close();

  // ── Relatório final ─────────────────────────────────────────────────────
  const videoFiles = fs.readdirSync(VIDEO_DIR).filter((f) => f.endsWith('.webm'));
  const latestVideo = videoFiles
    .map((f) => ({ f, t: fs.statSync(path.join(VIDEO_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0];

  console.log('\n========================================');
  console.log('CENAS');
  console.log('========================================');
  results.forEach((r) => {
    console.log(`${r.ok ? '✓' : '✗'} ${r.title}${r.ok ? '' : `  (${r.error})`}`);
  });

  const okCount = results.filter((r) => r.ok).length;

  console.log('\n========================================');
  console.log('VIDEO GERADO');
  console.log('========================================');
  if (latestVideo) {
    console.log(`Arquivo: ${path.join(VIDEO_DIR, latestVideo.f)}`);
  } else {
    console.log('Nenhum arquivo de vídeo encontrado — verifique permissões de disco.');
  }
  console.log(`Cenas concluídas: ${okCount}/${results.length}`);
  console.log('========================================\n');

  if (!dayFinished && DEMO_SCENES.matchEnd) {
    console.log('[VIDEO DEMO] Aviso: a cena de final de partida não foi concluída — revise o vídeo antes de editar.');
  }

  if (demoState.matchAlreadyLive) {
    console.log(
      '[VIDEO DEMO] Aviso: o sorteio foi PULADO nesta gravação porque já existia uma partida ao vivo\n' +
      '   de uma execução anterior (isso fica salvo no banco, não só no navegador). Se quiser um vídeo\n' +
      '   com o sorteio do zero, finalize essa partida uma vez manualmente no navegador (Finalizar\n' +
      '   Partida → Encerrar o baba de hoje) e rode "npm run video:demo" de novo.',
    );
  }
}

main().catch((err) => {
  console.error('\n[VIDEO DEMO] ✗ ERRO FATAL:', err);
  process.exit(1);
});
