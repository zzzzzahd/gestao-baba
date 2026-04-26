// src/services/matchService.js
// Centraliza todas as queries de partidas, draw_results e match_players.
// Elimina duplicação entre BabaContext, MatchPage e TeamsPage.

import { supabase } from './supabase';

// ─── Draw Results ────────────────────────────────────────────────────────────

export const fetchDrawResult = async (babaId, dateStr) => {
  const { data, error } = await supabase
    .from('draw_results')
    .select('*')
    .eq('baba_id', babaId)
    .eq('draw_date', dateStr)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const upsertDrawResult = async (payload) => {
  const { data, error } = await supabase
    .from('draw_results')
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ─── Matches ─────────────────────────────────────────────────────────────────

export const fetchTodayMatch = async (babaId, dateStr) => {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('baba_id', babaId)
    .gte('match_date', `${dateStr}T00:00:00`)
    .lte('match_date', `${dateStr}T23:59:59`)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const fetchMatchByDrawResult = async (babaId, drawResultId) => {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('baba_id', babaId)
    .eq('draw_result_id', drawResultId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const fetchMatchHistory = async (babaId, { filter = 'all', page = 0, pageSize = 10 } = {}) => {
  let query = supabase
    .from('matches')
    .select('*', { count: 'exact' })
    .eq('baba_id', babaId)
    .order('match_date', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (filter === 'finished') {
    query = query.eq('status', 'finished');
  } else if (filter === 'month') {
    const start = new Date();
    start.setDate(1); start.setHours(0, 0, 0, 0);
    query = query.gte('match_date', start.toISOString());
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return { data: data || [], count: count || 0 };
};

export const insertMatch = async (payload) => {
  const { data, error } = await supabase
    .from('matches')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateMatch = async (matchId, updates) => {
  const { data, error } = await supabase
    .from('matches')
    .update(updates)
    .eq('id', matchId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const finalizeMatch = async (matchId, { winnerTeam, scoreA, scoreB }) => {
  return updateMatch(matchId, {
    status:       'finished',
    winner_team:  winnerTeam,
    team_a_score: scoreA,
    team_b_score: scoreB,
    finished_at:  new Date().toISOString(),
  });
};

// ─── Match Players ───────────────────────────────────────────────────────────

export const fetchMatchPlayers = async (matchId) => {
  const { data, error } = await supabase
    .from('match_players')
    .select('*, player:players(*, profile:profiles(avatar_url))')
    .eq('match_id', matchId)
    .order('team');
  if (error) throw error;
  return data || [];
};

export const fetchMatchPlayersWithStats = async (matchId) => {
  const { data, error } = await supabase
    .from('match_players')
    .select('team, goals, assists, player:players(name, position)')
    .eq('match_id', matchId)
    .order('team');
  if (error) throw error;
  return data || [];
};

export const insertMatchPlayers = async (players) => {
  if (!players.length) return;
  const { error } = await supabase.from('match_players').insert(players);
  if (error) throw error;
};

export const fetchExistingMatchPlayerIds = async (matchId) => {
  const { data, error } = await supabase
    .from('match_players')
    .select('player_id')
    .eq('match_id', matchId);
  if (error) throw error;
  return (data || []).map(p => p.player_id);
};

export const updatePlayerStat = async (matchId, playerId, field, delta) => {
  const { data: current } = await supabase
    .from('match_players')
    .select(field)
    .eq('match_id', matchId)
    .eq('player_id', playerId)
    .single();

  const { error } = await supabase
    .from('match_players')
    .update({ [field]: (current?.[field] || 0) + delta })
    .eq('match_id', matchId)
    .eq('player_id', playerId);

  if (error) throw error;
};

// ─── Confirmações de presença ────────────────────────────────────────────────

export const fetchConfirmations = async (babaId, dateStr) => {
  const { data, error } = await supabase
    .from('game_confirmations')
    .select('*, player:players(*)')
    .eq('baba_id', babaId)
    .eq('game_date', dateStr);
  if (error) throw error;
  return data || [];
};

export const insertConfirmation = async (payload) => {
  const { data, error } = await supabase
    .from('game_confirmations')
    .insert([payload])
    .select('*, player:players(*)')
    .single();
  if (error) throw error;
  return data;
};

export const deleteConfirmation = async (confirmationId) => {
  const { error } = await supabase
    .from('game_confirmations')
    .delete()
    .eq('id', confirmationId);
  if (error) throw error;
};
