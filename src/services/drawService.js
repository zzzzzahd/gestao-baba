// src/services/drawService.js
// ─────────────────────────────────────────────────────────────────────────────
// ÚNICO caminho de sorteio no cliente. Tanto o sorteio manual (StepConfig)
// quanto o automático (BabaContext / botão "Sortear agora" do DrawPage) passam
// por executeDraw(), então as regras são idênticas:
//   • algoritmo: utils/drawAlgorithm.js (o mesmo espelhado na Edge Function)
//   • nível: média das avaliações (player_rating_summary.avg_level);
//            convidado usa o nível informado ao adicioná-lo (balance_level)
//   • restrições (juntos/separados) lidas de draw_constraints
//   • só entra quem está confirmado — lista de espera NÃO é sorteada
//   • grava draw_results com status 'active' (a partida só é criada depois,
//     pelo StepMatch, quando o presidente/coordenador inicia)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase';
import { drawTeamsWithConstraints } from '../utils/drawAlgorithm';

export const DEFAULT_DRAW_CONFIG = { playersPerTeam: 5, strategy: 'reserve' };

// ─── Configuração padrão do baba ──────────────────────────────────────────────

/** Padrões que o presidente definiu em Configurações › Sorteio. */
export const getDrawDefaults = (baba) => ({
  playersPerTeam: Math.max(2, Math.min(11, Number(baba?.players_per_team) || DEFAULT_DRAW_CONFIG.playersPerTeam)),
  strategy:       baba?.draw_strategy === 'substitute' ? 'substitute' : 'reserve',
});

export const describeStrategy = (strategy) =>
  strategy === 'substitute' ? 'Incompleto' : 'Reserva';

export const describeGkMode = (gkMode) => ({
  court:    'Fila da quadra',
  separate: 'Vaga à parte',
  fixed:    'Conta no time',
}[gkMode] || 'Conta no time');

// ─── Quem entra no sorteio ────────────────────────────────────────────────────

/** Confirmação que conta pro sorteio: tudo que não é lista de espera/cancelado. */
export const isCountedConfirmation = (c) =>
  !!c && c.status !== 'waitlist' && c.status !== 'cancelled';

export const getDrawPlayers = (confirmations = []) =>
  confirmations.filter(isCountedConfirmation).map((c) => c.player).filter(Boolean);

/** 'reserve': cada time precisa de +1 vaga própria de reserva pra se formar. */
export const getMinRequired = (cfg = DEFAULT_DRAW_CONFIG) =>
  (cfg.strategy === 'reserve' ? cfg.playersPerTeam + 1 : cfg.playersPerTeam) * 2;

// ─── Leituras ─────────────────────────────────────────────────────────────────

/** Sessão de sorteio ativa do baba (o índice único garante no máximo 1). */
export const fetchActiveDraw = async (babaId) => {
  if (!babaId) return null;
  const { data, error } = await supabase
    .from('draw_results')
    .select('*')
    .eq('baba_id', babaId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
};

/** Formato que o wizard (StepTeams/StepMatch) consome. */
export const toDrawSession = (row) => (row ? {
  teams:           row.teams || [],
  reserves:        row.reserves || [],
  goalkeeperQueue: row.goalkeeper_queue || [],
  drawResultId:    row.id,
  drawDate:        row.draw_date,
} : null);

/** Confirmações (com o jogador) de uma data de jogo. */
export const fetchConfirmationsForDate = async (babaId, dateStr) => {
  const { data, error } = await supabase
    .from('game_confirmations')
    .select('*, player:players(*)')
    .eq('baba_id', babaId)
    .eq('game_date', dateStr)
    .neq('status', 'cancelled');
  if (error) throw error;
  return data || [];
};

export const fetchDrawConstraints = async (babaId) => {
  const { data, error } = await supabase.rpc('get_draw_constraints', { p_baba_id: babaId });
  if (error) throw error;
  return data || [];
};

// ─── Sorteio ──────────────────────────────────────────────────────────────────

/**
 * Executa um sorteio e grava a sessão.
 *
 * @param {object}   p.baba           baba atual (usa id e gk_mode)
 * @param {string}   p.dateStr        data do jogo (YYYY-MM-DD)
 * @param {object[]} p.confirmations  game_confirmations (com .player)
 * @param {object}   p.drawConfig     { playersPerTeam, strategy }
 * @param {Function} p.getRatings     async () => [{ player_id, avg_level }]
 * @param {boolean}  p.force          true = encerra a sessão ativa e sorteia de novo
 * @param {string}   p.source         'manual' | 'auto' (só informativo, vai no draw_config)
 *
 * @returns {{ ok:true, reused:boolean, session, constraintsSkipped?:boolean }
 *          | { ok:false, code:'insufficient'|'few_teams', needed?:number, have?:number }}
 * Erros de banco são lançados.
 */
export const executeDraw = async ({
  baba,
  dateStr,
  confirmations,
  drawConfig,
  getRatings,
  force = false,
  source = 'manual',
}) => {
  const cfg = { ...DEFAULT_DRAW_CONFIG, ...(drawConfig || {}) };

  // 1) Já existe sessão ativa? Reabre em vez de sortear de novo.
  if (!force) {
    const existing = await fetchActiveDraw(baba.id);
    if (existing?.teams?.length >= 2) {
      return { ok: true, reused: true, session: toDrawSession(existing) };
    }
  } else {
    // Sortear de novo descarta as partidas da sessão anterior (placar/fila do
    // dia não podem misturar sorteios diferentes) e encerra TODAS as sessões
    // ativas — senão sobra mais de uma 'active' e o índice único
    // idx_draw_results_one_active_per_baba derruba o insert (409).
    const { data: staleActives, error: staleErr } = await supabase
      .from('draw_results')
      .select('id')
      .eq('baba_id', baba.id)
      .eq('status', 'active');
    if (staleErr) throw staleErr;

    if (staleActives?.length > 0) {
      const staleIds = staleActives.map((r) => r.id);
      const { error: finishErr } = await supabase
        .from('draw_results')
        .update({ status: 'finished', finished_at: new Date().toISOString() })
        .in('id', staleIds);
      if (finishErr) throw finishErr;

      const { error: delErr } = await supabase
        .from('matches')
        .delete()
        .in('draw_result_id', staleIds);
      if (delErr) throw delErr;
    }
  }

  // 2) Insumos: restrições + nível de cada jogador
  let constraints = [];
  let constraintsSkipped = false;
  try {
    constraints = await fetchDrawConstraints(baba.id);
  } catch (err) {
    // A RPC exige admin/presidente. Não derruba o sorteio, mas avisa quem chamou.
    console.warn('[drawService] restrições não carregadas:', err?.message || err);
    constraintsSkipped = true;
  }

  const ratings  = (await getRatings?.()) || [];
  const levelMap = new Map(ratings.map((r) => [r.player_id, r.avg_level ?? 2]));

  const players = getDrawPlayers(confirmations).map((p) => ({
    ...p,
    balance_level: p.is_guest ? (p.balance_level ?? 2) : (levelMap.get(p.id) ?? 2),
  }));

  const needed = getMinRequired(cfg);
  if (players.length < needed) {
    return { ok: false, code: 'insufficient', needed, have: players.length };
  }

  // 3) Algoritmo (o mesmo da Edge Function)
  const gkMode = baba.gk_mode || 'fixed';
  const { teams, reserves, goalkeeperQueue } = drawTeamsWithConstraints(
    players, cfg.playersPerTeam, cfg.strategy, constraints, gkMode,
  );

  // Nunca cria sessão com menos de 2 times: o StepMatch ficaria preso em
  // "Preparando partida..." e a sessão 'active' travada bloquearia qualquer
  // sorteio seguinte (índice único de 1 ativa por baba).
  if (!teams || teams.length < 2) {
    return { ok: false, code: 'few_teams', needed, have: players.length };
  }

  const avgs = teams.map((t) =>
    t.players.reduce((s, p) => s + (p.balance_level || 0), 0) / (t.players.length || 1));
  const balanceScore = Math.round((Math.max(...avgs) - Math.min(...avgs)) * 100) / 100;

  // 4) Grava a sessão
  const { data: row, error: drawErr } = await supabase
    .from('draw_results')
    .insert({
      baba_id:          baba.id,
      draw_date:        dateStr,
      teams,
      reserves,
      goalkeeper_queue: goalkeeperQueue,
      draw_config:      { ...cfg, gkMode, source },
      players_per_team: cfg.playersPerTeam,
      strategy:         cfg.strategy,
      algorithm:        'balanced_snake',
      constraints_used: constraints,
      balance_score:    balanceScore,
      teams_snapshot:   teams,
      total_confirmed:  players.length,
      status:           'active',
      finished_at:      null,
      finished_by:      null,
    })
    .select()
    .single();

  if (drawErr) {
    // Corrida (cron + cliente, ou dois cliques): outra sessão ativa acabou de
    // nascer — reaproveita em vez de falhar.
    if (drawErr.code === '23505') {
      const recovered = await fetchActiveDraw(baba.id);
      if (recovered?.teams?.length >= 2) {
        return { ok: true, reused: true, session: toDrawSession(recovered) };
      }
    }
    throw drawErr;
  }

  return {
    ok: true,
    reused: false,
    constraintsSkipped,
    session: { teams, reserves, goalkeeperQueue, drawResultId: row?.id, drawDate: dateStr },
  };
};
