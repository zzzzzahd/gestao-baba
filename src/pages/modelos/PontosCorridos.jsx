import React, { useMemo, useState } from 'react';
import { ModeloLayout, Preview, OutputActions, TeamsField, useTeams } from '../../components/tools/ModeloUI';
import { Panel, ErrorList, IntField, Segmented, toInt } from '../../components/tools/ui';
import { computeStandings, standingsToText, scheduleFor, scheduleToText } from '../../utils/modelosTorneio';
import { toCsv } from '../../utils/exportFile';

export default function PontosCorridos() {
  const teams = useTeams(4);
  const [legs, setLegs] = useState('1');
  const [win, setWin] = useState('3');
  const [draw, setDraw] = useState('1');
  const [scores, setScores] = useState({});
  const w = toInt(win); const d = toInt(draw);

  const errors = [...teams.errors];
  if (!teams.errors.length && !(Number.isInteger(w) && Number.isInteger(d) && w > d && d >= 0 && w <= 10)) {
    errors.push('A pontuação precisa seguir: vitória maior que empate, e ambos inteiros entre 0 e 10.');
  }

  const rounds = useMemo(() => (teams.errors.length ? [] : scheduleFor('roundrobin', teams.names, { legs: legs === '2' ? 2 : 1 })), [teams.errors.length, teams.names, legs]);
  const results = useMemo(() => rounds.flatMap((r, ri) => r.games.map((g, gi) => {
    const s = scores[`${ri}-${gi}`] ?? {};
    return { home: g.home, away: g.away, hg: s.hg === '' || s.hg === undefined ? NaN : Number(s.hg), ag: s.ag === '' || s.ag === undefined ? NaN : Number(s.ag) };
  })), [rounds, scores]);
  const standings = useMemo(() => (errors.length ? [] : computeStandings(teams.names, results, { win: w, draw: d, loss: 0 })), [errors.length, teams.names, results, w, d]);

  const setScore = (key, side, value) => setScores((p) => ({ ...p, [key]: { ...p[key], [side]: value } }));
  const fixtures = errors.length ? '' : scheduleToText(rounds, { title: 'Tabela de jogos' });
  const table = errors.length ? '' : standingsToText(standings, 'Classificação');
  const text = errors.length ? '' : `${fixtures}\n\n${table}`;
  const csv = errors.length ? '' : toCsv([['Pos', 'Equipe', 'P', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG'], ...standings.map((r) => [r.pos, r.team, r.pts, r.j, r.v, r.e, r.d, r.gp, r.gc, r.sg])]);

  return (
    <ModeloLayout
      slug="pontos-corridos"
      intro="Todos contra todos, com a classificação calculada por você: digite os placares conforme os jogos acontecem e a tabela se atualiza sozinha."
      howTo={[
        'Liste as equipes e escolha turno único ou ida e volta. A tabela de jogos aparece abaixo.',
        'Digite o placar de cada jogo (deixe em branco o que ainda não aconteceu).',
        'Acompanhe a classificação. Copie, imprima ou baixe em CSV para abrir no Excel.',
      ]}
      premises={[
        'Pontuação padrão: 3 por vitória, 1 por empate e 0 por derrota (você pode mudar acima).',
        'Ordem da classificação: pontos, vitórias, saldo de gols, gols marcados e, por fim, ordem alfabética.',
        'O confronto direto não é aplicado automaticamente. Equipes iguais em todos esses critérios ficam marcadas como empatadas para você resolver conforme o regulamento.',
        'Só entram na conta jogos com os dois placares preenchidos com números inteiros de 0 a 99.',
      ]}
      limitations="Os placares ficam só nesta página: ao recarregar, são apagados. Copie ou baixe antes de sair."
    >
      <Panel>
        <TeamsField teams={teams} rows={5} />
        <Segmented label="Turnos" options={[{ value: '1', label: 'Só ida' }, { value: '2', label: 'Ida e volta' }]} value={legs} onChange={setLegs} />
        <div className="grid grid-cols-2 gap-4">
          <IntField label="Pontos por vitória" value={win} onChange={setWin} min={1} max={10} />
          <IntField label="Pontos por empate" value={draw} onChange={setDraw} min={0} max={9} />
        </div>
      </Panel>
      <ErrorList errors={errors} />

      {!errors.length && (
        <>
          <section aria-labelledby="jogos" className="space-y-3">
            <h2 id="jogos" className="text-base font-black">Jogos e placares</h2>
            {rounds.map((r, ri) => (
              <fieldset key={ri} className="card-glass rounded-xl border border-border-mid p-4">
                <legend className="px-1 text-xs font-black uppercase tracking-wider opacity-70">{r.label ?? `Rodada ${r.round}`}</legend>
                <ul className="space-y-2">
                  {r.games.map((g, gi) => {
                    const key = `${ri}-${gi}`;
                    return (
                      <li key={key} className="grid grid-cols-[1fr_3.5rem_auto_3.5rem_1fr] items-center gap-2 text-sm">
                        <span className="text-right font-bold truncate">{g.home}</span>
                        <input type="number" inputMode="numeric" min={0} max={99} aria-label={`Gols de ${g.home} contra ${g.away}, rodada ${ri + 1}`}
                          value={scores[key]?.hg ?? ''} onChange={(e) => setScore(key, 'hg', e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-center outline-none focus:border-cyan-electric" />
                        <span aria-hidden="true">x</span>
                        <input type="number" inputMode="numeric" min={0} max={99} aria-label={`Gols de ${g.away} contra ${g.home}, rodada ${ri + 1}`}
                          value={scores[key]?.ag ?? ''} onChange={(e) => setScore(key, 'ag', e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-center outline-none focus:border-cyan-electric" />
                        <span className="font-bold truncate">{g.away}</span>
                      </li>
                    );
                  })}
                  {r.rest && <li className="text-xs opacity-60">Folga: {r.rest}</li>}
                </ul>
              </fieldset>
            ))}
          </section>

          <section aria-live="polite" aria-labelledby="class" className="space-y-3">
            <h2 id="class" className="text-base font-black">Classificação</h2>
            <div className="overflow-x-auto rounded-xl border border-border-mid">
              <table className="w-full text-sm">
                <caption className="sr-only">Classificação</caption>
                <thead className="text-[10px] uppercase tracking-wider opacity-60 text-left">
                  <tr>{['#', 'Equipe', 'P', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG'].map((h) => <th key={h} scope="col" className="p-3">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {standings.map((r) => (
                    <tr key={r.team} className="border-t border-white/5">
                      <td className="p-3">{r.pos}</td>
                      <th scope="row" className="p-3 text-left font-bold">{r.team}{r.tie ? <span className="ml-2 text-[10px] text-yellow-300 font-normal">empatada</span> : null}</th>
                      <td className="p-3 font-black text-cyan-electric">{r.pts}</td>
                      {[r.j, r.v, r.e, r.d, r.gp, r.gc, r.sg].map((v, i) => <td key={i} className="p-3">{v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Preview text={text} label="Texto para copiar: jogos e classificação" />
            <OutputActions text={text} csv={csv} title="Pontos corridos" filename="pontos-corridos" />
          </section>
        </>
      )}
    </ModeloLayout>
  );
}
