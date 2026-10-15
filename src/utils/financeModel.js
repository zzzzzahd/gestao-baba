// src/utils/financeModel.js
// Modelo de controle financeiro de um baba (mensalidades, outras receitas e
// despesas). Funções puras, em centavos. Não conversa com o Supabase.

import { formatBRL, splitEqually, sumCents } from './expenseSplit';
import { toCsv } from './exportFile';

/**
 * @param {{
 *   contributionCents:number,
 *   members:Array<{name:string, paid:boolean}>,
 *   incomes:Array<{label:string, cents:number}>,
 *   expenses:Array<{label:string, cents:number}>
 * }} s
 */
export function summarizeFinance(s) {
  const n = s.members.length;
  const paid = s.members.filter((m) => m.paid);
  const pending = s.members.filter((m) => !m.paid);
  const expectedContrib = n * s.contributionCents;
  const receivedContrib = paid.length * s.contributionCents;
  const otherIncome = sumCents(s.incomes.map((i) => i.cents));
  const totalExpenses = sumCents(s.expenses.map((e) => e.cents));
  const totalIncome = receivedContrib + otherIncome;
  const projectedIncome = expectedContrib + otherIncome;

  // Quanto cada jogador precisaria contribuir para as despesas fecharem, descontadas outras receitas.
  const toCover = Math.max(0, totalExpenses - otherIncome);
  const suggested = n > 0 && toCover > 0 ? splitEqually(toCover, n, 1) : null;

  return {
    members: n,
    paidCount: paid.length,
    pending: pending.map((m) => m.name),
    expectedContrib,
    receivedContrib,
    pendingContrib: expectedContrib - receivedContrib,
    otherIncome,
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    projectedBalance: projectedIncome - totalExpenses,
    suggestedContribution: suggested ? suggested.perPerson : 0,
  };
}

export function financeToText(period, s, r) {
  const L = [`Controle financeiro do baba${period ? ` — ${period}` : ''}`, ''];
  L.push(`Contribuição por jogador: ${formatBRL(s.contributionCents)}`);
  L.push(`Pagaram (${r.paidCount}/${r.members}): ${s.members.filter((m) => m.paid).map((m) => m.name).join(', ') || '—'}`);
  L.push(`Pendentes (${r.pending.length}): ${r.pending.join(', ') || '—'}`, '');
  L.push('Receitas');
  L.push(`- Contribuições recebidas: ${formatBRL(r.receivedContrib)}`);
  s.incomes.filter((i) => i.cents > 0).forEach((i) => L.push(`- ${i.label || 'Outra receita'}: ${formatBRL(i.cents)}`));
  L.push(`Total de receitas: ${formatBRL(r.totalIncome)}`, '');
  L.push('Despesas');
  s.expenses.filter((e) => e.cents > 0).forEach((e) => L.push(`- ${e.label || 'Despesa'}: ${formatBRL(e.cents)}`));
  L.push(`Total de despesas: ${formatBRL(r.totalExpenses)}`, '');
  L.push(`Saldo atual: ${formatBRL(r.balance)}`);
  L.push(`Saldo se todos pagarem: ${formatBRL(r.projectedBalance)}`);
  return L.join('\n');
}

export function financeToCsv(period, s, r) {
  const rows = [['Seção', 'Descrição', 'Valor (R$)', 'Situação']];
  const money = (c) => (c / 100).toFixed(2).replace('.', ',');
  s.members.forEach((m) => rows.push(['Contribuição', m.name, money(s.contributionCents), m.paid ? 'Pago' : 'Pendente']));
  s.incomes.filter((i) => i.cents > 0).forEach((i) => rows.push(['Outra receita', i.label, money(i.cents), '']));
  s.expenses.filter((e) => e.cents > 0).forEach((e) => rows.push(['Despesa', e.label, money(e.cents), '']));
  rows.push([], ['Resumo', 'Total de receitas', money(r.totalIncome), ''], ['Resumo', 'Total de despesas', money(r.totalExpenses), ''],
    ['Resumo', 'Saldo atual', money(r.balance), ''], ['Resumo', 'Saldo se todos pagarem', money(r.projectedBalance), '']);
  if (period) rows.unshift(['Período', period, '', ''], []);
  return toCsv(rows);
}

/** Folha em branco para imprimir e preencher à mão. */
export function blankFinanceSheet(rowsCount = 15) {
  const line = (a, b, c) => `${a.padEnd(34, ' ')}${b.padEnd(14, ' ')}${c}`;
  const blank = (i) => line(`${String(i).padStart(2, '0')}. ______________________`, 'R$ ________', '[  ]');
  const L = ['Período: ______________________    Contribuição por jogador: R$ ________', '', 'CONTRIBUIÇÕES (marque [x] quando pagar)', line('Jogador', 'Valor', 'Pago')];
  for (let i = 1; i <= rowsCount; i++) L.push(blank(i));
  L.push('', 'OUTRAS RECEITAS (rifa, patrocínio, venda de bebida...)', line('Descrição', 'Valor', ''));
  for (let i = 1; i <= 4; i++) L.push(line(`${String(i).padStart(2, '0')}. ______________________`, 'R$ ________', ''));
  L.push('', 'DESPESAS (quadra, árbitro, água, bola...)', line('Descrição', 'Valor', ''));
  for (let i = 1; i <= 6; i++) L.push(line(`${String(i).padStart(2, '0')}. ______________________`, 'R$ ________', ''));
  L.push('', 'Total de receitas: R$ __________   Total de despesas: R$ __________   Saldo: R$ __________');
  return L.join('\n');
}
