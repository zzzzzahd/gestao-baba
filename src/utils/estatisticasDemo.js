// src/utils/estatisticasDemo.js
// Cálculos das demonstrações de /estatisticas. Funções puras: tudo é derivado das
// partidas fictícias, de modo que as estatísticas sempre batem entre si.

import { DEMO_PLAYERS, DEMO_MATCHES } from '../content/estatisticasDemo';
import { getDivision } from '../components/DivisionBadge';

export const parseGoal = (s) => {
  const [team, rest] = s.split(':');
  const [scorer, assist] = rest.split('>');
  return { team, scorer, assist: assist || null };
};

/** Placar, vencedor e participantes de uma partida. */
export function resolveMatch(match, index = 0) {
  const events = match.goals.map(parseGoal);
  const scoreA = events.filter((e) => e.team === 'a').length;
  const scoreB = events.filter((e) => e.team === 'b').length;
  return {
    n: index + 1, a: match.a, b: match.b, events, scoreA, scoreB,
    result: scoreA > scoreB ? 'a' : scoreB > scoreA ? 'b' : 'draw',
  };
}

export const resolvedMatches = (matches = DEMO_MATCHES) => matches.map(resolveMatch);

const round1 = (n) => Math.round(n * 10) / 10;

/** Média das três notas (1 a 5), com 2 casas — é o valor que define a divisão. */
export const overallRating = (r) => Math.round(((r.skill + r.physical + r.commitment) / 3) * 100) / 100;

/**
 * Estatísticas individuais derivadas das partidas.
 * - aproveitamento (neste demo): vitórias ÷ partidas jogadas
 * - sequência: presenças consecutivas contadas a partir da partida mais recente
 */
export function deriveStats(players = DEMO_PLAYERS, matches = DEMO_MATCHES) {
  const resolved = matches.map(resolveMatch);
  return players.map((p) => {
    let games = 0; let wins = 0; let draws = 0; let goals = 0; let assists = 0;
    const attended = [];
    const cumGoals = [];
    resolved.forEach((m) => {
      const side = m.a.includes(p.id) ? 'a' : m.b.includes(p.id) ? 'b' : null;
      attended.push(side !== null);
      if (side) {
        games += 1;
        if (m.result === side) wins += 1;
        if (m.result === 'draw') draws += 1;
      }
      goals += m.events.filter((e) => e.scorer === p.id).length;
      assists += m.events.filter((e) => e.assist === p.id).length;
      cumGoals.push(goals);
    });
    let streak = 0;
    for (let i = attended.length - 1; i >= 0 && attended[i]; i--) streak++;
    const overall = overallRating(p.ratings);
    return {
      id: p.id, name: p.name, ratings: p.ratings, overall, division: getDivision(overall),
      games, wins, draws, losses: games - wins - draws, goals, assists,
      winRate: games ? Math.round((wins / games) * 100) : 0,
      goalsPerGame: games ? round1(goals / games) : 0,
      streak, attended, cumGoals,
    };
  });
}

/** Ranking: gols, assistências ou "MVP" (gols + assistências, como no app). Empate: ordem alfabética. */
export function rankBy(stats, metric) {
  const value = (s) => (metric === 'mvp' ? s.goals + s.assists : s[metric]);
  const list = stats.filter((s) => value(s) > 0)
    .map((s) => ({ id: s.id, name: s.name, value: value(s), goals: s.goals, assists: s.assists }))
    .sort((x, y) => y.value - x.value || x.name.localeCompare(y.name, 'pt-BR'));
  let lastV = null; let lastPos = 0;
  return list.map((r, i) => {
    const pos = r.value === lastV ? lastPos : i + 1;
    lastV = r.value; lastPos = pos;
    return { ...r, pos };
  });
}

/** Comparação descritiva: indica quem está à frente em cada métrica, sem declarar "melhor jogador". */
export function compareStats(a, b) {
  const row = (key, label, va, vb, fmt = (v) => String(v)) => ({
    key, label, a: fmt(va), b: fmt(vb), leader: va > vb ? 'a' : vb > va ? 'b' : 'tie',
  });
  return [
    row('goals', 'Gols', a.goals, b.goals),
    row('assists', 'Assistências', a.assists, b.assists),
    row('games', 'Partidas', a.games, b.games),
    row('wins', 'Vitórias', a.wins, b.wins),
    row('winRate', 'Aproveitamento', a.winRate, b.winRate, (v) => `${v}%`),
    row('streak', 'Sequência (presenças)', a.streak, b.streak),
    row('overall', 'Avaliação', a.overall, b.overall, (v) => v.toFixed(2)),
  ];
}

/** Linha extra, só didática: o app mostra totais; aqui ilustramos a taxa por partida. */
export const perGameRow = (a, b) => ({
  key: 'goalsPerGame', label: 'Gols por partida (cálculo didático)', a: a.goalsPerGame.toFixed(1), b: b.goalsPerGame.toFixed(1),
  leader: a.goalsPerGame > b.goalsPerGame ? 'a' : b.goalsPerGame > a.goalsPerGame ? 'b' : 'tie',
});

/** Estatísticas coletivas do baba fictício. */
export function collectiveStats(matches = DEMO_MATCHES) {
  const r = matches.map(resolveMatch);
  const goals = r.reduce((s, m) => s + m.scoreA + m.scoreB, 0);
  const margin = (m) => Math.abs(m.scoreA - m.scoreB);
  const biggest = r.reduce((best, m) => (margin(m) > margin(best) ? m : best), r[0]);
  return {
    matches: r.length, goals, avgGoals: round1(goals / r.length),
    draws: r.filter((m) => m.result === 'draw').length,
    decided: r.filter((m) => m.result !== 'draw').length,
    biggest: { n: biggest.n, score: `${biggest.scoreA} x ${biggest.scoreB}` },
  };
}

/** Nível 1–3 usado pelo sorteador público, a partir da média das notas (só para a demonstração). */
export const toBalancerStars = (overall) => (overall < 3 ? 1 : overall < 4 ? 2 : 3);

/** Série acumulada de aproveitamento (%) após cada partida em que o jogador atuou. */
export function winRateSeries(playerId, matches = DEMO_MATCHES) {
  const out = [];
  let games = 0; let wins = 0;
  matches.map(resolveMatch).forEach((m) => {
    const side = m.a.includes(playerId) ? 'a' : m.b.includes(playerId) ? 'b' : null;
    if (side) { games += 1; if (m.result === side) wins += 1; }
    out.push(games ? Math.round((wins / games) * 100) : null);
  });
  return out;
}
