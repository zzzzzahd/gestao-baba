// src/hooks/useRealtimeMatch.js
// Fase 3 — Hook encapsulando Supabase Realtime para sincronização de partida.
// Usado pelo StepMatch e pelo MatchPageVisitor para receber atualizações ao vivo.

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';

/**
 * @param {string|null} matchId  - ID da partida a observar (null = desativado)
 * @param {Function}    onUpdate - Callback chamado com { scoreA, scoreB, players }
 *                                 sempre que houver mudança em match_players ou matches.
 * @param {Object}      options
 * @param {boolean}     options.enabled - permite desabilitar sem desmontar o hook
 */
export function useRealtimeMatch(matchId, onUpdate, { enabled = true } = {}) {
  const channelRef = useRef(null);
  const onUpdateRef = useRef(onUpdate);

  // Mantém referência estável do callback
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  const fetchAndNotify = useCallback(async (id) => {
    if (!id) return;
    try {
      const [{ data: mp }, { data: match }] = await Promise.all([
        supabase
          .from('match_players')
          .select('player_id, team, goals, assists, position')
          .eq('match_id', id),
        supabase
          .from('matches')
          .select('team_a_score, team_b_score, status, winner_team, team_a_name, team_b_name')
          .eq('id', id)
          .single(),
      ]);

      const players = mp || [];
      const scoreA  = players.filter(p => ['A','a'].includes(p.team)).reduce((s, p) => s + (p.goals || 0), 0);
      const scoreB  = players.filter(p => ['B','b'].includes(p.team)).reduce((s, p) => s + (p.goals || 0), 0);

      onUpdateRef.current?.({ scoreA, scoreB, players, match: match || {} });
    } catch (err) {
      console.error('[useRealtimeMatch] fetchAndNotify:', err);
    }
  }, []);

  useEffect(() => {
    if (!matchId || !enabled) {
      channelRef.current?.unsubscribe();
      channelRef.current = null;
      return;
    }

    // Busca estado inicial imediatamente
    fetchAndNotify(matchId);

    // Inscreve no canal de realtime
    const channel = supabase
      .channel(`realtime:match:${matchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_players', filter: `match_id=eq.${matchId}` },
        () => fetchAndNotify(matchId)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        () => fetchAndNotify(matchId)
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[useRealtimeMatch] canal com erro, tentando reconectar...');
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [matchId, enabled, fetchAndNotify]);

  /** Força um refresh manual (útil após operação local) */
  const refresh = useCallback(() => fetchAndNotify(matchId), [matchId, fetchAndNotify]);

  return { refresh };
}
