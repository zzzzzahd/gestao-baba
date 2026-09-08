// src/__tests__/utils/matchClock.test.js
//
// A lógica do cronômetro em StepMatch.jsx é: quando rodando, o tempo
// restante é derivado de (clock_ends_at - agora), não decrementado local —
// isso foi o que corrigiu o bug de "o relógio pausa sozinho quando saio da
// tela" (antes era só um contador em estado local do React, que resetava
// toda vez que a página recarregava). Esses testes isolam essa fórmula.

import { describe, it, expect } from 'vitest';

/** Mesma fórmula usada em StepMatch.jsx e WatchPage.jsx pra derivar o tempo
 * restante — extraída aqui só pra poder testar isolada (o componente em si
 * não é facilmente testável sem montar toda a árvore de contexto). */
function computeRemaining(clockRunning, clockEndsAtMs, clockRemainingSeconds, nowMs) {
  if (clockRunning && clockEndsAtMs) {
    return Math.max(0, Math.round((clockEndsAtMs - nowMs) / 1000));
  }
  return clockRemainingSeconds;
}

describe('computeRemaining() — matemática do cronômetro persistido', () => {
  it('quando pausado, mostra o valor congelado direto (não depende de "agora")', () => {
    expect(computeRemaining(false, null, 245, Date.now())).toBe(245);
  });

  it('quando rodando, deriva do horário real restante, não de um contador local', () => {
    const now = Date.now();
    const endsAt = now + 300_000; // 5 minutos no futuro
    expect(computeRemaining(true, endsAt, 0, now)).toBe(300);
  });

  it('nunca fica negativo — trava em 0 quando o horário já passou', () => {
    const now = Date.now();
    const endsAtNoPassado = now - 60_000; // já venceu há 1 minuto
    expect(computeRemaining(true, endsAtNoPassado, 0, now)).toBe(0);
  });

  it('regressão: sair e voltar da tela não reseta o tempo — o cálculo é sempre pelo horário real', () => {
    const start = Date.now();
    const endsAt = start + 600_000; // cronômetro de 10 minutos começando agora

    // 3 minutos depois, ainda na tela
    const after3min = start + 180_000;
    expect(computeRemaining(true, endsAt, 0, after3min)).toBe(420); // 7 min restantes

    // Simula "saiu da tela e voltou 5 minutos depois" — clockEndsAt não muda,
    // só o "agora" avança. Isso é o que garante que o tempo continua correto
    // mesmo sem ninguém olhando a tela.
    const after5minAway = start + 480_000; // 8 min desde o início
    expect(computeRemaining(true, endsAt, 0, after5minAway)).toBe(120); // 2 min restantes
  });

  it('regressão: partida esquecida em andamento (relógio vencido há horas) calcula 0, não um número negativo estranho', () => {
    const start = Date.now();
    const endsAt = start + 600_000;
    const bemDepois = start + 3 * 60 * 60 * 1000; // 3 horas depois
    expect(computeRemaining(true, endsAt, 0, bemDepois)).toBe(0);
  });
});

describe('auto-encerrar partida quando o relógio zera', () => {
  // Mesma condição usada no useEffect de StepMatch.jsx:
  // if (clockRunning && timer === 0) { ...encerra... }
  const shouldAutoEnd = (clockRunning, timer) => clockRunning && timer === 0;

  it('só finaliza quando está rodando E o tempo chegou em 0', () => {
    expect(shouldAutoEnd(true, 0)).toBe(true);
  });

  it('não finaliza se está pausado, mesmo com tempo 0 (evita loop de reabrir e finalizar sozinho)', () => {
    // Esse é o bug real: o cronômetro pausado no banco (clock_running=false)
    // não deve disparar handleMatchEnd de novo só porque o valor congelado é 0.
    expect(shouldAutoEnd(false, 0)).toBe(false);
  });

  it('não finaliza com tempo > 0', () => {
    expect(shouldAutoEnd(true, 45)).toBe(false);
  });
});
