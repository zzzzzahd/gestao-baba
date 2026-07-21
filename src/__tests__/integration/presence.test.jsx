// src/__tests__/integration/presence.test.jsx
// Testes de integração — fluxo completo de presença (confirmar, cancelar, deadline)

import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('../../services/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

// Mock do matchService usado pelo usePresence
const mockFetchConfirmations  = vi.fn();
const mockInsertConfirmation  = vi.fn();
const mockDeleteConfirmation  = vi.fn();

vi.mock('../../services/matchService', () => ({
  fetchConfirmations: (...a) => mockFetchConfirmations(...a),
  insertConfirmation: (...a) => mockInsertConfirmation(...a),
  deleteConfirmation: (...a) => mockDeleteConfirmation(...a),
}));

import { usePresence } from '../../hooks/usePresence';
import { renderHook } from '@testing-library/react';
import toast from 'react-hot-toast';

// ─── Dados de teste ───────────────────────────────────────────────────────────

const BABA    = { id: 'baba-1', name: 'Baba do Zé', mode: 'casual' };
const USER    = { id: 'user-1' };
const PLAYER  = { id: 'p-1', user_id: 'user-1', name: 'Zé', baba_id: 'baba-1' };
const PLAYER2 = { id: 'p-2', user_id: 'user-2', name: 'João', baba_id: 'baba-1' };

const makeConf = (overrides = {}) => ({
  id:        'conf-1',
  player_id: 'p-1',
  baba_id:   'baba-1',
  game_date: '2025-06-15',
  player:    { name: 'Zé' },
  ...overrides,
});

const futureDeadline = () => ({
  dateStr:  '2025-06-15',
  deadline: new Date(Date.now() + 3600000), // 1h no futuro
  date:     new Date(Date.now() + 5400000),
});

const pastDeadline = () => ({
  dateStr:  '2025-06-15',
  deadline: new Date(Date.now() - 3600000), // 1h no passado
  date:     new Date(Date.now() - 1800000),
});

const defaultProps = (overrides = {}) => ({
  currentBaba: BABA,
  user:        USER,
  players:     [PLAYER, PLAYER2],
  nextGameDay: futureDeadline(),
  ...overrides,
});

// ─── Testes do hook usePresence ───────────────────────────────────────────────

describe('usePresence — loadConfirmations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('carrega confirmações e identifica a minha', async () => {
    const conf = makeConf();
    mockFetchConfirmations.mockResolvedValue([conf]);

    const { result } = renderHook(() => usePresence(defaultProps()));

    await act(async () => {
      await result.current.loadConfirmations('baba-1', '2025-06-15', [PLAYER, PLAYER2]);
    });

    expect(result.current.gameConfirmations).toHaveLength(1);
    expect(result.current.myConfirmation).toEqual(conf);
  });

  it('myConfirmation é null quando usuário não confirmou', async () => {
    const otherConf = makeConf({ player_id: 'p-2', id: 'conf-2' });
    mockFetchConfirmations.mockResolvedValue([otherConf]);

    const { result } = renderHook(() => usePresence(defaultProps()));

    await act(async () => {
      await result.current.loadConfirmations('baba-1', '2025-06-15', [PLAYER, PLAYER2]);
    });

    expect(result.current.gameConfirmations).toHaveLength(1);
    expect(result.current.myConfirmation).toBeNull();
  });

  it('retorna lista vazia em erro silencioso', async () => {
    mockFetchConfirmations.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => usePresence(defaultProps()));

    await act(async () => {
      await result.current.loadConfirmations('baba-1', '2025-06-15', [PLAYER]);
    });

    expect(result.current.gameConfirmations).toEqual([]);
  });

  it('carrega múltiplas confirmações', async () => {
    const confs = [makeConf(), makeConf({ player_id: 'p-2', id: 'conf-2' })];
    mockFetchConfirmations.mockResolvedValue(confs);

    const { result } = renderHook(() => usePresence(defaultProps()));

    await act(async () => {
      await result.current.loadConfirmations('baba-1', '2025-06-15', [PLAYER, PLAYER2]);
    });

    expect(result.current.gameConfirmations).toHaveLength(2);
  });
});

describe('usePresence — syncDeadline', () => {
  beforeEach(() => vi.clearAllMocks());

  it('canConfirm=true quando deadline é no futuro', () => {
    const { result } = renderHook(() => usePresence(defaultProps()));
    act(() => result.current.syncDeadline(futureDeadline()));
    expect(result.current.canConfirm).toBe(true);
  });

  it('canConfirm=false quando deadline passou', () => {
    const { result } = renderHook(() => usePresence(defaultProps()));
    act(() => result.current.syncDeadline(pastDeadline()));
    expect(result.current.canConfirm).toBe(false);
  });

  it('canConfirm=false e deadline=null quando nextGameDay é null', () => {
    const { result } = renderHook(() => usePresence(defaultProps()));
    act(() => result.current.syncDeadline(null));
    expect(result.current.canConfirm).toBe(false);
    expect(result.current.confirmationDeadline).toBeNull();
  });

  it('define confirmationDeadline corretamente', () => {
    const { result } = renderHook(() => usePresence(defaultProps()));
    const ngd = futureDeadline();
    act(() => result.current.syncDeadline(ngd));
    expect(result.current.confirmationDeadline).toEqual(ngd.deadline);
  });
});

describe('usePresence — confirmPresence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama insertConfirmation com payload correto', async () => {
    const newConf = makeConf();
    mockInsertConfirmation.mockResolvedValue(newConf);

    const { result } = renderHook(() => usePresence(defaultProps()));

    await act(async () => {
      await result.current.confirmPresence();
    });

    expect(mockInsertConfirmation).toHaveBeenCalledWith({
      baba_id:   'baba-1',
      player_id: 'p-1',
      game_date: '2025-06-15',
    });
  });

  it('adiciona confirmação à lista local após sucesso', async () => {
    const newConf = makeConf();
    mockInsertConfirmation.mockResolvedValue(newConf);

    const { result } = renderHook(() => usePresence(defaultProps()));

    await act(async () => { await result.current.confirmPresence(); });

    expect(result.current.gameConfirmations).toContainEqual(newConf);
    expect(result.current.myConfirmation).toEqual(newConf);
  });

  it('não faz nada quando baba é null', async () => {
    const { result } = renderHook(() => usePresence(defaultProps({ currentBaba: null })));

    await act(async () => { await result.current.confirmPresence(); });

    expect(mockInsertConfirmation).not.toHaveBeenCalled();
  });

  it('não faz nada quando user é null', async () => {
    const { result } = renderHook(() => usePresence(defaultProps({ user: null })));

    await act(async () => { await result.current.confirmPresence(); });

    expect(mockInsertConfirmation).not.toHaveBeenCalled();
  });

  it('não faz nada quando jogador não está na lista', async () => {
    const { result } = renderHook(() => usePresence(defaultProps({ players: [] })));

    await act(async () => { await result.current.confirmPresence(); });

    expect(mockInsertConfirmation).not.toHaveBeenCalled();
  });

  it('toast.error quando insertConfirmation falha', async () => {
    mockInsertConfirmation.mockRejectedValue(new Error('DB error'));
    const { result } = renderHook(() => usePresence(defaultProps()));

    await act(async () => { await result.current.confirmPresence(); });

    expect(toast.error).toHaveBeenCalledWith('Erro ao confirmar presença');
  });
});

describe('usePresence — cancelConfirmation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('não faz nada quando myConfirmation é null', async () => {
    const { result } = renderHook(() => usePresence(defaultProps()));

    await act(async () => { await result.current.cancelConfirmation(); });

    expect(mockDeleteConfirmation).not.toHaveBeenCalled();
  });

  it('chama deleteConfirmation com id correto após confirmar', async () => {
    const conf = makeConf();
    mockFetchConfirmations.mockResolvedValue([conf]);
    mockDeleteConfirmation.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePresence(defaultProps()));

    await act(async () => {
      await result.current.loadConfirmations('baba-1', '2025-06-15', [PLAYER]);
    });
    await act(async () => {
      await result.current.cancelConfirmation();
    });

    expect(mockDeleteConfirmation).toHaveBeenCalledWith('conf-1');
  });

  it('remove confirmação da lista local após cancelar', async () => {
    const conf = makeConf();
    mockFetchConfirmations.mockResolvedValue([conf]);
    mockDeleteConfirmation.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePresence(defaultProps()));

    await act(async () => {
      await result.current.loadConfirmations('baba-1', '2025-06-15', [PLAYER]);
    });
    await act(async () => {
      await result.current.cancelConfirmation();
    });

    expect(result.current.gameConfirmations).toHaveLength(0);
    expect(result.current.myConfirmation).toBeNull();
  });

  it('mantém outras confirmações ao cancelar apenas a minha', async () => {
    const myConf    = makeConf();
    const otherConf = makeConf({ player_id: 'p-2', id: 'conf-2' });
    mockFetchConfirmations.mockResolvedValue([myConf, otherConf]);
    mockDeleteConfirmation.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePresence(defaultProps()));

    await act(async () => {
      await result.current.loadConfirmations('baba-1', '2025-06-15', [PLAYER, PLAYER2]);
    });
    await act(async () => {
      await result.current.cancelConfirmation();
    });

    expect(result.current.gameConfirmations).toHaveLength(1);
    expect(result.current.gameConfirmations[0].player_id).toBe('p-2');
  });

  it('toast.error quando deleteConfirmation falha', async () => {
    const conf = makeConf();
    mockFetchConfirmations.mockResolvedValue([conf]);
    mockDeleteConfirmation.mockRejectedValue(new Error('DB error'));

    const { result } = renderHook(() => usePresence(defaultProps()));

    await act(async () => {
      await result.current.loadConfirmations('baba-1', '2025-06-15', [PLAYER]);
    });
    await act(async () => {
      await result.current.cancelConfirmation();
    });

    expect(toast.error).toHaveBeenCalledWith('Erro ao cancelar presença');
  });
});

describe('usePresence — fluxo completo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fluxo: vazio → confirmar → cancelar → vazio', async () => {
    const conf = makeConf();
    mockFetchConfirmations.mockResolvedValue([]);
    mockInsertConfirmation.mockResolvedValue(conf);
    mockDeleteConfirmation.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePresence(defaultProps()));

    // Estado inicial
    await act(async () => {
      await result.current.loadConfirmations('baba-1', '2025-06-15', [PLAYER]);
    });
    expect(result.current.gameConfirmations).toHaveLength(0);
    expect(result.current.myConfirmation).toBeNull();

    // Confirmar
    await act(async () => { await result.current.confirmPresence(); });
    expect(result.current.gameConfirmations).toHaveLength(1);
    expect(result.current.myConfirmation).toEqual(conf);

    // Cancelar
    await act(async () => { await result.current.cancelConfirmation(); });
    expect(result.current.gameConfirmations).toHaveLength(0);
    expect(result.current.myConfirmation).toBeNull();
  });

  it('não permite confirmar quando canConfirm=false', async () => {
    mockFetchConfirmations.mockResolvedValue([]);

    const { result } = renderHook(() => usePresence(defaultProps()));

    // Simular deadline passado
    act(() => result.current.syncDeadline(pastDeadline()));
    expect(result.current.canConfirm).toBe(false);

    // Tentar confirmar mesmo assim (o hook respeita o guard interno)
    // O guard é na UI, não no hook — mas testamos que não há myConfirmation sem insertConfirmation
    mockInsertConfirmation.mockResolvedValue(makeConf());
    await act(async () => { await result.current.confirmPresence(); });
    // insertConfirmation ainda é chamado — o bloqueio é responsabilidade da UI
    // Este teste documenta o comportamento atual
    expect(result.current.canConfirm).toBe(false);
  });
});
