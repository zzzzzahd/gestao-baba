// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Navegação E2E — links e CTAs principais (público)
 */

test.describe('Navegação a partir da landing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('vai para login ao clicar em entrar (se o botão existir)', async ({ page }) => {
    const btn = page.getByRole('button', { name: /entrar|meu baba|login/i }).first();
    if ((await btn.count()) === 0) {
      test.skip();
      return;
    }
    await btn.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('vai para visitante ao clicar no modo visitante (se existir)', async ({ page }) => {
    const btn = page.getByRole('button', { name: /visitante/i }).first();
    if ((await btn.count()) === 0) {
      test.skip();
      return;
    }
    await btn.click();
    await expect(page).toHaveURL(/\/visitor/, { timeout: 10_000 });
  });
});

test.describe('Redirects legados', () => {
  test('/tournament redireciona', async ({ page }) => {
    await page.goto('/tournament');
    // App redireciona para /home (protegido → /login) ou /home
    await page.waitForURL(/\/(home|login)/, { timeout: 15_000 });
  });

  test('/teams redireciona', async ({ page }) => {
    await page.goto('/teams');
    await page.waitForURL(/\/(draw|login)/, { timeout: 15_000 });
  });

  test('/match redireciona', async ({ page }) => {
    await page.goto('/match');
    await page.waitForURL(/\/(draw|login)/, { timeout: 15_000 });
  });
});
