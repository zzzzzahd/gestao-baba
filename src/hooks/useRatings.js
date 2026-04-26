// src/hooks/useRatings.js
// Hook isolado para avaliações de jogadores.
// Extraído do BabaContext para reduzir complexidade (ARCH-001).

import { useCallback, useRef } from 'react';
import { fetchRatingsSummary, upsertRating, updateManualWeight } from '../services/ratingsService';
import toast from 'react-hot-toast';

export const useRatings = ({ currentBaba, user, players }) => {
  // Ref estável para evitar loop no useEffect do DashboardPage (PERF-003/BUG-007)
  const lastResultRef = useRef([]);

  const getAllRatings = useCallback(async () => {
    if (!currentBaba) return [];
    try {
      const result = await fetchRatingsSummary(currentBaba.id);
      lastResultRef.current = result;
      return result;
    } catch (err) {
      console.error('[useRatings] getAllRatings:', err);
      return [];
    }
  }, [currentBaba?.id]);

  const ratePlayer = useCallback(async (ratedId, ratings) => {
    if (!user || !currentBaba) return;
    try {
      const myPlayer = players.find(p => p.user_id === user.id);
      if (!myPlayer) throw new Error('Jogador não identificado');

      await upsertRating({
        babaId:     currentBaba.id,
        raterId:    myPlayer.id,
        ratedId,
        skill:      ratings.skill,
        physical:   ratings.physical,
        commitment: ratings.commitment,
      });

      toast.success('Avaliação enviada! ⭐');
    } catch (err) {
      console.error('[useRatings] ratePlayer:', err);
      toast.error('Erro ao enviar avaliação');
    }
  }, [user, currentBaba, players]);

  const setManualWeight = useCallback(async (playerId, weight) => {
    if (!currentBaba) return;
    try {
      await updateManualWeight(playerId, currentBaba.id, weight);
      toast.success('Peso manual atualizado!');
    } catch (err) {
      console.error('[useRatings] setManualWeight:', err);
      toast.error('Erro ao atualizar peso');
    }
  }, [currentBaba]);

  return { getAllRatings, ratePlayer, setManualWeight };
};
