// src/__tests__/hooks/usePresence.test.js
// Sprint T-7 — Hook: usePresence

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePresence } from '../../hooks/usePresence';

vi.mock('../../services/supabase', () => ({ supabase: {} }));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  __esModule: true,
}));

const fetchConf  = vi.fn();
const insertConf = vi.fn();
const deleteConf = vi.fn();

vi.mock('../../services/matchService', () => ({
  fetchConfirmations: function() { return fetchConf.apply(null, arguments); },
  insertConfirmation: function() { return insertConf.apply(null, arguments); },
  deleteConfirmation: function() { return deleteConf.apply(null, arguments); },
}));

const user        = { id: 'user1' };
const players     = [{ id: 'p1', user_id: 'user1', name: 'João' }];
const nextGameDay = { dateStr: '2026-07-05', deadline: new Date(Date.now() + 3600000) };

function mkHook(opts) {
  opts = opts || {};
  return renderHook(function() {
    return usePresence({
      currentBaba: { id: 'baba1' },
      user:        user,
      players:     players,
      nextGameDay: nextGameDay,
      ...opts,
    });
  });
}

beforeEach(function() {
  vi.clearAllMocks();
  fetchConf.mockResolvedValue([]);
  insertConf.mockResolvedValue({ id: 'c1', player_id: 'p1', game_date: '2026-07-05' });
  deleteConf.mockResolvedValue(undefined);
});

describe('usePresence › estado inicial', () => {
  it('gameConfirmations começa vazio', () => {
    const { result } = mkHook();
    expect(result.current.gameConfirmations).toEqual([]);
  });

  it('myConfirmation começa null', () => {
    const { result } = mkHook();
    expect(result.current.myConfirmation).toBeNull();
  });

  it('loadingPresence começa false', () => {
    const { result } = mkHook();
    expect(result.current.loadingPresence).toBe(false);
  });
});

describe('usePresence › loadConfirmations', () => {
  it('popula gameConfirmations após load', async () => {
    const conf = [{ id: 'c1', player_id: 'p1' }];
    fetchConf.mockResolvedValueOnce(conf);
    const { result } = mkHook();
    await act(async function() {
      return result.current.loadConfirmations('baba1', '2026-07-05', players);
    });
    expect(result.current.gameConfirmations).toEqual(conf);
  });

  it('identifica myConfirmation do user logado', async () => {
    const conf = [{ id: 'c1', player_id: 'p1' }];
    fetchConf.mockResolvedValueOnce(conf);
    const { result } = mkHook();
    await act(async function() {
      return result.current.loadConfirmations('baba1', '2026-07-05', players);
    });
    expect(result.current.myConfirmation).toEqual(conf[0]);
  });
});

describe('usePresence › syncDeadline', () => {
  it('canConfirm=true quando deadline no futuro', () => {
    const { result } = mkHook();
    act(function() { result.current.syncDeadline(nextGameDay); });
    expect(result.current.canConfirm).toBe(true);
  });

  it('canConfirm=false quando deadline no passado', () => {
    const { result } = mkHook();
    const pastDay = { ...nextGameDay, deadline: new Date(Date.now() - 1000) };
    act(function() { result.current.syncDeadline(pastDay); });
    expect(result.current.canConfirm).toBe(false);
  });

  it('canConfirm=false quando next=null', () => {
    const { result } = mkHook();
    act(function() { result.current.syncDeadline(null); });
    expect(result.current.canConfirm).toBe(false);
  });
});

describe('usePresence › confirmPresence', () => {
  it('chama insertConfirmation', async () => {
    const { result } = mkHook();
    await act(async function() { return result.current.confirmPresence(); });
    expect(insertConf).toHaveBeenCalled();
  });

  it('adiciona à lista gameConfirmations', async () => {
    const { result } = mkHook();
    await act(async function() { return result.current.confirmPresence(); });
    expect(result.current.gameConfirmations).toHaveLength(1);
  });

  it('seta myConfirmation', async () => {
    const { result } = mkHook();
    await act(async function() { return result.current.confirmPresence(); });
    expect(result.current.myConfirmation).not.toBeNull();
  });

  it('não chama insert quando sem currentBaba', async () => {
    const { result } = renderHook(function() {
      return usePresence({ currentBaba: null, user, players, nextGameDay });
    });
    await act(async function() { return result.current.confirmPresence(); });
    expect(insertConf).not.toHaveBeenCalled();
  });
});

describe('usePresence › cancelConfirmation', () => {
  it('chama deleteConfirmation', async () => {
    const { result } = mkHook();
    await act(async function() { return result.current.confirmPresence(); });
    await act(async function() { return result.current.cancelConfirmation(); });
    expect(deleteConf).toHaveBeenCalledWith('c1');
  });

  it('remove da lista gameConfirmations', async () => {
    const { result } = mkHook();
    await act(async function() { return result.current.confirmPresence(); });
    await act(async function() { return result.current.cancelConfirmation(); });
    expect(result.current.gameConfirmations).toHaveLength(0);
  });

  it('reseta myConfirmation para null', async () => {
    const { result } = mkHook();
    await act(async function() { return result.current.confirmPresence(); });
    await act(async function() { return result.current.cancelConfirmation(); });
    expect(result.current.myConfirmation).toBeNull();
  });

  it('não chama delete quando myConfirmation=null', async () => {
    const { result } = mkHook();
    await act(async function() { return result.current.cancelConfirmation(); });
    expect(deleteConf).not.toHaveBeenCalled();
  });
});
