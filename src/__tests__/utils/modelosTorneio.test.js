import { describe, it, expect } from 'vitest';
import {
  textTable, computeStandings, standingsToText, blankStandingsText, bracketSheetText, groupsSheetText, resultsSheetText,
  assignTimes, calendarToText, fmtTime, TIME_RE, attendanceSheetText, rankScorers, scorersToText,
  tiebreakText, TIEBREAK_PRESETS, summarizeBudget, budgetToText, scheduleFor,
} from '../../utils/modelosTorneio';
import { summarize, roundRobinSchedule, knockoutSchedule } from '../../utils/tournamentMath';

const T = ['A', 'B', 'C', 'D'];

describe('computeStandings', () => {
  const results = [
    { home: 'A', away: 'B', hg: 2, ag: 0 },
    { home: 'C', away: 'D', hg: 1, ag: 1 },
    { home: 'A', away: 'C', hg: 0, ag: 1 },
    { home: 'B', away: 'D', hg: 3, ag: 3 },
  ];
  it('pontos, saldo e ordem', () => {
    const s = computeStandings(T, results);
    const byTeam = Object.fromEntries(s.map((r) => [r.team, r]));
    expect(byTeam.A).toMatchObject({ pts: 3, j: 2, v: 1, d: 1, gp: 2, gc: 1, sg: 1 });
    expect(byTeam.C).toMatchObject({ pts: 4, v: 1, e: 1, sg: 1 });
    expect(byTeam.D).toMatchObject({ pts: 2, e: 2 });
    expect(byTeam.B).toMatchObject({ pts: 1, e: 1, d: 1, sg: -2 });
    expect(s.map((r) => r.team)).toEqual(['C', 'A', 'D', 'B']);
    expect(s.map((r) => r.pos)).toEqual([1, 2, 3, 4]);
  });
  it('soma de pontos = 3 × vitórias + empates (contados por equipe)', () => {
    const s = computeStandings(T, results);
    const wins = s.reduce((a, r) => a + r.v, 0);
    const draws = s.reduce((a, r) => a + r.e, 0);
    expect(s.reduce((a, r) => a + r.pts, 0)).toBe(wins * 3 + draws);
  });
  it('ignora placar vazio/inválido e jogos com equipe desconhecida', () => {
    const s = computeStandings(T, [
      { home: 'A', away: 'B', hg: NaN, ag: 1 }, { home: 'A', away: 'B', hg: -1, ag: 1 },
      { home: 'A', away: 'Z', hg: 1, ag: 0 }, { home: 'A', away: 'A', hg: 1, ag: 0 }, { home: 'A', away: 'B', hg: 1.5, ag: 0 },
    ]);
    expect(s.every((r) => r.j === 0 && r.pts === 0)).toBe(true);
  });
  it('pontuação configurável', () => {
    const s = computeStandings(['A', 'B'], [{ home: 'A', away: 'B', hg: 1, ag: 0 }], { win: 2, draw: 1, loss: 0 });
    expect(s[0].pts).toBe(2);
  });
  it('marca empate total para resolução manual', () => {
    const s = computeStandings(['A', 'B', 'C'], []);
    expect(s.every((r) => r.tie)).toBe(true);
    expect(standingsToText(s)).toMatch(/confronto direto ou sorteio/);
  });
});

describe('textos de modelos', () => {
  it('textTable alinha colunas', () => {
    const t = textTable(['#', 'Equipe'], [[1, 'Bola Murcha'], [10, 'X']], ['r', 'l']);
    const lines = t.split('\n');
    expect(lines[0]).toBe(' #  Equipe');
    expect(lines[2]).toBe(' 1  Bola Murcha');
    expect(lines[3]).toBe('10  X');
  });
  it('mata-mata: jogos numerados, byes e campo de placar', () => {
    const t = bracketSheetText(['A', 'B', 'C', 'D', 'E', 'F'], { thirdPlace: true });
    expect(t).toContain('avança direto (bye)');
    expect(t).toMatch(/Jogo 1: .+ ___ x ___ /);
    expect(t).toContain('Disputa de 3º lugar');
    expect(t).toContain('Campeão:');
  });
  it('grupos: cada grupo com sua tabela em branco', () => {
    const t = groupsSheetText(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], 2);
    expect(t).toContain('Grupo A');
    expect(t).toContain('Grupo B');
    expect((t.match(/Equipe/g) || []).length).toBe(2);
  });
  it('súmula de resultados traz folga e campos de data/hora/campo', () => {
    const t = resultsSheetText(roundRobinSchedule(['A', 'B', 'C']));
    expect(t).toContain('Folga:');
    expect(t).toMatch(/Data: ___\/___/);
  });
  it('lista de presença por equipe', () => {
    const t = attendanceSheetText(['Time X', 'Time Y'], { rows: 3, games: 2 });
    expect(t).toContain('TIME X');
    expect(t).toContain('TIME Y');
    expect((t.match(/\[ \]/g) || []).length).toBe(2 * 3 * 2);
  });
  it('tabela em branco numera equipes', () => {
    expect(blankStandingsText(['A', 'B'])).toMatch(/1\s+A/);
  });
});

describe('assignTimes / calendário', () => {
  it('duração total bate com a calculadora (mata-mata e pontos corridos, 1 e 2 campos)', () => {
    for (const [format, n, fields] of [['knockout', 8, 1], ['knockout', 6, 2], ['roundrobin', 5, 1], ['roundrobin', 6, 2]]) {
      const teams = Array.from({ length: n }, (_, i) => `E${i + 1}`);
      const cal = assignTimes(scheduleFor(format, teams), { startTime: '19:00', matchMinutes: 20, breakMinutes: 5, fields });
      const calc = summarize({ format, teams: n, fields, matchMinutes: 20, breakMinutes: 5 });
      expect(cal.totalMinutes).toBe(calc.estimatedMinutes);
      expect(cal.entries).toHaveLength(calc.totalGames);
    }
  });
  it('horários: 19:00, 19:25... e nunca dois jogos no mesmo campo e horário', () => {
    const cal = assignTimes(roundRobinSchedule(['A', 'B', 'C', 'D']), { startTime: '19:00', matchMinutes: 20, breakMinutes: 5, fields: 2 });
    expect(cal.entries[0].start).toBe('19:00');
    expect(cal.entries[2].start).toBe('19:25');
    const keys = cal.entries.map((e) => `${e.start}|${e.field}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('fmtTime passa da meia-noite e TIME_RE valida', () => {
    expect(fmtTime(23 * 60 + 50 + 20)).toBe('00:10');
    expect(TIME_RE.test('19:05')).toBe(true);
    expect(TIME_RE.test('24:00')).toBe(false);
    expect(TIME_RE.test('9:00')).toBe(false);
  });
  it('texto do calendário inclui término previsto', () => {
    const cal = assignTimes(knockoutSchedule(['A', 'B', 'C', 'D']), { startTime: '10:00', matchMinutes: 30, breakMinutes: 0, fields: 1 });
    expect(calendarToText(cal)).toContain('Término previsto: 11:30');
  });
});

describe('rankScorers', () => {
  it('soma gols do mesmo jogador (acento/caixa) e ranqueia com empates', () => {
    const r = rankScorers([
      { player: 'João', team: 'A', goals: 2 }, { player: 'joao', team: 'a', goals: 1 },
      { player: 'Pedro', team: 'B', goals: 3 }, { player: 'Ana', team: 'B', goals: 1 },
      { player: '', team: 'B', goals: 5 }, { player: 'Zé', team: 'B', goals: 0 },
    ]);
    expect(r.map((x) => [x.player, x.goals, x.pos])).toEqual([['João', 3, 1], ['Pedro', 3, 1], ['Ana', 1, 3]]);
  });
  it('mesmo nome em times diferentes são pessoas diferentes', () => {
    expect(rankScorers([{ player: 'Léo', team: 'A', goals: 1 }, { player: 'Léo', team: 'B', goals: 1 }])).toHaveLength(2);
  });
  it('texto vazio', () => expect(scorersToText([])).toMatch(/nenhum gol/));
});

describe('desempate e orçamento', () => {
  it('texto de critérios na ordem e com sorteio no fim', () => {
    const t = tiebreakText(TIEBREAK_PRESETS[1].order);
    expect(t.indexOf('Confronto direto')).toBeLessThan(t.indexOf('saldo de gols'));
    expect(t.trim().endsWith('6. Sorteio.')).toBe(true);
  });
  it('orçamento: 8 equipes × R$ 100, patrocínio R$ 200, despesas R$ 1.300', () => {
    const b = { teams: 8, feeCents: 10000, incomes: [{ label: 'Patrocínio', cents: 20000 }], expenses: [{ label: 'Quadra', cents: 100000 }, { label: 'Troféus', cents: 30000 }] };
    const r = summarizeBudget(b);
    expect(r).toMatchObject({ feesTotal: 80000, totalIncome: 100000, totalExpenses: 130000, balance: -30000 });
    expect(r.breakEvenFee).toBe(13750); // (1300 - 200) / 8 = 137,50
    expect(budgetToText(b, r)).toContain('Saldo previsto: -R$ 300,00');
  });
  it('sem equipes não divide por zero', () => {
    expect(summarizeBudget({ teams: 0, feeCents: 0, incomes: [], expenses: [{ label: 'x', cents: 100 }] }).breakEvenFee).toBe(0);
  });
});
