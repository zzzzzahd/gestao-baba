// src/utils/teamBalancer.js
// Sorteio equilibrado em "serpentina" para as ferramentas públicas.
// Extraído do antigo Modo Visitante (src/pages/VisitorMode.jsx) sem alterar o
// algoritmo, e com rng injetável para ser testável.
//
// Como funciona: goleiros são distribuídos primeiro (um por time, do mais bem
// avaliado para o menos); os demais jogadores são ordenados por nível e
// distribuídos de time em time, indo e voltando (A B C D D C B A ...).
// Limitação: com poucos jogadores ou níveis muito concentrados, a soma dos
// níveis pode diferir entre times — o método é uma heurística, não uma garantia.

import { shuffle } from './tournamentMath';

export const POSITIONS = { LINE: 'linha', GK: 'goleiro' };

/**
 * @param {Array<{id:any,name:string,position:'linha'|'goleiro',stars:number}>} players
 * @param {number} numTeams
 * @param {number} playersPerTeam
 * @param {'reserve'|'fill'|'substitute'} leftoverStrategy
 *   'reserve': todos os times têm playersPerTeam; quem sobra vira reserva.
 *   'fill' / 'substitute': todos entram; times do início ficam com 1 a mais.
 */
export function balanceTeams(players, numTeams, playersPerTeam, leftoverStrategy = 'reserve', rng = Math.random) {
  const goalies = shuffle(players.filter((p) => p.position === POSITIONS.GK), rng);
  let outfield = shuffle(players.filter((p) => p.position !== POSITIONS.GK), rng);

  const teams = Array.from({ length: numTeams }, (_, i) => ({
    id: i + 1,
    name: `TIME ${String.fromCharCode(65 + i)}`,
    players: [],
    starSum: 0,
  }));

  const capacities = Array(numTeams).fill(playersPerTeam);
  if (leftoverStrategy !== 'reserve') {
    const base = Math.floor(players.length / numTeams);
    const extra = players.length % numTeams;
    for (let i = 0; i < numTeams; i++) capacities[i] = i < extra ? base + 1 : base;
  }

  goalies.sort((a, b) => b.stars - a.stars);
  for (let i = 0; i < numTeams && goalies.length > 0; i++) {
    const g = goalies.shift();
    teams[i].players.push(g);
    teams[i].starSum += g.stars;
  }
  // Goleiros que sobraram jogam na linha / viram reserva.
  outfield = [...outfield, ...goalies];
  // sort estável: empates mantêm a ordem aleatória do shuffle
  outfield.sort((a, b) => b.stars - a.stars);

  let direction = 1;
  let teamIndex = 0;
  const reserves = [];
  const advance = () => {
    teamIndex += direction;
    if (teamIndex >= numTeams) { direction = -1; teamIndex = numTeams - 1; }
    else if (teamIndex < 0) { direction = 1; teamIndex = 0; }
  };

  while (outfield.length > 0) {
    if (teams.every((t, i) => t.players.length >= capacities[i])) {
      reserves.push(...outfield);
      break;
    }
    let guard = 0;
    while (teams[teamIndex].players.length >= capacities[teamIndex] && guard < numTeams * 2 + 2) {
      advance();
      guard++;
    }
    const player = outfield.shift();
    teams[teamIndex].players.push(player);
    teams[teamIndex].starSum += player.stars;
    advance();
  }
  return { teams, reserves };
}

/** Número de times possível para uma lista de jogadores. */
export function teamCount(totalPlayers, playersPerTeam, leftoverStrategy = 'reserve') {
  if (!Number.isInteger(playersPerTeam) || playersPerTeam < 1) return 0;
  return leftoverStrategy === 'reserve'
    ? Math.floor(totalPlayers / playersPerTeam)
    : Math.ceil(totalPlayers / playersPerTeam);
}

/**
 * Lê uma lista colada (WhatsApp, planilha, anotação): uma pessoa por linha.
 * Remove numeração ("1.", "2)", "3 -"), marcadores ("-", "•", "*") e emojis de
 * confirmação (✅ ☑️ ✔️ ❌). Ignora linhas vazias e títulos comuns ("Lista", "Baba")
 * só quando terminam em ":" . Nomes repetidos (sem diferenciar maiúsculas e
 * acentos) são mantidos uma única vez e reportados em `duplicates`.
 */
export function parsePlayerList(text) {
  const names = [];
  const duplicates = [];
  const seen = new Set();
  const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  for (const raw of String(text ?? '').split(/\r?\n|;/)) {
    let line = raw
      .replace(/[✅☑️✔️❌✖️🟢🔴]/gu, '')
      .replace(/^\s*(?:\d{1,3}\s*[.)\-–:]\s*|[-•*]\s+)/, '')
      .trim();
    if (!line || /:$/.test(line)) continue;
    if (line.length > 40) line = line.slice(0, 40).trim();
    const key = norm(line);
    if (seen.has(key)) { duplicates.push(line); continue; }
    seen.add(key);
    names.push(line);
  }
  return { names, duplicates };
}
