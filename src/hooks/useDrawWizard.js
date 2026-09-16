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

  // `update` aceita um objeto OU uma função (prev) => partial — igual ao
  // setState funcional do React. É isso que permite setDrawConfig/
  // setMatchState ficarem 100% estáveis (deps só de `update`, que nunca
  // muda) em vez de precisarem capturar state.drawConfig/state.matchState
  // no próprio useCallback.
  const update = useCallback((partialOrFn) => {
    setState(prev => {
      const partial = typeof partialOrFn === 'function' ? partialOrFn(prev) : partialOrFn;
      const next = { ...prev, ...partial };
      save(next);
      return next;
    });
  }, []);

  const setStep = useCallback((step) => update({ step }), [update]);

  // FIX: antes dependia de state.drawConfig — toda vez que drawConfig
  // mudava, essa função ganhava uma referência NOVA. Sem consequência aqui
  // sozinho, mas o mesmo padrão em setMatchState (abaixo) causava um loop
  // infinito real: o useEffect de persistência do StepMatch.jsx tem
  // setMatchState nas deps E chama setMatchState dentro dele — cada render
  // gerava uma função nova, que disparava o efeito de novo, que chamava
  // setMatchState de novo, sem nunca parar (era o "Maximum update depth"
  // que aparecia preso na tela). Usando prev direto do update() em vez do
  // state fechado no closure, a função fica estável de verdade.
  const setDrawConfig = useCallback(
    (configOrFn) => update(prev => ({
      drawConfig: typeof configOrFn === 'function'
        ? configOrFn(prev.drawConfig)
        : configOrFn,
    })),
    [update],
  );

  const setDrawResult = useCallback(
    (drawResult) => update({ drawResult, step: 2 }),
    [update],
  );

  const setMatchState = useCallback(
    (matchStateOrFn) => update(prev => ({
      matchState: typeof matchStateOrFn === 'function'
        ? matchStateOrFn(prev.matchState)
        : matchStateOrFn,
    })),
    [update],
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