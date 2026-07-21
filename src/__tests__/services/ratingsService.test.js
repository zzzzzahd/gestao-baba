// src/__tests__/services/ratingsService.test.js
// Sprint T-9 — Service: ratingsService

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchRatingsSummary,
  fetchPlayerRatingSummary,
  upsertRating,
  updateManualWeight,
  fetchStatsRanking,
} from '../../services/ratingsService';

const { supabase } = vi.hoisted(() => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));
vi.mock('../../services/supabase', () => ({ supabase }));

function mkChain(data, error) {
  data  = data  !== undefined ? data  : null;
  error = error !== undefined ? error : null;
  const c = {
    from:        vi.fn().mockReturnThis(),
    select:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    order:       vi.fn().mockReturnThis(),
    gte:         vi.fn().mockReturnThis(),
    update:      vi.fn().mockReturnThis(),
    upsert:      vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
  c.then = vi.fn(function(cb) { return Promise.resolve(cb({ data, error })); });
  return c;
}

beforeEach(() => vi.clearAllMocks());

// ─── fetchRatingsSummary ──────────────────────────────────────────────────────
describe('fetchRatingsSummary', () => {
  it('retorna lista mapeada com name e position', async () => {
    const raw = [{
      player_id: 'p1', final_rating: 4.2, baba_id: 'b1',
      player: { name: 'João', position: 'meia' },
    }];
    supabase.from.mockReturnValue(mkChain(raw));
    const result = await fetchRatingsSummary('b1');
    expect(result[0].name).toBe('João');
    expect(result[0].position).toBe('meia');
  });

  it('usa fallback "Jogador" quando player.name ausente', async () => {
    const raw = [{ player_id: 'p1', final_rating: 3, player: {} }];
    supabase.from.mockReturnValue(mkChain(raw));
    const result = await fetchRatingsSummary('b1');
    expect(result[0].name).toBe('Jogador');
  });

  it('usa fallback "linha" quando player.position ausente', async () => {
    const raw = [{ player_id: 'p1', final_rating: 3, player: { name: 'X' } }];
    supabase.from.mockReturnValue(mkChain(raw));
    const result = await fetchRatingsSummary('b1');
    expect(result[0].position).toBe('linha');
  });

  it('retorna [] quando data=null', async () => {
    supabase.from.mockReturnValue(mkChain(null));
    const result = await fetchRatingsSummary('b1');
    expect(result).toEqual([]);
  });

  it('lança erro quando supabase retorna error', async () => {
    supabase.from.mockReturnValue(mkChain(null, { message: 'db error' }));
    await expect(fetchRatingsSummary('b1')).rejects.toMatchObject({ message: 'db error' });
  });

  it('filtra por baba_id', async () => {
    const c = mkChain([]);
    supabase.from.mockReturnValue(c);
    await fetchRatingsSummary('baba99');
    expect(c.eq).toHaveBeenCalledWith('baba_id', 'baba99');
  });
});

// ─── fetchPlayerRatingSummary ─────────────────────────────────────────────────
describe('fetchPlayerRatingSummary', () => {
  it('retorna dado único via maybeSingle', async () => {
    const c = mkChain({ player_id: 'p1', final_rating: 4 });
    supabase.from.mockReturnValue(c);
    const result = await fetchPlayerRatingSummary('p1', 'b1');
    expect(result.player_id).toBe('p1');
  });

  it('retorna null quando não encontrado', async () => {
    const c = mkChain(null);
    supabase.from.mockReturnValue(c);
    const result = await fetchPlayerRatingSummary('p99', 'b1');
    expect(result).toBeNull();
  });
});

// ─── upsertRating ─────────────────────────────────────────────────────────────
describe('upsertRating', () => {
  it('chama supabase.from(player_ratings).upsert', async () => {
    const c = mkChain(null);
    supabase.from.mockReturnValue(c);
    await upsertRating({ babaId: 'b1', raterId: 'r1', ratedId: 'rd1', skill: 4, physical: 3, commitment: 5 });
    expect(supabase.from).toHaveBeenCalledWith('player_ratings');
    expect(c.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ skill: 4, physical: 3, commitment: 5 }),
      { onConflict: 'baba_id,rater_id,rated_id' }
    );
  });

  it('lança erro quando supabase retorna error', async () => {
    supabase.from.mockReturnValue(mkChain(null, { message: 'upsert fail' }));
    await expect(
      upsertRating({ babaId: 'b1', raterId: 'r1', ratedId: 'rd1', skill: 3, physical: 3, commitment: 3 })
    ).rejects.toMatchObject({ message: 'upsert fail' });
  });
});

// ─── updateManualWeight ───────────────────────────────────────────────────────
describe('updateManualWeight', () => {
  it('clampeia weight acima de 5 para 5', async () => {
    const c = mkChain(null);
    supabase.from.mockReturnValue(c);
    supabase.rpc.mockResolvedValue({ error: null });
    await updateManualWeight('p1', 'b1', 10);
    expect(c.update).toHaveBeenCalledWith({ manual_weight: 5 });
  });

  it('clampeia weight negativo para 0', async () => {
    const c = mkChain(null);
    supabase.from.mockReturnValue(c);
    supabase.rpc.mockResolvedValue({ error: null });
    await updateManualWeight('p1', 'b1', -3);
    expect(c.update).toHaveBeenCalledWith({ manual_weight: 0 });
  });

  it('chama recalculateRating após atualizar', async () => {
    const c = mkChain(null);
    supabase.from.mockReturnValue(c);
    supabase.rpc.mockResolvedValue({ error: null });
    await updateManualWeight('p1', 'b1', 3);
    expect(supabase.rpc).toHaveBeenCalledWith('recalculate_player_rating',
      expect.objectContaining({ p_rated_id: 'p1', p_baba_id: 'b1' })
    );
  });
});

// ─── fetchStatsRanking ────────────────────────────────────────────────────────
describe('fetchStatsRanking', () => {
  const rawPlayers = [
    { player_id: 'p1', goals: 2, assists: 1,
      player: { name: 'João', position: 'atacante' },
      match: { match_date: '2026-06-01', baba_id: 'b1' } },
    { player_id: 'p1', goals: 1, assists: 0,
      player: { name: 'João', position: 'atacante' },
      match: { match_date: '2026-06-15', baba_id: 'b1' } },
    { player_id: 'p2', goals: 3, assists: 2,
      player: { name: 'Maria', position: 'meia' },
      match: { match_date: '2026-06-01', baba_id: 'b1' } },
  ];

  it('agrega gols de múltiplas partidas do mesmo jogador', async () => {
    supabase.from.mockReturnValue(mkChain(rawPlayers));
    const result = await fetchStatsRanking('b1');
    const joao = result.find(function(r) { return r.id === 'p1'; });
    expect(joao.goals).toBe(3);
  });

  it('conta matches corretamente', async () => {
    supabase.from.mockReturnValue(mkChain(rawPlayers));
    const result = await fetchStatsRanking('b1');
    const joao = result.find(function(r) { return r.id === 'p1'; });
    expect(joao.matches).toBe(2);
  });

  it('retorna [] quando data=null', async () => {
    supabase.from.mockReturnValue(mkChain(null));
    const result = await fetchStatsRanking('b1');
    expect(result).toEqual([]);
  });

  it('aplica filtro de 7 dias quando period="7days"', async () => {
    const c = mkChain([]);
    supabase.from.mockReturnValue(c);
    await fetchStatsRanking('b1', { period: '7days' });
    expect(c.gte).toHaveBeenCalled();
  });

  it('NÃO aplica filtro de data quando period="all"', async () => {
    const c = mkChain([]);
    supabase.from.mockReturnValue(c);
    await fetchStatsRanking('b1', { period: 'all' });
    expect(c.gte).not.toHaveBeenCalled();
  });
});
