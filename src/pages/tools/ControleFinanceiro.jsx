// src/pages/tools/ControleFinanceiro.jsx
// Modelo de controle financeiro do baba. Tudo em memória, no navegador:
// não usa o Supabase nem os registros financeiros do app.
import React, { useMemo, useState } from 'react';
import { Printer, Download } from 'lucide-react';
import { ToolLayout, Panel, Stat, ErrorList, Field, CopyButton, MoneyRows, newRow, inputCls } from '../../components/tools/ui';
import { TOOLS } from '../../content/toolsCatalog';
import { parseMoneyToCents, formatBRL } from '../../utils/expenseSplit';
import { parsePlayerList } from '../../utils/teamBalancer';
import { summarizeFinance, financeToText, financeToCsv, blankFinanceSheet } from '../../utils/financeModel';
import { downloadTextFile, printText } from '../../utils/exportFile';

const tool = TOOLS.find((t) => t.slug === 'controle-financeiro');

const row = () => newRow();
const Rows = MoneyRows;

export default function ControleFinanceiro() {
  const [period, setPeriod] = useState('');
  const [contribution, setContribution] = useState('');
  const [namesText, setNamesText] = useState('');
  const [paid, setPaid] = useState({});
  const [incomes, setIncomes] = useState(() => [row()]);
  const [expenses, setExpenses] = useState(() => [row()]);

  const { names } = useMemo(() => parsePlayerList(namesText), [namesText]);

  const parsed = useMemo(() => {
    const errs = [];
    let contributionCents = 0;
    if (contribution.trim() !== '') {
      const c = parseMoneyToCents(contribution);
      if (c === null) errs.push('Contribuição por jogador: valor inválido. Use números, por exemplo 50 ou 50,00.');
      else contributionCents = c;
    }
    const conv = (rows, what) => rows
      .filter((r) => r.label.trim() !== '' || r.value.trim() !== '')
      .map((r, i) => {
        if (r.value.trim() === '') return { label: r.label.trim(), cents: 0 };
        const c = parseMoneyToCents(r.value);
        if (c === null) { errs.push(`${what}, linha ${i + 1}: valor inválido.`); return { label: r.label.trim(), cents: 0 }; }
        return { label: r.label.trim(), cents: c };
      });
    const inc = conv(incomes, 'Outras receitas');
    const exp = conv(expenses, 'Despesas');
    return { errs, state: { contributionCents, members: names.map((n) => ({ name: n, paid: !!paid[n] })), incomes: inc, expenses: exp } };
  }, [contribution, names, paid, incomes, expenses]);

  const r = useMemo(() => summarizeFinance(parsed.state), [parsed.state]);
  const hasData = names.length > 0 || parsed.state.incomes.length > 0 || parsed.state.expenses.length > 0;
  const text = financeToText(period.trim(), parsed.state, r);

  const reset = () => { setPeriod(''); setContribution(''); setNamesText(''); setPaid({}); setIncomes([row()]); setExpenses([row()]); };

  return (
    <ToolLayout
      slug={tool.slug}
      title="Modelo de controle financeiro do baba"
      metaTitle={tool.title}
      metaDescription={tool.description}
      intro="Uma planilha simples, direto no navegador, para acompanhar mensalidades, outras receitas e despesas do baba: quem já pagou, quem falta, quanto entrou, quanto saiu e qual é o saldo. Exporte em CSV para abrir no Excel ou imprima."
      howTo={[
        'Informe o período (por exemplo, o mês) e a contribuição de cada jogador.',
        'Cole a lista de jogadores e marque quem já pagou. Registre outras receitas (rifa, patrocínio) e as despesas (quadra, árbitro, água).',
        'Veja o saldo atual e o saldo se todos pagarem. Copie o resumo para o grupo, baixe o CSV ou imprima. Se preferir papel, use a folha em branco.',
      ]}
      premises={[
        'Receitas = contribuições marcadas como pagas + outras receitas. Saldo atual = receitas − despesas.',
        'Saldo se todos pagarem = (todas as contribuições esperadas + outras receitas) − despesas.',
        'Contribuição sugerida = (despesas − outras receitas) ÷ número de jogadores, arredondada para cima ao centavo. É só uma referência para fechar a conta do período.',
        'Os valores são somados em centavos, sem erro de arredondamento.',
      ]}
      limitations="Nada aqui é salvo: ao recarregar ou fechar a página, os dados somem. Por isso, exporte ou copie antes de sair. A ferramenta não registra pagamentos de verdade nem se conecta ao financeiro do aplicativo."
    >
      <Panel>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Período"><input type="text" maxLength={40} value={period} onChange={(e) => setPeriod(e.target.value)} className={inputCls} placeholder="Ex.: Novembro/2026" /></Field>
          <Field label="Contribuição por jogador (R$)"><input type="text" inputMode="decimal" value={contribution} onChange={(e) => setContribution(e.target.value)} className={inputCls} placeholder="0,00" /></Field>
        </div>
        <Field label="Jogadores (um por linha)" hint={`${names.length} nome(s) reconhecido(s)`}>
          <textarea rows={5} value={namesText} onChange={(e) => setNamesText(e.target.value)} className={inputCls} placeholder={'1. João\n2. Maria'} />
        </Field>
        {names.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-[11px] font-black uppercase tracking-wider opacity-70 mb-2">Quem já pagou?</legend>
            <ul className="grid sm:grid-cols-2 gap-2">
              {names.map((n) => (
                <li key={n}>
                  <label className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-bold cursor-pointer ${paid[n] ? 'bg-cyan-electric/10 border-cyan-electric/40' : 'bg-white/5 border-white/10'}`}>
                    <input type="checkbox" checked={!!paid[n]} onChange={() => setPaid((p) => ({ ...p, [n]: !p[n] }))} className="w-5 h-5 accent-cyan-400" />
                    {n}
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex gap-4">
              <button type="button" onClick={() => setPaid(Object.fromEntries(names.map((n) => [n, true])))} className="text-[11px] font-black uppercase tracking-wider text-cyan-electric underline">Todos pagaram</button>
              <button type="button" onClick={() => setPaid({})} className="text-[11px] font-black uppercase tracking-wider opacity-60 hover:opacity-100 underline">Desmarcar todos</button>
            </div>
          </fieldset>
        )}
      </Panel>

      <Panel>
        <Rows legend="Outras receitas" rows={incomes} setRows={setIncomes} labelPlaceholder="Ex.: rifa, patrocínio" />
        <Rows legend="Despesas" rows={expenses} setRows={setExpenses} labelPlaceholder="Ex.: quadra, árbitro, água" />
        <button type="button" onClick={reset} className="text-[11px] font-black uppercase tracking-wider opacity-60 hover:opacity-100 underline">Limpar tudo</button>
      </Panel>

      <ErrorList errors={parsed.errs} />

      {hasData && (
        <section aria-live="polite" aria-labelledby="resumo-fin" className="space-y-4">
          <h2 id="resumo-fin" className="text-base font-black">Resumo{period.trim() ? ` — ${period.trim()}` : ''}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Receitas" value={formatBRL(r.totalIncome)} sub={`contribuições ${formatBRL(r.receivedContrib)}`} />
            <Stat label="Despesas" value={formatBRL(r.totalExpenses)} />
            <Stat label="Saldo atual" value={formatBRL(r.balance)} sub={r.balance < 0 ? 'caixa no vermelho' : undefined} />
            <Stat label="Se todos pagarem" value={formatBRL(r.projectedBalance)} sub={`pendente ${formatBRL(r.pendingContrib)}`} />
          </div>
          {names.length > 0 && (
            <p className="text-sm"><strong>Pagaram {r.paidCount} de {r.members}.</strong>{' '}
              {r.pending.length > 0 ? <>Pendentes: {r.pending.join(', ')}.</> : 'Ninguém pendente.'}</p>
          )}
          {r.suggestedContribution > 0 && (
            <p className="text-sm opacity-80">Para as despesas fecharem com as receitas extras informadas, cada um dos {r.members} jogadores precisaria contribuir com <strong>{formatBRL(r.suggestedContribution)}</strong>.</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <CopyButton text={text} label="Copiar resumo" />
            <button type="button" onClick={() => downloadTextFile(`controle-financeiro${period.trim() ? `-${period.trim().replace(/[^\w]+/g, '-')}` : ''}.csv`, financeToCsv(period.trim(), parsed.state, r), 'text/csv;charset=utf-8')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-xs font-black uppercase tracking-wider">
              <Download size={14} aria-hidden="true" /> Baixar CSV
            </button>
            <button type="button" onClick={() => printText(`Controle financeiro${period.trim() ? ` — ${period.trim()}` : ''}`, text)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-xs font-black uppercase tracking-wider">
              <Printer size={14} aria-hidden="true" /> Imprimir resumo
            </button>
          </div>
        </section>
      )}

      <section aria-labelledby="folha-branco" className="card-glass p-5 rounded-2xl border border-border-mid space-y-3">
        <h2 id="folha-branco" className="text-base font-black">Prefere papel?</h2>
        <p className="text-sm opacity-70 leading-relaxed">Imprima uma folha em branco com as três seções (contribuições, outras receitas e despesas) para preencher à mão durante o baba.</p>
        <button type="button" onClick={() => printText('Controle financeiro do baba', blankFinanceSheet())}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-xs font-black uppercase tracking-wider">
          <Printer size={14} aria-hidden="true" /> Imprimir folha em branco
        </button>
      </section>
    </ToolLayout>
  );
}
