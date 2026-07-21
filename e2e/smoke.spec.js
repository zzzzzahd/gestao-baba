// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Smoke E2E — páginas públicas do Draft Play
 * Não exige login; valida que o app sobe e as rotas públicas respondem.
 */

test.describe('Landing (/)', () => {
  test('carrega a página inicial', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('exibe ação para entrar ou modo visitante', async ({ page }) => {
    await page.goto('/');
    const entrar = page.getByRole('button', { name: /entrar|baba|login/i }).first();
    const visitante = page.getByRole('button', { name: /visitante/i }).first();
    // Pelo menos um CTA principal deve existir
    const temEntrar = await entrar.count();
    const temVisitante = await visitante.count();
    expect(temEntrar + temVisitante).toBeGreaterThan(0);
  });
});

test.describe('Login (/login)', () => {
  test('exibe formulário de autenticação', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    // Input de e-mail ou campo de texto do formulário
    const email = page.locator('input[type="email"], input[name="email"], input[type="text"]').first();
    await expect(email).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Privacidade e Termos', () => {
  test('página de privacidade carrega', async ({ page }) => {
    await page.goto('/privacidade');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/privacidade|lgpd|dados/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('página de termos carrega', async ({ page }) => {
    await page.goto('/termos');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/termo|uso|serviço/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Modo visitante', () => {
  test('rota /visitor responde', async ({ page }) => {
    await page.goto('/visitor');
    await expect(page).toHaveURL(/\/visitor/);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Rotas protegidas', () => {
  test('/home redireciona para login quando deslogado', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('/dashboard redireciona para login quando deslogado', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('/draw redireciona para login quando deslogado', async ({ page }) => {
    await page.goto('/draw');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});

test.describe('Convite inválido', () => {
  test('/join/CODIGO-FAKE não quebra a aplicação', async ({ page }) => {
    await page.goto('/join/CODIGO-FAKE-TESTE');
    await expect(page.locator('body')).toBeVisible();
    // Não deve ser tela branca / crash
    const html = await page.content();
    expect(html.length).toBeGreaterThan(100);
  });
});
