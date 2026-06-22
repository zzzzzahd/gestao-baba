// src/services/tournamentService.js
import { supabase } from './supabase';

/** Mata-mata: avança vencedor para a próxima fase ou marca campeão */
export async function advanceWinner(tournamentId, match, winnerId) {
  const { data: tour } = await supabase.from('tournaments')
    .select('format').eq('id', tournamentId).single();
  if (tour?.format !== 'knockout') return;

  const nextRound = match.round + 1;
  const nextIdx = Math.floor(match.match_index / 2);
  const slot = match.match_index % 2 === 0 ? 'team_a_id' : 'team_b_id';

  const { data: nextMatch } = await supabase.from('tournament_matches')
    .select('*').eq('tournament_id', tournamentId)
    .eq('round', nextRound).eq('match_index', nextIdx).maybeSingle();

  if (nextMatch) {
    await supabase.from('tournament_matches')
      .update({ [slot]: winnerId }).eq('id', nextMatch.id);
  } else {
    await supabase.from('tournaments')
      .update({ champion_team_id: winnerId, status: 'finished' })
      .eq('id', tournamentId);
  }
}
