// src/pages/tools/DivisaoDespesas.jsx
import React, { useMemo, useState } from 'react';
import { ToolLayout, Panel, Stat, ErrorList, IntField, Field, CopyButton, inputCls, toInt } from '../../components/tools/ui';
import { TOOLS } from '../../content/toolsCatalog';
import { parseMoneyToCents, formatBRL, splitEqually, scenarios, sumCents } from '../../utils/expenseSplit';

const tool = TOOLS.find((t) => t.slug === 'divisao-de-despesas');

const ITEMS = [
  { key: 'quadra', label: 'Quadra / campo' },
  { key: 'arbitragem', label: 'Arbitragem' },
  { key: 'agua', label: 'Água e materiais' },
  { key: 'outros', label: 'Outros gastos' },
];

const ROUNDINGS = [
  { value: '1', label: 'Sem arredondar' },
  { value: '50', label: 'Para cima, R$ 0,50' },
  { value: '100', label: 'Para cima, R$ 1,00' },
];

export default function DivisaoDespesas() {
  const [values, setValues] = useState({ quadra: '', arbitragem: '', agua: '', outros: '' });
  const [payers, setPayers] = useState('12');
  const [rounding, setRounding] = useState('1');

  const parsed = useMemo(() => {
    const errs = [];
    const cents = {};
    for (const it of ITEMS) {
      const raw = values[it.key];
      if (raw.trim() === '') { cents[it.key] = 0; continue; }
      const c = parseMoneyToCents(raw);
      if (c === null) errs.push(`"${it.label}": valor inválido. Use números, por exemplo 120 ou 120,50.`);
      else cents[it.key] = c;
    }
    const n = toInt(payers);
    if (!Number.isInteger(n) || n < 1) errs.push('Informe pelo menos 1 participante pagante.');
    else if (n > 500) errs.push('O limite desta calculadora é 500 participantes.');
    const total = sumCents(Object.values(cents));
    if (!errs.length && total === 0) errs.push('Informe pelo menos um valor de despesa maior que zero.');
    return { errs, cents, n, total };
  }, [values, payers]);

  const result = parsed.errs.length ? null : splitEqually(parsed.total, parsed.n, Number(rounding));
  const cen = parsed.errs.length ? [] : scenarios(parsed.total, parsed.n);

  const text = result && [
    'Divisão de despesas do baba',
    ...ITEMS.filter((it) => parsed.cents[it.key] > 0).map((it) => `${it.label}: ${formatBRL(parsed.cents[it.key])}`),
    `Total: ${formatBRL(result.total)}`,
    `Pagantes: ${parsed.n}`,
    `Valor por participante: ${formatBRL(result.perPerson)}`,
    result.surplus > 0 ? `Sobra em caixa (por causa do arredondamento): ${formatBRL(result.surplus)}` : null,
  ].filter(Boolean).join('\n');

  return (
    <ToolLayout
      slug={tool.slug}
      title="Calculadora de divisão de despesas"
      metaTitle={tool.title}
      metaDescription={tool.description}
      intro="Informe quanto o baba custa e quantas pessoas vão pagar. A calculadora mostra o valor por participante, a sobra de caixa quando você arredonda e como o valor muda se alguém faltar ou entrar de última hora."
      howTo={[
        'Preencha os custos que se aplicam (deixe em branco o que não existir). Aceita vírgula ou ponto: 120,50.',
        'Informe o número de participantes que vão pagar (não conte quem joga de graça, como um goleiro isento).',
        'Escolha se quer arredondar o valor para cima. Veja a tabela de cenários para decidir um valor que feche mesmo com faltas.',
      ]}
      premises={[
        'Total = soma de todos os custos informados. Valor por participante = total ÷ pagantes.',
        'Quando você escolhe arredondar, o valor sempre sobe até o múltiplo escolhido; a diferença vira sobra de caixa (nunca falta dinheiro).',
        'Os cenários recalculam o valor com mais ou menos pagantes, mantendo os custos fixos — útil porque a quadra custa o mesmo quando alguém falta.',
        'Todos os cálculos usam centavos inteiros, para evitar diferenças de arredondamento.',
      ]}
      limitations="O resultado depende exclusivamente dos valores que você digitar. A ferramenta não registra pagamentos nem cobra ninguém."
    >
      <Panel>
        <div className="grid sm:grid-cols-2 gap-4">
          {ITEMS.map((it) => (
            <Field key={it.key} label={`${it.label} (R$)`}>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={values[it.key]}
                onChange={(e) => setValues((v) => ({ ...v, [it.key]: e.target.value }))}
                className={inputCls}
              />
            </Field>
          ))}
        </div>
        <IntField label="Participantes pagantes" value={payers} onChange={setPayers} min={1} max={500} />
        <fieldset className="space-y-1.5">
          <legend className="text-[11px] font-black uppercase tracking-wider opacity-70">Arredondamento</legend>
          <div className="grid grid-cols-3 gap-2">
            {ROUNDINGS.map((r) => (
              <button key={r.value} type="button" aria-pressed={rounding === r.value} onClick={() => setRounding(r.value)}
                className={`py-2.5 px-2 rounded-xl text-[11px] font-black uppercase leading-tight border ${rounding === r.value ? 'bg-cyan-electric text-black border-cyan-electric' : 'bg-white/5 text-white/60 border-white/10'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </fieldset>
        <button type="button" onClick={() => { setValues({ quadra: '', arbitragem: '', agua: '', outros: '' }); setPayers('12'); setRounding('1'); }}
          className="text-[11px] font-black uppercase tracking-wider opacity-60 hover:opacity-100 underline">
          Limpar tudo
        </button>
      </Panel>

      <ErrorList errors={parsed.errs.filter(() => Object.values(values).some((v) => v.trim() !== ''))} />

      {result && (
        <section aria-live="polite" aria-labelledby="resultado" className="space-y-4">
          <h2 id="resultado" className="text-base font-black">Resultado</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="Total" value={formatBRL(result.total)} />
            <Stat label="Por participante" value={formatBRL(result.perPerson)} sub={rounding !== '1' ? `sem arredondar: ${formatBRL(Math.ceil(result.exact))}` : undefined} />
            <Stat label="Sobra em caixa" value={formatBRL(result.surplus)} sub={`arrecadado ${formatBRL(result.collected)}`} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border-mid">
            <table className="w-full text-sm">
              <caption className="sr-only">Valor por participante conforme o número de pagantes</caption>
              <thead className="text-[10px] uppercase tracking-wider opacity-60 text-left">
                <tr><th scope="col" className="p-3">Pagantes</th><th scope="col" className="p-3">Por pessoa</th><th scope="col" className="p-3">Arrecadado</th></tr>
              </thead>
              <tbody>
                {cen.map((s) => (
                  <tr key={s.payers} className={`border-t border-white/5 ${s.delta === 0 ? 'bg-cyan-electric/10 font-bold' : ''}`}>
                    <td className="p-3">{s.payers}{s.delta === 0 ? ' (atual)' : ''}</td>
                    <td className="p-3">{formatBRL(Math.ceil(s.total / s.payers))}</td>
                    <td className="p-3">{formatBRL(s.collected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs opacity-55">A tabela mostra o valor exato arredondado ao centavo para cima, sem o arredondamento escolhido acima.</p>
          <CopyButton text={text} label="Copiar resumo" />
        </section>
      )}
    </ToolLayout>
  );
}
