// src/utils/bracket.js
// Utilitários puros para geração de chaveamento.

/** Embaralhamento Fisher-Yates */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Próxima potência de 2 >= n */
function nextPow2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Gera partidas de MATA-MATA (eliminação simples).
 * @param {Array<{id:string,name:string}>} teams
 */
export function generateKnockout(teams) {
  const shuffled = shuffle(teams);
  const size = nextPow2(shuffled.length);

  const slots = [];
  for (let i = 0; i < size; i++) slots.push(shuffled[i] || null);

  const rounds = [];
  const r1 = [];
  for (let i = 0; i < size; i += 2) {
    r1.push({
      round: 1,
      match_index: i / 2,
      team_a_id: slots[i]?.id ?? null,
      team_b_id: slots[i + 1]?.id ?? null,
      bye: !slots[i] || !slots[i + 1],
    });
  }
  rounds.push(r1);

  let prev = r1.length;
  let roundNum = 2;
  while (prev > 1) {
    const r = [];
    for (let i = 0; i < prev / 2; i++) {
      r.push({
        round: roundNum,
        match_index: i,
        team_a_id: null,
        team_b_id: null,
        bye: false,
      });
    }
    rounds.push(r);
    prev = r.length;
    roundNum++;
  }

  return rounds;
}

/**
 * Gera partidas de PONTOS CORRIDOS (round-robin, turno único).
 * @param {Array<{id:string,name:string}>} teams
 */
export function generateRoundRobin(teams) {
  const shuffled = shuffle(teams);
  const list = [...shuffled];
  if (list.length % 2 === 1) list.push(null);
  const n = list.length;
  const rounds = [];
  const totalRounds = n - 1;
  const half = n / 2;

  let arr = [...list];
  for (let r = 0; r < totalRounds; r++) {
    const matches = [];
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a && b) {
        matches.push({
          round: r + 1,
          match_index: i,
          team_a_id: a.id,
          team_b_id: b.id,
          bye: false,
        });
      }
    }
    rounds.push(matches);
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }
  return rounds;
}

/**
 * Calcula a tabela de pontos corridos a partir das partidas finalizadas.
 * Vitória=3, Empate=1, Derrota=0.
 */
export function computeStandings(teams, matches) {
  const table = {};
  for (const t of teams) {
    table[t.id] = {
      team: t,
      P: 0, V: 0, E: 0, D: 0,
      GP: 0, GC: 0, SG: 0, Pts: 0,
    };
  }
  for (const m of matches) {
    if (m.status !== 'finished' || m.score_a == null || m.score_b == null) continue;
    if (!table[m.team_a_id] || !table[m.team_b_id]) continue;
    const A = table[m.team_a_id];
    const B = table[m.team_b_id];
    A.P++; B.P++;
    A.GP += m.score_a; A.GC += m.score_b;
    B.GP += m.score_b; B.GC += m.score_a;
    if (m.score_a > m.score_b) { A.V++; A.Pts += 3; B.D++; }
    else if (m.score_a < m.score_b) { B.V++; B.Pts += 3; A.D++; }
    else { A.E++; B.E++; A.Pts++; B.Pts++; }
  }
  return Object.values(table)
    .map(r => ({ ...r, SG: r.GP - r.GC }))
    .sort((a, b) => b.Pts - a.Pts || b.SG - a.SG || b.GP - a.GP);
}
