/**
 * e2e-match-flow-full.js
 * -------------------------------------------------------------------------
 * Versão ampliada do e2e-match-flow.js — em vez de um smoke test rápido com
 * 2 times e 1-2 partidas, este roda um "dia de baba" completo e maior:
 *
 *   - 3 times (não 2) — pra exercitar de verdade a ROTATIVIDADE da fila
 *     (quem perde vai pro final da fila, o 3º time entra automaticamente)
 *   - 5 partidas seguidas, com placares variados (incluindo 1 empate de
 *     propósito, pra testar o modal de par-ou-ímpar)
 *   - Gols COM assistência em parte deles (não só o artilheiro)
 *   - Cartão amarelo pro Time A e cartão vermelho pro Time B em partidas
 *     diferentes (não só amarelo, e não só num time)
 *   - Votação de MVP de verdade: vota no primeiro candidato da lista,
 *     clica em "Revelar MVP do dia", confirma que a tela de revelação
 *     aparece, e só ENTÃO fecha (em vez de "Pular votação", que nunca
 *     testava a votação em si — só o encerramento)
 *
 * Reaproveita a mesma infraestrutura já validada no e2e-match-flow.js
 * (login via magic link + Admin API, limpeza de sessão travada direto no
 * banco, clickFirstMatch com log do erro real). Se algo nessa base mudar,
 * replica a mudança nos dois arquivos.
 *
 * COMO RODAR — mesmas env vars do e2e-match-flow.js:
 *   BASE_URL=http://localhost:3000 \
 *   TEST_EMAIL=seu-baba-de-teste@email.com \
 *   SUPABASE_URL=https://SEU-PROJETO.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=xxxxx \
 *   SUPABASE_ANON_KEY=xxxxx \
 *   node e2e-match-flow-full.js
 *
 * PRÉ-REQUISITO: a conta de login precisa ser presidente (ou coordenador)
 * de um baba de TESTE (não use o baba real do grupo — esse script adiciona
 * dezenas de convidados avulsos e várias partidas de mentira).
 *
 * QUANTOS CONVIDADOS?
 *   playersPerTeam = 3, estratégia "Reserva" (padrão) → cada time precisa
 *   de 3+1 = 4 confirmados pra se formar. Pra 3 times: 4 × 3 = 12
 *   confirmados. O script ajusta "Jogadores por time" pra 3 e adiciona
 *   convidados até bater 12 (não só até o botão "Sortear" habilitar —
 *   isso garantiria só 2 times, não 3).
 */

import { chromium, devices } from 'playwright';
import { createClient }      from '@supabase/supabase-js';

const BASE_URL          = process.env.BASE_URL  || 'http://localhost:3000';
const EMAIL             = process.env.TEST_EMAIL;
const SUPABASE_URL      = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY          = process.env.SUPABASE_ANON_KEY;
const HEADLESS  = process.env.HEADLESS !== 'false';
const SLOWMO    = Number(process.env.SLOWMO || 0);

const PLAYERS_PER_TEAM = 3; // reserva precisa de +1 → 4 confirmados por time
const TARGET_TEAMS     = 3; // quantos times formar (testa rotatividade de verdade)
const TARGET_CONFIRMED = (PLAYERS_PER_TEAM + 1) * TARGET_TEAMS; // 12

// Roteiro das partidas: [golsTimeA, golsTimeB] — um empate de propósito no
// meio (índice 2) pra exercitar o modal de par-ou-ímpar.
const MATCH_SCRIPT = [
  [2, 0],
  [1, 3],
  [1, 1], // empate — os dois times empatados vão pro final da fila
  [0, 2],
  [4, 1],
];

if (!EMAIL) {
  console.error('❌ Defina TEST_EMAIL antes de rodar.');
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error('❌ Defina SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_ANON_KEY antes de rodar.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Helpers genéricos (idênticos ao e2e-match-flow.js) ──────────────────

const log = (msg) => console.log(msg);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickFirstMatch(page, candidates, { timeout = 4000, label = '' } = {}) {
  let lastError = null;
  for (const candidate of candidates) {
    try {
      const locator = candidate.startsWith('css=') || candidate.startsWith('text=')
        ? page.locator(candidate.replace(/^css=/, ''))
        : page.getByText(candidate, { exact: false });
      const el = locator.first();
      await el.waitFor({ state: 'visible', timeout });
      await el.click();
      log(`   ✅ ${label || 'clique'}: "${candidate}"`);
      return true;
    } catch (err) {
      lastError = err;
    }
  }
  log(`   ⚠️  ${label || 'clique'}: nenhum candidato encontrado (${candidates.join(' | ')})`);
  if (lastError) log(`      motivo real: ${lastError.message.split('\n')[0]}`);
  return false;
}

// ─── Login (idêntico ao e2e-match-flow.js) ────────────────────────────────

async function login(page) {
  log(`🔑 Gerando magic link via Admin API pra ${EMAIL}...`);

  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: EMAIL,
  });
  if (linkErr || !linkData?.properties?.hashed_token) {
    throw new Error(`Falha ao gerar magic link: ${linkErr?.message || 'hashed_token ausente na resposta'}`);
  }

  log('   Verificando o token no Node (sem passar pelo navegador)...');
  const { data: otpData, error: otpErr } = await supabaseAnon.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  });
  if (otpErr || !otpData?.session) {
    throw new Error(`Falha ao verificar o token: ${otpErr?.message || 'sessão ausente na resposta'}`);
  }

  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
  const storageKey = `sb-${projectRef}-auth-token`;

  await page.addInitScript(
    ([key, value, onboardingKey, changelogKey, betaNpsKey]) => {
      window.localStorage.setItem(key, value);
      window.localStorage.setItem(onboardingKey, '1');
      window.localStorage.setItem(changelogKey, '1');
      window.localStorage.setItem(betaNpsKey, '1');
    },
    [storageKey, JSON.stringify(otpData.session), 'draft_play_onboarding_done_v2', 'draft_play_changelog_seen_2.0.0', 'draft_play_beta_nps_shown']
  );

  page.on('console', (msg) => {
    if (msg.type() === 'error') log(`   [Browser Error]: ${msg.text()}`);
  });

  log('   Sessão pronta — navegando direto pro app já autenticado...');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  if (page.url().includes('/login')) {
    throw new Error(`Ainda caiu em /login depois de injetar a sessão (chave "${storageKey}").`);
  }
  log(`✅ Login ok — URL atual: ${page.url()}`);
  return linkData.user?.id || otpData.session?.user?.id || null;
}

// ─── Limpeza direta no banco de sessões de sorteio travadas ──────────────

async function forceCleanStuckDraws(userId) {
  const { data: babas } = await supabaseAdmin
    .from('babas')
    .select('id, name')
    .eq('president_id', userId);

  for (const baba of babas || []) {
    const { data: actives } = await supabaseAdmin
      .from('draw_results')
      .select('id, teams')
      .eq('baba_id', baba.id)
      .eq('status', 'active');

    const stuck = (actives || []).filter((d) => !Array.isArray(d.teams) || d.teams.length < 2);
    if (stuck.length > 0) {
      log(`   🧹 Limpando ${stuck.length} sessão(ões) de sorteio travada(s) (< 2 times) em "${baba.name}"...`);
      await supabaseAdmin.from('draw_results').delete().in('id', stuck.map((d) => d.id));
    }
  }
}

// ─── Passo 0: garantir que não sobrou sessão ativa de teste anterior ─────

async function ensureCleanSlate(page) {
  log('\n🧹 Checando se já existe sessão de sorteio ativa (limpando antes de começar)...');
  await page.goto(`${BASE_URL}/draw`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const finishDayBtn = page.getByText('Encerrar o baba de hoje', { exact: false }).first();
  if (await finishDayBtn.isVisible().catch(() => false)) {
    log('   ⚠️  Sessão ativa encontrada — encerrando pra começar limpo.');
    await finishDayBtn.click();
    await pause(400);
    await clickFirstMatch(page, ['css=button.bg-red-500:has-text("Encerrar")'], { label: 'confirmar encerramento' });
    await pause(1200);
    await clickFirstMatch(page, ['Pular por agora'], { label: 'pular foto do vencedor', timeout: 3000 });
    await pause(800);
    await clickFirstMatch(page, ['Pular votação'], { label: 'pular MVP (finaliza o dia de verdade)', timeout: 3000 });
    await pause(1500);
  } else {
    log('   ✅ Nenhuma sessão ativa — pode começar do zero.');
  }
}

// ─── Passo 1: Config — 3 times, 12 confirmados ────────────────────────────

async function stepConfig(page) {
  log(`\n1️⃣  STEP CONFIG — configurando ${PLAYERS_PER_TEAM} jogadores/time, alvo de ${TARGET_TEAMS} times (${TARGET_CONFIRMED} confirmados)...`);
  await page.goto(`${BASE_URL}/draw`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Ajusta "Jogadores por time" pro valor alvo (padrão é 5 — clica "−" até
  // chegar em PLAYERS_PER_TEAM).
  const minusBtn = page.getByRole('button', { name: '−' }).first();
  const plusBtn  = page.getByRole('button', { name: '+' }).first();
  const readPlayersPerTeam = async () => {
    const el = page.locator('span.text-xl.font-black.w-8.text-center.text-cyan-electric').first();
    const txt = await el.textContent().catch(() => null);
    return Number(txt) || null;
  };

  for (let i = 0; i < 10; i++) {
    const current = await readPlayersPerTeam();
    if (current === null) break;
    if (current === PLAYERS_PER_TEAM) break;
    if (current > PLAYERS_PER_TEAM) await minusBtn.click().catch(() => {});
    else await plusBtn.click().catch(() => {});
    await pause(150);
  }
  log(`   Jogadores por time ajustado.`);

  // Confirmados atuais — sobe do label exato "Confirmados" até a linha que
  // também contém o número (evita pegar o dígito escondido do Stepper lá em
  // cima, que também é só dígito e vem antes no DOM).
  const readConfirmedCount = async () => {
    const confirmedLabel = page.getByText('Confirmados', { exact: true }).first();
    const confirmedRow   = confirmedLabel.locator('xpath=../..');
    const txt = await confirmedRow.locator('span.tabular-nums').first().textContent().catch(() => null);
    return Number(txt) || 0;
  };

  let confirmedCount = await readConfirmedCount();
  log(`   Confirmados atuais: ${confirmedCount}`);

  if (confirmedCount < TARGET_CONFIRMED) {
    await clickFirstMatch(page, ['Convidados'], { label: 'abrir seção Convidados' });
    await pause(500);

    const MAX_ATTEMPTS = TARGET_CONFIRMED + 5; // trava de segurança
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      confirmedCount = await readConfirmedCount();
      if (confirmedCount >= TARGET_CONFIRMED) break;
      await clickFirstMatch(page, ['+ Adicionar convidado', 'Adicionar convidado'], { label: `adicionar convidado #${i + 1}` });
      await pause(700);
    }
  }

  confirmedCount = await readConfirmedCount();
  log(`   Confirmados finais: ${confirmedCount} (alvo: ${TARGET_CONFIRMED})`);
  if (confirmedCount < TARGET_CONFIRMED) {
    log(`   ⚠️  Não bateu o alvo de ${TARGET_CONFIRMED} — o sorteio pode sair com menos de ${TARGET_TEAMS} times.`);
  }

  const sortearBtnCheck = page.getByText('Sortear Times', { exact: false }).first();
  const isEnabled = async () =>
    !(await sortearBtnCheck.evaluate((el) => el.closest('button')?.disabled).catch(() => true));

  if (!(await isEnabled())) {
    throw new Error('Botão "Sortear Times" continua desabilitado mesmo depois de adicionar convidados suficientes.');
  }

  await sortearBtnCheck.click();
  log('   ✅ Sorteio disparado.');
  await pause(1500);
}

// ─── Passo 2: Times — iniciar a primeira partida ──────────────────────────

async function stepTeams(page) {
  log('\n2️⃣  STEP TEAMS — iniciando a primeira partida...');

  const started = await clickFirstMatch(page, ['Ir pra partida ao vivo'], {
    label: 'já havia partida em andamento', timeout: 2000,
  });

  if (!started) {
    await clickFirstMatch(page, ['Iniciar Partida'], { label: 'iniciar partida' });
    await pause(1000);
    const confirmedPresence = await clickFirstMatch(
      page, ['Confirmar e iniciar partida'],
      { label: 'confirmar presença e iniciar partida', timeout: 3000 }
    );
    if (!confirmedPresence) {
      log('   ℹ️  Nenhum modal de presença apareceu — seguindo.');
    }
  }
  await pause(1500);
}

// ─── Passo 3: jogar uma partida (gols com/sem assistência, cartões) ──────

/** Lê os nomes dos times A/B atuais na tela (pra logar a rotatividade da fila). */
async function readCurrentTeamNames(page) {
  const names = await page.locator('p.text-\\[10px\\].font-black.uppercase.truncate').allTextContents().catch(() => []);
  return names.slice(0, 2);
}

/** Registra um gol pro time A (side='A') ou B (side='B'), com assistência opcional. */
async function scoreGoal(page, side, { withAssist = false } = {}) {
  const scoreButtons = page.locator('button.text-5xl.font-black.tabular-nums');
  const idx = side === 'A' ? 0 : 1;
  await scoreButtons.nth(idx).click();
  await pause(400);

  const scorerSelect = page.locator('select').nth(0);
  await scorerSelect.waitFor({ state: 'visible', timeout: 5000 });
  const scorerOptions = await scorerSelect.locator('option').all();
  if (scorerOptions.length > 1) {
    const value = await scorerOptions[1].getAttribute('value');
    await scorerSelect.selectOption(value);
  }

  if (withAssist) {
    const assistSelect = page.locator('select').nth(1);
    const assistOptions = await assistSelect.locator('option').all();
    // option[0] é "Nenhuma"; pega a primeira de verdade se existir mais de uma pessoa em campo
    if (assistOptions.length > 1) {
      const value = await assistOptions[1].getAttribute('value');
      await assistSelect.selectOption(value);
    }
  }

  await clickFirstMatch(page, ['Confirmar'], { label: `confirmar gol (Time ${side}${withAssist ? ', com assistência' : ''})`, timeout: 3000 });
  await pause(700);
}

/** Aplica um cartão (yellow/red) pro time A ou B. */
async function applyCard(page, side, type) {
  const cardButtons = page.locator('button:has-text("Cartão")');
  const idx = side === 'A' ? 0 : 1;
  await cardButtons.nth(idx).click();
  await pause(400);

  const cardSelect = page.locator('select').first();
  await cardSelect.waitFor({ state: 'visible', timeout: 5000 });
  const cardOptions = await cardSelect.locator('option').all();
  if (cardOptions.length > 1) {
    const value = await cardOptions[1].getAttribute('value');
    await cardSelect.selectOption(value);
  }

  await clickFirstMatch(page, [type === 'yellow' ? 'Amarelo' : 'Vermelho'], { label: `selecionar cartão ${type === 'yellow' ? 'amarelo' : 'vermelho'} (Time ${side})`, timeout: 3000 });
  await clickFirstMatch(page, ['Confirmar'], { label: 'confirmar cartão', timeout: 3000 });
  await pause(700);
}

/** Joga uma partida inteira: cronômetro, N gols por lado (com assistência
 * alternada), cartões, finaliza, resolve empate se for o caso, avança. */
async function playMatch(page, matchNumber, [goalsA, goalsB]) {
  const [teamAName, teamBName] = await readCurrentTeamNames(page);
  log(`\n   🏟️  Partida ${matchNumber}: ${teamAName || 'Time A'} vs ${teamBName || 'Time B'} — placar alvo ${goalsA}x${goalsB}`);

  await clickFirstMatch(page, ['Iniciar Cronômetro'], { label: 'iniciar cronômetro', timeout: 5000 });
  await pause(500);

  for (let i = 0; i < goalsA; i++) {
    await scoreGoal(page, 'A', { withAssist: i === 0 }); // assistência só no 1º gol do time, pra variar
  }
  for (let i = 0; i < goalsB; i++) {
    await scoreGoal(page, 'B', { withAssist: i === 0 });
  }
  log(`   ✅ Placar registrado: ${goalsA}x${goalsB}`);

  // Cartão amarelo pro Time A (se tiver alguém em campo) e vermelho pro Time
  // B, alternando pra não ser sempre o mesmo time levando cartão.
  if (matchNumber % 2 === 1) {
    await applyCard(page, 'A', 'yellow');
    await applyCard(page, 'B', 'red');
  } else {
    await applyCard(page, 'B', 'yellow');
    await applyCard(page, 'A', 'red');
  }
  log('   ✅ Cartões aplicados (1 amarelo + 1 vermelho, times alternados).');

  await clickFirstMatch(page, ['Finalizar Partida'], { label: 'finalizar partida', timeout: 4000 });
  await pause(1500);

  if (goalsA === goalsB) {
    log('   ⚖️  Empate — resolvendo modal de par-ou-ímpar...');
    const resolved = await clickFirstMatch(page, ['css=.fixed button:has-text("Time")'], {
      label: 'resolver par-ou-ímpar', timeout: 4000,
    });
    if (resolved) await pause(1000);
    // Resolver o par-ou-ímpar chama handleParImparChoice, que TAMBÉM abre a
    // PostGameScreen (mesma tela pós-jogo de uma vitória normal) — ainda
    // precisa do clique em "Próxima partida" pra avançar de verdade. Sem
    // isso, essa tela ficava pendurada por cima e bloqueava os cliques da
    // partida seguinte ("intercepts pointer events").
    const advanced = await clickFirstMatch(page, ['Próxima partida'], { label: 'avançar da tela pós-jogo (pós par-ou-ímpar)', timeout: 5000 });
    if (!advanced) log('   ⚠️  Não achei "Próxima partida →" depois do par-ou-ímpar — pode estar preso na tela pós-jogo.');
  } else {
    const advanced = await clickFirstMatch(page, ['Próxima partida'], { label: 'avançar da tela pós-jogo', timeout: 5000 });
    if (!advanced) log('   ⚠️  Não achei "Próxima partida →" — pode estar preso na tela pós-jogo.');
  }
  await pause(1500);
}

// ─── Passo 4: MVP de verdade (vota, revela, só então fecha) ──────────────

async function voteMvpAndFinish(page) {
  log('\n🏆 VOTAÇÃO DE MVP — votando de verdade (não pulando)...');

  await clickFirstMatch(page, ['Pular por agora'], { label: 'pular foto do vencedor', timeout: 4000 });
  await pause(800);

  // Vota no primeiro candidato da lista (qualquer que seja) — scoped ao
  // container de votação, não depende de saber o nome exato de ninguém.
  const votedOk = await clickFirstMatch(page, ['css=.max-h-72 button'], { label: 'votar no 1º candidato da lista', timeout: 4000 });
  if (!votedOk) {
    log('   ⚠️  Não achei nenhum candidato pra votar — pulando votação como fallback.');
    await clickFirstMatch(page, ['Pular votação'], { label: 'pular MVP (fallback)', timeout: 3000 });
    return;
  }
  await pause(800);

  const revealed = await clickFirstMatch(page, ['Revelar MVP do dia'], { label: 'revelar MVP', timeout: 4000 });
  if (!revealed) {
    log('   ⚠️  Botão de revelar não apareceu depois do voto — algo não bateu.');
  }
  await pause(1200);

  // Tela de revelação — confere se mostra "MVP do Dia" antes de fechar.
  const revealedText = await page.getByText('MVP do Dia', { exact: false }).first().isVisible().catch(() => false);
  log(revealedText ? '   ✅ Tela de revelação do MVP apareceu.' : '   ⚠️  Tela de revelação não confirmada visualmente.');

  await clickFirstMatch(page, ['Fechar'], { label: 'fechar revelação (finaliza o dia de verdade)', timeout: 4000 });
}

async function finishBabaDay(page) {
  log('\n4️⃣  ENCERRANDO O BABA DO DIA (com votação de MVP de verdade)...');
  await clickFirstMatch(page, ['Encerrar o baba de hoje'], { label: 'abrir modal de encerrar baba' });
  await pause(500);
  await clickFirstMatch(page, ['css=button.bg-red-500:has-text("Encerrar")'], { label: 'confirmar encerramento' });
  await pause(1200);

  await voteMvpAndFinish(page);

  await page.waitForURL((url) => !url.pathname.startsWith('/draw'), { timeout: 10000 }).catch(() => {});
  const finalUrl = page.url();
  if (!finalUrl.includes('/draw')) {
    log(`   ✅ Baba do dia encerrado com sucesso — voltou pra ${finalUrl}`);
  } else {
    log(`   ⚠️  Ainda em ${finalUrl} depois de tentar encerrar — checar manualmente.`);
  }
}

// ─── Execução ─────────────────────────────────────────────────────────────

(async () => {
  const browser = await chromium.launch({ headless: HEADLESS, slowMo: SLOWMO });
  const context = await browser.newContext({ ...devices['Desktop Chrome'] });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') log(`   [Browser Error]: ${msg.text()}`);
  });
  page.on('pageerror', (err) => log(`   [Page Error]: ${err.message}`));

  try {
    const userId = await login(page);
    if (userId) await forceCleanStuckDraws(userId);
    await ensureCleanSlate(page);
    await stepConfig(page);
    await stepTeams(page);

    for (let i = 0; i < MATCH_SCRIPT.length; i++) {
      await playMatch(page, i + 1, MATCH_SCRIPT[i]);

      // Se a fila acabou (menos de 2 times restantes), o app já chama
      // onReset() sozinho e volta pro dashboard — para o roteiro aqui.
      const backAtDashboard = !page.url().includes('/draw');
      if (backAtDashboard) {
        log('\n   ℹ️  A fila de times acabou antes do roteiro — app encerrou sozinho.');
        break;
      }
    }

    const stillInDraw = page.url().includes('/draw');
    if (stillInDraw) {
      await finishBabaDay(page);
    }

    log('\n✅✅✅ FLUXO AMPLIADO EXECUTADO — revise os avisos (⚠️) acima, se houver.');
    log(`   Times: ${TARGET_TEAMS} | Partidas jogadas: ${MATCH_SCRIPT.length} | Convidados alvo: ${TARGET_CONFIRMED}`);
  } catch (err) {
    log(`\n❌ FALHOU: ${err.message}`);
    await page.screenshot({ path: 'e2e-failure-full.png', fullPage: true }).catch(() => {});
    log('   Screenshot salvo em e2e-failure-full.png');
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();