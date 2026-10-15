// src/utils/modelosTorneio.js
// Lógica pura da biblioteca de modelos de torneio (/modelos-de-torneio).
// Reaproveita tournamentMath (tabelas), expenseSplit (dinheiro) e regulamento.

import {
  knockoutSchedule, roundRobinSchedule, drawGroups, groupLabel, scheduleToText,
} from './tournamentMath';
import { splitEqually, formatBRL, sumCents } from './expenseSplit';
import { TIEBREAKERS } from './regulamento';

const norm = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

// ---------------------------------------------------------------------------
// Tabelas em texto (monoespaçado) — para copiar, imprimir e baixar
// ---------------------------------------------------------------------------

/** align: 'l' | 'r' | 'c' por coluna. Colunas largas pelo maior conteúdo. */
export function textTable(headers, rows, align = []) {
  const cells = [headers, ...rows].map((r) => r.map((c) => String(c ?? '')));
  const widths = headers.map((_, i) => Math.max(...cells.map((r) => r[i].length)));
  const fmt = (r) => r.map((c, i) => {
    const a = align[i] ?? 'l';
    if (a === 'r') return c.padStart(widths[i]);
    if (a === 'c') { const left = Math.floor((widths[i] - c.length) / 2); return ' '.repeat(left) + c + ' '.repeat(widths[i] - c.length - left); }
    return c.padEnd(widths[i]);
  }).join('  ').trimEnd();
  const sep = widths.map((w) => '-'.repeat(w)).join('  ');
  return [fmt(cells[0]), sep, ...cells.slice(1).map(fmt)].join('\n');
}

// ---------------------------------------------------------------------------
// Classificação a partir de resultados
// ---------------------------------------------------------------------------

const validScore = (n) => Number.isInteger(n) && n >= 0 && n <= 99;

/**
 * @param {string[]} teams
 * @param {Array<{home:string, away:string, hg:number, ag:number}>} results
 *        resultados com placar inválido/ausente são ignorados.
 * Ordem: pontos, vitórias, saldo de gols, gols marcados, nome. Sem confronto
 * direto: equipes iguais em TODOS esses critérios são marcadas com `tie: true`
 * para a organização resolver (confronto direto, sorteio...).
 */
export function computeStandings(teams, results, { win = 3, draw = 1, loss = 0 } = {}) {
  const rows = new Map(teams.map((t) => [t, { team: t, pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0 }]));
  for (const r of results) {
    if (!validScore(r.hg) || !validScore(r.ag)) continue;
    const h = rows.get(r.home);
    const a = rows.get(r.away);
    if (!h || !a || r.home === r.away) continue;
    h.j++; a.j++;
    h.gp += r.hg; h.gc += r.ag; a.gp += r.ag; a.gc += r.hg;
    if (r.hg > r.ag) { h.v++; a.d++; h.pts += win; a.pts += loss; }
    else if (r.hg < r.ag) { a.v++; h.d++; a.pts += win; h.pts += loss; }
    else { h.e++; a.e++; h.pts += draw; a.pts += draw; }
  }
  const list = [...rows.values()].map((r) => ({ ...r, sg: r.gp - r.gc }));
  list.sort((x, y) => y.pts - x.pts || y.v - x.v || y.sg - x.sg || y.gp - x.gp || x.team.localeCompare(y.team, 'pt-BR'));
  const same = (x, y) => x.pts === y.pts && x.v === y.v && x.sg === y.sg && x.gp === y.gp;
  return list.map((r, i) => ({ ...r, pos: i + 1, tie: (i > 0 && same(list[i - 1], r)) || (i < list.length - 1 && same(r, list[i + 1])) }));
}

export function standingsToText(rows, title) {
  const t = textTable(
    ['#', 'Equipe', 'P', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG'],
    rows.map((r) => [r.pos, r.team, r.pts, r.j, r.v, r.e, r.d, r.gp, r.gc, r.sg]),
    ['r', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r'],
  );
  const tied = rows.some((r) => r.tie);
  return [title, title ? '' : null, t, tied ? '\nEquipes empatadas em todos os critérios: resolva por confronto direto ou sorteio, conforme o regulamento.' : null]
    .filter((x) => x !== null).join('\n');
}

/** Tabela de classificação em branco, para preencher à mão. */
export function blankStandingsText(teams, title) {
  const t = textTable(
    ['#', 'Equipe', 'P', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG'],
    teams.map((tm, i) => [i + 1, tm, '', '', '', '', '', '', '', '']),
    ['r', 'l', 'c', 'c', 'c', 'c', 'c', 'c', 'c', 'c'],
  );
  return title ? `${title}\n\n${t}` : t;
}

// ---------------------------------------------------------------------------
// Tabelas de jogos (reuso de tournamentMath)
// ---------------------------------------------------------------------------

export function scheduleFor(format, teams, { legs = 1, thirdPlace = false } = {}) {
  return format === 'knockout'
    ? knockoutSchedule(teams, { thirdPlace })
    : roundRobinSchedule(teams, { legs });
}

/** Chave de mata-mata com campo de placar para preencher. */
export function bracketSheetText(teams, { thirdPlace = false, title = 'Tabela de mata-mata' } = {}) {
  const rounds = knockoutSchedule(teams, { thirdPlace });
  const lines = [title, ''];
  for (const r of rounds) {
    lines.push(r.label);
    for (const g of r.games) {
      lines.push(g.bye
        ? `  ${g.home} — avança direto (bye)`
        : `  Jogo ${g.id}: ${g.home}  ___ x ___  ${g.away}`);
    }
    lines.push('');
  }
  lines.push('Campeão: ______________________');
  return lines.join('\n');
}

/** Grupos sorteados/em serpentina + classificação em branco de cada um. */
export function groupsSheetText(teams, groupCount, { title = 'Fase de grupos' } = {}) {
  const groups = drawGroups(teams, groupCount, { mode: 'seeded' });
  const parts = [title];
  groups.forEach((g, i) => parts.push('', blankStandingsText(g, groupLabel(i))));
  return parts.join('\n');
}

/** Súmula de resultados por rodada, com espaço para data, hora, campo e placar. */
export function resultsSheetText(rounds, { title = 'Controle de resultados' } = {}) {
  const lines = [title, ''];
  for (const r of rounds) {
    lines.push(r.label ?? `Rodada ${r.round}`);
    for (const g of r.games) {
      lines.push(g.bye
        ? `  ${g.home} — avança direto (bye)`
        : `  ${g.id ? `Jogo ${g.id}: ` : ''}${g.home}  ___ x ___  ${g.away}      Data: ___/___  Hora: ___:___  Campo: ___`);
    }
    if (r.rest) lines.push(`  Folga: ${r.rest}`);
    lines.push('');
  }
  lines.push('Responsável pela súmula: ______________________');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Calendário com horários
// ---------------------------------------------------------------------------

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
export const fmtTime = (min) => {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/**
 * Distribui os jogos de cada rodada em campos e horários. Mesma regra da
 * calculadora de torneio: uma rodada só começa quando a anterior termina, e
 * cada faixa de horário comporta até `fields` jogos.
 * @returns {{ entries: Array<{round:string,start:string,end:string,field:number,home:string,away:string,id?:number}>, totalMinutes:number, endTime:string }}
 */
export function assignTimes(rounds, { startTime, matchMinutes, breakMinutes = 0, fields = 1 }) {
  let t = toMin(startTime);
  const t0 = t;
  let lastEnd = t;
  const entries = [];
  for (const r of rounds) {
    const games = r.games.filter((g) => !g.bye);
    for (let i = 0; i < games.length; i += fields) {
      const chunk = games.slice(i, i + fields);
      chunk.forEach((g, k) => entries.push({
        round: r.label ?? `Rodada ${r.round}`, start: fmtTime(t), end: fmtTime(t + matchMinutes), field: k + 1,
        home: g.home, away: g.away, id: g.id,
      }));
      lastEnd = t + matchMinutes;
      t += matchMinutes + breakMinutes;
    }
  }
  return { entries, totalMinutes: lastEnd - t0, endTime: fmtTime(lastEnd) };
}

export function calendarToText(cal, { title = 'Calendário de partidas', dateText = '' } = {}) {
  const lines = [title, dateText ? dateText : null, ''].filter((l) => l !== null);
  let round = null;
  for (const e of cal.entries) {
    if (e.round !== round) { if (round !== null) lines.push(''); lines.push(e.round); round = e.round; }
    lines.push(`  ${e.start}–${e.end}  Campo ${e.field}  ${e.id ? `Jogo ${e.id}: ` : ''}${e.home} x ${e.away}`);
  }
  lines.push('', `Término previsto: ${cal.endTime}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Lista de presença por equipe
// ---------------------------------------------------------------------------

export function attendanceSheetText(teams, { rows = 12, games = 4 } = {}) {
  const header = ['Nº', 'Jogador', ...Array.from({ length: games }, (_, i) => `J${i + 1}`)];
  const parts = ['Lista de presença por equipe'];
  for (const team of teams) {
    const body = Array.from({ length: rows }, (_, i) => [String(i + 1).padStart(2, '0'), '____________________', ...Array(games).fill('[ ]')]);
    parts.push('', team.toUpperCase(), textTable(header, body, ['r', 'l', ...Array(games).fill('c')]), 'Responsável: ____________________');
  }
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Artilharia
// ---------------------------------------------------------------------------

/** Soma gols por jogador+equipe (sem diferenciar acentos/maiúsculas) e ranqueia com empates. */
export function rankScorers(entries) {
  const map = new Map();
  for (const e of entries) {
    const goals = Number(e.goals);
    if (!e.player?.trim() || !Number.isInteger(goals) || goals < 1 || goals > 99) continue;
    const key = `${norm(e.player)}|${norm(e.team ?? '')}`;
    const cur = map.get(key) ?? { player: e.player.trim(), team: (e.team ?? '').trim(), goals: 0 };
    cur.goals += goals;
    map.set(key, cur);
  }
  const list = [...map.values()].sort((a, b) => b.goals - a.goals || a.player.localeCompare(b.player, 'pt-BR'));
  let lastGoals = null;
  let lastPos = 0;
  return list.map((r, i) => {
    const pos = r.goals === lastGoals ? lastPos : i + 1; // empate de gols divide a posição (1, 1, 3)
    lastGoals = r.goals;
    lastPos = pos;
    return { ...r, pos };
  });
}

export function scorersToText(rows, title = 'Artilharia') {
  if (!rows.length) return `${title}\n\n(nenhum gol registrado)`;
  return `${title}\n\n${textTable(['#', 'Jogador', 'Equipe', 'Gols'], rows.map((r) => [r.pos, r.player, r.team, r.goals]), ['r', 'l', 'l', 'r'])}`;
}

// ---------------------------------------------------------------------------
// Critérios de desempate
// ---------------------------------------------------------------------------

export const TIEBREAK_HELP = {
  vitorias: 'Quem venceu mais partidas fica na frente. Premia a equipe que mais ganhou, mesmo com saldo menor.',
  saldo: 'Diferença entre gols marcados e sofridos em todo o campeonato. É o critério mais usado depois dos pontos.',
  golspro: 'Total de gols marcados. Favorece equipes ofensivas.',
  confronto: 'Resultado do jogo entre as equipes empatadas. Só funciona bem com 2 equipes empatadas; com 3 ou mais é preciso uma mini-classificação entre elas.',
  golssofridos: 'Menos gols sofridos. Favorece equipes defensivas.',
  disciplina: 'Campanha disciplinar: menos pontos de punição (amarelo 1, vermelho 3) fica na frente. Exige registrar cartões em todos os jogos.',
};

export const TIEBREAK_PRESETS = [
  { id: 'padrao', name: 'Padrão amador', order: ['vitorias', 'saldo', 'golspro', 'confronto', 'disciplina'] },
  { id: 'confronto', name: 'Confronto direto primeiro', order: ['confronto', 'saldo', 'golspro', 'vitorias', 'disciplina'] },
  { id: 'defesa', name: 'Valoriza a defesa', order: ['vitorias', 'golssofridos', 'saldo', 'confronto', 'disciplina'] },
];

export function tiebreakText(order, { points = '3 pontos por vitória, 1 por empate, 0 por derrota' } = {}) {
  const items = order.map((id) => TIEBREAKERS.find((t) => t.id === id)).filter(Boolean);
  return [
    'Critérios de desempate',
    '',
    `Pontuação: ${points}.`,
    'Havendo igualdade de pontos, a classificação segue esta ordem:',
    ...items.map((t, i) => `${i + 1}. ${t.label}`),
    `${items.length + 1}. Sorteio.`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Orçamento do torneio
// ---------------------------------------------------------------------------

export function summarizeBudget({ teams, feeCents, incomes, expenses }) {
  const feesTotal = teams * feeCents;
  const otherIncome = sumCents(incomes.map((i) => i.cents));
  const totalIncome = feesTotal + otherIncome;
  const totalExpenses = sumCents(expenses.map((e) => e.cents));
  const toCover = Math.max(0, totalExpenses - otherIncome);
  const breakEven = teams > 0 && toCover > 0 ? splitEqually(toCover, teams, 1) : null;
  return {
    feesTotal, otherIncome, totalIncome, totalExpenses, balance: totalIncome - totalExpenses,
    breakEvenFee: breakEven ? breakEven.perPerson : 0,
  };
}

export function budgetToText({ title = 'Orçamento do torneio', teams, feeCents, incomes, expenses }, r) {
  const L = [title, '', `Equipes: ${teams} · Inscrição por equipe: ${formatBRL(feeCents)}`, '', 'RECEITAS',
    `- Inscrições (${teams} × ${formatBRL(feeCents)}): ${formatBRL(r.feesTotal)}`];
  incomes.filter((i) => i.cents > 0).forEach((i) => L.push(`- ${i.label || 'Outra receita'}: ${formatBRL(i.cents)}`));
  L.push(`Total de receitas: ${formatBRL(r.totalIncome)}`, '', 'DESPESAS');
  expenses.filter((e) => e.cents > 0).forEach((e) => L.push(`- ${e.label || 'Despesa'}: ${formatBRL(e.cents)}`));
  L.push(`Total de despesas: ${formatBRL(r.totalExpenses)}`, '', `Saldo previsto: ${formatBRL(r.balance)}`);
  if (r.breakEvenFee > 0) L.push(`Inscrição por equipe para cobrir as despesas (descontadas outras receitas): ${formatBRL(r.breakEvenFee)}`);
  return L.join('\n');
}

export const BUDGET_SUGGESTED_EXPENSES = ['Quadra / campo', 'Arbitragem', 'Premiação (troféus, medalhas)', 'Água e materiais', 'Outros'];
export const BUDGET_SUGGESTED_INCOMES = ['Patrocínio', 'Venda de bebidas/lanches'];

export { scheduleToText };
