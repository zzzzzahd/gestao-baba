/**
 * screenshots-playstore.js
 * -------------------------------------------------------
 * Tira prints das principais telas do Draft Play (gestao-baba)
 * já no tamanho recomendado pela Google Play Store, e salva
 * tudo em ./screenshots/ pronto pra subir no Play Console.
 */

import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Definição dos valores padrão para evitar passar por $env toda vez
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.TEST_EMAIL || 'draftplayapp@gmail.com';
const PASSWORD = process.env.TEST_PASSWORD || 'DraftPlay#Teste2026';

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
  { path: '/comparison', name: '11-comparacao' },
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

async function ensureOutDir() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function login(page) {
  if (!EMAIL || !PASSWORD) {
    console.log('⚠️  EMAIL ou PASSWORD não definidos — pulando login.');
    return false;
  }

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`   [Browser Error]: ${msg.text()}`);
  });

  console.log(`🔑 Tentando autenticar em ${BASE_URL}/login com: ${EMAIL}...`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  try {
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="senha" i]').first();

    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.click();
    await emailInput.fill(EMAIL);

    await passInput.click();
    await passInput.fill(PASSWORD);

    console.log('⏳ Enviando formulário de login...');
    await passInput.press('Enter');

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    await page.waitForTimeout(2000);

    console.log(`✅ Login efetuado! URL atual: ${page.url()}`);
    return true;
  } catch (err) {
    console.log(`❌ Login falhou — a página não saiu de /login. URL atual: ${page.url()}`);
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
    await page.waitForTimeout(1200);

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
  await ensureOutDir();

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ ...DEVICE });
  const page = await context.newPage();

  for (const route of PUBLIC_ROUTES) {
    await shoot(page, route);
  }

  for (const route of VISITOR_ROUTES) {
    await shoot(page, route);
  }

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