// src/__tests__/utils/drawAlgorithm.test.js
//
// Cobre os bugs reais já encontrados no algoritmo de sorteio (não hipotéticos —
// cada describe() abaixo tem uma referência ao que quebrou de verdade em produção).
// Rodar com: npm run test  (ou vitest run src/__tests__/utils/drawAlgorithm.test.js)

import { describe, it, expect } from 'vitest';
import { shuffle, snakeDistribute, drawTeamsWithConstraints } from '../../utils/drawAlgorithm';

const linePlayer = (id, name, level = 2) => ({ id, name, position: 'linha', balance_level: level });
const goalie      = (id, name, level = 2) => ({ id, name, position: 'goleiro', balance_level: level });
const linePlayers = (n, level = 2) => Array.from({ length: n }, (_, i) => linePlayer(`L${i}`, `Linha${i}`, level));
const goalies      = (n, level = 2) => Array.from({ length: n }, (_, i) => goalie(`G${i}`, `Goleiro${i}`, level));

// ═══════════════════════════════════════════════════════════════════════════
// BUG: desempate sempre alfabético — jogadores empatados em nota (o caso mais
// comum, já que todo mundo sem avaliação cai em nível 2) sempre saíam na
// mesma ordem, a ordem em que a query de players chegava (alfabética por
// nome). Isso deixava sempre os MESMOS nomes em desvantagem (reserva/fila de
// espera), sorteio após sorteio. Corrigido com shuffle() antes do sort.
// ═══════════════════════════════════════════════════════════════════════════
describe('shuffle() — desempate não pode ser sempre alfabético', () => {
  it('embaralha a ordem — não retorna sempre a mesma sequência pra a mesma entrada', () => {
    const original = linePlayers(20);
    const results = new Set();
    for (let i = 0; i < 30; i++) {
      results.add(shuffle(original).map(p => p.id).join(','));
    }
    // Com 20 itens e 30 tentativas, a chance de sair sempre a mesma ordem é
    // astronomicamente baixa se o shuffle estiver funcionando de verdade.
    expect(results.size).toBeGreaterThan(1);
  });

  it('não muta o array original', () => {
    const original = linePlayers(10);
    const copy = [...original];
    shuffle(original);
    expect(original).toEqual(copy);
  });

  it('preserva todos os elementos (não perde nem duplica ninguém)', () => {
    const original = linePlayers(15);
    const result = shuffle(original);
    expect(result).toHaveLength(15);
    expect(new Set(result.map(p => p.id)).size).toBe(15);
  });

  it('regressão: jogador com nome no fim do alfabeto não fica sempre em desvantagem quando empatado', () => {
    // Simula o cenário real: "Zharick" (Z) sempre por último quando a query
    // vem ordenada por nome e todo mundo empata em nota.
    const players = [
      ...linePlayers(19, 2), // A-Y, todos nível 2
      linePlayer('Z', 'Zharick', 2), // Z, mesmo nível — deveria ter chance igual
    ];
    let zharickWasFirst = false;
    for (let i = 0; i < 50 && !zharickWasFirst; i++) {
      const sorted = shuffle(players).sort((a, b) => (b.balance_level || 0) - (a.balance_level || 0));
      if (sorted[0].id === 'Z') zharickWasFirst = true;
    }
    expect(zharickWasFirst).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// snakeDistribute — distribuição respeitando capacidade
// ═══════════════════════════════════════════════════════════════════════════
describe('snakeDistribute()', () => {
  it('nunca ultrapassa a capacidade de nenhum time', () => {
    const pool = linePlayers(23);
    const teams = snakeDistribute(pool, [5, 5, 5, 5]);
    teams.forEach(t => expect(t.length).toBeLessThanOrEqual(5));
  });

  it('distribui todo mundo quando cabe exatamente', () => {
    const pool = linePlayers(20);
    const teams = snakeDistribute(pool, [5, 5, 5, 5]);
    const total = teams.reduce((s, t) => s + t.length, 0);
    expect(total).toBe(20);
  });

  it('para quando não sobra mais capacidade em nenhum time (não trava em loop)', () => {
    const pool = linePlayers(3);
    const teams = snakeDistribute(pool, [5, 5]);
    const total = teams.reduce((s, t) => s + t.length, 0);
    expect(total).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BUG: estratégia "reserva" — cada time deveria ganhar 1 vaga própria a mais
// (titular + reserva do próprio time), mas a implementação original só
// calculava um pool de sobra solto, sem vincular o reserva ao time certo.
// ═══════════════════════════════════════════════════════════════════════════
describe('drawTeamsWithConstraints() — estratégia "reserva"', () => {
  it('24 jogadores, 5 por time → 4 times de 6 (5 titulares + 1 reserva cada)', () => {
    const players = linePlayers(24);
    // gkMode='court' com 0 goleiros no pool vira court-queue automaticamente,
    // sem descontar vaga fantasma de goleiro da linha (diferente de 'fixed',
    // que sempre reserva 1 vaga pra goleiro mesmo sem nenhum no pool —
    // comportamento correto pro uso real, mas atrapalha isolar só a lógica
    // de linha aqui).
    const { teams, reserves } = drawTeamsWithConstraints(players, 5, 'reserve', [], 'court');
    expect(teams).toHaveLength(4);
    teams.forEach(t => {
      expect(t.players).toHaveLength(6);
      expect(t.players.filter(p => p.isReserve)).toHaveLength(1);
    });
    // 24 = 4 times * 6 exatos, não deveria sobrar reserva solta
    expect(reserves).toHaveLength(0);
  });

  it('jogador excedente (não cabe nem como reserva) vai pra lista de reservas geral', () => {
    const players = linePlayers(25); // 1 a mais do que 4 times de 6 comportam
    const { teams, reserves } = drawTeamsWithConstraints(players, 5, 'reserve', [], 'court');
    expect(teams).toHaveLength(4);
    expect(reserves).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BUG: estratégia "incompleto" — a falta de jogadores devia se concentrar em
// UM time só (o combinado com o presidente: "3 times completos + 1
// incompleto"), mas a primeira versão espalhava a falta entre vários times
// (snake round-robin sem considerar isso).
// ═══════════════════════════════════════════════════════════════════════════
describe('drawTeamsWithConstraints() — estratégia "incompleto"', () => {
  it('18 jogadores, 5 por time → 3 times completos + 1 incompleto (não espalha a falta)', () => {
    const players = linePlayers(18);
    // gkMode='separate': sem goleiro nenhum no pool, "separate" nunca desconta
    // vaga fantasma de goleiro da linha (diferente de 'fixed', que sempre
    // reserva 1 vaga pra goleiro mesmo sem nenhum no pool).
    const { teams } = drawTeamsWithConstraints(players, 5, 'substitute', [], 'separate');
    const sizes = teams.map(t => t.players.length).sort((a, b) => b - a);
    expect(sizes).toEqual([5, 5, 5, 3]);
  });

  it('quando divide exato, não sobra nenhum time incompleto à toa', () => {
    const players = linePlayers(20);
    const { teams } = drawTeamsWithConstraints(players, 5, 'substitute', [], 'separate');
    teams.forEach(t => expect(t.players).toHaveLength(5));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BUG: goleiro sumindo do sorteio — floor(goleiros/times) zerava quando havia
// menos goleiros que times, jogando TODOS os goleiros pro pool de linha
// (perdiam a posição). E o modo "court" precisa decidir sozinho entre goleiro
// fixo no time vs fila própria da quadra, dependendo da conta bater ou não.
// ═══════════════════════════════════════════════════════════════════════════
describe('drawTeamsWithConstraints() — modos de goleiro', () => {
  it('modo "fixed": sempre garante 1 goleiro por time quando tem goleiro suficiente', () => {
    const players = [...linePlayers(20), ...goalies(4)];
    const { teams } = drawTeamsWithConstraints(players, 5, 'reserve', [], 'fixed');
    teams.forEach(t => {
      expect(t.players.filter(p => p.position === 'goleiro')).toHaveLength(1);
    });
  });

  it('modo "court": conta bate exatamente (goleiros === times) → fixo no time', () => {
    const players = [...linePlayers(20), ...goalies(4)]; // 4 goleiros pra 4 times de 5
    const { teams, goalkeeperQueue } = drawTeamsWithConstraints(players, 5, 'reserve', [], 'court');
    expect(goalkeeperQueue).toHaveLength(0);
    teams.forEach(t => expect(t.players.some(p => p.position === 'goleiro')).toBe(true));
  });

  it('modo "court": falta goleiro (menos que os times) → vira fila da quadra, nenhum entra no sorteio de time', () => {
    const players = [...linePlayers(20), ...goalies(2)]; // só 2 goleiros pra 4 times
    // strategy='substitute' (não 'reserve') pra não somar +1 vaga extra por
    // time e confundir com o que este teste quer isolar: o comportamento do goleiro.
    const { teams, goalkeeperQueue } = drawTeamsWithConstraints(players, 5, 'substitute', [], 'court');
    expect(goalkeeperQueue).toHaveLength(2);
    teams.forEach(t => {
      expect(t.players.some(p => p.position === 'goleiro')).toBe(false);
      expect(t.players).toHaveLength(5); // time continua completo, só de linha
    });
  });

  it('regressão: nunca deixa um time goleiro-fixo sem goleiro por causa da ordenação por nota', () => {
    // Antes do shuffle+vaga garantida, a ordenação por nota podia por acaso
    // deixar times inteiros sem goleiro mesmo tendo goleiro suficiente.
    for (let i = 0; i < 20; i++) {
      const players = [...linePlayers(20), ...goalies(4)];
      const { teams } = drawTeamsWithConstraints(players, 5, 'reserve', [], 'fixed');
      teams.forEach(t => {
        expect(t.players.filter(p => p.position === 'goleiro')).toHaveLength(1);
      });
    }
  });

  it('modo "separate": goleiro é vaga extra, não desconta da linha', () => {
    const players = [...linePlayers(20), ...goalies(4)];
    const { teams } = drawTeamsWithConstraints(players, 5, 'substitute', [], 'separate');
    teams.forEach(t => {
      const linha = t.players.filter(p => p.position !== 'goleiro');
      expect(linha).toHaveLength(5); // capacidade cheia de linha, goleiro é bônus
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Casos extremos — não deveriam quebrar (lançar exceção) mesmo com dados ruins
// ═══════════════════════════════════════════════════════════════════════════
describe('drawTeamsWithConstraints() — casos extremos', () => {
  it('lista vazia não quebra — retorna 0 times (quem chama deve tratar isso como erro, ver StepConfig)', () => {
    expect(() => drawTeamsWithConstraints([], 5, 'reserve', [], 'fixed')).not.toThrow();
    const { teams } = drawTeamsWithConstraints([], 5, 'reserve', [], 'fixed');
    expect(teams).toHaveLength(0);
  });

  it('menos jogadores do que o mínimo pra 1 time não quebra', () => {
    const players = linePlayers(3);
    expect(() => drawTeamsWithConstraints(players, 5, 'reserve', [], 'fixed')).not.toThrow();
  });

  it('só goleiros, nenhum jogador de linha, não quebra', () => {
    const players = goalies(4);
    expect(() => drawTeamsWithConstraints(players, 5, 'court', [], 'court')).not.toThrow();
  });
});
