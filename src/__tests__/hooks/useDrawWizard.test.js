// src/__tests__/hooks/useDrawWizard.test.js
// Testes para o hook de estado persistido do wizard de sorteio

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDrawWizard, clearDrawWizard } from '../../hooks/useDrawWizard';

const STORAGE_KEY = 'draft_play_draw_wizard';

const DEFAULT_CONFIG = { playersPerTeam: 5, strategy: 'reserve' };

describe('useDrawWizard — estado inicial', () => {
  beforeEach(() => localStorage.clear());

  it('começa no step 1', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    expect(result.current.step).toBe(1);
  });

  it('começa com drawConfig padrão', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    expect(result.current.drawConfig).toEqual(DEFAULT_CONFIG);
  });

  it('começa com drawResult null', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    expect(result.current.drawResult).toBeNull();
  });

  it('começa com matchState null', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    expect(result.current.matchState).toBeNull();
  });

  it('carrega estado salvo do localStorage para o mesmo baba', () => {
    const saved = {
      step: 2,
      drawConfig: { playersPerTeam: 6, strategy: 'substitute' },
      drawResult: { teams: [], reserves: [] },
      matchState: null,
      babaId: 'baba-1',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    expect(result.current.step).toBe(2);
    expect(result.current.drawConfig.playersPerTeam).toBe(6);
  });

  it('ignora localStorage de outro baba e reseta', () => {
    const saved = {
      step: 3,
      drawConfig: { playersPerTeam: 7, strategy: 'reserve' },
      drawResult: null,
      matchState: null,
      babaId: 'baba-outro',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    expect(result.current.step).toBe(1);
    expect(result.current.drawConfig).toEqual(DEFAULT_CONFIG);
  });

  it('retorna estado padrão quando localStorage tem JSON inválido', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid{{json');
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    expect(result.current.step).toBe(1);
  });
});

describe('useDrawWizard — setStep', () => {
  beforeEach(() => localStorage.clear());

  it('avança para step 2', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    act(() => result.current.setStep(2));
    expect(result.current.step).toBe(2);
  });

  it('avança para step 3', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    act(() => result.current.setStep(3));
    expect(result.current.step).toBe(3);
  });

  it('persiste step no localStorage', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    act(() => result.current.setStep(2));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.step).toBe(2);
  });

  it('mantém outros campos ao mudar step', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    act(() => result.current.setDrawConfig({ playersPerTeam: 7, strategy: 'reserve' }));
    act(() => result.current.setStep(2));
    expect(result.current.drawConfig.playersPerTeam).toBe(7);
  });
});

describe('useDrawWizard — setDrawConfig', () => {
  beforeEach(() => localStorage.clear());

  it('atualiza playersPerTeam via objeto', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    act(() => result.current.setDrawConfig({ playersPerTeam: 6, strategy: 'reserve' }));
    expect(result.current.drawConfig.playersPerTeam).toBe(6);
  });

  it('atualiza strategy', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    act(() => result.current.setDrawConfig({ playersPerTeam: 5, strategy: 'substitute' }));
    expect(result.current.drawConfig.strategy).toBe('substitute');
  });

  it('aceita função como argumento (updater)', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    act(() => result.current.setDrawConfig(prev => ({ ...prev, playersPerTeam: prev.playersPerTeam + 1 })));
    expect(result.current.drawConfig.playersPerTeam).toBe(6);
  });

  it('persiste no localStorage', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    act(() => result.current.setDrawConfig({ playersPerTeam: 8, strategy: 'reserve' }));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.drawConfig.playersPerTeam).toBe(8);
  });
});

describe('useDrawWizard — setDrawResult', () => {
  beforeEach(() => localStorage.clear());

  it('define drawResult e avança para step 2', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    const drawResult = { teams: [{ name: 'Time A', players: [] }], reserves: [] };
    act(() => result.current.setDrawResult(drawResult));
    expect(result.current.drawResult).toEqual(drawResult);
    expect(result.current.step).toBe(2);
  });

  it('persiste drawResult no localStorage', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    const drawResult = { teams: [], reserves: [{ id: 'r-1' }] };
    act(() => result.current.setDrawResult(drawResult));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.drawResult.reserves).toHaveLength(1);
  });
});

describe('useDrawWizard — setMatchState', () => {
  beforeEach(() => localStorage.clear());

  it('define matchState', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    const ms = { matchId: 'match-1', timer: 0, currentMatch: null };
    act(() => result.current.setMatchState(ms));
    expect(result.current.matchState).toEqual(ms);
  });

  it('aceita função como argumento (updater)', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    act(() => result.current.setMatchState({ timer: 0, matchId: 'x' }));
    act(() => result.current.setMatchState(prev => ({ ...prev, timer: 60 })));
    expect(result.current.matchState.timer).toBe(60);
  });

  it('persiste matchState no localStorage', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    act(() => result.current.setMatchState({ matchId: 'm-1', timer: 30 }));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.matchState.matchId).toBe('m-1');
  });
});

describe('useDrawWizard — reset', () => {
  beforeEach(() => localStorage.clear());

  it('volta ao step 1', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    act(() => result.current.setStep(3));
    act(() => result.current.reset());
    expect(result.current.step).toBe(1);
  });

  it('limpa drawResult', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    act(() => result.current.setDrawResult({ teams: [], reserves: [] }));
    act(() => result.current.reset());
    expect(result.current.drawResult).toBeNull();
  });

  it('limpa matchState', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    act(() => result.current.setMatchState({ matchId: 'x' }));
    act(() => result.current.reset());
    expect(result.current.matchState).toBeNull();
  });

  it('restaura drawConfig padrão', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    act(() => result.current.setDrawConfig({ playersPerTeam: 9, strategy: 'substitute' }));
    act(() => result.current.reset());
    expect(result.current.drawConfig).toEqual(DEFAULT_CONFIG);
  });

  it('persiste estado resetado no localStorage', () => {
    const { result } = renderHook(() => useDrawWizard('baba-1'));
    act(() => result.current.setStep(2));
    act(() => result.current.reset());
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.step).toBe(1);
    expect(saved.drawResult).toBeNull();
  });
});

describe('clearDrawWizard', () => {
  beforeEach(() => localStorage.clear());

  it('remove a chave do localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: 2 }));
    clearDrawWizard();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('não lança erro quando chave não existe', () => {
    expect(() => clearDrawWizard()).not.toThrow();
  });

  it('novo hook após clearDrawWizard começa do zero', () => {
    const { result: r1 } = renderHook(() => useDrawWizard('baba-1'));
    act(() => r1.current.setStep(3));
    clearDrawWizard();
    const { result: r2 } = renderHook(() => useDrawWizard('baba-1'));
    expect(r2.current.step).toBe(1);
  });
});

describe('useDrawWizard — troca de baba', () => {
  beforeEach(() => localStorage.clear());

  it('reseta estado ao trocar babaId', () => {
    const { result, rerender } = renderHook(({ id }) => useDrawWizard(id), {
      initialProps: { id: 'baba-1' },
    });
    act(() => result.current.setStep(3));
    act(() => result.current.setDrawConfig({ playersPerTeam: 8, strategy: 'substitute' }));

    rerender({ id: 'baba-2' });

    expect(result.current.step).toBe(1);
    expect(result.current.drawConfig).toEqual(DEFAULT_CONFIG);
    expect(result.current.drawResult).toBeNull();
  });

  it('persiste babaId novo no localStorage após troca', () => {
    const { rerender } = renderHook(({ id }) => useDrawWizard(id), {
      initialProps: { id: 'baba-1' },
    });
    rerender({ id: 'baba-2' });
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.babaId).toBe('baba-2');
  });
});
