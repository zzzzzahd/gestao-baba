// video-demo/e2e-video-demo-social.js
// ─────────────────────────────────────────────────────────────────────────────
// GRAVADOR DE VÍDEO — FUNÇÕES SOCIAIS — Draft Play
// ─────────────────────────────────────────────────────────────────────────────
// Roteiro NOVO e ISOLADO (não mexe em e2e/*.spec.js, playwright.config.js nem
// nos outros roteiros). Mostra o lado social do app:
//   1. Login
//   2. Meu perfil, com o contador de seguidores
//   3. Tela de seguidores / seguindo (alterna entre as duas abas)
//   4. Perfil público de outro jogador: seguir e deixar de seguir
//   5. Ranking
//
// SEGURANÇA DOS DADOS DE DEMONSTRAÇÃO:
//   A cena 4 deixa a relação de seguir EXATAMENTE como estava antes: se você já
//   seguia o jogador, deixa de seguir e volta a seguir; se não seguia, segue e
//   depois deixa de seguir. Nada é criado, editado ou apagado além disso.
//
// USO:
//   npm run video:demo:social
//
// Variáveis de ambiente (as mesmas dos outros roteiros — ver .env.example):
//   BASE_URL, DEMO_EMAIL / DEMO_PASSWORD (ou TEST_EMAIL / TEST_PASSWORD),
//   SUPABASE_SERVICE_ROLE_KEY (login sem captcha), DEMO_SPEED, VIDEO_FORMAT
//   e, só para a cena 4:
//   DEMO_FOLLOW_USER_ID  → id (uuid) de outro jogador cujo perfil será aberto.
//                           Sem ele a cena 4 é pulada.
//
// O vídeo final é salvo em video-demo/output/videos/social.webm e SUBSTITUI o
// da gravação anterior (a pasta não acumula versões).
// ─────────────────────────────────────────────────────────────────────────────

import { chromium } from 'playwright';
import {
  BASE_URL, DEMO_SPEED, VIDEO_FORMAT,
  VIEWPORTS, RECORD_SIZE, OUTPUT_DIR, VIDEO_DIR,
} from './demo-config.js';
import {
  log, sleep, injectFakeCursor, clickWithPause, waitForVisible,
  scrollSmoothly, ensureDir, runScene, dismissBlockingOverlays,
  finalizeVideo,
} from './demo-helpers.js';
import { login } from './demo-auth.js';

const FOLLOW_USER_ID = (process.env.DEMO_FOLLOW_USER_ID || '').trim();

const SOCIAL_SCENES = {
  myProfile:  true, // Meu perfil e contador de seguidores
  followers:  true, // Seguidores / seguindo
  publicProf: true, // Perfil público: seguir e deixar de seguir
  rankings:   true, // Ranking
};

// ── Cenas ────────────────────────────────────────────────────────────────

/** Abre o perfil do usuário logado e destaca o contador de seguidores. */
async function sceneMyProfile(page) {
  await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await dismissBlockingOverlays(page);
  await sleep(800);

  const followersLabel = page.getByText(/seguidores/i).first();
  if (!(await waitForVisible(followersLabel, 15000))) {
    throw new Error('Contador de "seguidores" não apareceu no perfil.');
  }
  await scrollSmoothly(page, followersLabel);
  await sleep(1200);
}

/** Abre a tela de seguidores (clicando no contador) e alterna as abas. */
async function sceneFollowers(page) {
  const followersLabel = page.getByText(/seguidores/i).first();
  if (await waitForVisible(followersLabel, 4000)) {
    await clickWithPause(page, followersLabel);
  }
  // Se o clique não levou à tela de seguidores, abre direto pela rota.
  if (!/\/followers/.test(page.url())) {
    await page.goto(`${BASE_URL}/followers`, { waitUntil: 'domcontentloaded' });
  }

  const tabFollowers = page.getByRole('button', { name: /^Seguidores/ });
  const tabFollowing = page.getByRole('button', { name: /^Seguindo\s*·/ });
  if (!(await waitForVisible(tabFollowers, 15000))) {
    throw new Error('Abas de seguidores não apareceram.');
  }
  await sleep(1500);

  await clickWithPause(page, tabFollowing);
  await sleep(1800);
  await clickWithPause(page, tabFollowers);
  await sleep(1500);
}

/**
 * Abre o perfil público de outro jogador e demonstra seguir / deixar de seguir.
 * Termina com a relação igual à que estava antes de começar.
 */
async function scenePublicProfile(page) {
  if (!FOLLOW_USER_ID) {
    log.skip('DEMO_FOLLOW_USER_ID não definido — defina o id de outro jogador no .env.local para gravar esta cena.');
    return;
  }

  await page.goto(`${BASE_URL}/player/${FOLLOW_USER_ID}`, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await dismissBlockingOverlays(page);

  const followBtn = page.getByRole('button', { name: /^(Seguir|Seguindo)$/ }).first();
  if (!(await waitForVisible(followBtn, 15000))) {
    throw new Error('Botão Seguir/Seguindo não apareceu (o id é de outro jogador? você está logado?).');
  }
  await sleep(1500);

  // Duas trocas: o estado final é o mesmo do inicial.
  for (let i = 0; i < 2; i += 1) {
    const before = ((await followBtn.textContent()) || '').trim();
    await clickWithPause(page, followBtn, { pauseAfter: 400 });
    const expected = before === 'Seguir' ? 'Seguindo' : 'Seguir';
    const changed = page.getByRole('button', { name: new RegExp(`^${expected}$`) }).first();
    if (!(await waitForVisible(changed, 8000))) {
      throw new Error(`O botão não mudou de "${before}" para "${expected}".`);
    }
    await sleep(1600);
  }
}

/** Mostra o ranking. */
async function sceneRankings(page) {
  await page.goto(`${BASE_URL}/rankings`, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await dismissBlockingOverlays(page);
  await sleep(1500);
  await page.mouse.wheel(0, 600);
  await sleep(1500);
  await page.mouse.wheel(0, -600);
  await sleep(1200);
}

// ── Fluxo principal ──────────────────────────────────────────────────────

async function main() {
  ensureDir(OUTPUT_DIR);
  ensureDir(VIDEO_DIR);

  const viewport = VIEWPORTS[VIDEO_FORMAT] || VIEWPORTS.vertical;
  const recordSize = RECORD_SIZE[VIDEO_FORMAT] || RECORD_SIZE.vertical;

  console.log('========================================');
  console.log('DRAFT PLAY — VIDEO DEMO (FUNÇÕES SOCIAIS)');
  console.log('========================================');
  console.log(`URL base:      ${BASE_URL}`);
  console.log(`Velocidade:    ${DEMO_SPEED}`);
  console.log(`Formato:       ${VIDEO_FORMAT} (${recordSize.width}x${recordSize.height})`);
  console.log(`Perfil alvo:   ${FOLLOW_USER_ID ? 'definido (DEMO_FOLLOW_USER_ID)' : 'não definido — a cena 4 será pulada'}`);
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

  if (SOCIAL_SCENES.myProfile) {
    results.push(await runScene(page, { number: 2, title: 'MEU PERFIL E SEGUIDORES' }, () => sceneMyProfile(page)));
  }
  if (SOCIAL_SCENES.followers) {
    results.push(await runScene(page, { number: 3, title: 'SEGUIDORES E SEGUINDO' }, () => sceneFollowers(page)));
  }
  if (SOCIAL_SCENES.publicProf) {
    results.push(await runScene(page, { number: 4, title: 'PERFIL PÚBLICO — SEGUIR', optional: true }, () => scenePublicProfile(page)));
  }
  if (SOCIAL_SCENES.rankings) {
    results.push(await runScene(page, { number: 5, title: 'RANKING', optional: true }, () => sceneRankings(page)));
  }

  await sleep(1500);
  await context.close();
  await browser.close();
  const finalVideo = await finalizeVideo(page, 'social'); // mantém só o último vídeo

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
  console.log(finalVideo
    ? `Arquivo: ${finalVideo}`
    : 'Nenhum arquivo de vídeo gerado — verifique permissões de disco.');
  console.log(`Cenas concluídas: ${okCount}/${results.length}`);
  console.log('========================================\n');
}

main().catch((err) => {
  console.error('\n[VIDEO DEMO] ✗ ERRO FATAL:', err);
  process.exit(1);
});
