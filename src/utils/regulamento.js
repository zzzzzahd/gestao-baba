// src/utils/regulamento.js
// Gerador de MODELO de regulamento de torneio amador. Funções puras.
// O resultado é um texto-base para revisão e adaptação — não é um documento
// jurídico, e a organização é quem decide e responde pelas regras finais.

import { validateConfig, summarize } from './tournamentMath';

export const TIEBREAKERS = [
  { id: 'vitorias', label: 'Maior número de vitórias' },
  { id: 'saldo', label: 'Maior saldo de gols' },
  { id: 'golspro', label: 'Maior número de gols marcados' },
  { id: 'confronto', label: 'Confronto direto (entre as equipes empatadas)' },
  { id: 'golssofridos', label: 'Menor número de gols sofridos' },
  { id: 'disciplina', label: 'Melhor campanha disciplinar (menos cartões; vermelho vale 3 pontos de punição, amarelo 1)' },
];
export const DEFAULT_TIEBREAKERS = ['vitorias', 'saldo', 'golspro', 'confronto', 'disciplina'];

export const defaultRegulamento = () => ({
  name: '',
  organizer: '',
  place: '',
  dateText: '',
  format: 'roundrobin',
  teams: 6,
  legs: 1,
  thirdPlace: false,
  groupCount: 2,
  knockoutAfterGroups: true,
  advancePerGroup: 2,
  playersPerTeam: 5,
  minPlayers: 4,
  maxRegistered: 10,
  matchMinutes: 20,
  halves: 'unico',
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  tiebreakers: [...DEFAULT_TIEBREAKERS],
  knockoutDraw: 'penaltis',
  lateTolerance: 10,
  woScore: '1x0',
  woLimit: 2,
  yellowSuspensionAt: 2,
  redSuspension: true,
  fee: '',
  prize: '',
});

const isInt = Number.isInteger;

export function validateRegulamento(cfg) {
  const errors = [];
  const name = (cfg.name ?? '').trim();
  if (!name) errors.push('Informe o nome do torneio.');
  else if (name.length > 80) errors.push('O nome do torneio pode ter no máximo 80 caracteres.');

  errors.push(...validateConfig({ format: cfg.format, teams: cfg.teams, legs: cfg.legs, thirdPlace: cfg.thirdPlace,
    groupCount: cfg.groupCount, knockoutAfterGroups: cfg.knockoutAfterGroups, advancePerGroup: cfg.advancePerGroup }));

  if (!isInt(cfg.playersPerTeam) || cfg.playersPerTeam < 3 || cfg.playersPerTeam > 15) errors.push('Jogadores em campo por equipe: informe de 3 a 15.');
  else {
    if (!isInt(cfg.minPlayers) || cfg.minPlayers < 1 || cfg.minPlayers > cfg.playersPerTeam) errors.push('O mínimo para iniciar a partida deve ficar entre 1 e o número de jogadores em campo.');
    if (!isInt(cfg.maxRegistered) || cfg.maxRegistered < cfg.playersPerTeam || cfg.maxRegistered > 40) errors.push('O máximo de inscritos por equipe não pode ser menor que o número de jogadores em campo (limite 40).');
  }
  if (!isInt(cfg.matchMinutes) || cfg.matchMinutes < 5 || cfg.matchMinutes > 120) errors.push('A duração da partida deve ficar entre 5 e 120 minutos.');
  if (cfg.format !== 'knockout') {
    const { pointsWin: w, pointsDraw: d, pointsLoss: l } = cfg;
    if (![w, d, l].every((p) => isInt(p) && p >= 0 && p <= 10)) errors.push('A pontuação deve usar números inteiros de 0 a 10.');
    else if (!(w > d && d >= l)) errors.push('A pontuação precisa seguir: vitória maior que empate, e empate maior ou igual à derrota.');
  }
  if (!isInt(cfg.lateTolerance) || cfg.lateTolerance < 0 || cfg.lateTolerance > 60) errors.push('A tolerância de atraso deve ficar entre 0 e 60 minutos.');
  if (!isInt(cfg.woLimit) || cfg.woLimit < 1 || cfg.woLimit > 5) errors.push('O limite de W.O. deve ficar entre 1 e 5.');
  if (!isInt(cfg.yellowSuspensionAt) || cfg.yellowSuspensionAt < 0 || cfg.yellowSuspensionAt > 10) errors.push('Cartões amarelos para suspensão: de 0 (desligado) a 10.');
  return errors;
}

const woText = { '1x0': 'derrota por 1 x 0', '3x0': 'derrota por 3 x 0', '2x0': 'derrota por 2 x 0' };
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

function formatSection(cfg, s) {
  const items = [];
  if (cfg.format === 'knockout') {
    items.push(`A competição será disputada em sistema de mata-mata simples, com ${cfg.teams} equipes: quem perde está eliminado.`);
    const byes = s.byes ?? 0;
    if (byes > 0) items.push(`Como o número de equipes não é potência de 2, ${plural(byes, 'equipe avança', 'equipes avançam')} direto para a segunda rodada (bye), escolhidas entre as melhores cabeças de chave definidas pela organização.`);
    items.push('O chaveamento segue a ordem de cabeças de chave definida pela organização, de modo que as duas melhores só se enfrentem na final.');
    if (cfg.thirdPlace && cfg.teams >= 4) items.push('Haverá disputa de 3º lugar entre os perdedores das semifinais.');
  } else if (cfg.format === 'roundrobin') {
    items.push(`A competição será disputada em pontos corridos, com ${cfg.teams} equipes, em ${cfg.legs === 2 ? 'dois turnos (ida e volta)' : 'turno único'}: todas as equipes se enfrentam ${cfg.legs === 2 ? 'duas vezes' : 'uma vez'}.`);
    if (cfg.teams % 2 === 1) items.push('Como o número de equipes é ímpar, em cada rodada uma equipe folga, de acordo com a tabela divulgada pela organização.');
    items.push('Vence o torneio a equipe com mais pontos ao final de todas as rodadas, respeitados os critérios de desempate deste regulamento.');
  } else {
    items.push(`A competição terá fase de grupos com ${cfg.teams} equipes divididas em ${cfg.groupCount} grupos, distribuídas pela organização o mais uniformemente possível.`);
    items.push(`Dentro de cada grupo, as equipes jogam todas contra todas em ${cfg.legs === 2 ? 'dois turnos' : 'turno único'}.`);
    if (cfg.knockoutAfterGroups) {
      const q = cfg.groupCount * cfg.advancePerGroup;
      items.push(`Classificam-se para a fase eliminatória as ${plural(cfg.advancePerGroup, 'primeira equipe', 'primeiras equipes')} de cada grupo (${q} equipes), em mata-mata simples, com cruzamentos definidos pela organização antes do início da fase.`);
      if (cfg.thirdPlace && q >= 4) items.push('Haverá disputa de 3º lugar entre os perdedores das semifinais.');
    } else {
      items.push('Vence o torneio a melhor equipe de acordo com a classificação, conforme definido pela organização antes do início.');
    }
  }
  items.push(`No total, o torneio terá ${plural(s.totalGames, 'jogo', 'jogos')} distribuídos em ${plural(s.totalRounds, 'etapa', 'etapas')}.`);
  return items;
}

/**
 * @returns {{ sections: Array<{title:string, items:string[]}>, text:string }}
 * Pressupõe configuração válida (use validateRegulamento antes).
 */
export function buildRegulamento(cfg) {
  const s = summarize({ format: cfg.format, teams: cfg.teams, legs: cfg.legs, thirdPlace: cfg.thirdPlace,
    groupCount: cfg.groupCount, knockoutAfterGroups: cfg.knockoutAfterGroups, advancePerGroup: cfg.advancePerGroup });
  const name = cfg.name.trim();
  const sections = [];

  const general = [`O ${name} é uma competição amadora de futebol${cfg.organizer.trim() ? `, organizada por ${cfg.organizer.trim()}` : ''}${cfg.place.trim() ? `, realizada em ${cfg.place.trim()}` : ''}${cfg.dateText.trim() ? `, ${cfg.dateText.trim()}` : ''}.`,
    'Este regulamento vale para todas as equipes e jogadores inscritos. A inscrição implica conhecimento e aceitação de todas as regras aqui descritas.'];
  sections.push({ title: 'Disposições gerais', items: general });

  const part = [
    `Participam ${cfg.teams} equipes, cada uma com ${cfg.playersPerTeam} jogadores em campo e até ${cfg.maxRegistered} jogadores inscritos.`,
    'Cada equipe terá um responsável, que representa o grupo perante a organização.',
    'O jogador só pode atuar por uma equipe durante o torneio.',
    'A lista de inscritos de cada equipe deve ser entregue antes do primeiro jogo; inclusões e trocas depois disso dependem de autorização da organização.',
  ];
  if (cfg.fee.trim()) part.push(`Inscrição: ${cfg.fee.trim()}.`);
  sections.push({ title: 'Participantes e inscrição', items: part });

  sections.push({ title: 'Formato da competição', items: formatSection(cfg, s) });

  const matches = [
    `Cada partida terá ${cfg.halves === 'dois' ? `dois tempos de ${Math.floor(cfg.matchMinutes / 2)} minutos${cfg.matchMinutes % 2 ? ' (mais 1 minuto no segundo tempo)' : ''}, com intervalo curto` : `tempo único de ${cfg.matchMinutes} minutos`}.`,
    `Para iniciar a partida, cada equipe precisa ter pelo menos ${plural(cfg.minPlayers, 'jogador', 'jogadores')} em campo.`,
    `Há tolerância de ${plural(cfg.lateTolerance, 'minuto', 'minutos')} de atraso, contada a partir do horário marcado na tabela. Vencido o prazo sem o mínimo de jogadores, a equipe ausente perde por W.O. (${woText[cfg.woScore] ?? woText['1x0']}).`,
    `A equipe que acumular ${plural(cfg.woLimit, 'W.O.', 'W.O.')} está eliminada do torneio; seus resultados anteriores são mantidos.`,
    'As substituições são livres, desde que feitas com a bola parada e com aviso à arbitragem ou à mesa.',
    'Os horários e a ordem dos jogos seguem a tabela divulgada pela organização, que pode ajustá-la por motivo de força maior, avisando as equipes.',
  ];
  sections.push({ title: 'Partidas', items: matches });

  if (cfg.format !== 'knockout') {
    const order = cfg.tiebreakers
      .map((id) => TIEBREAKERS.find((t) => t.id === id))
      .filter(Boolean)
      .map((t) => t.label);
    const items = [
      `Vitória vale ${plural(cfg.pointsWin, 'ponto', 'pontos')}, empate vale ${plural(cfg.pointsDraw, 'ponto', 'pontos')} e derrota vale ${plural(cfg.pointsLoss, 'ponto', 'pontos')}.`,
      'Em caso de igualdade de pontos, a classificação é decidida pelos critérios abaixo, nesta ordem:',
      ...order.map((o, i) => `   ${String.fromCharCode(97 + i)}) ${o};`),
      `   ${String.fromCharCode(97 + order.length)}) Sorteio, realizado pela organização na presença dos responsáveis interessados.`,
    ];
    sections.push({ title: 'Pontuação, classificação e desempate', items });
  }

  if (cfg.format === 'knockout' || (cfg.format === 'groups' && cfg.knockoutAfterGroups)) {
    sections.push({
      title: 'Empates nas partidas eliminatórias',
      items: [
        cfg.knockoutDraw === 'prorrogacao'
          ? 'Se o jogo terminar empatado no tempo normal, haverá prorrogação de 5 minutos e, persistindo o empate, disputa de pênaltis.'
          : 'Se o jogo terminar empatado no tempo normal, a vaga será decidida em disputa de pênaltis.',
        'Os pênaltis serão disputados em série de 3 cobranças alternadas por equipe; persistindo o empate, seguem cobranças alternadas até haver diferença.',
      ],
    });
  }

  const conduct = [
    'Todos os participantes devem respeitar adversários, arbitragem, organização e público.',
    'É proibida qualquer agressão física ou verbal. O infrator será excluído da partida e do torneio, e a organização poderá punir também a equipe.',
    'Cada equipe responde pela conduta de seus jogadores e acompanhantes.',
  ];
  if (cfg.yellowSuspensionAt > 0) conduct.push(`O jogador que acumular ${plural(cfg.yellowSuspensionAt, 'cartão amarelo', 'cartões amarelos')} fica suspenso do jogo seguinte.`);
  if (cfg.redSuspension) conduct.push('O jogador expulso com cartão vermelho fica suspenso por, no mínimo, o jogo seguinte; casos graves serão avaliados pela organização.');
  sections.push({ title: 'Disciplina e conduta', items: conduct });

  if (cfg.prize.trim()) sections.push({ title: 'Premiação', items: [cfg.prize.trim().replace(/\.*$/, '.')] });

  sections.push({
    title: 'Disposições finais',
    items: [
      'Os casos omissos neste regulamento serão resolvidos pela organização, e suas decisões valem para todas as equipes.',
      'Este regulamento pode ser alterado antes do início da competição, com comunicação a todos os responsáveis. Depois do início, só por decisão da organização, informada a todos.',
      'Este regulamento entra em vigor na data de início do torneio.',
    ],
  });

  const lines = [name.toUpperCase(), 'REGULAMENTO', ''];
  sections.forEach((sec, i) => {
    lines.push(`${i + 1}. ${sec.title.toUpperCase()}`);
    let n = 0;
    sec.items.forEach((item) => {
      if (/^\s{2,}/.test(item)) lines.push(item);
      else { n += 1; lines.push(`${i + 1}.${n} ${item}`); }
    });
    lines.push('');
  });
  lines.push('Modelo gerado no Draft Play (draftplay.app.br/ferramentas/gerador-de-regulamento). Revise e adapte antes de divulgar: este texto não substitui orientação jurídica.');
  return { sections, text: lines.join('\n') };
}
