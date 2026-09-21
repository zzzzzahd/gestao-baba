// video-demo/demo-helpers.js
// ─────────────────────────────────────────────────────────────────────────────
// Funções auxiliares para o gravador de vídeo promocional.
// Nada aqui toca no código do app — só orquestra o Playwright de um jeito
// que pareça uso humano em vez de teste automatizado.
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { SPEED, SCREENSHOT_DIR } from './demo-config.js';

// ── Log padronizado ──────────────────────────────────────────────────────────

export const log = {
  scene(n, title) {
    console.log(`\n[VIDEO DEMO] Cena ${String(n).padStart(2, '0')} — ${title}`);
  },
  ok(msg = 'OK') {
    console.log(`[VIDEO DEMO] ✓ ${msg}`);
  },
  skip(msg) {
    console.log(`[VIDEO DEMO] ↷ Pulada: ${msg}`);
  },
  error(msg) {
    console.log(`[VIDEO DEMO] ✗ ERRO: ${msg}`);
  },
  info(msg) {
    console.log(`[VIDEO DEMO] ${msg}`);
  },
};

// ── Tempo ────────────────────────────────────────────────────────────────────

/** Pausa em ms, já ajustada pelo multiplicador de DEMO_SPEED. */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.round(ms * SPEED)));

// ── Cursor falso e visível ───────────────────────────────────────────────────
// O Playwright move o mouse "de verdade" (dispara mousemove real), mas o
// cursor do SO não aparece na gravação. Isso injeta um cursor visual que
// segue os eventos mousemove reais da página — assim a gravação mostra
// exatamente para onde o "usuário" está apontando.
export async function injectFakeCursor(page) {
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      const cursor = document.createElement('div');
      cursor.id = '__demo_cursor__';
      Object.assign(cursor.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        background: 'rgba(0, 242, 255, 0.55)',
        border: '2px solid rgba(0, 242, 255, 0.9)',
        boxShadow: '0 0 12px rgba(0, 242, 255, 0.8)',
        pointerEvents: 'none',
        zIndex: '2147483647',
        transform: 'translate(-50%, -50%)',
        transition: 'left 60ms linear, top 60ms linear',
        display: 'none',
      });
      document.documentElement.appendChild(cursor);

      const showAt = (x, y) => {
        cursor.style.display = 'block';
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
      };

      document.addEventListener('mousemove', (e) => showAt(e.clientX, e.clientY), { passive: true });

      window.__demoCursorClick = (x, y) => {
        showAt(x, y);
        cursor.style.transform = 'translate(-50%, -50%) scale(0.7)';
        cursor.style.background = 'rgba(0, 242, 255, 0.9)';
        setTimeout(() => {
          cursor.style.transform = 'translate(-50%, -50%) scale(1)';
          cursor.style.background = 'rgba(0, 242, 255, 0.55)';
        }, 180);
      };
    });
  });
}

// ── Movimento e clique "humanos" ─────────────────────────────────────────────

/** Move o mouse até o centro do elemento em vários passos, com pausa antes de clicar. */
export async function moveMouse(page, locator) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const box = await locator.boundingBox();
  if (!box) throw new Error('Elemento sem posição visível (boundingBox nulo)');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps: Math.max(15, Math.round(20 / SPEED)) });
  return { x, y };
}

/** Move até o elemento, pausa, clica, e destaca visualmente o clique. */
export async function clickWithPause(page, locator, { pauseBefore = 350, pauseAfter = 600 } = {}) {
  const { x, y } = await moveMouse(page, locator);
  await sleep(pauseBefore);
  await page.evaluate(([px, py]) => window.__demoCursorClick?.(px, py), [x, y]);
  await locator.click();
  await sleep(pauseAfter);
}

/** Digita devagar, caractere a caractere, como uma pessoa digitando. */
export async function typeSlowly(page, locator, text, { delay = 90 } = {}) {
  await moveMouse(page, locator);
  await locator.click();
  await sleep(150);
  await locator.pressSequentially(text, { delay: Math.round(delay * SPEED) });
}

/** Espera um elemento (por locator) ficar visível, com timeout customizável. Retorna true/false. */
export async function waitForVisible(locator, timeout = 8000) {
  try {
    await locator.waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/** Rola a página suavemente até um elemento, em vez de pular direto. */
export async function scrollSmoothly(page, locator) {
  await locator.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  await page.evaluate((el) => {
    el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, await locator.elementHandle().catch(() => null));
  await sleep(500);
}

/**
 * Fecha modais que aparecem por cima de tudo e bloqueiam cliques —
 * ModeSelector ("Como vocês jogam?", sem botão de pular — só de confirmar)
 * e qualquer modal com botão de fechar via aria-label (InstallAppModal, etc.).
 * O OnboardingModal é evitado antes mesmo de aparecer (ver login() no
 * e2e-video-demo.js, que já marca o onboarding como visto).
 */
export async function dismissBlockingOverlays(page) {
  const modeSelectorTitle = page.getByText('Como vocês jogam?', { exact: false }).first();
  if (await waitForVisible(modeSelectorTitle, 2000)) {
    const confirmBtn = page.getByRole('button', { name: /confirmar/i }).first();
    if (await waitForVisible(confirmBtn, 2000)) {
      await clickWithPause(page, confirmBtn, { pauseAfter: 1000 });
    }
  }

  const closeBtn = page.locator('[aria-label="Fechar"], [aria-label="Close"]').first();
  if (await waitForVisible(closeBtn, 1500)) {
    await clickWithPause(page, closeBtn, { pauseAfter: 500 });
  }
}

/**
 * Fecha um modal clicando no "backdrop" (fundo escuro por trás do conteúdo).
 * Vários modais do app (ex: MembersModal) têm onClick={onClose} no próprio
 * overlay, mas o botão "X" interno não tem aria-label — clicar num ponto
 * garantidamente fora do conteúdo (topo da tela, já que os modais em
 * bottom-sheet só ocupam a parte de baixo) é mais confiável que procurar
 * um seletor de botão.
 */
export async function closeByBackdropClick(page) {
  const vp = page.viewportSize();
  const x = vp ? Math.round(vp.width / 2) : 200;
  await page.mouse.click(x, 24);
  await sleep(500);
}

// ── Tratamento de erro por cena ──────────────────────────────────────────────

export function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Executa uma cena com tratamento de erro padronizado:
 * loga início/fim, tira screenshot se falhar, e NUNCA derruba o processo —
 * o vídeo gravado até aquele ponto é preservado e o roteiro tenta seguir
 * para a próxima cena (quando fizer sentido).
 */
export async function runScene(page, { number, title, optional = false }, fn) {
  log.scene(number, title);
  try {
    await fn();
    log.ok();
    return { title, ok: true };
  } catch (err) {
    log.error(err.message);
    ensureDir(SCREENSHOT_DIR);
    const shotPath = path.join(SCREENSHOT_DIR, `cena-${String(number).padStart(2, '0')}-erro.png`);
    try {
      await page.screenshot({ path: shotPath, fullPage: false });
      log.info(`Screenshot salvo em: ${shotPath}`);
    } catch (shotErr) {
      log.error(`Não foi possível salvar screenshot: ${shotErr.message}`);
    }
    if (!optional) {
      log.info('Cena obrigatória falhou — o roteiro continua, mas a cena fica marcada como falha no relatório final.');
    }
    return { title, ok: false, error: err.message, screenshot: shotPath };
  }
}
