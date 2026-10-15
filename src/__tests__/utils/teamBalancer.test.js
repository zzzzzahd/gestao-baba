import { describe, it, expect } from 'vitest';
import { balanceTeams, teamCount, parsePlayerList } from '../../utils/teamBalancer';

const mk = (n, gk = 0) => Array.from({ length: n }, (_, i) => ({
  id: i, name: `J${i}`, position: i < gk ? 'goleiro' : 'linha', stars: (i % 3) + 1,
}));

describe('balanceTeams', () => {
  it('reserve: times completos, sobra vira reserva, ninguém repetido', () => {
    const { teams, reserves } = balanceTeams(mk(13), 2, 6, 'reserve');
    expect(teams.map((t) => t.players.length)).toEqual([6, 6]);
    expect(reserves).toHaveLength(1);
    const ids = [...teams.flatMap((t) => t.players), ...reserves].map((p) => p.id);
    expect(new Set(ids).size).toBe(13);
  });
  it('fill: 15 jogadores em 4 times → 4,4,4,3', () => {
    const { teams, reserves } = balanceTeams(mk(15), 4, 4, 'substitute');
    expect(teams.map((t) => t.players.length)).toEqual([4, 4, 4, 3]);
    expect(reserves).toHaveLength(0);
  });
  it('goleiros: um por time antes dos demais', () => {
    const { teams } = balanceTeams(mk(10, 2), 2, 5, 'reserve');
    expect(teams.every((t) => t.players.filter((p) => p.position === 'goleiro').length === 1)).toBe(true);
  });
  it('níveis equilibrados: diferença da soma de estrelas ≤ 2 (serpentina)', () => {
    for (let k = 0; k < 20; k++) {
      const { teams } = balanceTeams(mk(12), 2, 6, 'reserve');
      expect(Math.abs(teams[0].starSum - teams[1].starSum)).toBeLessThanOrEqual(2);
    }
  });
  it('rng fixo é determinístico', () => {
    const a = balanceTeams(mk(10), 2, 5, 'reserve', () => 0.5).teams.map((t) => t.players.map((p) => p.id));
    const b = balanceTeams(mk(10), 2, 5, 'reserve', () => 0.5).teams.map((t) => t.players.map((p) => p.id));
    expect(a).toEqual(b);
  });
});

describe('teamCount', () => {
  it('reserve = floor, fill = ceil', () => {
    expect(teamCount(13, 5, 'reserve')).toBe(2);
    expect(teamCount(13, 5, 'fill')).toBe(3);
    expect(teamCount(13, 0)).toBe(0);
  });
});

describe('parsePlayerList', () => {
  it('remove numeração, marcadores, emojis e duplicados', () => {
    const { names, duplicates } = parsePlayerList('Lista do baba:\n1. João ✅\n2) maria\n- Pedro\n• José\n4 - joão\n\nÁgata');
    expect(names).toEqual(['João', 'maria', 'Pedro', 'José', 'Ágata']);
    expect(duplicates).toEqual(['joão']);
  });
  it('aceita vazio', () => {
    expect(parsePlayerList('').names).toEqual([]);
    expect(parsePlayerList(null).names).toEqual([]);
  });
});
