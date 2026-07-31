// src/services/attendanceService.js
// ─────────────────────────────────────────────────────────────────────────────
// Conferência de presença pré-partida: registra faltas/atrasos e resolve
// substituição automática (reserva do sorteio → lista de espera).
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase';

// ─── Eventos de falta/atraso ──────────────────────────────────────────────────

export const recordAttendanceEvent = async ({ babaId, playerId, gameDate, type, replacedByPlayerId, createdBy }) => {
  const { data, error } = await supabase
    .from('attendance_events')
    .insert([{
      baba_id:                babaId,
      player_id:               playerId,
      game_date:                gameDate,
      type,
      replaced_by_player_id:    replacedByPlayerId || null,
      created_by:                createdBy || null,
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const fetchAttendanceSummary = async (babaId) => {
  const { data, error } = await supabase.rpc('get_attendance_summary', { p_baba_id: babaId });
  if (error) throw error;
  return data || [];
};

// ─── Substituição automática ──────────────────────────────────────────────────

// Escolhe o próximo substituto disponível: 1º reserva do sorteio, senão 1º da
// lista de espera (game_confirmations status = 'waitlist') que ainda não esteja
// em campo nem já usado como reserva nesta rodada.
export const pickSubstitute = ({ reserves = [], waitlistConfirmations = [], excludePlayerIds = [] }) => {
  const excluded = new Set(excludePlayerIds);

  const freeReserve = reserves.find(p => !excluded.has(p.id));
  if (freeReserve) return { player: freeReserve, source: 'reserve' };

  const sortedWaitlist = [...waitlistConfirmations].sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
  const fromWaitlist = sortedWaitlist.find(c => !excluded.has(c.player_id));
  if (fromWaitlist) {
    return {
      player: { id: fromWaitlist.player_id, name: fromWaitlist.player?.name, position: fromWaitlist.player?.position },
      source: 'waitlist',
      confirmationId: fromWaitlist.id,
    };
  }

  return null;
};

// Aplica a falta de um jogador nos times do sorteio: remove o faltoso do time,
// entra o substituto (se houver) no lugar dele, atualiza reservas.
// Retorna { teams, reserves } atualizados para persistir e refletir na UI.
export const applyAbsenceToTeams = ({ teams, reserves, absentPlayerId, substitute }) => {
  let newReserves = [...reserves];
  const newTeams = teams.map(team => {
    const idx = (team.players || []).findIndex(p => p.id === absentPlayerId);
    if (idx === -1) return team;

    const players = [...team.players];
    if (substitute) {
      players[idx] = { ...substitute, position: substitute.position || players[idx].position };
      if (substitute.__source === 'reserve') {
        newReserves = newReserves.filter(p => p.id !== substitute.id);
      }
    } else {
      players.splice(idx, 1); // sem substituto disponível — time joga com um a menos
    }
    return { ...team, players };
  });

  return { teams: newTeams, reserves: newReserves };
};

// Persiste o resultado do sorteio já ajustado (times + reservas) no banco.
export const persistDrawResultTeams = async (babaId, gameDate, teams, reserves) => {
  const { error } = await supabase
    .from('draw_results')
    .update({ teams, reserves, teams_snapshot: teams })
    .eq('baba_id', babaId)
    .eq('draw_date', gameDate);
  if (error) throw error;
};

// Se o substituto veio da lista de espera, promove a confirmação dele para 'confirmed'.
export const confirmWaitlistSubstitute = async (confirmationId) => {
  if (!confirmationId) return;
  const { error } = await supabase
    .from('game_confirmations')
    .update({ status: 'confirmed', position: null })
    .eq('id', confirmationId);
  if (error) throw error;
};
