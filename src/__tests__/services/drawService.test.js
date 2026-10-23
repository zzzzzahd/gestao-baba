import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('../../services/supabase', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));

import {
  executeDraw, getDrawDefaults, getMinRequired, getDrawPlayers, isCountedConfirmation,
} from '../../services/drawService';
import { drawTeamsWithConstraints } from '../../utils/drawAlgorithm';

const mk = (n, extra = () => ({})) => Array.from({ length: n }, (_, i) => ({
  id: `p${i + 1}`, player_id: `p${i + 1}`, status: 'confirmed',
  player: { id: `p${i + 1}`, name: `J${i + 1}`, position: 'linha', ...extra(i) },
}));

// builder: draw_results → 1ª chamada (sessão ativa) devolve `active`; depois insert
const setup = ({ active = null, insertError = null } = {}) => {
  const insert = vi.fn().mockReturnThis();
  let calls = 0;
  mocks.from.mockImplementation((t) => {
    if (t !== 'draw_results') return {};
    calls += 1;
    if (calls === 1) {
      const b = { select: () => b, eq: () => b, order: () => b, limit: () => b, maybeSingle: async () => ({ data: active, error: null }) };
      return b;
    }
    const b = { insert, select: () => b, single: async () => (insertError ? { data: null, error: insertError } : { data: { id: 'new-1' }, error: null }) };
    return b;
  });
  return { insert };
};

beforeEach(() => { vi.clearAllMocks(); mocks.rpc.mockResolvedValue({ data: [], error: null }); });

describe('helpers', () => {
  it('padrão do baba: players_per_team e draw_strategy', () => {
    expect(getDrawDefaults({ players_per_team: 6, draw_strategy: 'substitute' })).toEqual({ playersPerTeam: 6, strategy: 'substitute' });
    expect(getDrawDefaults({})).toEqual({ playersPerTeam: 5, strategy: 'reserve' });
  });
  it('mínimo: reserva exige +1 por time', () => {
    expect(getMinRequired({ playersPerTeam: 5, strategy: 'reserve' })).toBe(12);
    expect(getMinRequired({ playersPerTeam: 5, strategy: 'substitute' })).toBe(10);
  });
  it('lista de espera e cancelados não entram no sorteio', () => {
    const c = [{ status: 'confirmed', player: { id: 'a' } }, { status: 'waitlist', player: { id: 'b' } }, { player: { id: 'c' } }];
    expect(getDrawPlayers(c).map((p) => p.id)).toEqual(['a', 'c']);
    expect(isCountedConfirmation({ status: 'cancelled' })).toBe(false);
  });
});

describe('executeDraw', () => {
  it('usa nível do convidado, restrições e grava sessão ativa idêntica ao algoritmo compartilhado', async () => {
    const { insert } = setup();
    const confs = mk(10, (i) => (i === 0 ? { is_guest: true, balance_level: 3 } : {}));
    mocks.rpc.mockResolvedValue({ data: [{ player_a_id: 'p1', player_b_id: 'p2', constraint_type: 'must_apart' }], error: null });

    const r = await executeDraw({
      baba: { id: 'b1', gk_mode: 'fixed' }, dateStr: '2026-10-22', confirmations: confs,
      drawConfig: { playersPerTeam: 5, strategy: 'substitute' },
      getRatings: async () => confs.slice(1).map((c) => ({ player_id: c.player_id, avg_level: 2 })),
    });

    expect(r.ok).toBe(true);
    const row = insert.mock.calls[0][0];
    expect(row).toMatchObject({ baba_id: 'b1', draw_date: '2026-10-22', status: 'active', strategy: 'substitute', players_per_team: 5 });
    expect(row.constraints_used).toHaveLength(1);
    // restrição respeitada: p1 e p2 em times diferentes
    const teamOf = (id) => row.teams.findIndex((t) => t.players.some((p) => p.id === id));
    expect(teamOf('p1')).not.toBe(teamOf('p2'));
    // o convidado entrou com o nível informado (3), não 2
    expect(row.teams.flatMap((t) => t.players).find((p) => p.id === 'p1').balance_level).toBe(3);
    // mesmos times que o algoritmo compartilhado dá com a mesma entrada (ordem de times/tamanhos)
    const ref = drawTeamsWithConstraints(confs.map((c) => c.player).map((p) => ({ ...p, balance_level: p.id === 'p1' ? 3 : 2 })), 5, 'substitute', [], 'fixed');
    expect(row.teams.map((t) => t.players.length)).toEqual(ref.teams.map((t) => t.players.length));
  });

  it('reabre a sessão ativa em vez de sortear de novo', async () => {
    const { insert } = setup({ active: { id: 'x', teams: [{ players: [] }, { players: [] }], reserves: [], goalkeeper_queue: [], draw_date: '2026-10-22' } });
    const r = await executeDraw({ baba: { id: 'b1' }, dateStr: '2026-10-22', confirmations: mk(12), drawConfig: { playersPerTeam: 5, strategy: 'reserve' } });
    expect(r).toMatchObject({ ok: true, reused: true });
    expect(r.session.drawResultId).toBe('x');
    expect(insert).not.toHaveBeenCalled();
  });

  it('falta de confirmados: não grava nada', async () => {
    const { insert } = setup();
    const r = await executeDraw({ baba: { id: 'b1' }, dateStr: 'd', confirmations: mk(9), drawConfig: { playersPerTeam: 5, strategy: 'substitute' } });
    expect(r).toMatchObject({ ok: false, code: 'insufficient', needed: 10, have: 9 });
    expect(insert).not.toHaveBeenCalled();
  });

  it('restrições indisponíveis (RPC negada) não derrubam o sorteio, mas avisam', async () => {
    setup();
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'Acesso negado' } });
    const r = await executeDraw({ baba: { id: 'b1' }, dateStr: 'd', confirmations: mk(10), drawConfig: { playersPerTeam: 5, strategy: 'substitute' } });
    expect(r).toMatchObject({ ok: true, constraintsSkipped: true });
  });

  it('corrida (23505): reaproveita a sessão que o outro processo criou', async () => {
    let n = 0;
    const active = { id: 'race', teams: [{ players: [] }, { players: [] }], draw_date: 'd' };
    mocks.from.mockImplementation(() => {
      n += 1;
      const b = {
        select: () => b, eq: () => b, order: () => b, limit: () => b, insert: () => b,
        maybeSingle: async () => ({ data: n === 1 ? null : active, error: null }),
        single: async () => ({ data: null, error: { code: '23505' } }),
      };
      return b;
    });
    const r = await executeDraw({ baba: { id: 'b1' }, dateStr: 'd', confirmations: mk(10), drawConfig: { playersPerTeam: 5, strategy: 'substitute' } });
    expect(r).toMatchObject({ ok: true, reused: true });
  });
});
