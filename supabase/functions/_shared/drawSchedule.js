// src/utils/drawSchedule.js
// ─────────────────────────────────────────────────────────────────────────────
// Agenda do sorteio: QUANDO o sorteio roda e qual é o "jogo do dia".
//
// JS puro, sem imports — é espelhado em supabase/functions/_shared/drawSchedule.js
// (Edge Function auto-draw). Existe um teste (drawShared.sync.test.js) que
// falha se as duas cópias divergirem. Depois de editar este arquivo:
//   cp src/utils/drawSchedule.js supabase/functions/_shared/drawSchedule.js
//
// Todas as funções trabalham com o "relógio de parede" do Date recebido
// (getHours/getDate etc.), nunca com UTC. No navegador isso é o horário do
// aparelho; na Edge Function o chamador passa o horário de Bahia (ver nowBahia).
// ─────────────────────────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, '0');
const HM  = /^([01]\d|2[0-3]):([0-5]\d)/;

/** Prazo padrão de confirmação: 30 min antes do jogo. */
export const CONFIRMATION_LEAD_MS = 30 * 60 * 1000;
/** Depois do início do jogo, ainda vale sortear por mais 3h (ex: cron atrasado). */
export const DRAW_GRACE_MS = 3 * 60 * 60 * 1000;

/** YYYY-MM-DD no relógio local (NÃO usar toISOString: converte pra UTC e, em
 *  Bahia, jogo às 21h+ viraria "amanhã"). */
export const toLocalDateStr = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Normaliza os dias de jogo do baba → [{ day, time:'HH:MM', location }] */
export const getGameDayConfigs = (baba) => {
  if (!baba) return [];

  if (Array.isArray(baba.game_days_config) && baba.game_days_config.length > 0) {
    const seen = new Set();
    return baba.game_days_config
      .filter((c) => c && typeof c === 'object')
      .map((c) => ({
        day:      Number(c.day),
        time:     String(c.time || '').trim().substring(0, 5),
        location: c.location ? String(c.location).trim() : '',
      }))
      .filter((c) => {
        if (!Number.isInteger(c.day) || c.day < 0 || c.day > 6) return false;
        if (!HM.test(c.time) || seen.has(c.day)) return false;
        seen.add(c.day);
        return true;
      })
      .sort((a, b) => a.day - b.day);
  }

  if (Array.isArray(baba.game_days) && baba.game_days.length > 0) {
    const time = baba.game_time ? String(baba.game_time).substring(0, 5) : '20:00';
    return [...new Set(baba.game_days.map(Number))]
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      .map((d) => ({ day: d, time, location: baba.location || '' }))
      .sort((a, b) => a.day - b.day);
  }

  return [];
};

/**
 * Momento em que o sorteio roda para um jogo.
 *  • auto_draw_enabled + auto_draw_time válido → esse horário, no dia do jogo
 *    (limitado ao horário do jogo — um horário depois do jogo não faz sentido)
 *  • caso contrário → o prazo padrão (30 min antes do jogo)
 */
export const getDrawMoment = (baba, gameDate) => {
  const fallback = new Date(gameDate.getTime() - CONFIRMATION_LEAD_MS);
  if (!baba?.auto_draw_enabled || !baba?.auto_draw_time) return fallback;

  const m = String(baba.auto_draw_time).match(HM);
  if (!m) return fallback;

  const at = new Date(
    gameDate.getFullYear(), gameDate.getMonth(), gameDate.getDate(),
    Number(m[1]), Number(m[2]), 0, 0,
  );
  return at.getTime() > gameDate.getTime() ? fallback : at;
};

/** Prazo de confirmação: o que vier primeiro entre "30 min antes do jogo" e o
 *  momento do sorteio automático (não adianta confirmar depois que sorteou). */
export const getConfirmationDeadline = (baba, gameDate) => {
  const lead = new Date(gameDate.getTime() - CONFIRMATION_LEAD_MS);
  const draw = getDrawMoment(baba, gameDate);
  return draw.getTime() < lead.getTime() ? draw : lead;
};

/**
 * O jogo de HOJE (se houver), independente de o prazo já ter passado — é isso
 * que permite sortear depois do prazo (getNextGameDay já "pula" pro jogo da
 * semana seguinte nesse momento).
 *
 * Retorna null se hoje não tem jogo. Senão:
 *   { day, time, location, date, dateStr, drawMoment, windowEnd,
 *     isBefore (ainda não deu a hora), isDue (hora de sortear), isOver }
 */
export const getTodayGame = (baba, now = new Date()) => {
  const cfg = getGameDayConfigs(baba).find((c) => c.day === now.getDay());
  if (!cfg) return null;

  const [h, m]     = cfg.time.split(':').map(Number);
  const date       = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  const drawMoment = getDrawMoment(baba, date);
  const windowEnd  = new Date(date.getTime() + DRAW_GRACE_MS);

  return {
    ...cfg,
    date,
    dateStr:    toLocalDateStr(date),
    drawMoment,
    windowEnd,
    isBefore:   now < drawMoment,
    isDue:      now >= drawMoment && now < windowEnd,
    isOver:     now >= windowEnd,
  };
};

/** "HH:MM" de uma Date (relógio local). */
export const formatHM = (d) => (d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : null);
