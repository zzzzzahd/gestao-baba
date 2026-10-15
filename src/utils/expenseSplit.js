// src/utils/expenseSplit.js
// Divisão de despesas de um baba. Todo cálculo é feito em CENTAVOS (inteiros)
// para evitar erro de ponto flutuante (0,1 + 0,2 ≠ 0,3 em JS).

/**
 * Converte texto digitado em centavos. Aceita "1.234,50", "1234,5", "12,5",
 * "R$ 80" e "80.5" (ponto decimal só quando há no máximo 2 casas depois dele).
 * Retorna null para vazio/inválido/negativo.
 */
export function parseMoneyToCents(input) {
  if (input === null || input === undefined) return null;
  let s = String(input).trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (s === '') return null;
  if (!/^[\d.,]+$/.test(s)) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma !== -1) {
    // vírgula é o separador decimal; pontos são milhar
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (lastDot !== -1) {
    const decimals = s.length - lastDot - 1;
    // "1.234" (3 casas) = milhar; "12.5" / "12.50" = decimal
    s = decimals === 3 && s.indexOf('.') === lastDot ? s.replace('.', '') : s;
    if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const cents = Math.round(parseFloat(s) * 100);
  return Number.isFinite(cents) && cents >= 0 ? cents : null;
}

export function formatBRL(cents) {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return '—';
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const reais = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const c = String(abs % 100).padStart(2, '0');
  return `${sign}R$ ${reais},${c}`;
}

/**
 * Divide o total entre `payers` pagantes.
 * `roundUpTo` (em centavos; 1 = sem arredondar): o valor por pessoa é arredondado
 * PARA CIMA a esse múltiplo, e a sobra vira "folga de caixa" (nunca falta).
 *
 * @returns {{ total:number, perPerson:number, collected:number, surplus:number, exact:number }}
 */
export function splitEqually(totalCents, payers, roundUpTo = 1) {
  if (!Number.isInteger(payers) || payers < 1) return null;
  const step = Math.max(1, Math.round(roundUpTo));
  const exact = totalCents / payers;
  const perPerson = Math.ceil(totalCents / payers / step) * step;
  const collected = perPerson * payers;
  return { total: totalCents, perPerson, collected, surplus: collected - totalCents, exact };
}

/**
 * Cenários: variação do número de pagantes (faltas/convidados de última hora)
 * e arredondamentos usuais. Ajuda a decidir um valor "redondo" sem deixar o
 * caixa no vermelho.
 */
export function scenarios(totalCents, payers, deltas = [-2, -1, 0, 1, 2]) {
  return deltas
    .map((d) => ({ payers: payers + d, delta: d }))
    .filter((s) => s.payers >= 1)
    .map((s) => ({ ...s, ...splitEqually(totalCents, s.payers, 1) }));
}

export const sumCents = (items) => items.reduce((s, i) => s + (i ?? 0), 0);
