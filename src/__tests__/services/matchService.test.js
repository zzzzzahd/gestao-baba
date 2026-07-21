// src/__tests__/services/matchService.test.js
// Sprint T-9 — Service: matchService

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchDrawResult,
  upsertDrawResult,
  fetchTodayMatch,
  fetchMatchHistory,
  insertMatch,
  updateMatch,
  finalizeMatch,
  fetchMatchPlayers,
  insertMatchPlayers,
  updatePlayerStat,
  fetchConfirmations,
  insertConfirmation,
  deleteConfirmation,
} from '../../services/matchService';

const { supabase } = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
}));
vi.mock('../../services/supabase', () => ({ supabase }));

function mkChain(data, error, count) {
  data  = data  !== undefined ? data  : null;
  error = error !== undefined ? error : null;
  count = count !== undefined ? count : null;
  const c = {
    select:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    gte:         vi.fn().mockReturnThis(),
    lte:         vi.fn().mockReturnThis(),
    order:       vi.fn().mockReturnThis(),
    range:       vi.fn().mockReturnThis(),
    insert:      vi.fn().mockReturnThis(),
    update:      vi.fn().mockReturnThis(),
    upsert:      vi.fn().mockReturnThis(),
    delete:      vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    single:      vi.fn().mockResolvedValue({ data, error }),
  };
  c.then = vi.fn(function(cb) { return Promise.resolve(cb({ data, error, count })); });
  return c;
}

beforeEach(() => vi.clearAllMocks());

// ─── fetchDrawResult ──────────────────────────────────────────────────────────
describe('fetchDrawResult', () => {
  it('retorna draw result pelo babaId e dateStr', async () => {
    supabase.from.mockReturnValue(mkChain({ id: 'dr1' }));
    const result = await fetchDrawResult('b1', '2026-07-05');
    expect(result).toEqual({ id: 'dr1' });
    expect(supabase.from).toHaveBeenCalledWith('draw_results');
  });

  it('retorna null quando não encontrado', async () => {
    supabase.from.mockReturnValue(mkChain(null));
    const result = await fetchDrawResult('b1', '2026-07-05');
    expect(result).toBeNull();
  });

  it('lança erro quando supabase falha', async () => {
    supabase.from.mockReturnValue(mkChain(null, { message: 'draw error' }));
    await expect(fetchDrawResult('b1', '2026-07-05')).rejects.toBeDefined();
  });
});

// ─── upsertDrawResult ─────────────────────────────────────────────────────────
describe('upsertDrawResult', () => {
  it('chama upsert e retorna dado', async () => {
    const payload = { baba_id: 'b1', draw_date: '2026-07-05', teams: {} };
    const c = mkChain({ id: 'dr2', ...payload });
    supabase.from.mockReturnValue(c);
    const result = await upsertDrawResult(payload);
    expect(c.upsert).toHaveBeenCalledWith(payload);
    expect(result.id).toBe('dr2');
  });
});

// ─── fetchTodayMatch ──────────────────────────────────────────────────────────
describe('fetchTodayMatch', () => {
  it('filtra por babaId e range de data do dia', async () => {
    const c = mkChain({ id: 'm1' });
    supabase.from.mockReturnValue(c);
    await fetchTodayMatch('b1', '2026-07-05');
    expect(c.gte).toHaveBeenCalledWith('match_date', '2026-07-05T00:00:00');
    expect(c.lte).toHaveBeenCalledWith('match_date', '2026-07-05T23:59:59');
  });

  it('retorna null quando não há partida hoje', async () => {
    supabase.from.mockReturnValue(mkChain(null));
    const result = await fetchTodayMatch('b1', '2026-07-05');
    expect(result).toBeNull();
  });
});

// ─── fetchMatchHistory ────────────────────────────────────────────────────────
describe('fetchMatchHistory', () => {
  it('retorna { data, count }', async () => {
    supabase.from.mockReturnValue(mkChain([{ id: 'm1' }], null, 1));
    const result = await fetchMatchHistory('b1');
    expect(result.data).toHaveLength(1);
    expect(result.count).toBe(1);
  });

  it('retorna arrays vazios quando data=null', async () => {
    supabase.from.mockReturnValue(mkChain(null, null, 0));
    const result = await fetchMatchHistory('b1');
    expect(result.data).toEqual([]);
  });

  it('aplica filtro status=finished quando filter="finished"', async () => {
    const c = mkChain([], null, 0);
    supabase.from.mockReturnValue(c);
    await fetchMatchHistory('b1', { filter: 'finished' });
    expect(c.eq).toHaveBeenCalledWith('status', 'finished');
  });

  it('usa paginação page e pageSize', async () => {
    const c = mkChain([], null, 0);
    supabase.from.mockReturnValue(c);
    await fetchMatchHistory('b1', { page: 2, pageSize: 5 });
    expect(c.range).toHaveBeenCalledWith(10, 14);
  });
});

// ─── insertMatch ──────────────────────────────────────────────────────────────
describe('insertMatch', () => {
  it('insere e retorna a partida criada', async () => {
    const payload = { baba_id: 'b1', status: 'ongoing' };
    const c = mkChain({ id: 'm1', ...payload });
    supabase.from.mockReturnValue(c);
    const result = await insertMatch(payload);
    expect(c.insert).toHaveBeenCalledWith([payload]);
    expect(result.id).toBe('m1');
  });
});

// ─── updateMatch ─────────────────────────────────────────────────────────────
describe('updateMatch', () => {
  it('atualiza e retorna partida', async () => {
    const c = mkChain({ id: 'm1', status: 'finished' });
    supabase.from.mockReturnValue(c);
    const result = await updateMatch('m1', { status: 'finished' });
    expect(c.update).toHaveBeenCalledWith({ status: 'finished' });
    expect(result.status).toBe('finished');
  });
});

// ─── finalizeMatch ────────────────────────────────────────────────────────────
describe('finalizeMatch', () => {
  it('atualiza status=finished, winner_team, scores e finished_at', async () => {
    const c = mkChain({ id: 'm1', status: 'finished' });
    supabase.from.mockReturnValue(c);
    await finalizeMatch('m1', { winnerTeam: 'A', scoreA: 3, scoreB: 1 });
    expect(c.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status:       'finished',
        winner_team:  'A',
        team_a_score: 3,
        team_b_score: 1,
      })
    );
  });

  it('inclui finished_at como ISO string', async () => {
    const c = mkChain({ id: 'm1' });
    supabase.from.mockReturnValue(c);
    await finalizeMatch('m1', { winnerTeam: null, scoreA: 1, scoreB: 1 });
    const update = c.update.mock.calls[0][0];
    expect(typeof update.finished_at).toBe('string');
    expect(update.finished_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ─── fetchMatchPlayers ────────────────────────────────────────────────────────
describe('fetchMatchPlayers', () => {
  it('retorna lista de match_players', async () => {
    supabase.from.mockReturnValue(mkChain([{ player_id: 'p1', team: 'A', goals: 2 }]));
    const result = await fetchMatchPlayers('m1');
    expect(result).toHaveLength(1);
  });

  it('retorna [] quando data=null', async () => {
    supabase.from.mockReturnValue(mkChain(null));
    const result = await fetchMatchPlayers('m1');
    expect(result).toEqual([]);
  });
});

// ─── insertMatchPlayers ───────────────────────────────────────────────────────
describe('insertMatchPlayers', () => {
  it('não chama supabase quando lista vazia', async () => {
    await insertMatchPlayers([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('chama insert com todos os players', async () => {
    const c = mkChain(null);
    supabase.from.mockReturnValue(c);
    const players = [
      { match_id: 'm1', player_id: 'p1', team: 'A' },
      { match_id: 'm1', player_id: 'p2', team: 'B' },
    ];
    await insertMatchPlayers(players);
    expect(c.insert).toHaveBeenCalledWith(players);
  });
});

// ─── updatePlayerStat ────────────────────────────────────────────────────────
describe('updatePlayerStat', () => {
  it('soma delta ao valor atual', async () => {
    const getChain    = mkChain({ goals: 2 });
    const updateChain = mkChain(null);
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? getChain : updateChain;
    });
    await updatePlayerStat('m1', 'p1', 'goals', 1);
    expect(updateChain.update).toHaveBeenCalledWith({ goals: 3 });
  });
});

// ─── fetchConfirmations ───────────────────────────────────────────────────────
describe('fetchConfirmations', () => {
  it('retorna lista de confirmações', async () => {
    supabase.from.mockReturnValue(mkChain([{ id: 'c1', player_id: 'p1' }]));
    const result = await fetchConfirmations('b1', '2026-07-05');
    expect(result).toHaveLength(1);
  });

  it('retorna [] quando data=null', async () => {
    supabase.from.mockReturnValue(mkChain(null));
    const result = await fetchConfirmations('b1', '2026-07-05');
    expect(result).toEqual([]);
  });

  it('filtra por baba_id e game_date', async () => {
    const c = mkChain([]);
    supabase.from.mockReturnValue(c);
    await fetchConfirmations('baba99', '2026-07-10');
    expect(c.eq).toHaveBeenCalledWith('baba_id', 'baba99');
    expect(c.eq).toHaveBeenCalledWith('game_date', '2026-07-10');
  });
});

// ─── insertConfirmation ───────────────────────────────────────────────────────
describe('insertConfirmation', () => {
  it('retorna a confirmação criada', async () => {
    const payload = { baba_id: 'b1', player_id: 'p1', game_date: '2026-07-05' };
    supabase.from.mockReturnValue(mkChain({ id: 'c1', ...payload }));
    const result = await insertConfirmation(payload);
    expect(result.id).toBe('c1');
  });
});

// ─── deleteConfirmation ───────────────────────────────────────────────────────
describe('deleteConfirmation', () => {
  it('chama delete com o ID correto', async () => {
    const c = mkChain(null);
    supabase.from.mockReturnValue(c);
    await deleteConfirmation('c1');
    expect(c.delete).toHaveBeenCalled();
    expect(c.eq).toHaveBeenCalledWith('id', 'c1');
  });
});
