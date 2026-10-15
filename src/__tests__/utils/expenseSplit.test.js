import { describe, it, expect } from 'vitest';
import { parseMoneyToCents, formatBRL, splitEqually, scenarios } from '../../utils/expenseSplit';

describe('parseMoneyToCents', () => {
  it.each([
    ['80', 8000], ['80,5', 8050], ['R$ 1.234,50', 123450], ['1234,56', 123456],
    ['12.5', 1250], ['1.234', 123400], ['0,99', 99], [' 10 ', 1000],
  ])('%s → %i', (input, cents) => expect(parseMoneyToCents(input)).toBe(cents));
  it.each([[''], ['abc'], ['-5'], ['1,234,5'], [null], ['12,345']])('%s → null', (i) => {
    expect(parseMoneyToCents(i)).toBeNull();
  });
});

describe('formatBRL', () => {
  it('formata com milhar e centavos', () => {
    expect(formatBRL(123450)).toBe('R$ 1.234,50');
    expect(formatBRL(5)).toBe('R$ 0,05');
    expect(formatBRL(null)).toBe('—');
  });
});

describe('splitEqually', () => {
  it('divide e arredonda para cima, sobra vira folga de caixa', () => {
    const r = splitEqually(20000, 12, 1); // 200,00 / 12 = 16,666…
    expect(r.perPerson).toBe(1667);
    expect(r.collected).toBe(1667 * 12);
    expect(r.surplus).toBe(1667 * 12 - 20000);
    expect(r.collected).toBeGreaterThanOrEqual(r.total);
  });
  it('arredondamento para R$ 1,00', () => {
    const r = splitEqually(20000, 12, 100);
    expect(r.perPerson).toBe(1700);
  });
  it('divisão exata não gera sobra', () => {
    expect(splitEqually(10000, 10).surplus).toBe(0);
  });
  it('0 pagantes ou não inteiro → null', () => {
    expect(splitEqually(1000, 0)).toBeNull();
    expect(splitEqually(1000, 2.5)).toBeNull();
  });
  it('cenários não incluem pagantes < 1', () => {
    const s = scenarios(10000, 2);
    expect(s.map((x) => x.payers)).toEqual([1, 2, 3, 4]);
  });
});
