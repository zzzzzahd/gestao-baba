import React, { useMemo, useState } from 'react';
import { ModeloLayout, Preview, OutputActions } from '../../components/tools/ModeloUI';
import { Panel, Stat, ErrorList, IntField, Field, MoneyRows, newRow, inputCls, toInt } from '../../components/tools/ui';
import { parseMoneyToCents, formatBRL } from '../../utils/expenseSplit';
import { summarizeBudget, budgetToText, BUDGET_SUGGESTED_EXPENSES, BUDGET_SUGGESTED_INCOMES } from '../../utils/modelosTorneio';

export default function OrcamentoTorneio() {
  const [name, setName] = useState('');
  const [teamsStr, setTeamsStr] = useState('8');
  const [fee, setFee] = useState('');
  const [incomes, setIncomes] = useState(() => BUDGET_SUGGESTED_INCOMES.map((l) => newRow(l)));
  const [expenses, setExpenses] = useState(() => BUDGET_SUGGESTED_EXPENSES.map((l) => newRow(l)));

  const parsed = useMemo(() => {
    const errs = [];
    const teams = toInt(teamsStr);
    if (!Number.isInteger(teams) || teams < 1 || teams > 64) errs.push('Equipes: informe de 1 a 64.');
    let feeCents = 0;
    if (fee.trim() !== '') {
      const c = parseMoneyToCents(fee);
      if (c === null) errs.push('Inscrição por equipe: valor inválido. Use números, por exemplo 100 ou 100,00.'); else feeCents = c;
    }
    const conv = (rows, what) => rows.filter((r) => r.value.trim() !== '').map((r, i) => {
      const c = parseMoneyToCents(r.value);
      if (c === null) { errs.push(`${what}, linha ${i + 1}: valor inválido.`); return { label: r.label.trim(), cents: 0 }; }
      return { label: r.label.trim(), cents: c };
    });
    return { errs, teams, feeCents, incomes: conv(incomes, 'Outras receitas'), expenses: conv(expenses, 'Despesas') };
  }, [teamsStr, fee, incomes, expenses]);

  const r = summarizeBudget(parsed);
  const hasData = parsed.expenses.length > 0 || parsed.incomes.length > 0 || parsed.feeCents > 0;
  const text = parsed.errs.length ? '' : budgetToText({ ...parsed, title: name.trim() ? `Orçamento — ${name.trim()}` : 'Orçamento do torneio' }, r);

  return (
    <ModeloLayout
      slug="orcamento-do-torneio"
      intro="Planeje as receitas e despesas do torneio antes de abrir as inscrições e descubra quanto cobrar de cada equipe para a conta fechar."
      howTo={[
        'Informe o número de equipes e, se já tiver decidido, o valor da inscrição por equipe.',
        'Preencha as despesas previstas (quadra, arbitragem, premiação...) e outras receitas (patrocínio, bebidas).',
        'Veja o saldo previsto e a inscrição por equipe necessária para cobrir as despesas. Copie ou imprima para apresentar à organização.',
      ]}
      premises={[
        'Receitas = inscrições (equipes × valor) + outras receitas. Saldo previsto = receitas − despesas.',
        'Inscrição para cobrir as despesas = (despesas − outras receitas) ÷ equipes, arredondada para cima ao centavo. Se as outras receitas já cobrem tudo, não é preciso cobrar inscrição.',
        'As linhas de despesa vêm com nomes sugeridos; renomeie, apague ou adicione o que precisar. Linhas sem valor são ignoradas.',
      ]}
      limitations="É uma previsão baseada nos valores que você informar. Não inclui imprevistos nem a conciliação do que foi realmente pago."
    >
      <Panel>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Nome do torneio (opcional)"><input type="text" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
          <IntField label="Equipes" value={teamsStr} onChange={setTeamsStr} min={1} max={64} />
          <Field label="Inscrição por equipe (R$)"><input type="text" inputMode="decimal" placeholder="0,00" value={fee} onChange={(e) => setFee(e.target.value)} className={inputCls} /></Field>
        </div>
        <MoneyRows legend="Despesas" rows={expenses} setRows={setExpenses} labelPlaceholder="Ex.: quadra" />
        <MoneyRows legend="Outras receitas" rows={incomes} setRows={setIncomes} labelPlaceholder="Ex.: patrocínio" />
      </Panel>
      <ErrorList errors={parsed.errs} />
      {hasData && !parsed.errs.length && (
        <section aria-live="polite" aria-labelledby="orc" className="space-y-4">
          <h2 id="orc" className="text-base font-black">Resumo do orçamento</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Receitas" value={formatBRL(r.totalIncome)} sub={`inscrições ${formatBRL(r.feesTotal)}`} />
            <Stat label="Despesas" value={formatBRL(r.totalExpenses)} />
            <Stat label="Saldo previsto" value={formatBRL(r.balance)} sub={r.balance < 0 ? 'faltaria dinheiro' : undefined} />
            <Stat label="Inscrição p/ cobrir" value={r.breakEvenFee > 0 ? formatBRL(r.breakEvenFee) : 'R$ 0,00'} sub="por equipe" />
          </div>
          <Preview text={text} label="Texto do orçamento" />
          <OutputActions text={text} title="Orçamento do torneio" filename="orcamento-do-torneio" />
        </section>
      )}
    </ModeloLayout>
  );
}
