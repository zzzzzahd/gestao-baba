// src/hooks/usePresence.js
// Hook isolado para confirmação de presença.
// Extraído do BabaContext para reduzir complexidade (ARCH-001).

import { useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { fetchConfirmations, insertConfirmation, deleteConfirmation } from '../services/matchService';
import toast from 'react-hot-toast';

export const usePresence = ({ currentBaba, user, players, nextGameDay }) => {
  const [gameConfirmations,    setGameConfirmations]    = useState([]);
  const [myConfirmation,       setMyConfirmation]       = useState(null);
  const [confirmationDeadline, setConfirmationDeadline] = useState(null);
  const [canConfirm,           setCanConfirm]           = useState(false);
  const [loadingPresence,      setLoadingPresence]      = useState(false);

  // Carrega confirmações para uma data específica
  const loadConfirmations = useCallback(async (babaId, dateStr, playersData) => {
    try {
      const confirmations = await fetchConfirmations(babaId, dateStr);
      setGameConfirmations(confirmations);

      if (user && playersData) {
        const myPlayer = playersData.find(p => p.user_id === user.id);
        const mine = myPlayer
          ? confirmations.find(c => c.player_id === myPlayer.id) || null
          : null;
        setMyConfirmation(mine);
      }
    } catch (err) {
      console.error('[usePresence] loadConfirmations:', err);
    }
  }, [user]);

  // Sincroniza deadline e canConfirm a partir do nextGameDay
  const syncDeadline = useCallback((next) => {
    if (!next) {
      setConfirmationDeadline(null);
      setCanConfirm(false);
      return;
    }
    setConfirmationDeadline(next.deadline);
    setCanConfirm(new Date() < next.deadline);
  }, []);

  // Confirmar presença
  const confirmPresence = useCallback(async () => {
    if (!currentBaba || !user || !nextGameDay) return;
    setLoadingPresence(true);
    try {
      const myPlayer = players.find(p => p.user_id === user.id);
      if (!myPlayer) throw new Error('Jogador não encontrado');

      const data = await insertConfirmation({
        baba_id:   currentBaba.id,
        player_id: myPlayer.id,
        game_date: nextGameDay.dateStr,
      });

      setGameConfirmations(prev => [...prev, data]);
      setMyConfirmation(data);
      toast.success('Presença confirmada!');
    } catch (err) {
      console.error('[usePresence] confirmPresence:', err);
      toast.error('Erro ao confirmar');
    } finally {
      setLoadingPresence(false);
    }
  }, [currentBaba, user, players, nextGameDay]);

  // Cancelar presença
  const cancelConfirmation = useCallback(async () => {
    if (!myConfirmation) return;
    setLoadingPresence(true);
    try {
      await deleteConfirmation(myConfirmation.id);
      setGameConfirmations(prev => prev.filter(c => c.id !== myConfirmation.id));
      setMyConfirmation(null);
      toast.success('Presença cancelada');
    } catch (err) {
      console.error('[usePresence] cancelConfirmation:', err);
      toast.error('Erro ao cancelar');
    } finally {
      setLoadingPresence(false);
    }
  }, [myConfirmation]);

  return {
    gameConfirmations,
    myConfirmation,
    confirmationDeadline,
    canConfirm,
    loadingPresence,
    loadConfirmations,
    syncDeadline,
    confirmPresence,
    cancelConfirmation,
    setCanConfirm,
  };
};
