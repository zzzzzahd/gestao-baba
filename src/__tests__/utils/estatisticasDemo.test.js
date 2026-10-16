import { describe, it, expect } from 'vitest';
import { DEMO_PLAYERS, DEMO_MATCHES } from '../../content/estatisticasDemo';
import {
  resolveMatch, resolvedMatches, deriveStats, rankBy, compareStats, perGameRow, collectiveStats,
  overallRating, toBalancerStars, winRateSeries,
} from '../../utils/estatisticasDemo';

const stats = deriveStats();
const by = (id) => stats.find((s) => s.id === id);

describe('coerência dos dados fictícios', () => {
  it('cada partida tem 2 equipes de 4 jogadores distintos e existentes', () => {
    const ids = new Set(DEMO_PLAYERS.map((p) => p.id));
    for (const m of DEMO_MATCHES) {
      expect(m.a).toHaveLength(4);
      expect(m.b).toHaveLength(4);
      const all = [...m.a, ...m.b];
      expect(new Set(all).size).toBe(8);
      all.forEach((id) => expect(ids.has(id)).toBe(true));
    }
  });
  it('autor e assistente de cada gol pertencem à equipe que marcou, e ninguém assiste a si mesmo', () => {
    for (const m of resolvedMatches()) {
      for (const e of m.events) {
        const team = e.team === 'a' ? m.a : m.b;
        expect(team).toContain(e.scorer);
        if (e.assist) { expect(team).toContain(e.assist); expect(e.assist).not.toBe(e.scorer); }
      }
    }
  });
  it('soma dos gols dos jogadores = soma dos placares = nº de eventos', () => {
    const fromPlayers = stats.reduce((s, p) => s + p.goals, 0);
    const fromScores = resolvedMatches().reduce((s, m) => s + m.scoreA + m.scoreB, 0);
    const events = DEMO_MATCHES.reduce((s, m) => s + m.goals.length, 0);
    expect(fromPlayers).toBe(fromScores);
    expect(fromScores).toBe(events);
  });
  it('assistências nunca excedem os gols e cada jogador soma V+E+D = partidas', () => {
    expect(stats.reduce((s, p) => s + p.assists, 0)).toBeLessThanOrEqual(stats.reduce((s, p) => s + p.goals, 0));
    stats.forEach((p) => expect(p.wins + p.draws + p.losses).toBe(p.games));
  });
  it('cada partida soma 8 participações', () => {
    expect(stats.reduce((s, p) => s + p.games, 0)).toBe(DEMO_MATCHES.length * 8);
  });
  it('nomes são claramente fictícios', () => {
    DEMO_PLAYERS.forEach((p) => expect(p.name).toMatch(/^Atleta [A-Z]/));
  });
});

describe('estatísticas derivadas (conferidas à mão)', () => {
  it('Atleta Alfa: 10 jogos, 16 gols, 6V 2E 2D, 60%', () => {
    expect(by('alfa')).toMatchObject({ games: 10, goals: 16, wins: 6, draws: 2, losses: 2, winRate: 60, goalsPerGame: 1.6, streak: 10 });
  });
  it('placar da partida 1 é 3 x 2 para a equipe A', () => {
    expect(resolveMatch(DEMO_MATCHES[0])).toMatchObject({ scoreA: 3, scoreB: 2, result: 'a' });
    expect(resolveMatch(DEMO_MATCHES[3]).result).toBe('draw');
  });
  it('sequência conta presenças consecutivas a partir da última partida', () => {
    expect(by('hotel').streak).toBe(0); // faltou à última
    expect(by('golf').streak).toBe(1); // jogou a última, faltou à anterior
  });
  it('divisão vem da média das três notas', () => {
    expect(overallRating({ skill: 4.6, physical: 4.3, commitment: 4.8 })).toBe(4.57);
    expect(by('alfa').division.id).toBe('platina');
    expect(by('juliet').division.id).toBe('bronze');
  });
});

describe('ranking e comparação', () => {
  it('ranking de gols ordenado, com posições empatadas', () => {
    const r = rankBy(stats, 'goals');
    expect(r[0]).toMatchObject({ id: 'alfa', value: 16, pos: 1 });
    for (let i = 1; i < r.length; i++) expect(r[i - 1].value).toBeGreaterThanOrEqual(r[i].value);
    const tied = r.filter((x, i) => i > 0 && x.value === r[i - 1].value);
    tied.forEach((x) => expect(x.pos).toBe(r.find((y) => y.value === x.value).pos));
  });
  it('MVP = gols + assistências (como no app)', () => {
    const r = rankBy(stats, 'mvp');
    const a = by('alfa');
    expect(r.find((x) => x.id === 'alfa').value).toBe(a.goals + a.assists);
  });
  it('ranking só inclui quem tem valor > 0', () => {
    expect(rankBy(stats, 'assists').every((x) => x.value > 0)).toBe(true);
  });
  it('comparação indica quem está à frente sem declarar vencedor geral', () => {
    const rows = compareStats(by('alfa'), by('bravo'));
    expect(rows.map((r) => r.label)).toEqual(['Gols', 'Assistências', 'Partidas', 'Vitórias', 'Aproveitamento', 'Sequência (presenças)', 'Avaliação']);
    expect(rows[0].leader).toBe('a');
    expect(rows.find((r) => r.key === 'winRate').a).toMatch(/%$/);
    expect(perGameRow(by('alfa'), by('bravo')).label).toMatch(/didático/);
  });
  it('comparar um jogador com ele mesmo dá empate em tudo', () => {
    expect(compareStats(by('echo'), by('echo')).every((r) => r.leader === 'tie')).toBe(true);
  });
});

describe('coletivas, sorteio e evolução', () => {
  it('estatísticas coletivas batem com as partidas', () => {
    const c = collectiveStats();
    expect(c.matches).toBe(10);
    expect(c.draws + c.decided).toBe(10);
    expect(c.draws).toBe(2);
    expect(c.biggest).toEqual({ n: 7, score: '4 x 1' });
  });
  it('mapeia notas para os níveis 1–3 do sorteador', () => {
    expect([toBalancerStars(2.9), toBalancerStars(3), toBalancerStars(3.99), toBalancerStars(4)]).toEqual([1, 2, 2, 3]);
  });
  it('série de aproveitamento termina no aproveitamento final', () => {
    const s = winRateSeries('alfa');
    expect(s).toHaveLength(10);
    expect(s[9]).toBe(60);
  });
  it('gols acumulados são não decrescentes e terminam no total', () => {
    const c = by('bravo').cumGoals;
    c.forEach((v, i) => i && expect(v).toBeGreaterThanOrEqual(c[i - 1]));
    expect(c[9]).toBe(by('bravo').goals);
  });
});
