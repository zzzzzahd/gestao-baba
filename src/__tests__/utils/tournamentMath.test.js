import { describe, it, expect } from 'vitest';
import {
  summarize, validateConfig, roundRobinSchedule, knockoutSchedule, drawGroups,
  seedPositions, groupSizes, formatDuration, scheduleToText,
} from '../../utils/tournamentMath';

const names = (n) => Array.from({ length: n }, (_, i) => `E${i + 1}`);

describe('summarize — contagem de jogos', () => {
  it('mata-mata: n-1 jogos para qualquer n', () => {
    for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 16, 17, 32]) {
      expect(summarize({ format: 'knockout', teams: n }).totalGames).toBe(n - 1);
    }
  });
  it('mata-mata com 6 equipes: 2 byes, rodadas 2+2+1', () => {
    const s = summarize({ format: 'knockout', teams: 6 });
    expect(s.byes).toBe(2);
    expect(s.rounds.map((r) => r.games)).toEqual([2, 2, 1]);
  });
  it('mata-mata com 8 equipes: rodadas 4+2+1 e rótulos', () => {
    const s = summarize({ format: 'knockout', teams: 8 });
    expect(s.rounds.map((r) => r.label)).toEqual(['Quartas de final', 'Semifinais', 'Final']);
  });
  it('disputa de 3º lugar soma 1 jogo', () => {
    expect(summarize({ format: 'knockout', teams: 8, thirdPlace: true }).totalGames).toBe(8);
  });
  it('pontos corridos: n(n-1)/2 por turno', () => {
    expect(summarize({ format: 'roundrobin', teams: 6 }).totalGames).toBe(15);
    expect(summarize({ format: 'roundrobin', teams: 5 }).totalGames).toBe(10);
    expect(summarize({ format: 'roundrobin', teams: 6, legs: 2 }).totalGames).toBe(30);
  });
  it('pontos corridos: rodadas = n-1 (par) ou n (ímpar)', () => {
    expect(summarize({ format: 'roundrobin', teams: 6 }).totalRounds).toBe(5);
    expect(summarize({ format: 'roundrobin', teams: 5 }).totalRounds).toBe(5);
  });
  it('grupos: 8 equipes em 2 grupos = 12 jogos; +4 equipes no mata-mata = 3 jogos', () => {
    const g = summarize({ format: 'groups', teams: 8, groupCount: 2 });
    expect(g.totalGames).toBe(12);
    const gk = summarize({ format: 'groups', teams: 8, groupCount: 2, knockoutAfterGroups: true, advancePerGroup: 2 });
    expect(gk.groupGames).toBe(12);
    expect(gk.knockoutGames).toBe(3);
    expect(gk.totalGames).toBe(15);
  });
  it('grupos desiguais: 7 equipes em 2 grupos = 4+3 → 6+3 = 9 jogos', () => {
    expect(groupSizes(7, 2)).toEqual([4, 3]);
    expect(summarize({ format: 'groups', teams: 7, groupCount: 2 }).totalGames).toBe(9);
  });
});

describe('summarize — duração', () => {
  it('1 campo, 8 equipes mata-mata, 20 min + 5 min: 7 faixas → 140 + 30', () => {
    const s = summarize({ format: 'knockout', teams: 8, fields: 1, matchMinutes: 20, breakMinutes: 5 });
    expect(s.slots).toBe(7);
    expect(s.estimatedMinutes).toBe(7 * 20 + 6 * 5);
  });
  it('2 campos reduzem faixas por rodada (4 jogos → 2 faixas)', () => {
    const s = summarize({ format: 'knockout', teams: 8, fields: 2, matchMinutes: 20, breakMinutes: 0 });
    expect(s.slots).toBe(2 + 1 + 1);
  });
  it('formatDuration', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(95)).toBe('1 h 35 min');
  });
});

describe('validateConfig', () => {
  it('rejeita equipes inválidas e grupos impossíveis', () => {
    expect(validateConfig({ format: 'knockout', teams: 1 }).length).toBeGreaterThan(0);
    expect(validateConfig({ format: 'knockout', teams: 2.5 }).length).toBeGreaterThan(0);
    expect(validateConfig({ format: 'groups', teams: 5, groupCount: 3 }).length).toBeGreaterThan(0);
    expect(validateConfig({ format: 'groups', teams: 8, groupCount: 2, knockoutAfterGroups: true, advancePerGroup: 5 }).length).toBeGreaterThan(0);
    expect(validateConfig({ format: 'x', teams: 8 }).length).toBeGreaterThan(0);
  });
  it('aceita configuração válida', () => {
    expect(validateConfig({ format: 'groups', teams: 8, groupCount: 2, knockoutAfterGroups: true, advancePerGroup: 2, fields: 1, matchMinutes: 20, breakMinutes: 5 })).toEqual([]);
  });
});

describe('roundRobinSchedule', () => {
  const pairKey = (g) => [g.home, g.away].sort().join('|');
  it('cada par se enfrenta exatamente uma vez e ninguém joga duas vezes na rodada', () => {
    for (const n of [2, 3, 4, 5, 6, 7, 8]) {
      const rounds = roundRobinSchedule(names(n));
      const seen = new Set();
      for (const r of rounds) {
        const inRound = new Set();
        for (const g of r.games) {
          expect(inRound.has(g.home) || inRound.has(g.away)).toBe(false);
          inRound.add(g.home); inRound.add(g.away);
          const k = pairKey(g);
          expect(seen.has(k)).toBe(false);
          seen.add(k);
        }
      }
      expect(seen.size).toBe((n * (n - 1)) / 2);
    }
  });
  it('número ímpar: uma folga por rodada, todas as equipes folgam uma vez', () => {
    const rounds = roundRobinSchedule(names(5));
    expect(rounds.every((r) => r.rest)).toBe(true);
    expect(new Set(rounds.map((r) => r.rest)).size).toBe(5);
  });
  it('2 turnos: o returno inverte o mando', () => {
    const rounds = roundRobinSchedule(names(4), { legs: 2 });
    expect(rounds).toHaveLength(6);
    expect(rounds[3].games[0]).toEqual({ home: rounds[0].games[0].away, away: rounds[0].games[0].home });
  });
  it('bate com a contagem de summarize', () => {
    const rounds = roundRobinSchedule(names(6), { legs: 2 });
    expect(rounds.reduce((s, r) => s + r.games.length, 0)).toBe(summarize({ format: 'roundrobin', teams: 6, legs: 2 }).totalGames);
  });
});

describe('knockoutSchedule', () => {
  it('seedPositions(8) = 1,8,4,5,2,7,3,6', () => {
    expect(seedPositions(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });
  it('total de jogos = n-1 e número de jogos com id é consistente', () => {
    for (const n of [3, 5, 6, 7, 8, 12]) {
      const rounds = knockoutSchedule(names(n));
      const games = rounds.flatMap((r) => r.games).filter((g) => !g.bye);
      expect(games).toHaveLength(n - 1);
      expect(games.map((g) => g.id)).toEqual(Array.from({ length: n - 1 }, (_, i) => i + 1));
    }
  });
  it('byes vão para as melhores cabeças de chave', () => {
    const rounds = knockoutSchedule(names(6));
    const byes = rounds[0].games.filter((g) => g.bye).map((g) => g.home);
    expect(byes.sort()).toEqual(['E1', 'E2']);
  });
  it('3º lugar: numeração e confrontos', () => {
    const rounds = knockoutSchedule(names(4), { thirdPlace: true });
    expect(rounds.map((r) => r.label)).toEqual(['Semifinais', 'Disputa de 3º lugar', 'Final']);
    expect(rounds[1].games[0]).toMatchObject({ id: 3, home: 'Perdedor do jogo 1', away: 'Perdedor do jogo 2' });
    expect(rounds[2].games[0].id).toBe(4);
  });
  it('2 equipes: só a final', () => {
    const rounds = knockoutSchedule(['A', 'B']);
    expect(rounds).toHaveLength(1);
    expect(rounds[0].label).toBe('Final');
  });
});

describe('drawGroups / texto', () => {
  it('serpentina por cabeça de chave', () => {
    const g = drawGroups(names(8), 2);
    expect(g[0]).toEqual(['E1', 'E4', 'E5', 'E8']);
    expect(g[1]).toEqual(['E2', 'E3', 'E6', 'E7']);
  });
  it('aleatório com rng fixo é determinístico e completo', () => {
    const rng = () => 0.3;
    const g = drawGroups(names(7), 3, { mode: 'random', rng });
    expect(g.flat().sort()).toEqual(names(7).sort());
  });
  it('scheduleToText inclui folga e bye', () => {
    const txt = scheduleToText(roundRobinSchedule(['A', 'B', 'C']), { title: 'Teste' });
    expect(txt).toContain('Folga:');
    expect(txt.startsWith('Teste')).toBe(true);
  });
});
