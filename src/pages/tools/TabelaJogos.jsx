// src/pages/tools/TabelaJogos.jsx
import React, { useMemo, useState } from 'react';
import { ToolLayout, Panel, ErrorList, Segmented, IntField, CopyButton, Field, inputCls, toInt } from '../../components/tools/ui';
import { TOOLS } from '../../content/toolsCatalog';
import {
  validateConfig, roundRobinSchedule, knockoutSchedule, drawGroups, groupLabel,
  scheduleToText, shuffle, groupSizes,
} from '../../utils/tournamentMath';
import { parsePlayerList } from '../../utils/teamBalancer';

const tool = TOOLS.find((t) => t.slug === 'tabela-de-jogos');

const FORMATS = [
  { value: 'knockout', label: 'Mata-mata' },
  { value: 'roundrobin', label: 'Pontos corridos' },
  { value: 'groups', label: 'Grupos' },
];

const DEFAULT_NAMES = 'Time A\nTime B\nTime C\nTime D\nTime E\nTime F';

function buildSections(cfg, teamNames, order, rng = Math.random) {
  const base = order === 'random' ? shuffle(teamNames, rng) : teamNames;
  if (cfg.format === 'knockout') {
    return [{ title: null, rounds: knockoutSchedule(base, { thirdPlace: cfg.thirdPlace }) }];
  }
  if (cfg.format === 'roundrobin') {
    return [{ title: null, rounds: roundRobinSchedule(base, { legs: cfg.legs }) }];
  }
  // groups
  const groups = drawGroups(base, cfg.groupCount, { mode: 'seeded' });
  const sections = groups.map((g, i) => ({
    title: `${groupLabel(i)}: ${g.join(', ')}`,
    rounds: roundRobinSchedule(g, { legs: cfg.legs }),
  }));
  if (cfg.knockoutAfterGroups) {
    // 1ºs colocados primeiro, depois 2ºs etc. (ordem de cabeça de chave)
    const seeds = [];
    for (let pos = 1; pos <= cfg.advancePerGroup; pos++) {
      groups.forEach((_, gi) => seeds.push(`${pos}º do ${groupLabel(gi)}`));
    }
    sections.push({
      title: 'Fase eliminatória',
      note: 'Os classificados entram na ordem de cabeça de chave (1ºs colocados primeiro). Em chaves grandes, dois classificados do mesmo grupo podem se cruzar antes da final.',
      rounds: knockoutSchedule(seeds, { thirdPlace: cfg.thirdPlace }),
    });
  }
  return sections;
}

const sectionsToText = (sections, title) =>
  [title, '']
    .concat(sections.map((s) => [s.title ? `== ${s.title} ==` : null, scheduleToText(s.rounds)].filter(Boolean).join('\n')))
    .join('\n\n');

export default function TabelaJogos() {
  const [format, setFormat] = useState('roundrobin');
  const [namesText, setNamesText] = useState(DEFAULT_NAMES);
  const [legs, setLegs] = useState('1');
  const [thirdPlace, setThirdPlace] = useState(false);
  const [groupCount, setGroupCount] = useState('2');
  const [knockoutAfterGroups, setKnockoutAfterGroups] = useState(true);
  const [advancePerGroup, setAdvancePerGroup] = useState('2');
  const [order, setOrder] = useState('listed');
  const [out, setOut] = useState(null);

  const parsed = useMemo(() => parsePlayerList(namesText), [namesText]);
  const cfg = useMemo(() => ({
    format, teams: parsed.names.length, legs: legs === '2' ? 2 : 1, thirdPlace,
    groupCount: toInt(groupCount), knockoutAfterGroups, advancePerGroup: toInt(advancePerGroup),
  }), [format, parsed.names.length, legs, thirdPlace, groupCount, knockoutAfterGroups, advancePerGroup]);

  const errors = useMemo(() => {
    const e = validateConfig(cfg);
    if (parsed.duplicates.length) e.push(`Há nomes repetidos: ${parsed.duplicates.join(', ')}. Dê um nome diferente a cada equipe.`);
    return e;
  }, [cfg, parsed.duplicates]);

  const inputsKey = JSON.stringify([cfg, parsed.names, order]);
  const stale = out && out.key !== inputsKey;

  const generate = () => {
    if (errors.length) return;
    const sections = buildSections(cfg, parsed.names, order);
    const label = FORMATS.find((f) => f.value === format).label;
    setOut({ key: inputsKey, sections, text: sectionsToText(sections, `Tabela de jogos — ${label} — ${parsed.names.length} equipes`) });
  };

  return (
    <ToolLayout
      slug={tool.slug}
      title="Gerador de tabela de jogos"
      metaTitle={tool.title}
      metaDescription={tool.description}
      intro="Digite os nomes das equipes, escolha o formato e receba a tabela de confrontos pronta para copiar e mandar no grupo. Folgas e byes são tratados automaticamente."
      howTo={[
        'Escreva uma equipe por linha (ou cole a lista; numeração e marcadores são ignorados).',
        'Escolha o formato. No mata-mata, a ordem da lista define os cabeças de chave: a primeira equipe é a favorita.',
        'Se preferir sortear a ordem, escolha "Sortear ordem". Clique em "Gerar tabela" e copie o resultado.',
      ]}
      premises={[
        'Pontos corridos usa o método do círculo: em cada rodada todas as equipes jogam uma vez; com número ímpar, uma equipe folga por rodada. Em ida e volta, o returno repete as rodadas com o mando invertido.',
        'Mata-mata: os cabeças de chave são posicionados de forma que o 1º e o 2º só se encontrem na final. Quando o número de equipes não é potência de 2, as melhores cabeças de chave avançam direto na primeira rodada (bye).',
        'Grupos: as equipes são distribuídas em serpentina pela ordem da lista (ou da ordem sorteada), e cada grupo joga todos contra todos. As eliminatórias, se escolhidas, usam os primeiros colocados de cada grupo como cabeças de chave.',
      ]}
      limitations="A tabela define os confrontos e a ordem das rodadas; ela não distribui horários nem campos. Para estimar a duração, use a calculadora de torneio."
    >
      <Panel>
        <Segmented label="Formato" options={FORMATS} value={format} onChange={setFormat} />
        <Field label="Equipes (uma por linha)" hint={`${parsed.names.length} equipe(s) reconhecida(s)`}>
          <textarea rows={7} value={namesText} onChange={(e) => setNamesText(e.target.value)} className={inputCls} />
        </Field>

        {(format === 'roundrobin' || format === 'groups') && (
          <Segmented label="Turnos" options={[{ value: '1', label: 'Só ida' }, { value: '2', label: 'Ida e volta' }]} value={legs} onChange={setLegs} />
        )}
        {format === 'groups' && (
          <div className="grid sm:grid-cols-2 gap-4">
            <IntField label="Quantidade de grupos" value={groupCount} onChange={setGroupCount} min={2} max={32}
              hint={cfg.groupCount >= 2 && cfg.teams >= 4 && cfg.groupCount <= cfg.teams / 2 ? `Tamanhos: ${groupSizes(cfg.teams, cfg.groupCount).join(' + ')}` : undefined} />
            <label className="flex items-center gap-3 text-sm font-bold sm:mt-6">
              <input type="checkbox" checked={knockoutAfterGroups} onChange={(e) => setKnockoutAfterGroups(e.target.checked)} className="w-5 h-5 accent-cyan-400" />
              Eliminatórias depois dos grupos
            </label>
            {knockoutAfterGroups && <IntField label="Classificados por grupo" value={advancePerGroup} onChange={setAdvancePerGroup} min={1} max={16} />}
          </div>
        )}
        {(format === 'knockout' || (format === 'groups' && knockoutAfterGroups)) && (
          <label className="flex items-center gap-3 text-sm font-bold">
            <input type="checkbox" checked={thirdPlace} onChange={(e) => setThirdPlace(e.target.checked)} className="w-5 h-5 accent-cyan-400" />
            Incluir disputa de 3º lugar
          </label>
        )}
        <Segmented label="Ordem das equipes" options={[{ value: 'listed', label: 'Como listei' }, { value: 'random', label: 'Sortear ordem' }]} value={order} onChange={setOrder} />

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={generate} disabled={errors.length > 0}
            className="px-6 py-3 rounded-xl font-black text-black text-xs uppercase tracking-widest disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}>
            {out ? 'Gerar novamente' : 'Gerar tabela'}
          </button>
          <button type="button" onClick={() => { setNamesText(DEFAULT_NAMES); setOut(null); }} className="text-[11px] font-black uppercase tracking-wider opacity-60 hover:opacity-100 underline">
            Restaurar exemplo
          </button>
        </div>
      </Panel>

      <ErrorList errors={errors} />

      {out && (
        <section aria-live="polite" aria-labelledby="tabela" className="space-y-5">
          <h2 id="tabela" className="text-base font-black">Tabela de jogos</h2>
          {stale && <p role="status" className="text-xs text-yellow-300">Você alterou os dados depois de gerar. Clique em "Gerar novamente" para atualizar.</p>}
          {out.sections.map((s, si) => (
            <div key={si} className="space-y-3">
              {s.title && <h3 className="text-sm font-black text-cyan-electric">{s.title}</h3>}
              {s.note && <p className="text-xs opacity-60 leading-relaxed">{s.note}</p>}
              {s.rounds.map((r, ri) => (
                <div key={ri} className="card-glass rounded-xl border border-border-mid p-4">
                  <h4 className="text-xs font-black uppercase tracking-wider opacity-70 mb-2">{r.label ?? `Rodada ${r.round}`}</h4>
                  <ul className="space-y-1.5 text-sm">
                    {r.games.map((g, gi) => (
                      <li key={gi}>
                        {g.bye
                          ? <><strong>{g.home}</strong> <span className="opacity-60">avança direto (bye)</span></>
                          : <>{g.id ? <span className="opacity-50">Jogo {g.id}: </span> : null}<strong>{g.home}</strong> x <strong>{g.away}</strong></>}
                      </li>
                    ))}
                    {r.rest && <li className="opacity-60">Folga: {r.rest}</li>}
                  </ul>
                </div>
              ))}
            </div>
          ))}
          <CopyButton text={out.text} label="Copiar tabela" />
        </section>
      )}
    </ToolLayout>
  );
}
