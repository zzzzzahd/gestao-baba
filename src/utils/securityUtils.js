// src/utils/securityUtils.js
// ─────────────────────────────────────────────────────────────────────────────
// Utilitários de segurança e LGPD. Sprint 10.5, Fase E.
// ─────────────────────────────────────────────────────────────────────────────

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

// ─── Session timeout ──────────────────────────────────────────────────────────

const LAST_ACTIVE_KEY  = 'draft_play_last_active';
const INACTIVITY_LIMIT = 7 * 24 * 60 * 60 * 1000; // 7 dias em ms

/** Registrar atividade do usuário (chamar em eventos de interação) */
export const touchSession = () => {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
  } catch {}
};

/** Verificar se a sessão expirou por inatividade */
export const isSessionExpired = () => {
  try {
    const last = localStorage.getItem(LAST_ACTIVE_KEY);
    if (!last) return false;
    return Date.now() - Number(last) > INACTIVITY_LIMIT;
  } catch {
    return false;
  }
};

/** Limpar dados de sessão local */
export const clearSessionData = () => {
  try {
    localStorage.removeItem(LAST_ACTIVE_KEY);
    localStorage.removeItem('draft_play_draw_wizard');
    localStorage.removeItem('draft_play_onboarding_done');
  } catch {}
};

// ─── Sanitização básica ───────────────────────────────────────────────────────

/** Remove caracteres perigosos de strings de input */
export const sanitizeText = (str, maxLength = 200) => {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // previne XSS básico
};

/** Valida se é UUID válido */
export const isValidUUID = (str) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
