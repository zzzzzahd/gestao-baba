// src/pages/tools/OrganizadorPresenca.jsx
import React, { useMemo, useState } from 'react';
import { ToolLayout, Panel, Stat, ErrorList, Segmented, IntField, Field, CopyButton, inputCls, toInt } from '../../components/tools/ui';
import { TOOLS } from '../../content/toolsCatalog';
import { parsePlayerList, teamCount } from '../../utils/teamBalancer';

const tool = TOOLS.find((t) => t.slug === 'lista-de-presenca');

export default function OrganizadorPresenca() {
  const [text, setText] = useState('');
  const [confirmed, setConfirmed] = useState({}); // nome -> true
  const [perTeam, setPerTeam] = useState('5');
  const [leftover, setLeftover] = useState('reserve');

  const { names, duplicates } = useMemo(() => parsePlayerList(text), [text]);
  const ppt = toInt(perTeam);
  const errors = [];
  if (!Number.isInteger(ppt) || ppt < 1 || ppt > 15) errors.push('Jogadores por time deve ser um número entre 1 e 15.');

  const present = names.filter((n) => confirmed[n]);
  const absent = names.filter((n) => !confirmed[n]);
  const teams = errors.length ? 0 : teamCount(present.length, ppt, leftover);
  const playing = errors.length ? 0 : (leftover === 'reserve' ? Math.min(present.length, teams * ppt) : present.length);
  const reserves = present.slice(playing);
  const missing = errors.length || leftover !== 'reserve' ? 0 : Math.max(0, ppt * 2 - present.length);

  const toggle = (n) => setConfirmed((c) => ({ ...c, [n]: !c[n] }));

  const out = [
    `Lista de presença (${present.length} confirmado${present.length === 1 ? '' : 's'} de ${names.length})`,
    '',
    'Confirmados:',
    ...present.slice(0, playing || present.length).map((n, i) => `${i + 1}. ${n}`),
    reserves.length ? '\nReservas:' : null,
    ...reserves.map((n, i) => `${i + 1}. ${n}`),
    absent.length ? '\nAusentes / sem resposta:' : null,
    ...absent.map((n) => `- ${n}`),
  ].filter((l) => l !== null).join('\n');

  return (
    <ToolLayout
      slug={tool.slug}
      title="Organizador de lista de presença"
      metaTitle={tool.title}
      metaDescription={tool.description}
      intro="Cole a lista de jogadores do grupo, marque quem confirmou e veja na hora quantos estão confirmados, quem está de fora, quantos ficam na reserva e quantos times fecham."
      howTo={[
        'Cole os nomes (um por linha). Numeração, marcadores e emojis de confirmação são removidos automaticamente.',
        'Marque a caixa de quem confirmou presença. Os números atualizam sozinhos.',
        'Defina quantos jogadores formam um time e o que fazer com os que sobram. Copie o resultado para mandar no grupo.',
      ]}
      premises={[
        'Confirmados = nomes marcados. Ausentes = nomes sem marcação (inclui quem ainda não respondeu).',
        'Com "Sobra vira reserva", times = confirmados ÷ jogadores por time (arredondado para baixo) e as pessoas que sobram, na ordem da lista, ficam como reservas.',
        'Com "Times completos com suplente", todos jogam: times = confirmados ÷ jogadores por time (arredondado para cima) e os últimos times ficam com um jogador a menos.',
        'Nomes repetidos (ignorando maiúsculas e acentos) são contados uma só vez.',
      ]}
      limitations="A lista só existe nesta página: se você recarregar, ela é apagada. Copie o resultado antes de sair."
    >
      <Panel>
        <Field label="Lista de jogadores" hint={`${names.length} nome(s) reconhecido(s)${duplicates.length ? ` · ${duplicates.length} repetido(s) ignorado(s)` : ''}`}>
          <textarea rows={7} placeholder={'1. João\n2. Maria\n3. Pedro'} value={text} onChange={(e) => setText(e.target.value)} className={inputCls} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <IntField label="Jogadores por time" value={perTeam} onChange={setPerTeam} min={1} max={15} />
          <Segmented label="Se sobrar gente" options={[{ value: 'reserve', label: 'Vira reserva' }, { value: 'fill', label: 'Time com suplente' }]} value={leftover} onChange={setLeftover} />
        </div>
        <div className="flex flex-wrap gap-4">
          <button type="button" onClick={() => setConfirmed(Object.fromEntries(names.map((n) => [n, true])))} className="text-[11px] font-black uppercase tracking-wider text-cyan-electric underline">Marcar todos</button>
          <button type="button" onClick={() => setConfirmed({})} className="text-[11px] font-black uppercase tracking-wider opacity-60 hover:opacity-100 underline">Desmarcar todos</button>
          <button type="button" onClick={() => { setText(''); setConfirmed({}); }} className="text-[11px] font-black uppercase tracking-wider opacity-60 hover:opacity-100 underline">Limpar lista</button>
        </div>
      </Panel>

      <ErrorList errors={errors} />

      {names.length === 0 ? (
        <p className="text-sm opacity-60">Cole a lista acima para começar. Exemplo: um nome por linha, com ou sem numeração.</p>
      ) : (
        <>
          <fieldset className="card-glass rounded-2xl border border-border-mid p-5">
            <legend className="px-2 text-base font-black">Quem confirmou?</legend>
            <ul className="grid sm:grid-cols-2 gap-2 mt-2">
              {names.map((n) => (
                <li key={n}>
                  <label className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-bold cursor-pointer ${confirmed[n] ? 'bg-cyan-electric/10 border-cyan-electric/40' : 'bg-white/5 border-white/10'}`}>
                    <input type="checkbox" checked={!!confirmed[n]} onChange={() => toggle(n)} className="w-5 h-5 accent-cyan-400" />
                    {n}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <section aria-live="polite" aria-labelledby="resumo" className="space-y-4">
            <h2 id="resumo" className="text-base font-black">Resumo</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Confirmados" value={present.length} />
              <Stat label="Ausentes" value={absent.length} sub="inclui sem resposta" />
              <Stat label="Reservas" value={reserves.length} />
              <Stat label="Times possíveis" value={teams} sub={`de ${ppt || '?'} jogadores`} />
            </div>
            {missing > 0 && present.length > 0 && (
              <p role="status" className="text-xs text-yellow-300">Faltam {missing} confirmado(s) para formar 2 times de {ppt}.</p>
            )}
            <CopyButton text={out} label="Copiar lista" />
          </section>
        </>
      )}
    </ToolLayout>
  );
}
