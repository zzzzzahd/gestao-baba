import { describe, it, expect, vi } from 'vitest';
import { summarizeFinance, financeToText, financeToCsv, blankFinanceSheet } from '../../utils/financeModel';
import { csvCell, toCsv, printableHtml, downloadTextFile } from '../../utils/exportFile';

const state = {
  contributionCents: 5000,
  members: [
    ...Array.from({ length: 6 }, (_, i) => ({ name: `P${i}`, paid: true })),
    ...Array.from({ length: 4 }, (_, i) => ({ name: `D${i}`, paid: false })),
  ],
  incomes: [{ label: 'Rifa', cents: 8000 }],
  expenses: [{ label: 'Quadra', cents: 30000 }, { label: 'Água', cents: 10000 }],
};

describe('summarizeFinance', () => {
  it('10 jogadores, R$ 50, 6 pagaram, rifa R$ 80, despesas R$ 400', () => {
    const r = summarizeFinance(state);
    expect(r.expectedContrib).toBe(50000);
    expect(r.receivedContrib).toBe(30000);
    expect(r.pendingContrib).toBe(20000);
    expect(r.totalIncome).toBe(38000);
    expect(r.totalExpenses).toBe(40000);
    expect(r.balance).toBe(-2000);
    expect(r.projectedBalance).toBe(18000);
    expect(r.pending).toEqual(['D0', 'D1', 'D2', 'D3']);
    expect(r.suggestedContribution).toBe(3200); // (400 - 80) / 10
  });
  it('sem jogadores não quebra e não sugere contribuição', () => {
    const r = summarizeFinance({ ...state, members: [] });
    expect(r.suggestedContribution).toBe(0);
    expect(r.members).toBe(0);
  });
  it('despesas menores que outras receitas não pedem contribuição', () => {
    expect(summarizeFinance({ ...state, expenses: [{ label: 'x', cents: 1000 }] }).suggestedContribution).toBe(0);
  });
});

describe('saídas', () => {
  const r = summarizeFinance(state);
  it('texto traz totais e pendentes', () => {
    const t = financeToText('Outubro/2026', state, r);
    expect(t).toContain('Outubro/2026');
    expect(t).toContain('Pendentes (4): D0, D1, D2, D3');
    expect(t).toContain('Saldo atual: -R$ 20,00');
  });
  it('CSV usa ; e vírgula decimal, com período e resumo', () => {
    const csv = financeToCsv('Outubro', state, r);
    expect(csv.split('\r\n')[0]).toBe('Período;Outubro;;');
    expect(csv).toContain('Contribuição;P0;50,00;Pago');
    expect(csv).toContain('Despesa;Quadra;300,00;');
    expect(csv).toContain('Resumo;Saldo atual;-20,00;');
  });
  it('folha em branco tem as três seções', () => {
    const t = blankFinanceSheet();
    expect(t).toMatch(/CONTRIBUIÇÕES/);
    expect(t).toMatch(/OUTRAS RECEITAS/);
    expect(t).toMatch(/DESPESAS/);
  });
});

describe('exportFile', () => {
  it('csvCell escapa aspas, ; e quebra de linha', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvCell('l1\nl2')).toBe('"l1\nl2"');
  });
  it('csvCell neutraliza injeção de fórmula, mas preserva números negativos', () => {
    expect(csvCell('=SOMA(A1)')).toBe("'=SOMA(A1)");
    expect(csvCell('@x')).toBe("'@x");
    expect(csvCell('-20,00')).toBe('-20,00');
  });
  it('toCsv junta linhas com CRLF', () => {
    expect(toCsv([['a', 'b'], ['c', 'd']])).toBe('a;b\r\nc;d');
  });
  it('printableHtml escapa HTML', () => {
    const h = printableHtml('T <b>', '<script>x</script>');
    expect(h).not.toContain('<script>');
    expect(h).toContain('&lt;script&gt;');
  });
  it('downloadTextFile cria link com o nome e BOM (bytes EF BB BF) no CSV', async () => {
    let captured;
    URL.createObjectURL = vi.fn((b) => { captured = b; return 'blob:x'; });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadTextFile('f.csv', 'a;b', 'text/csv;charset=utf-8');
    expect(click).toHaveBeenCalled();
    const bytes = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(new Uint8Array(fr.result)); fr.readAsArrayBuffer(captured); });
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(captured.type).toContain('text/csv');
    click.mockRestore();
  });
});
