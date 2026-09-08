// src/utils/drawAlgorithm.js
// Algoritmo de sorteio balanceado — extraído de StepConfig.jsx pra ficar
// testável isoladamente (era código inline, sem nenhum teste cobrindo os
// bugs reais que já apareceram aqui: desempate alfabético, tamanho errado
// do time reserva, goleiro sumindo quando faltava pra 1 por time, etc.)
//
// Revisão: dois bugs corrigidos nesta versão (ver comentários abaixo):
// 1) modo gkMode='fixed' não validava se havia goleiros suficientes pra
//    cobrir 1 por time (só o modo 'court' fazia isso) — quando faltava
//    goleiro, jogadores de linha excedentes desapareciam do sorteio (não
//    entravam em nenhum time nem em reservas).
// 2) as trocas por restrição (must_together/must_apart) não respeitavam a
//    posição do jogador — podiam trocar um goleiro por um jogador de linha
//    e quebrar a garantia de 1 goleiro por time.

/** Distribui um pool (já ordenado por prioridade) em times respeitando a capacidade de cada um, em formato serpentina (cobra). Aceita capacidades diferentes por time. */
export const snakeDistribute = (pool, capacities) => {
  const teams = capacities.map(() => []);
  let dir = 1, poolIdx = 0;
  while (poolIdx < pool.length) {
    const order = dir === 1 ? capacities.map((_, i) => i) : capacities.map((_, i) => i).reverse();
    let placedAny = false;
    for (const t of order) {
      if (poolIdx >= pool.length) break;
      if (teams[t].length < capacities[t]) {
        teams[t].push(pool[poolIdx]);
        poolIdx++;
        placedAny = true;
      }
    }
    if (!placedAny) break;
    dir *= -1;
  }
  return teams;
};

/** Fisher-Yates — usado antes de ordenar por nota pra empates não caírem sempre
 * pra ordem alfabética do nome (era isso que fazia "Zharick" ficar sempre por
 * último: todo mundo empatado em nota 2, e a query de players vem ordenada por
 * nome — sem embaralhar, o desempate é sempre alfabético, sempre no mesmo sentido). */
export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const drawTeamsWithConstraints = (players, playersPerTeam, strategy, constraints = [], gkMode = 'fixed') => {
  const gks      = players.filter(p => p.position === 'goleiro');
  const outfield = players.filter(p => p.position !== 'goleiro');

  const totalTeamsIfFixed    = strategy === 'reserve'
    ? Math.floor(players.length / (playersPerTeam + 1))
    : Math.ceil(players.length / playersPerTeam);
  const totalTeamsIfLineOnly = strategy === 'reserve'
    ? Math.floor(outfield.length / (playersPerTeam + 1))
    : Math.ceil(outfield.length / playersPerTeam);

  // court: decide sozinho — goleiro fixo no time se a conta bate exatamente
  // (1 goleiro por time), senão vira fila própria da quadra (goalkeeperQueue)
  let mode; // 'fixed' | 'separate' | 'court-fixed' | 'court-queue'
  if (gkMode === 'separate') mode = 'separate';
  else if (gkMode === 'court') {
    mode = (totalTeamsIfFixed > 0 && gks.length === totalTeamsIfFixed) ? 'court-fixed' : 'court-queue';
  } else mode = 'fixed';

  const totalTeams = (mode === 'separate' || mode === 'court-queue') ? totalTeamsIfLineOnly : totalTeamsIfFixed;

  // Goleiro sempre é distribuído à parte, com vaga garantida (1 por time) quando o
  // modo exige — nunca dentro do mesmo snake por nota que os jogadores de linha,
  // senão a ordenação por nota pode deixar times inteiros sem goleiro por acaso.
  const hasDedicatedGkPerTeam = mode === 'fixed' || mode === 'court-fixed' || mode === 'separate';
  // separate: goleiro é vaga extra (bônus) — linha usa a capacidade cheia de playersPerTeam.
  // fixed/court-fixed: goleiro é 1 dos playersPerTeam — linha usa playersPerTeam-1.
  // court-queue: não tem goleiro dedicado nenhum — linha usa a capacidade cheia.
  let lineCapacityPerTeam = (mode === 'fixed' || mode === 'court-fixed') ? playersPerTeam - 1 : playersPerTeam;
  // 'reserve': cada time ganha +1 vaga própria de reserva (fica marcado isReserve),
  // que pode entrar pra substituir qualquer titular DO MESMO TIME até o fim do baba.
  if (strategy === 'reserve') lineCapacityPerTeam += 1;

  // FIX (bug 1): os goleiros são distribuídos ANTES da linha, pra sabermos
  // exatamente quais times ficaram sem goleiro (quando gks.length < totalTeams,
  // isso acontece mesmo no modo 'fixed' — só o modo 'court' verificava isso
  // antes). Um time que não recebe goleiro tem sua vaga de linha "devolvida"
  // (lineCapacityPerTeam + 1), senão o jogador de linha excedente não caberia
  // em capacidade nenhuma e sumiria do sorteio sem aviso.
  let goalkeeperQueue = [];
  let gkReserves      = [];
  let gkAssignedPerTeam = Array.from({ length: totalTeams }, () => []);
  if (mode === 'court-queue') {
    // Goleiros não entram no sorteio de time nenhum — ficam numa fila própria,
    // vinculada à quadra (índices 0/1 = ativos, resto = banco). StepMatch.jsx
    // gira essa fila em paralelo com a fila de times (ver handleMatchEnd).
    goalkeeperQueue = shuffle(gks).sort((a, b) => (b.balance_level || 0) - (a.balance_level || 0));
  } else if (hasDedicatedGkPerTeam) {
    const sortedGks    = shuffle(gks).sort((a, b) => (b.balance_level || 0) - (a.balance_level || 0));
    const gkCapacities = Array.from({ length: totalTeams }, () => 1);
    gkAssignedPerTeam  = snakeDistribute(sortedGks, gkCapacities);
    gkReserves = sortedGks.slice(totalTeams); // goleiros excedentes (mais goleiro que time)
  }

  // Só devolve a vaga de linha nos modos onde ela foi reduzida assumindo que um
  // goleiro ia preenchê-la (fixed/court-fixed). No 'separate' o goleiro já é
  // bônus e não mexe na capacidade de linha; sem goleiro ali o time só fica
  // sem o bônus, não perde vaga de linha nenhuma.
  const reducesLineForGk = mode === 'fixed' || mode === 'court-fixed';
  const lineCapacities = Array.from({ length: totalTeams }, (_, i) =>
    reducesLineForGk && gkAssignedPerTeam[i].length === 0
      ? lineCapacityPerTeam + 1
      : lineCapacityPerTeam
  );

  const sorted = shuffle(outfield).sort((a, b) => (b.balance_level || 0) - (a.balance_level || 0));
  let distributed;
  if (strategy === 'substitute' && totalTeams > 0) {
    // Concentra a falta de jogadores em UM time só (o último), em vez de espalhar
    // entre vários — mas ainda balanceia por nota dentro dos times completos.
    const fullTeams      = totalTeams - 1;
    const fullCapacities = lineCapacities.slice(0, fullTeams);
    const fullCapacity   = fullCapacities.reduce((a, b) => a + b, 0);
    const forFull        = sorted.slice(0, fullCapacity);
    const forIncomplete  = sorted.slice(fullCapacity);
    distributed = [
      ...snakeDistribute(forFull, fullCapacities),
      forIncomplete,
    ];
  } else {
    distributed = snakeDistribute(sorted, lineCapacities);
  }
  const teams = distributed.map((teamPlayers, i) => ({
    name:    `Time ${String.fromCharCode(65 + i)}`,
    // 'reserve': o último jogador alocado no time (a vaga extra) é o reserva do time.
    // 'substitute': o time pode sobrar incompleto naturalmente (snake respeita a
    // capacidade mas não força completar — o último time formado pode ficar curto).
    players: strategy === 'reserve' && teamPlayers.length === lineCapacities[i]
      ? teamPlayers.map((p, idx) => idx === teamPlayers.length - 1 ? { ...p, isReserve: true } : p)
      : teamPlayers,
  }));

  // Goleiros já sorteados acima (antes da linha) — só falta anexar a cada time.
  gkAssignedPerTeam.forEach((assigned, i) => teams[i].players.push(...assigned));

  // FIX (bug 1, rede de segurança): captura qualquer jogador de linha que não
  // tenha entrado em time nenhum (não deveria mais acontecer, já que
  // lineCapacities agora compensa a falta de goleiro — mas evita perda
  // silenciosa em qualquer cenário não previsto). Antes, isso só era feito
  // quando strategy === 'reserve'; agora vale sempre, exceto 'substitute',
  // que por design já absorve toda sobra no último time.
  const placedLineCount = distributed.reduce((n, t) => n + t.length, 0);
  const unassignedLine  = strategy === 'substitute' ? [] : sorted.slice(placedLineCount);

  const getTeamOf = (pid) => teams.findIndex(t => t.players.some(p => p.id === pid));

  const swapPlayers = (tAIdx, pAId, tBIdx, pBId) => {
    const pA = teams[tAIdx].players.find(p => p.id === pAId);
    const pB = teams[tBIdx].players.find(p => p.id === pBId);
    if (!pA || !pB) return false;
    teams[tAIdx].players = teams[tAIdx].players.filter(p => p.id !== pAId);
    teams[tBIdx].players = teams[tBIdx].players.filter(p => p.id !== pBId);
    teams[tAIdx].players.push(pB);
    teams[tBIdx].players.push(pA);
    return true;
  };

  constraints.forEach(({ player_a_id, player_b_id, constraint_type }) => {
    const tA = getTeamOf(player_a_id);
    const tB = getTeamOf(player_b_id);
    if (tA === -1 || tB === -1) return;

    if (constraint_type === 'must_together' && tA !== tB) {
      const playerBObj   = teams[tB].players.find(p => p.id === player_b_id);
      const ratingTarget = playerBObj?.balance_level || 0;
      // FIX (bug 2): só considera candidatos da MESMA posição que player_b,
      // senão a troca pode tirar o goleiro do time A (ou colocar 2 goleiros
      // no time B) só porque a nota dele ficou perto do alvo.
      const candidates   = teams[tA].players
        .filter(p => p.id !== player_a_id && p.position === playerBObj?.position)
        .sort((a, b) => Math.abs((a.balance_level || 0) - ratingTarget) - Math.abs((b.balance_level || 0) - ratingTarget));
      if (candidates[0]) swapPlayers(tA, candidates[0].id, tB, player_b_id);
    }

    if (constraint_type === 'must_apart' && tA === tB) {
      const playerBObj   = teams[tA].players.find(p => p.id === player_b_id);
      const ratingTarget = playerBObj?.balance_level || 0;
      const otherTeamIdx = (tA + 1) % totalTeams;
      // FIX (bug 2): mesma restrição de posição aqui — só troca player_b por
      // alguém da mesma posição no time de destino.
      const candidates   = teams[otherTeamIdx].players
        .filter(p => p.position === playerBObj?.position)
        .sort((a, b) => Math.abs((a.balance_level || 0) - ratingTarget) - Math.abs((b.balance_level || 0) - ratingTarget));
      if (candidates[0]) swapPlayers(tA, player_b_id, otherTeamIdx, candidates[0].id);
    }
  });

  const reserves = [...unassignedLine, ...gkReserves];

  return { teams, reserves, goalkeeperQueue };
};
