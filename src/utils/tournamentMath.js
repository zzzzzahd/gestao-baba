// src/utils/tournamentMath.js
//
// Cálculos e geração de tabelas de torneio. Funções puras, sem React e sem
// acesso a rede/banco — usadas pelas ferramentas públicas (/ferramentas/*).
//
// Formatos suportados:
//   - 'knockout'   mata-mata simples (derrota elimina; sem disputa de 3º lugar
//                  por padrão)
//   - 'roundrobin' pontos corridos (todos contra todos, 1 ou 2 turnos)
//   - 'groups'     fase de grupos (todos contra todos dentro de cada grupo)
//                  seguida, opcionalmente, de mata-mata entre os classificados
//
// A estrutura de um torneio é descrita como uma lista de RODADAS
// ({ phase, label, games }). A mesma lista alimenta a contagem de jogos e a
// estimativa de duração, então as duas nunca divergem.

export const FORMATS = ['knockout', 'roundrobin', 'groups'];

export const nextPow2 = (n) => {
  let p = 1;
  while (p < n) p *= 2;
  return p;
};

const isInt = (n) => Number.isInteger(n);

// ---------------------------------------------------------------------------
// ESTRUTURA (rodadas e jogos por rodada)
// ---------------------------------------------------------------------------

const knockoutRoundLabel = (gamesInRound, totalRounds, roundIndex) => {
  const fromEnd = totalRounds - roundIndex; // 1 = final
  if (fromEnd === 1) return 'Final';
  if (fromEnd === 2) return 'Semifinais';
  if (fromEnd === 3) return 'Quartas de final';
  if (fromEnd === 4) return 'Oitavas de final';
  return `Rodada ${roundIndex + 1} (${gamesInRound} jogos)`;
};

/** Rodadas de um mata-mata simples com `n` equipes. */
export function knockoutRounds(n, { thirdPlace = false } = {}) {
  if (!isInt(n) || n < 2) return [];
  const size = nextPow2(n);
  const totalRounds = Math.log2(size);
  const rounds = [];
  // 1ª rodada: só jogam as equipes sem "bye". n - size/2 jogos.
  let games = n - size / 2;
  rounds.push({ phase: 'knockout', games });
  games = size / 4;
  for (let r = 1; r < totalRounds; r++) {
    rounds.push({ phase: 'knockout', games });
    games /= 2;
  }
  const labelled = rounds.map((r, i) => ({
    ...r,
    label: knockoutRoundLabel(r.games, totalRounds, i),
  }));
  if (thirdPlace && n >= 4) {
    // A disputa de 3º lugar acontece junto da final (mesma "rodada" de tempo
    // só se houver campo livre; aqui conservadoramente conta como rodada própria).
    labelled.splice(labelled.length - 1, 0, {
      phase: 'knockout',
      label: 'Disputa de 3º lugar',
      games: 1,
    });
  }
  return labelled;
}

/** Quantidade de rodadas e jogos por rodada de um todos-contra-todos. */
export function roundRobinRounds(n, { legs = 1, label = 'Rodada', phase = 'roundrobin' } = {}) {
  if (!isInt(n) || n < 2) return [];
  const roundsPerLeg = n % 2 === 0 ? n - 1 : n;
  const gamesPerRound = Math.floor(n / 2);
  const rounds = [];
  for (let leg = 0; leg < legs; leg++) {
    for (let r = 0; r < roundsPerLeg; r++) {
      rounds.push({
        phase,
        label: `${label} ${leg * roundsPerLeg + r + 1}`,
        games: gamesPerRound,
        byes: n % 2 === 0 ? 0 : 1,
      });
    }
  }
  return rounds;
}

/** Tamanho dos grupos: equipes distribuídas o mais uniformemente possível. */
export function groupSizes(n, groupCount) {
  const base = Math.floor(n / groupCount);
  const extra = n % groupCount;
  return Array.from({ length: groupCount }, (_, i) => (i < extra ? base + 1 : base));
}

/**
 * Valida a configuração. Retorna lista de mensagens de erro (vazia = válida).
 */
export function validateConfig(cfg) {
  const errors = [];
  const { format, teams } = cfg;
  if (!FORMATS.includes(format)) errors.push('Escolha um formato de competição.');
  if (!isInt(teams) || teams < 2) errors.push('Informe pelo menos 2 equipes.');
  else if (teams > 64) errors.push('O limite desta calculadora é 64 equipes.');

  if (format === 'groups' && isInt(teams) && teams >= 2) {
    const { groupCount, advancePerGroup } = cfg;
    if (!isInt(groupCount) || groupCount < 2) {
      errors.push('Informe pelo menos 2 grupos.');
    } else if (groupCount > teams / 2) {
      errors.push('Cada grupo precisa de pelo menos 2 equipes: reduza a quantidade de grupos.');
    } else if (cfg.knockoutAfterGroups) {
      const smallest = Math.min(...groupSizes(teams, groupCount));
      if (!isInt(advancePerGroup) || advancePerGroup < 1) {
        errors.push('Informe quantas equipes classificam por grupo.');
      } else if (advancePerGroup > smallest) {
        errors.push(`O menor grupo tem ${smallest} equipes; não dá para classificar ${advancePerGroup} por grupo.`);
      } else if (groupCount * advancePerGroup < 2) {
        errors.push('É preciso classificar pelo menos 2 equipes para a fase eliminatória.');
      }
    }
  }
  if (cfg.fields !== undefined && (!isInt(cfg.fields) || cfg.fields < 1 || cfg.fields > 32)) {
    errors.push('O número de campos/quadras deve ser um inteiro entre 1 e 32.');
  }
  if (cfg.matchMinutes !== undefined && (!Number.isFinite(cfg.matchMinutes) || cfg.matchMinutes < 1 || cfg.matchMinutes > 240)) {
    errors.push('A duração da partida deve estar entre 1 e 240 minutos.');
  }
  if (cfg.breakMinutes !== undefined && (!Number.isFinite(cfg.breakMinutes) || cfg.breakMinutes < 0 || cfg.breakMinutes > 120)) {
    errors.push('O intervalo entre partidas deve estar entre 0 e 120 minutos.');
  }
  return errors;
}

/**
 * Monta a estrutura completa (lista de rodadas) de acordo com a configuração.
 * Pressupõe configuração válida (use validateConfig antes).
 */
export function buildStructure(cfg) {
  const { format, teams } = cfg;
  const legs = cfg.legs === 2 ? 2 : 1;

  if (format === 'knockout') {
    return knockoutRounds(teams, { thirdPlace: !!cfg.thirdPlace });
  }
  if (format === 'roundrobin') {
    return roundRobinRounds(teams, { legs });
  }
  // groups
  const sizes = groupSizes(teams, cfg.groupCount);
  const perGroup = sizes.map((s) => roundRobinRounds(s, { legs, label: 'Grupos – rodada', phase: 'groups' }));
  const maxRounds = Math.max(...perGroup.map((r) => r.length));
  const rounds = [];
  // A rodada k de todos os grupos acontece "em paralelo" (mesma etapa).
  for (let k = 0; k < maxRounds; k++) {
    const games = perGroup.reduce((sum, g) => sum + (g[k]?.games ?? 0), 0);
    rounds.push({ phase: 'groups', label: `Grupos – rodada ${k + 1}`, games });
  }
  if (cfg.knockoutAfterGroups) {
    const qualified = cfg.groupCount * cfg.advancePerGroup;
    rounds.push(...knockoutRounds(qualified, { thirdPlace: !!cfg.thirdPlace }));
  }
  return rounds;
}

// ---------------------------------------------------------------------------
// RESUMO + DURAÇÃO ESTIMADA
// ---------------------------------------------------------------------------

/**
 * @returns {{
 *   totalGames:number, totalRounds:number, rounds:Array,
 *   slots:number, estimatedMinutes:number|null,
 *   groupGames?:number, knockoutGames?:number, byes?:number
 * }}
 *
 * Duração estimada = soma, para cada rodada, de ceil(jogos / campos) "faixas
 * de horário" × duração da partida, mais o intervalo entre faixas consecutivas.
 * Premissas: todos os jogos duram o mesmo tempo; uma rodada só começa quando a
 * anterior termina (conservador); não considera atrasos, aquecimento,
 * premiação nem prorrogação/pênaltis.
 */
export function summarize(cfg) {
  const rounds = buildStructure(cfg);
  const totalGames = rounds.reduce((s, r) => s + r.games, 0);
  const fields = cfg.fields ?? 1;
  const slots = rounds.reduce((s, r) => s + Math.ceil(r.games / fields), 0);

  let estimatedMinutes = null;
  if (cfg.matchMinutes !== undefined) {
    const brk = cfg.breakMinutes ?? 0;
    estimatedMinutes = slots * cfg.matchMinutes + Math.max(0, slots - 1) * brk;
  }

  const out = { totalGames, totalRounds: rounds.length, rounds, slots, estimatedMinutes };
  if (cfg.format === 'groups') {
    out.groupGames = rounds.filter((r) => r.phase === 'groups').reduce((s, r) => s + r.games, 0);
    out.knockoutGames = totalGames - out.groupGames;
  }
  if (cfg.format === 'knockout') {
    out.byes = nextPow2(cfg.teams) - cfg.teams;
  }
  if (cfg.format === 'roundrobin' && cfg.teams % 2 === 1) {
    out.byes = cfg.teams * (cfg.legs === 2 ? 2 : 1); // folgas totais (1 por rodada)
  }
  return out;
}

export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return '—';
  const m = Math.round(minutes);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r === 0 ? `${h} h` : `${h} h ${String(r).padStart(2, '0')} min`;
}

// ---------------------------------------------------------------------------
// GERAÇÃO DE CONFRONTOS
// ---------------------------------------------------------------------------

export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Todos contra todos pelo "método do círculo". Retorna rodadas:
 *   [{ round: 1, games: [{home, away}], rest: 'Equipe X' | null }, ...]
 * Com número ímpar de equipes, uma equipe folga em cada rodada.
 * Em 2 turnos, o returno repete as rodadas com mando invertido.
 */
export function roundRobinSchedule(teams, { legs = 1 } = {}) {
  const list = [...teams];
  if (list.length < 2) return [];
  const BYE = Symbol('bye');
  if (list.length % 2 === 1) list.push(BYE);
  const n = list.length;
  const roundsPerLeg = n - 1;
  const half = n / 2;

  let arr = [...list];
  const firstLeg = [];
  for (let r = 0; r < roundsPerLeg; r++) {
    const games = [];
    let rest = null;
    for (let i = 0; i < half; i++) {
      let a = arr[i];
      let b = arr[n - 1 - i];
      // alterna o mando da posição fixa para equilibrar mandos
      if (i === 0 && r % 2 === 1) [a, b] = [b, a];
      if (a === BYE) rest = b;
      else if (b === BYE) rest = a;
      else games.push({ home: a, away: b });
    }
    firstLeg.push({ games, rest });
    // gira todos menos o primeiro
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }

  const rounds = firstLeg.map((r, i) => ({ round: i + 1, ...r }));
  if (legs === 2) {
    firstLeg.forEach((r, i) => {
      rounds.push({
        round: roundsPerLeg + i + 1,
        games: r.games.map((g) => ({ home: g.away, away: g.home })),
        rest: r.rest,
      });
    });
  }
  return rounds;
}

/** Ordem de "cabeças de chave" para um chaveamento de tamanho potência de 2. */
export function seedPositions(size) {
  let order = [1];
  while (order.length < size) {
    const next = [];
    const total = order.length * 2;
    for (const s of order) {
      next.push(s, total + 1 - s);
    }
    order = next;
  }
  return order;
}

/**
 * Mata-mata simples. `teams` na ordem de cabeça de chave (a 1ª é a favorita).
 * Equipes com bye avançam direto e são sempre as melhores cabeças de chave.
 * Retorna rodadas com jogos { id, home, away, bye? } — nas rodadas seguintes,
 * home/away são descrições como "Vencedor do jogo 1".
 */
export function knockoutSchedule(teams, { thirdPlace = false } = {}) {
  const n = teams.length;
  if (n < 2) return [];
  const size = nextPow2(n);
  const positions = seedPositions(size);
  const slots = positions.map((seed) => (seed <= n ? teams[seed - 1] : null));

  let gameNo = 0;
  const rounds = [];
  const totalRounds = Math.log2(size);

  // Rodada 1
  const first = [];
  const winnersLabels = []; // descrição do "vencedor" de cada confronto da rodada
  for (let i = 0; i < size; i += 2) {
    const home = slots[i];
    const away = slots[i + 1];
    if (home && away) {
      gameNo++;
      first.push({ id: gameNo, home, away });
      winnersLabels.push(`Vencedor do jogo ${gameNo}`);
    } else {
      // bye: a equipe real avança direto (sem jogo)
      winnersLabels.push(home || away);
      first.push({ id: null, home: home || away, away: null, bye: true });
    }
  }
  // Se não houver bye nenhum, a 1ª rodada é a rodada "cheia".
  rounds.push({ label: knockoutRoundLabel(first.filter((g) => !g.bye).length, totalRounds, 0), games: first });

  let prevLabels = winnersLabels;
  for (let r = 1; r < totalRounds; r++) {
    const games = [];
    const labels = [];
    for (let i = 0; i < prevLabels.length; i += 2) {
      gameNo++;
      games.push({ id: gameNo, home: prevLabels[i], away: prevLabels[i + 1] });
      labels.push(`Vencedor do jogo ${gameNo}`);
    }
    rounds.push({ label: knockoutRoundLabel(games.length, totalRounds, r), games });
    prevLabels = labels;
  }

  if (thirdPlace && n >= 4) {
    // Perdedores das semifinais (penúltima rodada). A disputa de 3º lugar é
    // numerada antes da final para manter a ordem do calendário.
    const semi = rounds[rounds.length - 2].games;
    const final = rounds[rounds.length - 1].games[0];
    const third = {
      id: final.id,
      home: `Perdedor do jogo ${semi[0].id}`,
      away: `Perdedor do jogo ${semi[1].id}`,
    };
    final.id += 1;
    rounds.splice(rounds.length - 1, 0, { label: 'Disputa de 3º lugar', games: [third] });
  }
  return rounds;
}

/** Distribui equipes em grupos (serpentina por cabeça de chave ou aleatório). */
export function drawGroups(teams, groupCount, { mode = 'seeded', rng = Math.random } = {}) {
  const list = mode === 'random' ? shuffle(teams, rng) : [...teams];
  const groups = Array.from({ length: groupCount }, () => []);
  let idx = 0;
  let dir = 1;
  for (const team of list) {
    groups[idx].push(team);
    idx += dir;
    if (idx >= groupCount) { dir = -1; idx = groupCount - 1; }
    else if (idx < 0) { dir = 1; idx = 0; }
  }
  return groups;
}

export const groupLabel = (i) => `Grupo ${String.fromCharCode(65 + i)}`;

/** Converte uma tabela de jogos em texto simples, pronto para copiar. */
export function scheduleToText(rounds, { title } = {}) {
  const lines = [];
  if (title) lines.push(title, '');
  for (const r of rounds) {
    lines.push(r.label ?? `Rodada ${r.round}`);
    for (const g of r.games) {
      if (g.bye) lines.push(`  ${g.home} — avança direto (sem jogo)`);
      else lines.push(`  ${g.id ? `Jogo ${g.id}: ` : ''}${g.home} x ${g.away}`);
    }
    if (r.rest) lines.push(`  Folga: ${r.rest}`);
    lines.push('');
  }
  return lines.join('\n').trim();
}
