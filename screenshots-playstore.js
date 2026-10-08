/**
 * screenshots-playstore.js
 * -------------------------------------------------------
 * Tira prints das principais telas do Draft Play (gestao-baba)
 * já no tamanho recomendado pela Google Play Store, e salva
 * tudo em ./screenshots/ pronto pra subir no Play Console.
 *
 * Login sem captcha (mesmo método do video-demo/demo-auth.js):
 *   1. SERVICE ROLE KEY gera um magic link (API admin do Supabase)
 *   2. ANON KEY troca o token por uma sessão real (verifyOtp)
 *   3. A sessão é injetada no localStorage (sb-<project-ref>-auth-token)
 *
 * Variáveis (ambiente, .env.local ou .env na pasta do projeto):
 *   SUPABASE_URL (ou VITE_SUPABASE_URL)
 *   SUPABASE_ANON_KEY (ou VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY)
 *   SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SERVICE_KEY / SUPABASE_SECRET_KEY)
 *   DEMO_EMAIL (ou TEST_EMAIL)
 *   SCREENSHOT_THEME=dark|light (padrão: dark)
 *
 * ATENÇÃO: a service role key nunca deve ir para o front-end nem para o Git.
 */

import { chromium, devices } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Carrega .env.local e .env (sem sobrescrever o que já está no ambiente) ----------
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    let value = m[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
for (const dir of new Set([process.cwd(), __dirname])) {
  loadEnvFile(path.join(dir, '.env.local'));
  loadEnvFile(path.join(dir, '.env'));
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.DEMO_EMAIL || process.env.TEST_EMAIL || 'draftplayapp@gmail.com';
const THEME = process.env.SCREENSHOT_THEME === 'light' ? 'light' : 'dark';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  '';

// Adicione aqui IDs válidos do seu banco se quiser tirar print do torneio e perfil público
const TOURNAMENT_ID = process.env.TOURNAMENT_ID || '';
const TOURNAMENT_MATCH_ID = process.env.TOURNAMENT_MATCH_ID || '';
const PUBLIC_USER_ID = process.env.PUBLIC_USER_ID || '';

const OUT_DIR = path.join(__dirname, 'screenshots');
const DEVICE = devices['Pixel 7'];

const DEMO_VISITOR_PLAYERS = [
  { id: 1, name: 'Lucas', position: 'linha', stars: 3 },
  { id: 2, name: 'Rafael', position: 'linha', stars: 2 },
  { id: 3, name: 'Bruno', position: 'goleiro', stars: 3 },
  { id: 4, name: 'Diego', position: 'linha', stars: 1 },
  { id: 5, name: 'Marcos', position: 'linha', stars: 2 },
  { id: 6, name: 'Felipe', position: 'linha', stars: 3 },
  { id: 7, name: 'André', position: 'goleiro', stars: 2 },
  { id: 8, name: 'Thiago', position: 'linha', stars: 2 },
];

const DEMO_VISITOR_TEAMS = [
  {
    id: 1001,
    name: 'TIME A',
    starSum: 8,
    players: [
      { id: 3, name: 'Bruno', position: 'goleiro', stars: 3 },
      { id: 1, name: 'Lucas', position: 'linha', stars: 3 },
      { id: 5, name: 'Marcos', position: 'linha', stars: 2 },
    ],
  },
  {
    id: 1002,
    name: 'TIME B',
    starSum: 6,
    players: [
      { id: 7, name: 'André', position: 'goleiro', stars: 2 },
      { id: 6, name: 'Felipe', position: 'linha', stars: 3 },
      { id: 2, name: 'Rafael', position: 'linha', stars: 2 },
    ],
  },
];

const DEMO_VISITOR_RESERVES = [
  { id: 4, name: 'Diego', position: 'linha', stars: 1 },
  { id: 8, name: 'Thiago', position: 'linha', stars: 2 },
];

const PUBLIC_ROUTES = [
  { path: '/', name: '01-landing' },
  { path: '/login', name: '02-login' },
];

const VISITOR_ROUTES = [
  {
    path: '/visitor',
    name: '03-modo-visitante-balanceamento',
    before: (page) =>
      page.evaluate((players) => {
        localStorage.setItem('visitor_players_list', JSON.stringify(players));
      }, DEMO_VISITOR_PLAYERS),
  },
  {
    path: '/visitor-match',
    name: '04-modo-visitante-partida',
    before: (page) =>
      page.evaluate(
        ({ teams, reserves }) => {
          localStorage.setItem('temp_teams', JSON.stringify(teams));
          localStorage.setItem('temp_reserves', JSON.stringify(reserves));
        },
        { teams: DEMO_VISITOR_TEAMS, reserves: DEMO_VISITOR_RESERVES }
      ),
  },
];

const PRIVATE_ROUTES = [
  { path: '/home', name: '05-home' },
  { path: '/dashboard', name: '06-dashboard' },
  { path: '/draw', name: '07-sorteio-times' },
  { path: '/rankings', name: '08-rankings' },
  { path: '/history', name: '09-historico' },
  { path: '/financial', name: '10-financeiro' },
  { path: '/comparison?a=5fcc8d68-ae52-4daa-9905-a96527818f68&b=5201b579-02fc-4e19-9fff-88d362de1774', name: '11-comparacao' },
  { path: '/profile', name: '12-perfil' },
];

function buildIdDependentRoutes() {
  const routes = [];
  if (TOURNAMENT_ID) {
    routes.push({ path: `/torneio/${TOURNAMENT_ID}`, name: '13-torneio' });
  } else {
    console.log('⚠️  TOURNAMENT_ID não definido — pulando print do Modo Torneio.');
  }
  if (TOURNAMENT_ID && TOURNAMENT_MATCH_ID) {
    routes.push({
      path: `/torneio/${TOURNAMENT_ID}/partida/${TOURNAMENT_MATCH_ID}`,
      name: '14-torneio-partida',
    });
  } else {
    console.log('⚠️  TOURNAMENT_MATCH_ID não definido — pulando print da partida do torneio.');
  }
  if (PUBLIC_USER_ID) {
    routes.push({ path: `/player/${PUBLIC_USER_ID}`, name: '15-perfil-publico' });
  } else {
    console.log('⚠️  PUBLIC_USER_ID não definido — pulando print do Perfil Público.');
  }
  return routes;
}

function ensureOutDir() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
}

function attachErrorLogger(page) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`   [Browser Error]: ${msg.text()}`);
  });
}

/** Evita popups de primeira visita e força o tema, em toda página aberta no contexto. */
async function applyAppFlags(context) {
  await context.addInitScript((theme) => {
    try {
      localStorage.setItem('draft_play_onboarding_done_v2', '1');
      localStorage.setItem('draft_play_beta_nps_shown', '1');
      localStorage.setItem('draft_play_theme', theme);
    } catch {
      /* origem sem localStorage (about:blank etc.) */
    }
  }, THEME);
}

/** Gera uma sessão válida sem senha e sem captcha (secret key + anon key). */
async function getAdminSession() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Faltam variáveis: SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY ' +
        '(defina no ambiente ou no .env.local da pasta do projeto).'
    );
  }

  const authOpts = { auth: { autoRefreshToken: false, persistSession: false } };

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, authOpts);
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: EMAIL,
  });
  if (linkError) {
    throw new Error(`Falha ao gerar magic link (confira a chave e se o e-mail ${EMAIL} existe): ${linkError.message}`);
  }

  const hashedToken = linkData?.properties?.hashed_token;
  if (!hashedToken) throw new Error('O Supabase não retornou hashed_token.');

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, authOpts);
  const { data: verifyData, error: verifyError } = await anon.auth.verifyOtp({
    token_hash: hashedToken,
    type: 'magiclink',
  });
  if (verifyError) throw new Error(`Falha ao trocar o token por sessão: ${verifyError.message}`);
  if (!verifyData?.session) throw new Error('verifyOtp não retornou sessão.');

  return verifyData.session;
}

/** Chave que o supabase-js usa por padrão: sb-<project-ref>-auth-token. */
function buildSupabaseStorageKey(supabaseUrl) {
  const match = supabaseUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/i);
  if (!match) throw new Error(`Não consegui extrair o project-ref de SUPABASE_URL: ${supabaseUrl}`);
  return `sb-${match[1]}-auth-token`;
}

/** Injeta a sessão no localStorage e confirma que o app abriu logado. */
async function login(page) {
  try {
    const session = await getAdminSession();
    const storageKey = buildSupabaseStorageKey(SUPABASE_URL);

    console.log(`🔑 Sessão criada para ${EMAIL}, injetando no app...`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);

    await page.evaluate(
      ([key, value]) => localStorage.setItem(key, value),
      [storageKey, JSON.stringify(session)]
    );
    await page.waitForTimeout(600);

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2500);

    const logged = !new URL(page.url()).pathname.includes('/login');
    console.log(logged ? `✅ Login efetuado! URL atual: ${page.url()}` : '❌ O app não reconheceu a sessão (voltou para /login).');
    return logged;
  } catch (err) {
    console.log(`❌ Login falhou: ${err.message}`);
    return false;
  }
}

async function shoot(page, route) {
  const url = `${BASE_URL}${route.path}`;
  console.log(`📸 ${route.name} -> ${url}`);
  try {
    if (route.before) {
      if (!page.url().startsWith(BASE_URL)) {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      }
      await route.before(page);
    }

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1500);

    const closeButtons = page.locator('[aria-label="Fechar"], [aria-label="Close"]');
    if (await closeButtons.count()) {
      await closeButtons.first().click().catch(() => {});
    }

    await page.screenshot({
      path: path.join(OUT_DIR, `${route.name}.png`),
      fullPage: false,
    });
  } catch (err) {
    console.log(`   ⚠️  Falhou em ${route.path}: ${err.message}`);
  }
}

(async () => {
  ensureOutDir();

  const browser = await chromium.launch({ headless: false });
  const contextOpts = { ...DEVICE, colorScheme: THEME, locale: 'pt-BR' };

  // ---------- Fase 1: telas públicas e visitante (contexto limpo, sem sessão) ----------
  const publicContext = await browser.newContext(contextOpts);
  await applyAppFlags(publicContext);
  const publicPage = await publicContext.newPage();
  attachErrorLogger(publicPage);

  for (const route of PUBLIC_ROUTES) {
    await shoot(publicPage, route);
  }
  for (const route of VISITOR_ROUTES) {
    await shoot(publicPage, route);
  }
  await publicContext.close();

  // ---------- Fase 2: telas privadas (sessão criada via Supabase Admin) ----------
  const privateContext = await browser.newContext(contextOpts);
  await applyAppFlags(privateContext);
  const page = await privateContext.newPage();
  attachErrorLogger(page);

  const logged = await login(page);
  if (logged) {
    for (const route of PRIVATE_ROUTES) {
      await shoot(page, route);
    }
    for (const route of buildIdDependentRoutes()) {
      await shoot(page, route);
    }
  } else {
    console.log('⚠️  Pulando captura das telas privadas devido à falha no login.');
  }

  await browser.close();
  console.log(`\n✅ Processo finalizado! Prints salvos em: ${OUT_DIR}`);
})();