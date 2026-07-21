// src/__tests__/hooks/useRatings_useRealtimeMatch_useOfflineQueue.test.js
// Sprint T-7 — Hooks: useRatings, useRealtimeMatch, useOfflineQueue

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks globais ────────────────────────────────────────────────────────────
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  __esModule: true,
}));

const mockSupabase = {
  from:          vi.fn(),
  rpc:           vi.fn(),
  channel:       vi.fn(),
  removeChannel: vi.fn(),
};
vi.mock('../../services/supabase', () => ({ supabase: mockSupabase }));

// ══════════════════════════════════════════════════════════════════════════════
// useRatings
// ══════════════════════════════════════════════════════════════════════════════
const mockFetchRatingsSummary = vi.fn();
const mockUpsertRating        = vi.fn();
const mockUpdateManualWeight  = vi.fn();

vi.mock('../../services/ratingsService', () => ({
  fetchRatingsSummary: (...args) => mockFetchRatingsSummary(...args),
  upsertRating:        (...args) => mockUpsertRating(...args),
  updateManualWeight:  (...args) => mockUpdateManualWeight(...args),
}));

import { useRatings } from '../../hooks/useRatings';

const currentBaba = { id: 'baba1' };
const user        = { id: 'user1' };
const players     = [{ id: 'p1', user_id: 'user1' }];

const mkRatings = (opts) =>
  renderHook(() => useRatings({ currentBaba, user, players, ...opts }));

describe('useRatings › getAllRatings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchRatingsSummary.mockResolvedValue([{ player_id: 'p1', final_rating: 4.2 }]);
    mockUpsertRating.mockResolvedValue(undefined);
    mockUpdateManualWeight.mockResolvedValue(undefined);
  });

  it('retorna lista de ratings do serviço', async () => {
    const { result } = mkRatings();
    let data;
    await act(async () => { data = await result.current.getAllRatings(); });
    expect(data).toHaveLength(1);
    expect(data[0].final_rating).toBe(4.2);
  });

  it('retorna [] quando currentBaba=null', async () => {
    const { result } = renderHook(() => useRatings({ currentBaba: null, user, players }));
    let data;
    await act(async () => { data = await result.current.getAllRatings(); });
    expect(data).toEqual([]);
  });

  it('retorna [] em caso de erro', async () => {
    mockFetchRatingsSummary.mockRejectedValueOnce(new Error('fail'));
    const { result } = mkRatings();
    let data;
    await act(async () => { data = await result.current.getAllRatings(); });
    expect(data).toEqual([]);
  });
});

describe('useRatings › ratePlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertRating.mockResolvedValue(undefined);
  });

  it('chama upsertRating com dados corretos', async () => {
    const { result } = mkRatings();
    await act(async () =>
      result.current.ratePlayer('p2', { skill: 4, physical: 3, commitment: 5 })
    );
    expect(mockUpsertRating).toHaveBeenCalledWith(
      expect.objectContaining({ ratedId: 'p2', skill: 4, physical: 3, commitment: 5 })
    );
  });

  it('não chama upsert quando sem user', async () => {
    const { result } = renderHook(() => useRatings({ currentBaba, user: null, players }));
    await act(async () =>
      result.current.ratePlayer('p2', { skill: 3, physical: 3, commitment: 3 })
    );
    expect(mockUpsertRating).not.toHaveBeenCalled();
  });
});

describe('useRatings › setManualWeight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateManualWeight.mockResolvedValue(undefined);
  });

  it('chama updateManualWeight com playerId, babaId e weight', async () => {
    const { result } = mkRatings();
    await act(async () => result.current.setManualWeight('p1', 4.5));
    expect(mockUpdateManualWeight).toHaveBeenCalledWith('p1', 'baba1', 4.5);
  });

  it('não chama quando currentBaba=null', async () => {
    const { result } = renderHook(() => useRatings({ currentBaba: null, user, players }));
    await act(async () => result.current.setManualWeight('p1', 3));
    expect(mockUpdateManualWeight).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// useRealtimeMatch
// ══════════════════════════════════════════════════════════════════════════════
import { useRealtimeMatch } from '../../hooks/useRealtimeMatch';

const channelMock = {
  on:          vi.fn().mockReturnThis(),
  subscribe:   vi.fn().mockReturnThis(),
  unsubscribe: vi.fn(),
};

function setupRealtimeMock(mpData, matchData) {
  mpData    = mpData    || [];
  matchData = matchData || {};
  mockSupabase.channel.mockReturnValue(channelMock);
  mockSupabase.from.mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: matchData }),
    then:   vi.fn(function(cb) { return Promise.resolve(cb({ data: mpData })); }),
  }));
}

describe('useRealtimeMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupRealtimeMock();
  });

  it('subscreve ao canal no mount', () => {
    renderHook(() => useRealtimeMatch('m1', vi.fn()));
    expect(mockSupabase.channel).toHaveBeenCalledWith('realtime:match:m1');
  });

  it('não subscreve quando matchId=null', () => {
    renderHook(() => useRealtimeMatch(null, vi.fn()));
    expect(mockSupabase.channel).not.toHaveBeenCalled();
  });

  it('não subscreve quando enabled=false', () => {
    renderHook(() => useRealtimeMatch('m1', vi.fn(), { enabled: false }));
    expect(mockSupabase.channel).not.toHaveBeenCalled();
  });

  it('desinscreve ao desmontar', () => {
    const { unmount } = renderHook(() => useRealtimeMatch('m1', vi.fn()));
    unmount();
    expect(channelMock.unsubscribe).toHaveBeenCalled();
  });

  it('chama onUpdate com scoreA e scoreB', async () => {
    const mpData = [
      { player_id: 'x', team: 'A', goals: 2, assists: 0 },
      { player_id: 'y', team: 'B', goals: 1, assists: 0 },
    ];
    setupRealtimeMock(mpData);
    const onUpdate = vi.fn();
    renderHook(() => useRealtimeMatch('m1', onUpdate));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    expect(onUpdate.mock.calls[0][0].scoreA).toBe(2);
    expect(onUpdate.mock.calls[0][0].scoreB).toBe(1);
  });

  it('retorna função refresh', () => {
    const { result } = renderHook(() => useRealtimeMatch('m1', vi.fn()));
    expect(typeof result.current.refresh).toBe('function');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// useOfflineQueue
// ══════════════════════════════════════════════════════════════════════════════
import { useOfflineQueue } from '../../hooks/useOfflineQueue';

describe('useOfflineQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
    mockSupabase.rpc = vi.fn().mockResolvedValue({ data: [], error: null });
  });

  it('isOnline = true quando navigator.onLine = true', () => {
    const { result } = renderHook(() => useOfflineQueue());
    expect(result.current.isOnline).toBe(true);
  });

  it('isOnline = false quando navigator.onLine = false', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    const { result } = renderHook(() => useOfflineQueue());
    expect(result.current.isOnline).toBe(false);
  });

  it('pendingCount inicia 0', () => {
    const { result } = renderHook(() => useOfflineQueue());
    expect(result.current.pendingCount).toBe(0);
  });

  it('enqueue adiciona item à fila', () => {
    const { result } = renderHook(() => useOfflineQueue());
    act(() => result.current.enqueue('confirm_presence', { baba_id: 'b1', game_date: '2026-07-05' }));
    expect(result.current.pendingCount).toBe(1);
  });

  it('dequeue remove item da fila', () => {
    const { result } = renderHook(() => useOfflineQueue());
    let clientId;
    act(() => { clientId = result.current.enqueue('op', {}); });
    act(() => result.current.dequeue(clientId));
    expect(result.current.pendingCount).toBe(0);
  });

  it('enqueue ignora duplicata (mesma op + payload)', () => {
    const { result } = renderHook(() => useOfflineQueue());
    const payload = { baba_id: 'b1', game_date: '2026-07-05' };
    act(() => result.current.enqueue('confirm_presence', payload));
    act(() => result.current.enqueue('confirm_presence', payload));
    expect(result.current.pendingCount).toBe(1);
  });

  it('execute online: chama onlineAction diretamente', async () => {
    const onlineAction = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useOfflineQueue());
    let res;
    await act(async () => {
      res = await result.current.execute('op', {}, onlineAction);
    });
    expect(onlineAction).toHaveBeenCalled();
    expect(res).toEqual({ ok: true });
  });

  it('execute offline: enfileira e retorna { queued: true }', async () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    const { result } = renderHook(() => useOfflineQueue());
    let res;
    await act(async () => {
      res = await result.current.execute(
        'confirm_presence',
        { baba_id: 'b1', game_date: '2026-07-05' },
        vi.fn()
      );
    });
    expect(res.queued).toBe(true);
    expect(result.current.pendingCount).toBe(1);
  });

  it('fila persiste no localStorage', () => {
    const { result } = renderHook(() => useOfflineQueue());
    act(() => result.current.enqueue('op', { baba_id: 'x' }));
    const stored = JSON.parse(localStorage.getItem('draft_play_offline_queue') || '[]');
    expect(stored).toHaveLength(1);
  });

  it('carrega fila do localStorage ao montar', () => {
    localStorage.setItem(
      'draft_play_offline_queue',
      JSON.stringify([{ client_id: 'pre1', operation: 'op', payload: {}, retry_count: 0 }])
    );
    const { result } = renderHook(() => useOfflineQueue());
    expect(result.current.pendingCount).toBe(1);
  });
});
