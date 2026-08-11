/**
 * screenshots-playstore.js
 * -------------------------------------------------------
 * Tira prints das principais telas do Draft Play (gestao-baba)
 * já no tamanho recomendado pela Google Play Store, e salva
 * tudo em ./screenshots/ pronto pra subir no Play Console.
 *
 * COMO USAR
 * 1) Instalar dependências (uma vez só):
 *      npm install -D playwright
 *      npx playwright install chromium
 *
 * 2) Ter um usuário de teste já cadastrado no app (com pelo
 *    menos 1 baba criado, pra Home/Dashboard não ficarem vazios).
 *
 * 3) (Opcional, pra telas de Torneio e Perfil Público) — crie
 *    um torneio de teste e pegue os IDs direto da URL do navegador:
 *      - abra /torneio/<ID>            -> copie o <ID>          -> TOURNAMENT_ID
 *      - abra /torneio/<ID>/partida/<M> -> copie o <M>          -> TOURNAMENT_MATCH_ID
 *      - abra /player/<USER_ID> de algum perfil público          -> PUBLIC_USER_ID
 *    Se não definir essas variáveis, o script simplesmente pula
 *    essas 3 telas e avisa no terminal.
 *
 * 4) Rodar o app (localmente ou usar a URL de produção) e
 *    definir as variáveis de ambiente antes de rodar o script.
 *    No PowerShell (Windows):
 *
 *      $env:BASE_URL="http://localhost:5173"
 *      $env:TEST_EMAIL="seuemail@teste.com"
 *      $env:TEST_PASSWORD="suasenha"
 *      $env:TOURNAMENT_ID="uuid-do-torneio"
 *      $env:TOURNAMENT_MATCH_ID="uuid-da-partida"
 *      $env:PUBLIC_USER_ID="uuid-do-usuario"
 *      node screenshots-playstore.js
 *
 * 5) Os arquivos aparecem em ./screenshots/, numerados na ordem
 *    que a Play Store costuma exibir (a primeira imagem é a
 *    "capa" da galeria, então a ordem dos arquivos importa).
 *
 * IMPORTANTE — sobre o login (corrigido):
 * Antes, se o login falhasse silenciosamente (senha errada, sessão
 * expirada, erro do Supabase etc.), o script seguia em frente
 * achando que estava autenticado e acabava fotografando a tela de
 * /login repetida com o nome de cada rota privada. Agora o script
 * verifica de verdade se a navegação pra área logada aconteceu, e
 * também confere antes de CADA print privado — se a sessão cair no
 * meio do processo, ele avisa e pula em vez de salvar print errado.
 * -------------------------------------------------------
 */

import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Utilitário para resolver __dirname dentro de ES Modules (type: module)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const EMAIL = process.env.TEST_EMAIL || '';
const PASSWORD = process.env.TEST_PASSWORD || '';
const TOURNAMENT_ID = process.env.TOURNAMENT_ID || '';
const TOURNAMENT_MATCH_ID = process.env.TOURNAMENT_MATCH_ID || '';
const PUBLIC_USER_ID = process.env.PUBLIC_USER_ID || '';
const OUT_DIR = path.join(__dirname, 'screenshots');

// Dispositivo usado para simular um celular real (tamanho de tela,
// device scale factor, user agent). O Playwright já traz esse preset.
// Pixel 7 dá uma imagem 1080x2340 aprox, que está dentro do range
// aceito pela Play Store (mín. 320px, máx. 3840px, proporção 16:9–9:16).
const DEVICE = devices['Pixel 7'];

// Dados de demonstração usados no Modo Visitante (gravados direto no
// localStorage, do mesmo jeito que o app grava quando o usuário
// preenche o formulário e clica em "Sortear"). Isso evita ter que
// simular clique em cada campo e garante telas sempre preenchidas.
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

// Telas públicas (não precisam de login)
const PUBLIC_ROUTES = [
  { path: '/', name: '01-landing' },
  { path: '/login', name: '02-login' },
];

// Modo visitante — pré-carrega dados de exemplo no localStorage
// pra tela não aparecer vazia.
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

// Telas protegidas (precisam estar logado)
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

// Telas que dependem de um ID real (torneio, partida de torneio,
// perfil público). Só entram na lista se a variável de ambiente
// correspondente foi definida.
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

// Considera "logado" só se a URL atual está numa rota que exige auth
// (não é mais /login nem /). Usado tanto logo após o login quanto
// como checagem de segurança antes de cada print privado.
function looksAuthenticated(page) {
  const url = page.url();
  return !url.includes('/login') && (url.includes('/home') || url.includes('/dashboard') || !url.endsWith('/'));
}

async function login(page) {
  if (!EMAIL || !PASSWORD) {
    console.log('⚠️  TEST_EMAIL/TEST_PASSWORD não definidos — pulando login e telas protegidas.');
    return false;
  }
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

  // Ajuste os seletores abaixo se os campos do seu LoginPage.jsx
  // tiverem outro name/placeholder/id.
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passInput = page.locator('input[type="password"], input[name="password"]').first();

  await emailInput.fill(EMAIL);
  await passInput.fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();

  // Antes: waitForURL tinha .catch(() => {}) e a função retornava
  // true de qualquer jeito. Agora, se a navegação falhar, tratamos
  // como falha de verdade e abortamos as telas privadas.
  try {
    await page.waitForURL(/\/home|\/dashboard/, { timeout: 15000 });
  } catch {
    // Segunda checagem: às vezes a URL muda mas não bate exatamente
    // no regex (ex: querystring). Confere pelo estado real da página.
    if (!looksAuthenticated(page)) {
      const errorText = await page
        .locator('[role="alert"], .error, [class*="error"]')
        .first()
        .textContent()
        .catch(() => null);
      console.log(
        `❌ Login falhou — a página não saiu de /login. ${
          errorText ? `Mensagem encontrada: "${errorText.trim()}"` : 'Confira TEST_EMAIL/TEST_PASSWORD.'
        }`
      );
      return false;
    }
  }

  await page.waitForTimeout(1500); // dá tempo do Supabase/contexto carregar

  if (!looksAuthenticated(page)) {
    console.log('❌ Login falhou — ainda na tela de login depois da tentativa. Pulando telas protegidas.');
    return false;
  }

  return true;
}

async function shoot(page, route, { requiresAuth = false } = {}) {
  const url = `${BASE_URL}${route.path}`;
  console.log(`📸 ${route.name} -> ${url}`);
  try {
    if (route.before) {
      // Garante que já estamos na origem certa antes de mexer no localStorage
      if (!page.url().startsWith(BASE_URL)) {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      }
      await route.before(page);
    }

    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(800); // animações/transições terminarem

    // Se a rota exige login e a gente acabou voltando pra /login (sessão
    // caiu, cookie expirou etc.), NÃO salva o print — só avisa e pula.
    // É essa checagem que faltava e causava os prints duplicados da tela
    // de login com nome de rota errado.
    if (requiresAuth && page.url().includes('/login')) {
      console.log(`   ⚠️  Redirecionado pra /login em vez de ${route.path} — sessão inválida, pulando print.`);
      return;
    }

    // Fecha modais comuns (cookie banner, prompt de instalar PWA etc.)
    // se existirem na tela — ignora se não existir.
    const closeButtons = page.locator('[aria-label="Fechar"], [aria-label="Close"]');
    if (await closeButtons.count()) {
      await closeButtons.first().click().catch(() => {});
    }

    await page.screenshot({
      path: path.join(OUT_DIR, `${route.name}.png`),
      fullPage: false, // print do viewport (o que aparece na tela do celular)
    });
  } catch (err) {
    console.log(`   ⚠️  Falhou em ${route.path}: ${err.message}`);
  }
}

(async () => {
  await ensureOutDir();

  const browser = await chromium.launch();
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
      await shoot(page, route, { requiresAuth: true });
    }
    for (const route of buildIdDependentRoutes()) {
      await shoot(page, route, { requiresAuth: true });
    }
  } else {
    console.log('\n⚠️  Login não confirmado — telas protegidas (05 a 15) não foram fotografadas.');
  }

  await browser.close();
  console.log(`\n✅ Prints salvos em: ${OUT_DIR}`);
})();
