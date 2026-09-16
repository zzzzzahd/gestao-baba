/**
 * e2e-match-flow.js
 * -------------------------------------------------------------------------
 * Teste E2E real do fluxo de partida do Draft Play (gestao-baba), rodando
 * contra um baba de teste, num navegador de verdade (Playwright).
 *
 * Cobre a prioridade #1 da lista de pendências:
 *   sortear → confirmar presença → jogar → gol → cartão → finalizar
 *   partida → próxima partida → encerrar o baba do dia
 *
 * COMO RODAR
 *   npm install -D playwright
 *   npm install @supabase/supabase-js
 *   BASE_URL=http://localhost:3000 \
 *   TEST_EMAIL=seu-baba-de-teste@email.com \
 *   SUPABASE_URL=https://SEU-PROJETO.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=xxxxx \
 *   SUPABASE_ANON_KEY=xxxxx \
 *   node e2e-match-flow.js
 *
 * MODAIS MAPEADOS (seletores exatos, não heurística de texto)
 *   PresenceCheckModal → "Confirmar e iniciar partida"
 *   PostGameScreen     → "Próxima partida →"
 *   WinnerPhotoModal   → "Pular por agora" (só aparece se já existe time
 *                        líder do dia — senão finishPhase pula direto pro MVP)
 *   DailyMVPScreen     → "Pular votação" (é o botão que de fato dispara
 *                        handleReallyFinish/finish_baba_day; "Revelar MVP"
 *                        só aparece se alguém já votou, então não é confiável
 *                        pra automação)
 *
 * PRÉ-REQUISITOS NO BABA DE TESTE
 *   - A conta de login precisa ser presidente (ou coordenador) de um baba.
 *   - NÃO precisa ter jogadores confirmados de antemão: o script usa a
 *     própria função de "Convidados" do StepConfig (StepConfig.jsx) pra
 *     entrar com jogadores avulsos até bater o mínimo — então funciona
 *     mesmo num baba totalmente vazio.
 *   - Se já existir uma sessão de sorteio ATIVA nesse baba, o script detecta
 *     (DrawPage pula direto pro step 3) e ENCERRA ela primeiro (via
 *     "Encerrar o baba de hoje") pra garantir um começo limpo — isso evita
 *     misturar dado de um teste anterior com o teste atual.
 *
 * LOGIN — via Admin API, sem tocar no formulário nem no navegador
 *   O Supabase Auth deste projeto exige captcha_token em /token (login por
 *   senha), e o Playwright não resolve Turnstile automaticamente — login
 *   pelo formulário trava com 400 e nunca sai de /login.
 *   O script usa a SERVICE ROLE KEY (só no Node, nunca no navegador) pra
 *   gerar um magic link via supabase.auth.admin.generateLink() — uma
 *   operação administrativa que nunca aciona o captcha — e então VERIFICA
 *   esse token inteiramente no Node (supabaseAnon.auth.verifyOtp), obtendo
 *   a sessão pronta (access_token + refresh_token) sem abrir nenhuma URL do
 *   GoTrue no navegador. A sessão é então escrita direto no localStorage da
 *   página via page.addInitScript(), antes da primeira navegação.
 *   Isso evita de propósito a alternativa mais óbvia (abrir o action_link
 *   do magic link no navegador) porque o GoTrue só honra a URL de retorno
 *   se ela estiver na allow-list de Redirect URLs do projeto — como só a
 *   URL de produção costuma estar liberada lá, abrir o link redireciona pra
 *   produção, e como localStorage é isolado por origem, a sessão se perde
 *   assim que o script navega de volta pro BASE_URL local. Verificar no
 *   Node e injetar direto evita esse problema por completo, e funciona com
 *   qualquer BASE_URL sem precisar mexer em nenhuma configuração no painel
 *   do Supabase.
 *   Requer `npm install @supabase/supabase-js` (se ainda não tiver) e as
 *   env vars SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + SUPABASE_ANON_KEY.
 *   A service role key fica em Project Settings → API no painel do Supabase
 *   — NUNCA commite essa chave, ela contorna todo o RLS. A anon key é a
 *   mesma chave pública que o front-end já usa (não é segredo).
 *
 *   Junto com a sessão, o mesmo addInitScript também marca como "já visto"
 *   os modais de primeiro acesso (onboarding, changelog, NPS do beta) — eles
 *   decidem se aparecem checando uma chave no localStorage, e como o
 *   Playwright cria um contexto de navegador zerado a cada execução, pro
 *   app é sempre "primeira vez logando". Sem isso, esses modais apareciam
 *   por cima da tela (1s/1.5s/3s depois do load) e bloqueavam silenciosamente
 *   os cliques do resto do script (o clique "achava" o botão mas o modal por
 *   cima interceptava, e o catch genérico do clickFirstMatch escondia o erro
 *   real).
 */

import { chromium, devices } from 'playwright';
import { createClient }      from '@supabase/supabase-js';

const BASE_URL          = process.env.BASE_URL  || 'http://localhost:3000';
const EMAIL             = process.env.TEST_EMAIL;
const SUPABASE_URL      = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY          = process.env.SUPABASE_ANON_KEY; // chave pública/anon — a mesma que o front-end já usa (VITE_SUPABASE_PUBLISHABLE_KEY no .env do app), não é segredo
const HEADLESS  = process.env.HEADLESS !== 'false'; // HEADLESS=false pra ver o navegador
const SLOWMO    = Number(process.env.SLOWMO || 0);

if (!EMAIL) {
  console.error('❌ Defina TEST_EMAIL antes de rodar.');
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error('❌ Defina SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_ANON_KEY antes de rodar (login via Admin API).');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Helpers genéricos ────────────────────────────────────────────────────

const log = (msg) => console.log(msg);

/** Espera um pouco — usado só onde animação/transição pode atrasar o DOM. */
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Tenta clicar no primeiro elemento visível que bata com qualquer um dos
 * textos/seletores da lista. Retorna true se clicou, false se não achou
 * nada (loga um aviso, não lança erro — deixa o fluxo seguir e o resto do
 * script decidir o que fazer).
 */
async function clickFirstMatch(page, candidates, { timeout = 4000, label = '' } = {}) {
  let lastError = null;
  for (const candidate of candidates) {
    try {
      const locator = candidate.startsWith('css=') || candidate.startsWith('text=')
        ? page.locator(candidate)
        : page.getByText(candidate, { exact: false });
      const el = locator.first();
      await el.waitFor({ state: 'visible', timeout });
      await el.click();
      log(`   ✅ ${label || 'clique'}: "${candidate}"`);
      return true;
    } catch (err) {
      lastError = err; // guarda o erro real em vez de descartar (era catch {} antes)
    }
  }
  log(`   ⚠️  ${label || 'clique'}: nenhum candidato encontrado (${candidates.join(' | ')})`);
  if (lastError) log(`      motivo real: ${lastError.message.split('\n')[0]}`);
  return false;
}

async function waitForAnyText(page, texts, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const t of texts) {
      if (await page.getByText(t, { exact: false }).first().isVisible().catch(() => false)) {
        return t;
      }
    }
    await pause(200);
  }
  return null;
}

// ─── Login: verifica o magic link no Node e injeta a sessão pronta ───────
// (bypassa o Turnstile/captcha do formulário E a lista de Redirect URLs do
// Supabase — a versão anterior abria o action_link no navegador, mas o
// GoTrue só honra o redirectTo se ele estiver na allow-list do projeto;
// como só a URL de produção estava liberada, o login "funcionava" mas
// terminava noutra origem — e como localStorage é isolado por origem, a
// sessão se perdia assim que o script navegava de volta pro BASE_URL local.
// Esta versão nunca abre nenhuma URL do GoTrue no navegador: verifica o
// token inteiramente no Node (supabaseAnon.auth.verifyOtp) e escreve a
// sessão resultante direto no localStorage da origem certa, ANTES da
// primeira navegação — funciona com qualquer BASE_URL, sem depender de
// nenhuma configuração no painel do Supabase.

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

  // Chave padrão que o @supabase/supabase-js usa pra guardar a sessão no
  // localStorage quando createClient() não define um "storageKey" próprio:
  // sb-<ref-do-projeto>-auth-token, onde <ref> é o subdomínio da SUPABASE_URL.
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
  const storageKey = `sb-${projectRef}-auth-token`;

  // addInitScript roda ANTES de qualquer script da página, em toda
  // navegação seguinte — então a sessão já está lá no primeiro load,
  // independente de qual origem o BASE_URL apontar.
  //
  // Junto com a sessão, marca como "já visto" os modais de primeiro acesso
  // (onboarding, changelog, NPS do beta) — eles decidem se aparecem checando
  // uma chave no localStorage (ex: draft_play_onboarding_done_v2), e como o
  // Playwright cria um contexto de navegador zerado a cada execução, pro app
  // é sempre "primeira vez logando" e esses modais aparecem por cima da tela
  // (1s/1.5s/3s depois do load) bloqueando os cliques do resto do script.
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
    throw new Error(
      `Ainda caiu em /login depois de injetar a sessão. A chave de storage usada foi "${storageKey}" ` +
      `(o padrão do @supabase/supabase-js) — se services/supabase.js definir um "storageKey" customizado ` +
      `no createClient(), me manda esse arquivo que eu ajusto a chave certa.`
    );
  }
  log(`✅ Login ok — URL atual: ${page.url()}`);
  return linkData.user?.id || otpData.session?.user?.id || null;
}

// ─── Passo -1: limpeza direta no banco de sessões de sorteio travadas ────
// O ensureCleanSlate() abaixo detecta sessão ativa pela UI (texto "Encerrar
// o baba de hoje"), mas isso tem uma corrida: se o DrawPage ainda estiver
// esperando a query assíncrona de sessão ativa (checkingSession/sessionChecked)
// no instante em que o script olha a tela, ele conclui "nenhuma sessão ativa"
// errado. Isso já deixou pra trás um draw_results 'active' com só 1 time
// (inválido — precisa de 2+ pra virar partida), que bloqueia qualquer sorteio
// novo com "duplicate key value violates unique constraint
// idx_draw_results_one_active_per_baba". Como o script já tem a Service Role
// Key, é mais confiável checar direto no banco antes de começar.
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
    // WinnerPhotoModal (só aparece se já existe um time líder do dia) —
    // "Pular por agora" chama onClose, que avança pro MVP.
    await clickFirstMatch(page, ['Pular por agora'], { label: 'pular foto do vencedor', timeout: 3000 });
    await pause(800);
    // DailyMVPScreen — "Pular votação" é o botão que de fato chama
    // handleReallyFinish (a RPC finish_baba_day só roda aqui, não antes).
    await clickFirstMatch(page, ['Pular votação'], { label: 'pular MVP (finaliza o dia de verdade)', timeout: 3000 });
    await pause(1500);
  } else {
    log('   ✅ Nenhuma sessão ativa — pode começar do zero.');
  }
}

// ─── Passo 1: Config (StepConfig) — garantir confirmados e sortear ───────

async function stepConfig(page) {
  log('\n1️⃣  STEP CONFIG — ajustando mínimo de jogadores e sorteando...');
  await page.goto(`${BASE_URL}/draw`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Reduz "Jogadores por time" pro mínimo (2) — clicando no botão "−" várias
  // vezes — assim minRequired cai pra 4, exigindo o menor número possível
  // de convidados avulsos pra liberar o sorteio.
  const minusBtn = page.getByRole('button', { name: '−' }).first();
  for (let i = 0; i < 10; i++) {
    if (!(await minusBtn.isVisible().catch(() => false))) break;
    await minusBtn.click().catch(() => {});
    await pause(150);
  }

  // Lê quantos já estão confirmados — sobe do label exato "Confirmados" até
  // a linha (div flex justify-between) que também contém o número, em vez
  // de usar um seletor genérico de div (que pegaria a div mais externa da
  // página, não o card específico). Isso evita pegar por engano o "1"
  // escondido do Stepper lá em cima (Config/Times/Partida), que também é só
  // dígito e vem antes no DOM — foi o que causava contar 1 confirmado a
  // mais do que o real.
  const confirmedLabel = page.getByText('Confirmados', { exact: true }).first();
  const confirmedRow   = confirmedLabel.locator('xpath=../..');
  const confirmedText  = await confirmedRow.locator('span.tabular-nums').first().textContent().catch(() => null);
  let confirmedCount = Number(confirmedText) || 0;
  log(`   Confirmados atuais: ${confirmedCount}`);

  // Abre a seção de convidados e adiciona em loop até o botão "Sortear
  // Times" ficar habilitado de verdade — mais robusto que pré-calcular
  // quantos faltam (não depende de nenhuma leitura de contador na tela).
  const sortearBtnCheck = page.getByText('Sortear Times', { exact: false }).first();
  const isEnabled = async () =>
    !(await sortearBtnCheck.evaluate((el) => el.closest('button')?.disabled).catch(() => true));

  if (!(await isEnabled())) {
    await clickFirstMatch(page, [/Convidados/i.source ? 'Convidados' : 'Convidados'], { label: 'abrir seção Convidados' });
    await pause(500);

    const MAX_GUESTS = 12; // trava de segurança — nunca deve chegar perto disso
    for (let i = 0; i < MAX_GUESTS && !(await isEnabled()); i++) {
      await clickFirstMatch(page, ['+ Adicionar convidado', 'Adicionar convidado'], { label: `adicionar convidado #${i + 1}` });
      await pause(800);
    }

    if (!(await isEnabled())) {
      throw new Error(`Sortear Times continua desabilitado mesmo depois de ${MAX_GUESTS} convidados — algo além do mínimo de confirmados está bloqueando.`);
    }
  }

  // Clica em "Sortear Times" (já sabemos que está habilitado, confirmado no loop acima)
  await sortearBtnCheck.click();
  log('   ✅ Sorteio disparado.');
  await pause(1500);
}

// ─── Passo 2: Times (StepTeams) — iniciar partida ────────────────────────

async function stepTeams(page) {
  log('\n2️⃣  STEP TEAMS — iniciando a partida...');

  const started = await clickFirstMatch(page, ['Ir pra partida ao vivo'], {
    label: 'já havia partida em andamento', timeout: 2000,
  });

  if (!started) {
    await clickFirstMatch(page, ['Iniciar Partida'], { label: 'iniciar partida' });
    await pause(1000);

    // PresenceCheckModal — como ninguém foi marcado como falta/atraso (todo
    // mundo fica "Presente" por padrão), o botão único do modal já confirma
    // e inicia a partida direto (sem chamada de substituição).
    const confirmedPresence = await clickFirstMatch(
      page,
      ['Confirmar e iniciar partida'],
      { label: 'confirmar presença e iniciar partida', timeout: 3000 }
    );
    if (!confirmedPresence) {
      log('   ℹ️  Nenhum modal de presença apareceu — seguindo (pode já ter partida em andamento).');
    }
  }

  await pause(1500);
}

// ─── Passo 3: Match (StepMatch) — cronômetro, gol, cartão, finalizar ─────

async function stepMatchGoalAndCard(page) {
  log('\n3️⃣  STEP MATCH — cronômetro, gol e cartão...');

  await clickFirstMatch(page, ['Iniciar Cronômetro'], { label: 'iniciar cronômetro' });
  await pause(500);

  // GOL pro Time A: clica no placar do time A (o número dentro do botão de gol)
  const scoreButtons = page.locator('button.text-5xl.font-black.tabular-nums');
  await scoreButtons.first().click();
  log('   ✅ Modal de gol aberto (Time A).');
  await pause(500);

  // Seleciona o primeiro jogador disponível no <select> "Quem fez o gol?"
  const scorerSelect = page.locator('select').first();
  await scorerSelect.waitFor({ state: 'visible', timeout: 5000 });
  const options = await scorerSelect.locator('option').all();
  if (options.length > 1) {
    const value = await options[1].getAttribute('value');
    await scorerSelect.selectOption(value);
  }
  await clickFirstMatch(page, ['Confirmar'], { label: 'confirmar gol' });
  log('   ✅ Gol registrado pro Time A (placar deve estar 1x0).');
  await pause(1000);

  // CARTÃO pro Time A
  await clickFirstMatch(page, ['Cartão'], { label: 'abrir modal de cartão' });
  await pause(500);
  const cardSelect = page.locator('select').first();
  const cardOptions = await cardSelect.locator('option').all();
  if (cardOptions.length > 1) {
    const value = await cardOptions[1].getAttribute('value');
    await cardSelect.selectOption(value);
  }
  await clickFirstMatch(page, ['Amarelo'], { label: 'selecionar cartão amarelo' });
  await clickFirstMatch(page, ['Confirmar'], { label: 'confirmar cartão' });
  log('   ✅ Cartão amarelo registrado.');
  await pause(1000);
}

async function finishMatchAndAdvance(page) {
  log('\n   Finalizando a partida (placar 1x0 — sem empate, sem modal de par-ou-ímpar)...');
  await clickFirstMatch(page, ['Finalizar Partida'], { label: 'finalizar partida' });
  await pause(1500);

  // PostGameScreen — "Próxima partida →" chama onClose, que dispara
  // continueAfterMatch(pendingQueue) no StepMatch.
  const advanced = await clickFirstMatch(
    page,
    ['Próxima partida'],
    { label: 'avançar da tela pós-jogo', timeout: 5000 }
  );
  if (!advanced) {
    log('   ⚠️  Não achei o botão "Próxima partida →" — pode estar preso na tela pós-jogo.');
  }
  await pause(1500);
}

// ─── Passo 4: encerrar o baba do dia ──────────────────────────────────────

async function finishBabaDay(page) {
  log('\n4️⃣  ENCERRANDO O BABA DO DIA...');
  await clickFirstMatch(page, ['Encerrar o baba de hoje'], { label: 'abrir modal de encerrar baba' });
  await pause(500);
  await clickFirstMatch(page, ['css=button.bg-red-500:has-text("Encerrar")'], { label: 'confirmar encerramento' });
  await pause(1200);

  // WinnerPhotoModal (só se já tem time líder do dia) — "Pular por agora"
  // avança pra fase de MVP sem precisar tirar/subir foto nenhuma.
  await clickFirstMatch(page, ['Pular por agora'], { label: 'pular foto do vencedor', timeout: 4000 });
  await pause(800);

  // DailyMVPScreen — "Pular votação" é o único caminho garantido de chegar
  // em handleReallyFinish sem depender de ter voto registrado (o botão
  // "Revelar MVP" só aparece se alguém votou). É aqui que finish_baba_day
  // roda de verdade.
  await clickFirstMatch(page, ['Pular votação'], { label: 'pular MVP (finaliza o dia de verdade)', timeout: 4000 });

  // Sucesso esperado: onReset() navega de volta pro dashboard e sai do /draw
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
    await stepMatchGoalAndCard(page);
    await finishMatchAndAdvance(page);

    // Volta pra tela de partida (nova partida já deve estar carregada) e
    // finaliza ela também, direto, sem gol/cartão, só pra exercitar
    // "próxima partida" -> "encerrar o dia" de ponta a ponta.
    await pause(1000);
    const stillOnMatch = await page.getByText('Finalizar Partida', { exact: false }).first().isVisible().catch(() => false);
    if (stillOnMatch) {
      log('\n   Segunda partida carregada — finalizando também (empate 0x0 é esperado aqui, cobre o modal de par-ou-ímpar).');
      await clickFirstMatch(page, ['Finalizar Partida'], { label: 'finalizar 2ª partida' });
      await pause(1000);
      // Se empatar (0x0), aparece o modal de par-ou-ímpar — escolhe qualquer um dos dois times.
      const tieModal = await clickFirstMatch(page, ['css=.fixed button:has-text("Time")'], {
        label: 'resolver par-ou-ímpar', timeout: 3000,
      });
      if (tieModal) await pause(1000);
      await clickFirstMatch(page, ['Próxima partida'], { label: 'avançar pós-jogo (2ª partida)' });
      await pause(1000);
    }

    await finishBabaDay(page);

    log('\n✅✅✅ FLUXO COMPLETO EXECUTADO — revise os avisos (⚠️) acima, se houver.');
  } catch (err) {
    log(`\n❌ FALHOU: ${err.message}`);
    await page.screenshot({ path: 'e2e-failure.png', fullPage: true }).catch(() => {});
    log('   Screenshot salvo em e2e-failure.png');
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();