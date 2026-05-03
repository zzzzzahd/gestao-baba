// src/hooks/useDrawWizard.js
// ─────────────────────────────────────────────────────────────────────────────
// Estado centralizado do wizard /draw.
// Persiste em localStorage para sobreviver a navegações de volta.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'draft_play_draw_wizard';

const DEFAULT_STATE = {
  step: 1,           // 1 = Config, 2 = Times, 3 = Partida
  drawConfig: { playersPerTeam: 5, strategy: 'reserve' },
  drawResult: null,  // { teams, reserves } do sorteio
  matchState: null,  // { allTeams, currentMatch, matchId, timer }
  babaId: null,      // para invalidar cache ao trocar de baba
};

const load = (babaId) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE, babaId };
    const parsed = JSON.parse(raw);
    // Se trocou de baba, reseta
    if (parsed.babaId !== babaId) return { ...DEFAULT_STATE, babaId };
    return parsed;
  } catch {
    return { ...DEFAULT_STATE, babaId };
  }
};

const save = (state) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
};

export const clearDrawWizard = () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useDrawWizard = (babaId) => {
  const [state, setState] = useState(() => load(babaId));

  // Sincronizar ao trocar de baba
  useEffect(() => {
    if (babaId && state.babaId !== babaId) {
      const fresh = { ...DEFAULT_STATE, babaId };
      setState(fresh);
      save(fresh);
    }
  }, [babaId]);

  const update = useCallback((partial) => {
    setState(prev => {
      const next = { ...prev, ...partial };
      save(next);
      return next;
    });
  }, []);

  const setStep = useCallback((step) => update({ step }), [update]);

  const setDrawConfig = useCallback(
    (configOrFn) => update({
      drawConfig: typeof configOrFn === 'function'
        ? configOrFn(state.drawConfig)
        : configOrFn,
    }),
    [update, state.drawConfig],
  );

  const setDrawResult = useCallback(
    (drawResult) => update({ drawResult, step: 2 }),
    [update],
  );

  const setMatchState = useCallback(
    (matchStateOrFn) => update({
      matchState: typeof matchStateOrFn === 'function'
        ? matchStateOrFn(state.matchState)
        : matchStateOrFn,
    }),
    [update, state.matchState],
  );

  const reset = useCallback(() => {
    const fresh = { ...DEFAULT_STATE, babaId };
    setState(fresh);
    save(fresh);
  }, [babaId]);

  return {
    step:        state.step,
    drawConfig:  state.drawConfig,
    drawResult:  state.drawResult,
    matchState:  state.matchState,
    setStep,
    setDrawConfig,
    setDrawResult,
    setMatchState,
    reset,
  };
};
