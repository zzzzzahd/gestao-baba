// src/pages/tools/TorneioCalculadora.jsx
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ToolLayout, IntField, Panel, Stat, ErrorList, Segmented, CopyButton, toInt } from '../../components/tools/ui';
import { TOOLS } from '../../content/toolsCatalog';
import { validateConfig, summarize, formatDuration } from '../../utils/tournamentMath';

const tool = TOOLS.find((t) => t.slug === 'calculadora-torneio');

const FORMATS = [
  { value: 'knockout', label: 'Mata-mata' },
  { value: 'roundrobin', label: 'Pontos corridos' },
  { value: 'groups', label: 'Grupos' },
];

export default function TorneioCalculadora() {
  const [format, setFormat] = useState('knockout');
  const [teams, setTeams] = useState('8');
  const [legs, setLegs] = useState('1');
  const [thirdPlace, setThirdPlace] = useState(false);
  const [groupCount, setGroupCount] = useState('2');
  const [knockoutAfterGroups, setKnockoutAfterGroups] = useState(true);
  const [advancePerGroup, setAdvancePerGroup] = useState('2');
  const [fields, setFields] = useState('1');
  const [matchMinutes, setMatchMinutes] = useState('20');
  const [breakMinutes, setBreakMinutes] = useState('5');

  const cfg = useMemo(() => ({
    format,
    teams: toInt(teams),
    legs: legs === '2' ? 2 : 1,
    thirdPlace,
    groupCount: toInt(groupCount),
    knockoutAfterGroups,
    advancePerGroup: toInt(advancePerGroup),
    fields: toInt(fields),
    matchMinutes: toInt(matchMinutes),
    breakMinutes: breakMinutes === '' ? 0 : toInt(breakMinutes),
  }), [format, teams, legs, thirdPlace, groupCount, knockoutAfterGroups, advancePerGroup, fields, matchMinutes, breakMinutes]);

  const errors = useMemo(() => validateConfig(cfg), [cfg]);
  const result = useMemo(() => (errors.length ? null : summarize(cfg)), [errors, cfg]);

  const reset = () => {
    setFormat('knockout'); setTeams('8'); setLegs('1'); setThirdPlace(false); setGroupCount('2');
    setKnockoutAfterGroups(true); setAdvancePerGroup('2'); setFields('1'); setMatchMinutes('20'); setBreakMinutes('5');
  };

  const summaryText = result && [
    `Torneio ${FORMATS.find((f) => f.value === format).label.toLowerCase()} com ${cfg.teams} equipes`,
    `Jogos: ${result.totalGames}`,
    `Rodadas/etapas: ${result.totalRounds}`,
    `Duração estimada: ${formatDuration(result.estimatedMinutes)} (${cfg.fields} campo(s), ${cfg.matchMinutes} min por jogo, ${cfg.breakMinutes} min de intervalo)`,
    '',
    ...result.rounds.map((r) => `${r.label}: ${r.games} jogo(s)`),
  ].join('\n');

  return (
    <ToolLayout
      slug={tool.slug}
      title="Calculadora de torneio"
      metaTitle={tool.title}
      metaDescription={tool.description}
      intro="Antes de convidar as equipes, descubra quantos jogos o seu torneio terá e quanto tempo ele deve durar. Escolha o formato, o número de campos e a duração das partidas."
      howTo={[
        'Escolha o formato: mata-mata, pontos corridos ou fase de grupos (com ou sem eliminatórias depois).',
        'Informe o número de equipes e, se houver mais de um campo ou quadra, quantos estarão disponíveis.',
        'Preencha a duração de cada partida e o intervalo entre elas. Veja jogos, etapas e a duração estimada.',
        'Use o botão de copiar para mandar o resumo no grupo, ou vá ao gerador de tabela para montar os confrontos.',
      ]}
      premises={[
        'Mata-mata simples: sempre há n − 1 jogos (cada jogo elimina uma equipe). Se o número de equipes não for potência de 2, as melhores cabeças de chave ganham "bye" (avançam direto) e a primeira rodada tem n − p/2 jogos, onde p é a próxima potência de 2.',
        'Pontos corridos: cada turno tem n(n − 1)/2 jogos. Com número par de equipes há n − 1 rodadas; com número ímpar há n rodadas e uma equipe folga em cada uma.',
        'Fase de grupos: as equipes são divididas o mais uniformemente possível (por exemplo, 7 equipes em 2 grupos viram 4 + 3). Cada grupo joga todos contra todos; se escolhida, a fase eliminatória usa a quantidade de classificados (grupos × classificados por grupo).',
        'Duração estimada: para cada etapa, jogos ÷ campos (arredondado para cima) faixas de horário; cada faixa dura o tempo da partida, com o intervalo entre faixas. Uma etapa só começa quando a anterior termina.',
      ]}
      limitations="É uma estimativa: não inclui atrasos, aquecimento, cerimônias, prorrogação ou pênaltis, nem a restrição de que uma mesma equipe descanse entre jogos. Se o seu regulamento tiver disputa de 3º lugar, marque a opção correspondente."
    >
      <Panel>
        <Segmented label="Formato" options={FORMATS} value={format} onChange={setFormat} />

        <div className="grid sm:grid-cols-2 gap-4">
          <IntField label="Equipes" value={teams} onChange={setTeams} min={2} max={64} />
          <IntField label="Campos ou quadras" value={fields} onChange={setFields} min={1} max={32} />
          <IntField label="Minutos por partida" value={matchMinutes} onChange={setMatchMinutes} min={1} max={240} />
          <IntField label="Intervalo entre partidas (min)" value={breakMinutes} onChange={setBreakMinutes} min={0} max={120} />
        </div>

        {(format === 'roundrobin' || format === 'groups') && (
          <Segmented
            label="Turnos"
            options={[{ value: '1', label: 'Só ida' }, { value: '2', label: 'Ida e volta' }]}
            value={legs}
            onChange={setLegs}
          />
        )}

        {format === 'groups' && (
          <div className="grid sm:grid-cols-2 gap-4">
            <IntField label="Quantidade de grupos" value={groupCount} onChange={setGroupCount} min={2} max={32} />
            <label className="flex items-center gap-3 text-sm font-bold sm:mt-6">
              <input type="checkbox" checked={knockoutAfterGroups} onChange={(e) => setKnockoutAfterGroups(e.target.checked)} className="w-5 h-5 accent-cyan-400" />
              Eliminatórias depois dos grupos
            </label>
            {knockoutAfterGroups && (
              <IntField label="Classificados por grupo" value={advancePerGroup} onChange={setAdvancePerGroup} min={1} max={16} />
            )}
          </div>
        )}

        {(format === 'knockout' || (format === 'groups' && knockoutAfterGroups)) && (
          <label className="flex items-center gap-3 text-sm font-bold">
            <input type="checkbox" checked={thirdPlace} onChange={(e) => setThirdPlace(e.target.checked)} className="w-5 h-5 accent-cyan-400" />
            Incluir disputa de 3º lugar
          </label>
        )}

        <button type="button" onClick={reset} className="text-[11px] font-black uppercase tracking-wider opacity-60 hover:opacity-100 underline">
          Restaurar valores iniciais
        </button>
      </Panel>

      <ErrorList errors={errors} />

      {result && (
        <section aria-live="polite" aria-labelledby="resultado" className="space-y-4">
          <h2 id="resultado" className="text-base font-black">Resultado</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Jogos" value={result.totalGames} />
            <Stat label="Etapas" value={result.totalRounds} sub="rodadas em sequência" />
            <Stat label="Duração estimada" value={formatDuration(result.estimatedMinutes)} sub={`${result.slots} faixas de horário`} />
            {result.byes !== undefined && (
              <Stat label={format === 'knockout' ? 'Byes' : 'Folgas'} value={result.byes} sub={format === 'knockout' ? 'equipes que avançam direto' : 'no total, 1 por rodada'} />
            )}
            {result.groupGames !== undefined && <Stat label="Jogos nos grupos" value={result.groupGames} sub={`+ ${result.knockoutGames} nas eliminatórias`} />}
          </div>

          <div className="overflow-x-auto rounded-xl border border-border-mid">
            <table className="w-full text-sm">
              <caption className="sr-only">Jogos por etapa</caption>
              <thead className="text-[10px] uppercase tracking-wider opacity-60 text-left">
                <tr><th scope="col" className="p-3">Etapa</th><th scope="col" className="p-3">Jogos</th></tr>
              </thead>
              <tbody>
                {result.rounds.map((r, i) => (
                  <tr key={`${r.label}-${i}`} className="border-t border-white/5">
                    <td className="p-3">{r.label}</td>
                    <td className="p-3 font-bold">{r.games}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <CopyButton text={summaryText} label="Copiar resumo" />
            <Link to="/ferramentas/tabela-de-jogos" className="text-xs font-black uppercase tracking-wider text-cyan-electric underline">
              Gerar a tabela de jogos →
            </Link>
          </div>
        </section>
      )}
    </ToolLayout>
  );
}
