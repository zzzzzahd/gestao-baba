// src/services/ratingsService.js
// Centraliza queries de avaliações de jogadores.
// Elimina duplicação entre BabaContext, RankingsPage e DashboardPage.

import { supabase } from './supabase';

// ─── Ratings summary ─────────────────────────────────────────────────────────

export const fetchRatingsSummary = async (babaId) => {
  const { data, error } = await supabase
    .from('player_rating_summary')
    .select(`
      *,
      player:players!player_id(name, position)
    `)
    .eq('baba_id', babaId)
    .order('final_rating', { ascending: false });

  if (error) throw error;

  return (data || []).map(r => ({
    ...r,
    name:     r.player?.name     || 'Jogador',
    position: r.player?.position || 'linha',
  }));
};

export const fetchPlayerRatingSummary = async (playerId, babaId) => {
  const { data, error } = await supabase
    .from('player_rating_summary')
    .select('*')
    .eq('player_id', playerId)
    .eq('baba_id', babaId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

// ─── Inserir avaliação ────────────────────────────────────────────────────────

export const upsertRating = async ({ babaId, raterId, ratedId, skill, physical, commitment }) => {
  const { error } = await supabase
    .from('player_ratings')
    .upsert(
      { baba_id: babaId, rater_id: raterId, rated_id: ratedId, skill, physical, commitment },
      { onConflict: 'baba_id,rater_id,rated_id' }
    );
  if (error) throw error;
};

// ─── Recalcular rating ────────────────────────────────────────────────────────

export const recalculateRating = async (playerId, babaId) => {
  const { error } = await supabase.rpc('recalculate_player_rating', {
    p_rated_id: playerId,
    p_baba_id:  babaId,
  });
  if (error) throw error;
};

export const updateManualWeight = async (playerId, babaId, weight) => {
  const clamped = Math.max(0, Math.min(5, Number(weight)));
  const { error } = await supabase
    .from('player_rating_summary')
    .update({ manual_weight: clamped })
    .eq('player_id', playerId)
    .eq('baba_id', babaId);
  if (error) throw error;
  await recalculateRating(playerId, babaId);
};

// ─── Rankings de estatísticas ─────────────────────────────────────────────────

export const fetchStatsRanking = async (babaId, { period = 'all', limit = 10 } = {}) => {
  let dateFilter = null;
  if (period === '7days') {
    const d = new Date(); d.setDate(d.getDate() - 7);
    dateFilter = d.toISOString().split('T')[0];
  } else if (period === '30days') {
    const d = new Date(); d.setDate(d.getDate() - 30);
    dateFilter = d.toISOString().split('T')[0];
  }

  // BUG-005 FIX já aplicado: usa !inner para garantir filtro correto
  let query = supabase
    .from('match_players')
    .select(`
      player_id,
      goals,
      assists,
      player:players!inner(name, position),
      match:matches!inner(match_date, baba_id)
    `)
    .eq('match.baba_id', babaId);

  if (dateFilter) query = query.gte('match.match_date', dateFilter);

  const { data, error } = await query;
  if (error) throw error;

  const statsMap = {};
  (data || []).forEach(mp => {
    const id = mp.player_id;
    if (!statsMap[id]) {
      statsMap[id] = {
        id,
        name:     mp.player.name     || 'Jogador',
        position: mp.player.position || 'linha',
        goals:   0,
        assists: 0,
        matches: 0,
      };
    }
    statsMap[id].goals   += mp.goals   || 0;
    statsMap[id].assists += mp.assists || 0;
    statsMap[id].matches += 1;
  });

  return Object.values(statsMap);
};

// ─── Perfil completo do jogador (RPC) ────────────────────────────────────────

export const fetchPlayerFullProfile = async (userId, babaIds) => {
  const { data, error } = await supabase.rpc('get_player_full_profile', {
    p_user_id:  userId,
    p_baba_ids: babaIds,
  });
  if (error) throw error;
  return data || {};
};
