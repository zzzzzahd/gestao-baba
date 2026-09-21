// video-demo/demo-auth.js
// ─────────────────────────────────────────────────────────────────────────────
// Login "por trás dos panos" via Supabase Admin — evita o captcha (Cloudflare
// Turnstile) do formulário de login público.
//
// COMO FUNCIONA (padrão recomendado pela própria Supabase para automação/E2E):
//   1. Com a SERVICE ROLE KEY (secreta, só roda no servidor/terminal — nunca
//      no navegador), pede pro Supabase gerar um "magic link" pro e-mail da
//      conta de demonstração. Isso não passa pelo endpoint de senha, então
//      não tem captcha nenhum envolvido.
//   2. Com a ANON KEY (a mesma chave pública que o app já usa), troca o token
//      desse magic link por uma sessão real (access_token + refresh_token).
//   3. O e2e-video-demo.js injeta essa sessão direto no localStorage do
//      navegador, no mesmo formato que o supabase-js já usa (ver
//      src/services/supabase.js) — o app carrega já autenticado.
//
// SEGURANÇA — leia antes de usar:
//   - SUPABASE_SERVICE_ROLE_KEY é um segredo com acesso TOTAL ao banco
//     (ignora RLS). NUNCA prefixe com VITE_ (isso vazaria pro bundle do
//     navegador), NUNCA commite, e use só localmente neste script.
//   - Pegue essa chave em: Supabase → Project Settings → API → service_role.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import {
  BASE_URL, EMAIL, PASSWORD, SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY,
} from './demo-config.js';
import {
  sleep, typeSlowly, waitForVisible, dismissBlockingOverlays,
} from './demo-helpers.js';

/**
 * Gera uma sessão válida (access_token/refresh_token) para o e-mail informado,
 * sem precisar de senha nem captcha.
 * @returns {Promise<import('@supabase/supabase-js').Session>}
 */
export async function getAdminSession({ supabaseUrl, serviceRoleKey, anonKey, email }) {
  if (!supabaseUrl || !serviceRoleKey || !anonKey || !email) {
    throw new Error(
      'Faltam variáveis para o login via admin: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ' +
      'VITE_SUPABASE_PUBLISHABLE_KEY (ou SUPABASE_ANON_KEY) e DEMO_EMAIL/TEST_EMAIL.',
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkError) {
    throw new Error(`Falha ao gerar magic link (confira a SERVICE_ROLE_KEY e se o e-mail existe): ${linkError.message}`);
  }

  const hashedToken = linkData?.properties?.hashed_token;
  if (!hashedToken) {
    throw new Error('O Supabase não retornou hashed_token no generateLink — resposta inesperada da API.');
  }

  const anon = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: verifyData, error: verifyError } = await anon.auth.verifyOtp({
    token_hash: hashedToken,
    type: 'magiclink',
  });
  if (verifyError) {
    throw new Error(`Falha ao trocar o magic link por uma sessão: ${verifyError.message}`);
  }
  if (!verifyData?.session) {
    throw new Error('verifyOtp não retornou sessão — resposta inesperada da API.');
  }

  return verifyData.session;
}

/**
 * Monta a chave de localStorage que o supabase-js usa por padrão
 * (sb-<project-ref>-auth-token), a partir da URL do projeto.
 * Ver src/services/supabase.js — o projeto não define storageKey customizado,
 * então usa esse padrão.
 */
export function buildSupabaseStorageKey(supabaseUrl) {
  const match = supabaseUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/i);
  if (!match) {
    throw new Error(`Não consegui extrair o project-ref de SUPABASE_URL: ${supabaseUrl}`);
  }
  return `sb-${match[1]}-auth-token`;
}

/**
 * Login completo e compartilhado por qualquer script de demo: valida as
 * credenciais/variáveis, digita e-mail/senha na tela (só efeito visual — o
 * formulário nunca é de fato enviado, evitando o captcha), injeta a sessão
 * via Supabase Admin, e já entra no dashboard livre de popups de primeira
 * visita (onboarding, NPS) e com o tema escuro forçado.
 */
export async function login(page) {
  if (!EMAIL) {
    console.error(
      '\n[VIDEO DEMO] ✗ ERRO: defina DEMO_EMAIL (ou TEST_EMAIL) no seu .env.local ' +
      'antes de rodar este script.\n',
    );
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
    console.error(
      '\n[VIDEO DEMO] ✗ ERRO: o login pula o captcha usando o Supabase Admin — faltam variáveis.\n' +
      'Defina no seu .env.local:\n' +
      '  SUPABASE_URL               (ou já tem VITE_SUPABASE_URL — reaproveita automaticamente)\n' +
      '  SUPABASE_SERVICE_ROLE_KEY  (Supabase → Project Settings → API → service_role — NUNCA prefixe com VITE_)\n' +
      '  SUPABASE_ANON_KEY          (ou já tem VITE_SUPABASE_PUBLISHABLE_KEY — reaproveita automaticamente)\n' +
      'Nunca coloque essas chaves direto no código nem commite o .env.local.\n',
    );
    process.exit(1);
  }

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await sleep(700);

  const emailInput = page.locator('input[type="email"]').first();
  const passInput  = page.locator('input[type="password"]').first();
  await waitForVisible(emailInput, 8000);

  await typeSlowly(page, emailInput, EMAIL);
  await sleep(200);
  if (PASSWORD) {
    await typeSlowly(page, passInput, PASSWORD);
  }
  await sleep(500);

  const session = await getAdminSession({
    supabaseUrl: SUPABASE_URL,
    serviceRoleKey: SUPABASE_SERVICE_KEY,
    anonKey: SUPABASE_ANON_KEY,
    email: EMAIL,
  });
  const storageKey = buildSupabaseStorageKey(SUPABASE_URL);

  await page.evaluate(([key, value]) => {
    localStorage.setItem(key, value);
    // Evita popups de primeira visita que bloqueiam a tela durante a
    // gravação (não fazem parte da demonstração, são só onboarding do app):
    localStorage.setItem('draft_play_onboarding_done_v2', '1');
    localStorage.setItem('draft_play_beta_nps_shown', '1');
    // Reforça o tema escuro (o Playwright simula "light" por padrão numa
    // aba nova — ver colorScheme no newContext de cada script).
    localStorage.setItem('draft_play_theme', 'dark');
  }, [storageKey, JSON.stringify(session)]);

  await sleep(600);
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await dismissBlockingOverlays(page);
}
