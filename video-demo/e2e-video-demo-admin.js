// video-demo/e2e-video-demo-admin.js
// ─────────────────────────────────────────────────────────────────────────────
// GRAVADOR DE VÍDEO — FUNÇÕES DO PRESIDENTE — Draft Play
// ─────────────────────────────────────────────────────────────────────────────
// Script NOVO e ISOLADO (não mexe em e2e/*.spec.js, playwright.config.js nem
// no e2e-video-demo.js já existente). Mostra as ferramentas de administração
// do baba: convites, suspensão, cargo de coordenador, remoção de membro,
// financeiro (cobranças e despesas) e restrições de sorteio (jogadores que
// devem ficar juntos ou separados).
//
// SEGURANÇA DOS DADOS DE DEMONSTRAÇÃO:
//   Ações destrutivas ou permanentes são só EXIBIDAS, nunca executadas de
//   verdade, pra não ir corroendo o baba de demonstração a cada gravação:
//   - "Excluir do baba": abre o modal de confirmação e CANCELA (não exclui).
//   - Suspensão e cargo de coordenador: aplica e depois DESFAZ (reversível
//     por natureza, então é seguro demonstrar de ponta a ponta).
//   - Restrição de sorteio: cria e depois remove, mesma lógica.
//   Cobranças/despesas ficam registradas de verdade (é exatamente o que a
//   função faz) — se não quiser isso no baba real, use um baba de demo.
//
// USO:
//   npm run video:demo:admin
//
// Mesmas variáveis de ambiente do e2e-video-demo.js (BASE_URL, DEMO_EMAIL,
// SUPABASE_SERVICE_ROLE_KEY, etc. — ver README.md).
// ─────────────────────────────────────────────────────────────────────────────

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  BASE_URL, DEMO_SPEED, VIDEO_FORMAT,
  VIEWPORTS, RECORD_SIZE, OUTPUT_DIR, VIDEO_DIR,
} from './demo-config.js';
import {
  log, sleep, injectFakeCursor, moveMouse, clickWithPause,
  typeSlowly, waitForVisible, ensureDir, runScene, dismissBlockingOverlays,
  closeByBackdropClick,
} from './demo-helpers.js';
import { login } from './demo-auth.js';

const ADMIN_SCENES = {
  invites:      true, // Convites
  suspension:   true, // Suspender / remover suspensão
  coordinator:  true, // Nomear / remover coordenador
  expel:        true, // Excluir do baba (só mostra o modal, cancela)
  settings:     true, // Configurações do grupo (aba Gestão)
  financial:    true, // Caixa do grupo — cobrança e despesa
  constraints:  true, // Restrições de sorteio (juntos/separados)
};

// ── Helpers específicos deste roteiro ────────────────────────────────────

/** Abre "Lista de Membros" a partir do dashboard (Visão Geral). */
async function openMembersModal(page) {
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await waitForVisible(page.getByRole('tablist').first(), 15000);
  await sleep(1000);
  await dismissBlockingOverlays(page);
  await sleep(800);

  const membros = page.getByText('Lista de Membros', { exact: false }).first();
  await waitForVisible(membros, 6000);
  await clickWithPause(page, membros, { pauseAfter: 1500 });

  const heading = page.getByText('Atletas', { exact: true }).first();
  const opened = await waitForVisible(heading, 5000);
  if (!opened) throw new Error('Modal "Atletas" (Lista de Membros) não abriu.');
}

/** Fecha o modal de membros (backdrop click, com verificação e fallback de reload). */
async function closeMembersModal(page) {
  const heading = page.getByText('Atletas', { exact: true }).first();
  await closeByBackdropClick(page);
  let closed = await heading.waitFor({ state: 'hidden', timeout: 4000 }).then(() => true).catch(() => false);
  if (!closed) {
    await page.keyboard.press('Escape').catch(() => {});
    closed = await heading.isVisible().catch(() => false).then((v) => !v);
  }
  if (!closed) {
    // Última rede de segurança: recarrega o dashboard do zero, pra não
    // travar as próximas cenas com esse modal preso na tela.
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await sleep(1200);
  }
}

/** O botão "⋮" só existe nas linhas de membros que NÃO são o presidente logado
 *  (ver MembersModal.jsx: isPresident && !isSelf && !isOwner) — então cada
 *  botão encontrado já é, por definição, um membro válido para testar. */
function memberMenuButtons(page) {
  return page.locator('button:has(svg.lucide-more-vertical)');
}

async function openMemberMenu(page, index) {
  const buttons = memberMenuButtons(page);
  const count = await buttons.count();
  if (count <= index) return false;
  await clickWithPause(page, buttons.nth(index), { pauseAfter: 800 });
  return true;
}

// ── Cena — Convites ───────────────────────────────────────────────────────

async function sceneInvites(page) {
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await waitForVisible(page.getByRole('tablist').first(), 15000);
  await sleep(1000);
  await dismissBlockingOverlays(page);

  const invitesHeading = page.getByText('Convidar Atletas', { exact: false }).first();
  await waitForVisible(invitesHeading, 8000);
  await moveMouse(page, invitesHeading);
  await sleep(800);

  // Já existe convite ativo? Se não, gera um (recurso do próprio presidente).
  const gerarBtn = page.getByRole('button', { name: /gerar convite do grupo/i }).first();
  if (await gerarBtn.isVisible().catch(() => false)) {
    await clickWithPause(page, gerarBtn, { pauseAfter: 1800 });
  }

  // Mostra o QR code do convite principal
  const qrBtn = page.getByTitle('Mostrar QR Code').first();
  if (await waitForVisible(qrBtn, 5000)) {
    await clickWithPause(page, qrBtn, { pauseAfter: 2200 });
    const closeQr = page.locator('[aria-label="Fechar"], [aria-label="Close"]').first();
    if (await waitForVisible(closeQr, 2000)) {
      await clickWithPause(page, closeQr, { pauseAfter: 600 });
    } else {
      await closeByBackdropClick(page);
    }
  }

  // Copia o link do convite
  const copiarBtn = page.getByRole('button', { name: /copiar link/i }).first();
  if (await waitForVisible(copiarBtn, 4000)) {
    await clickWithPause(page, copiarBtn, { pauseAfter: 1500 });
  }
}

// ── Cena — Suspensão ──────────────────────────────────────────────────────

async function sceneSuspension(page) {
  await openMembersModal(page);

  const gotMenu = await openMemberMenu(page, 0);
  if (!gotMenu) {
    log.skip('Nenhum membro disponível pra demonstrar suspensão (baba com poucos membros).');
    await closeMembersModal(page);
    return;
  }

  const suspenderBtn = page.getByRole('button', { name: /^suspender$/i }).first();
  if (!(await waitForVisible(suspenderBtn, 3000))) {
    log.skip('Membro já estava suspenso — pulando pra não bagunçar o estado dele.');
    await closeMembersModal(page);
    return;
  }
  await clickWithPause(page, suspenderBtn, { pauseAfter: 1000 });

  // SuspendSheet — escolhe 7 dias (padrão já vem selecionado) e confirma.
  const confirmarBtn = page.getByRole('button', { name: /^confirmar$/i }).first();
  await waitForVisible(confirmarBtn, 4000);
  await clickWithPause(page, confirmarBtn, { pauseAfter: 1800 });

  // Mostra o badge "Suspenso" resultante
  const suspensoBadge = page.getByText('Suspenso', { exact: false }).first();
  await waitForVisible(suspensoBadge, 4000);
  await moveMouse(page, suspensoBadge);
  await sleep(2000);

  // Desfaz a suspensão — mantém o baba de demonstração limpo pra próxima gravação.
  await openMemberMenu(page, 0);
  const removerSuspensaoBtn = page.getByRole('button', { name: /remover suspensão/i }).first();
  if (await waitForVisible(removerSuspensaoBtn, 3000)) {
    await clickWithPause(page, removerSuspensaoBtn, { pauseAfter: 1200 });
  }

  await closeMembersModal(page);
}

// ── Cena — Coordenador ────────────────────────────────────────────────────

async function sceneCoordinator(page) {
  await openMembersModal(page);

  // Usa o SEGUNDO membro (índice 1) pra não interferir com o teste de
  // suspensão, que reordena/mexe no primeiro.
  let gotMenu = await openMemberMenu(page, 1);
  if (!gotMenu) gotMenu = await openMemberMenu(page, 0);
  if (!gotMenu) {
    log.skip('Nenhum membro disponível pra demonstrar nomeação de coordenador.');
    await closeMembersModal(page);
    return;
  }

  const nomearBtn = page.getByRole('button', { name: /nomear coordenador/i }).first();
  const jaEhCoord = page.getByRole('button', { name: /remover coordenador/i }).first();

  if (await waitForVisible(nomearBtn, 3000)) {
    await clickWithPause(page, nomearBtn, { pauseAfter: 1500 });

    const badge = page.getByText('Coordenador', { exact: true }).first();
    await waitForVisible(badge, 4000);
    await moveMouse(page, badge);
    await sleep(2000);

    // Reverte — mantém o baba limpo pra próxima gravação.
    const menuOpenedAgain = await openMemberMenu(page, 1) || await openMemberMenu(page, 0);
    if (menuOpenedAgain) {
      const removerBtn = page.getByRole('button', { name: /remover coordenador/i }).first();
      if (await waitForVisible(removerBtn, 3000)) {
        await clickWithPause(page, removerBtn, { pauseAfter: 1200 });
      }
    }
  } else if (await waitForVisible(jaEhCoord, 2000)) {
    log.info('Este membro já era coordenador — mostrando o badge sem alterar o cargo.');
    await sleep(1500);
  }

  await closeMembersModal(page);
}

// ── Cena — Excluir do baba (demonstração segura, sem excluir de verdade) ──

async function sceneExpel(page) {
  await openMembersModal(page);

  // Usa o TERCEIRO membro (índice 2) pra não colidir com as cenas anteriores.
  let gotMenu = await openMemberMenu(page, 2);
  if (!gotMenu) gotMenu = await openMemberMenu(page, 0);
  if (!gotMenu) {
    log.skip('Nenhum membro disponível pra demonstrar a remoção.');
    await closeMembersModal(page);
    return;
  }

  const excluirBtn = page.getByRole('button', { name: /excluir do baba/i }).first();
  await waitForVisible(excluirBtn, 3000);
  await clickWithPause(page, excluirBtn, { pauseAfter: 1200 });

  // Modal de confirmação — mostra e CANCELA (não exclui de verdade).
  const cancelarBtn = page.getByRole('button', { name: /^cancelar$/i }).first();
  const confirmed = await waitForVisible(cancelarBtn, 4000);
  if (confirmed) {
    await sleep(1500); // tempo pro espectador ler o aviso de confirmação
    await clickWithPause(page, cancelarBtn, { pauseAfter: 800 });
  } else {
    throw new Error('Modal de confirmação de exclusão não apareceu — verifique manualmente antes de reusar este fluxo.');
  }

  await closeMembersModal(page);
}

// ── Cena — Configurações do grupo (aba Gestão) ───────────────────────────

async function sceneSettings(page) {
  await page.goto(`${BASE_URL}/dashboard?tab=manage`, { waitUntil: 'domcontentloaded' });
  await waitForVisible(page.getByRole('tablist').first(), 15000);
  await sleep(1200);
  await dismissBlockingOverlays(page);

  const configHeading = page.getByText('Configurações do Grupo', { exact: false }).first();
  await waitForVisible(configHeading, 8000);
  await clickWithPause(page, configHeading, { pauseAfter: 1500 });

  // Abre uma sub-seção pra mostrar conteúdo real (Jogo e Confirmações)
  const jogoSection = page.getByText('Jogo e Confirmações', { exact: false }).first();
  if (await waitForVisible(jogoSection, 4000)) {
    await clickWithPause(page, jogoSection, { pauseAfter: 1800 });
  }

  // Fecha a sub-seção de novo, sem salvar nada (só demonstração visual)
  if (await jogoSection.isVisible().catch(() => false)) {
    await clickWithPause(page, jogoSection, { pauseAfter: 600 });
  }
}

// ── Cena — Financeiro ─────────────────────────────────────────────────────

async function sceneFinancial(page) {
  await page.goto(`${BASE_URL}/financial`, { waitUntil: 'domcontentloaded' });
  const heading = page.getByText('Financeiro', { exact: false }).first();
  await waitForVisible(heading, 10000);
  await sleep(1500);

  // Nova cobrança
  const novaCobranca = page.getByRole('button', { name: /nova cobrança/i }).first();
  if (await waitForVisible(novaCobranca, 5000)) {
    await clickWithPause(page, novaCobranca, { pauseAfter: 1200 });

    const tituloInput = page.getByPlaceholder(/título \(ex: mensalidade\)/i).first();
    await waitForVisible(tituloInput, 4000);
    await typeSlowly(page, tituloInput, 'MENSALIDADE DEMO', { delay: 45 });

    const valorInput = page.getByPlaceholder('VALOR R$').first();
    await typeSlowly(page, valorInput, '20', { delay: 60 });

    // Data de vencimento — daqui a 7 dias
    const dataInput = page.locator('input[type="date"]').first();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const iso = dueDate.toISOString().split('T')[0];
    await moveMouse(page, dataInput);
    await dataInput.fill(iso);
    await sleep(400);

    const pixInput = page.getByPlaceholder('CHAVE PIX').first();
    await typeSlowly(page, pixInput, 'demo@draftplay.app', { delay: 40 });

    const lancarBtn = page.getByRole('button', { name: /lançar agora/i }).first();
    await clickWithPause(page, lancarBtn, { pauseAfter: 1800 });
  }

  await sleep(1000);

  // Nova despesa
  const novaDespesa = page.getByRole('button', { name: /nova despesa/i }).first();
  if (await waitForVisible(novaDespesa, 5000)) {
    await clickWithPause(page, novaDespesa, { pauseAfter: 1200 });

    const tituloDespesa = page.getByPlaceholder(/título \(ex: aluguel da quadra\)/i).first();
    await waitForVisible(tituloDespesa, 4000);
    await typeSlowly(page, tituloDespesa, 'ALUGUEL DA QUADRA', { delay: 45 });

    const valorDespesa = page.getByPlaceholder('VALOR R$').first();
    await typeSlowly(page, valorDespesa, '150', { delay: 60 });

    const abaterBtn = page.getByRole('button', { name: /abater do caixa/i }).first();
    await clickWithPause(page, abaterBtn, { pauseAfter: 1800 });
  }

  await sleep(1500); // tempo pro espectador ver o caixa atualizado
}

// ── Cena — Restrições de sorteio (rival / parceiro) ───────────────────────

async function sceneConstraints(page) {
  await page.goto(`${BASE_URL}/draw`, { waitUntil: 'domcontentloaded' });
  await sleep(1500);

  const jaAoVivo = page.getByText('AO VIVO', { exact: false }).first();
  if (await waitForVisible(jaAoVivo, 2500)) {
    log.skip('Já existe uma partida ao vivo — a tela de restrições só aparece na configuração do sorteio (antes de sortear). Finalize a partida atual pra ver esta cena.');
    return;
  }

  const restricoesToggle = page.getByText('Restrições de sorteio', { exact: false }).first();
  const hasFeature = await waitForVisible(restricoesToggle, 6000);
  if (!hasFeature) {
    log.skip('Restrições de sorteio não disponíveis neste baba (recurso de assinante).');
    return;
  }
  await clickWithPause(page, restricoesToggle, { pauseAfter: 1200 });

  const novaBtn = page.getByRole('button', { name: /^nova$/i }).first();
  await waitForVisible(novaBtn, 4000);
  await clickWithPause(page, novaBtn, { pauseAfter: 1000 });

  // Tipo "Separados" (rivais)
  const separadosBtn = page.getByRole('button', { name: /separados/i }).first();
  await clickWithPause(page, separadosBtn, { pauseAfter: 600 });

  // Escopado ao formulário "Nova restrição" — a tela de sorteio tem outro
  // <select> fora desse painel (formato/estratégia), então pegar selects
  // pela ordem global da página pegaria o elemento errado.
  const formContainer = page.getByText('Nova restrição', { exact: true }).locator('xpath=..');
  const selects = formContainer.locator('select');
  const selectA = selects.nth(0);
  const selectB = selects.nth(1);

  const optionsA = await selectA.locator('option').all();
  if (optionsA.length > 2) {
    const valueA = await optionsA[1].getAttribute('value');
    await moveMouse(page, selectA);
    await selectA.selectOption(valueA);
    await sleep(500);

    const optionsB = await selectB.locator('option').all();
    if (optionsB.length > 1) {
      const valueB = await optionsB[1].getAttribute('value');
      await moveMouse(page, selectB);
      await selectB.selectOption(valueB);
      await sleep(500);
    }

    const motivoInput = page.getByPlaceholder(/rivalidade, melhor amigo/i).first();
    await typeSlowly(page, motivoInput, 'Rivalidade', { delay: 50 });

    const criarBtn = page.getByRole('button', { name: /^criar$/i }).first();
    await clickWithPause(page, criarBtn, { pauseAfter: 1800 });

    // Mostra a restrição criada
    const listaRestricao = page.getByText('Jogam separados', { exact: false }).first();
    await waitForVisible(listaRestricao, 4000);
    await sleep(1800);

    // Remove — mantém o baba de demonstração limpo pra próxima gravação.
    const removerBtn = page.locator('button[aria-label="Remover restrição"]').first();
    if (await waitForVisible(removerBtn, 3000)) {
      await clickWithPause(page, removerBtn, { pauseAfter: 1000 });
    }
  } else {
    log.skip('Baba não tem jogadores suficientes pra criar uma restrição de exemplo.');
  }
}

// ── Orquestração ──────────────────────────────────────────────────────────

async function main() {
  ensureDir(OUTPUT_DIR);
  ensureDir(VIDEO_DIR);

  const viewport = VIEWPORTS[VIDEO_FORMAT] || VIEWPORTS.vertical;
  const recordSize = RECORD_SIZE[VIDEO_FORMAT] || RECORD_SIZE.vertical;

  console.log('========================================');
  console.log('DRAFT PLAY — VIDEO DEMO (FUNÇÕES DO PRESIDENTE)');
  console.log('========================================');
  console.log(`URL base:      ${BASE_URL}`);
  console.log(`Velocidade:    ${DEMO_SPEED}`);
  console.log(`Formato:       ${VIDEO_FORMAT} (${recordSize.width}x${recordSize.height})`);
  console.log('========================================\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-lcd-text', '--force-color-profile=srgb'],
  });
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    locale: 'pt-BR',
    colorScheme: 'dark',
    recordVideo: { dir: VIDEO_DIR, size: recordSize },
  });

  const page = await context.newPage();
  await injectFakeCursor(page);

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`   [Browser Error]: ${msg.text()}`);
  });

  const results = [];

  results.push(await runScene(page, { number: 1, title: 'LOGIN' }, () => login(page)));

  if (ADMIN_SCENES.invites) {
    results.push(await runScene(page, { number: 2, title: 'CONVITES' }, () => sceneInvites(page)));
  }
  if (ADMIN_SCENES.suspension) {
    results.push(await runScene(page, { number: 3, title: 'SUSPENSÃO DE MEMBRO' }, () => sceneSuspension(page)));
  }
  if (ADMIN_SCENES.coordinator) {
    results.push(await runScene(page, { number: 4, title: 'NOMEAR COORDENADOR' }, () => sceneCoordinator(page)));
  }
  if (ADMIN_SCENES.expel) {
    results.push(await runScene(page, { number: 5, title: 'EXCLUIR MEMBRO DO BABA' }, () => sceneExpel(page)));
  }
  if (ADMIN_SCENES.settings) {
    results.push(await runScene(page, { number: 6, title: 'CONFIGURAÇÕES DO GRUPO' }, () => sceneSettings(page)));
  }
  if (ADMIN_SCENES.financial) {
    results.push(await runScene(page, { number: 7, title: 'FINANCEIRO — COBRANÇA E DESPESA' }, () => sceneFinancial(page)));
  }
  if (ADMIN_SCENES.constraints) {
    results.push(await runScene(page, { number: 8, title: 'RESTRIÇÕES DE SORTEIO (JUNTOS/SEPARADOS)' }, () => sceneConstraints(page)));
  }

  await sleep(1500);
  await context.close();
  await browser.close();

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
}

main().catch((err) => {
  console.error('\n[VIDEO DEMO] ✗ ERRO FATAL:', err);
  process.exit(1);
});
