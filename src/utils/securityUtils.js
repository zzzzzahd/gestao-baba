// src/utils/securityUtils.js
// Fase 1.4 — sanitização robusta e utilitários de segurança LGPD.
// Sessão agora é gerenciada pelo JWT do Supabase (sem isSessionExpired local).

// ─── Mascaramento de dados sensíveis ─────────────────────────────────────────

/** Mascara chave Pix — exibe apenas últimos 4 caracteres */
export const maskPix = (key) => {
  if (!key) return '—';
  if (key.length <= 4) return '****';
  return `****${key.slice(-4)}`;
};

/** Mascara telefone: (11) 99999-1234 → (11) ****-1234 */
export const maskPhone = (phone) => {
  if (!phone) return '—';
  return phone.replace(/(\d{2})[\s.-]?(\d{4,5})[\s.-]?(\d{4})/, '($1) ****-$3');
};

/** Mascara CPF: 123.456.789-00 → ***.456.***-** */
export const maskCPF = (cpf) => {
  if (!cpf) return '—';
  return cpf.replace(/(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/, '***.***.$3-**');
};

/** Mascara email: usuario@dominio.com → u***@dominio.com */
export const maskEmail = (email) => {
  if (!email) return '—';
  const [user, domain] = email.split('@');
  if (!domain) return '—';
  return `${user.charAt(0)}***@${domain}`;
};

// ─── Sanitização de input ─────────────────────────────────────────────────────

/**
 * Sanitiza string de input do usuário.
 * React já faz escape de JSX, então esta função é para dados que vão
 * para o banco ou são usados em contextos não-JSX (ex: nomes, textos livres).
 * Não usar DOMPurify porque não há render de HTML no app.
 */
export const sanitizeText = (str, maxLength = 200) => {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .slice(0, maxLength)
    // Remove caracteres de controle (exceto espaço)
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Remove tags HTML básicas (extra cautela, React já escapa)
    .replace(/<[^>]*>/g, '');
};

/** Valida se é UUID v4 válido */
export const isValidUUID = (str) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

/** Valida formato de email */
export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ─── Stub para compatibilidade retroativa ─────────────────────────────────────
// Mantidos como no-ops para não quebrar imports existentes.
// A expiração de sessão agora é responsabilidade do JWT do Supabase.
export const touchSession    = () => {};
export const isSessionExpired = () => false;
export const clearSessionData = () => {
  try {
    localStorage.removeItem('draft_play_draw_wizard');
    localStorage.removeItem('draft_play_onboarding_done');
  } catch {}
};
