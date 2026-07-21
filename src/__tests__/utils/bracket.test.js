// src/__tests__/utils/bracket.test.js
// Sprint — Utils: bracket.js

import { describe, it, expect } from 'vitest';
import {
  shuffle,
  generateKnockout,
  generateRoundRobin,
  computeStandings,
} from '../../utils/bracket';

function mkTeams(n) {
  return Array.from({ length: n }, function(_, i) {
    return { id: 't' + (i + 1), name: 'Time ' + (i + 1) };
  });
}

// ─── shuffle ─────────────────────────────────────────────────────────────────
describe('shuffle', () => {
  it('retorna array do mesmo tamanho', () => {
    expect(shuffle([1, 2, 3, 4, 5])).toHaveLength(5);
  });

  it('contém os mesmos elementos', () => {
    const arr = ['a', 'b', 'c', 'd'];
    expect(shuffle(arr).sort()).toEqual([...arr].sort());
  });

  it('não muta o array original', () => {
    const arr = [1, 2, 3];
    const copy = [...arr];
    shuffle(arr);
    expect(arr).toEqual(copy);
  });

  it('funciona com array vazio', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('funciona com array de 1 elemento', () => {
    expect(shuffle([42])).toEqual([42]);
  });

  it('retorna resultado diferente em execuções distintas (aleatoriedade)', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const results = Array.from({ length: 20 }, function() { return shuffle(arr).join(','); });
    expect(new Set(results).size).toBeGreaterThan(1);
  });
});

// ─── generateKnockout ─────────────────────────────────────────────────────────
describe('generateKnockout', () => {
  it('4 times: gera 2 partidas na rodada 1', () => {
    expect(generateKnockout(mkTeams(4))[0]).toHaveLength(2);
  });

  it('4 times: gera 2 rodadas (R1 + Final)', () => {
    expect(generateKnockout(mkTeams(4))).toHaveLength(2);
  });

  it('8 times: gera 3 rodadas', () => {
    expect(generateKnockout(mkTeams(8))).toHaveLength(3);
  });

  it('2 times: gera 1 rodada com 1 partida', () => {
    const rounds = generateKnockout(mkTeams(2));
    expect(rounds).toHaveLength(1);
    expect(rounds[0]).toHaveLength(1);
  });

  it('3 times: usa bye para completar bracket', () => {
    const rounds = generateKnockout(mkTeams(3));
    const byes = rounds[0].filter(function(m) { return m.bye; });
    expect(byes.length).toBeGreaterThan(0);
  });

  it('R1 com 4 times: partidas têm team_a_id e team_b_id preenchidos', () => {
    generateKnockout(mkTeams(4))[0].forEach(function(m) {
      expect(m.team_a_id).not.toBeNull();
      expect(m.team_b_id).not.toBeNull();
    });
  });

  it('rodadas seguintes têm team_a_id=null (a preencher)', () => {
    generateKnockout(mkTeams(4))[1].forEach(function(m) {
      expect(m.team_a_id).toBeNull();
      expect(m.team_b_id).toBeNull();
    });
  });

  it('match_index começa em 0', () => {
    expect(generateKnockout(mkTeams(4))[0][0].match_index).toBe(0);
  });

  it('round começa em 1', () => {
    expect(generateKnockout(mkTeams(4))[0][0].round).toBe(1);
  });

  it('16 times: gera 4 rodadas', () => {
    expect(generateKnockout(mkTeams(16))).toHaveLength(4);
  });
});

// ─── generateRoundRobin ───────────────────────────────────────────────────────
describe('generateRoundRobin', () => {
  it('4 times: gera 3 rodadas (n-1)', () => {
    expect(generateRoundRobin(mkTeams(4))).toHaveLength(3);
  });

  it('4 times: cada rodada tem 2 partidas', () => {
    generateRoundRobin(mkTeams(4)).forEach(function(r) { expect(r).toHaveLength(2); });
  });

  it('3 times: arredonda e gera rodadas corretas', () => {
    const rounds = generateRoundRobin(mkTeams(3));
    expect(rounds.length).toBeGreaterThanOrEqual(2);
  });

  it('cada partida tem team_a_id e team_b_id definidos', () => {
    generateRoundRobin(mkTeams(4)).flat().forEach(function(m) {
      expect(m.team_a_id).toBeTruthy();
      expect(m.team_b_id).toBeTruthy();
    });
  });

  it('nenhum time joga contra si mesmo', () => {
    generateRoundRobin(mkTeams(6)).flat().forEach(function(m) {
      expect(m.team_a_id).not.toBe(m.team_b_id);
    });
  });

  it('6 times: 5 rodadas, 3 partidas cada', () => {
    const rounds = generateRoundRobin(mkTeams(6));
    expect(rounds).toHaveLength(5);
    rounds.forEach(function(r) { expect(r).toHaveLength(3); });
  });

  it('round começa em 1', () => {
    expect(generateRoundRobin(mkTeams(4))[0][0].round).toBe(1);
  });

  it('bye=false em todas as partidas de round_robin', () => {
    generateRoundRobin(mkTeams(4)).flat().forEach(function(m) {
      expect(m.bye).toBe(false);
    });
  });
});

// ─── computeStandings ────────────────────────────────────────────────────────
describe('computeStandings', () => {
  const teams = mkTeams(3);
  const matches = [
    { team_a_id: 't1', team_b_id: 't2', score_a: 3, score_b: 1, status: 'finished' },
    { team_a_id: 't1', team_b_id: 't3', score_a: 1, score_b: 1, status: 'finished' },
    { team_a_id: 't3', team_b_id: 't2', score_a: 2, score_b: 0, status: 'finished' },
  ];

  it('retorna array com todos os times', () => {
    expect(computeStandings(teams, matches)).toHaveLength(3);
  });

  it('ordena por pontos decrescente', () => {
    const result = computeStandings(teams, matches);
    expect(result[0].Pts).toBeGreaterThanOrEqual(result[1].Pts);
    expect(result[1].Pts).toBeGreaterThanOrEqual(result[2].Pts);
  });

  it('t2 com 0 pontos no último lugar', () => {
    const result = computeStandings(teams, matches);
    expect(result[result.length - 1].team.id).toBe('t2');
    expect(result[result.length - 1].Pts).toBe(0);
  });

  it('vitória = 3 pontos', () => {
    const result = computeStandings(teams, matches);
    const t1 = result.find(function(r) { return r.team.id === 't1'; });
    expect(t1.Pts).toBe(4); // 3 (vitória) + 1 (empate)
  });

  it('empate = 1 ponto para cada', () => {
    const result = computeStandings(teams, matches);
    const t1 = result.find(function(r) { return r.team.id === 't1'; });
    const t3 = result.find(function(r) { return r.team.id === 't3'; });
    expect(t1.E).toBe(1);
    expect(t3.E).toBe(1);
  });

  it('calcula GP, GC e SG corretamente para t1', () => {
    const result = computeStandings(teams, matches);
    const t1 = result.find(function(r) { return r.team.id === 't1'; });
    expect(t1.GP).toBe(4);
    expect(t1.GC).toBe(2);
    expect(t1.SG).toBe(2);
  });

  it('contabiliza P (partidas jogadas)', () => {
    const result = computeStandings(teams, matches);
    const t1 = result.find(function(r) { return r.team.id === 't1'; });
    expect(t1.P).toBe(2);
  });

  it('ignora partidas com status !== finished', () => {
    const result = computeStandings(teams, [
      { team_a_id: 't1', team_b_id: 't2', score_a: 5, score_b: 0, status: 'pending' },
    ]);
    result.forEach(function(r) { expect(r.Pts).toBe(0); });
  });

  it('ignora partidas com score null', () => {
    const result = computeStandings(teams, [
      { team_a_id: 't1', team_b_id: 't2', score_a: null, score_b: null, status: 'finished' },
    ]);
    result.forEach(function(r) { expect(r.Pts).toBe(0); });
  });

  it('lista vazia de matches retorna todos com 0 pts', () => {
    computeStandings(teams, []).forEach(function(r) { expect(r.Pts).toBe(0); });
  });
});
