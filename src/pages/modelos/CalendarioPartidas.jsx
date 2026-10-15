import React, { useMemo, useState } from 'react';
import { ModeloLayout, Preview, OutputActions, TeamsField, useTeams } from '../../components/tools/ModeloUI';
import { Panel, ErrorList, IntField, Segmented, Field, inputCls, toInt } from '../../components/tools/ui';
import { assignTimes, calendarToText, scheduleFor, TIME_RE } from '../../utils/modelosTorneio';
import { toCsv } from '../../utils/exportFile';
import { formatDuration } from '../../utils/tournamentMath';

export default function CalendarioPartidas() {
  const teams = useTeams(6);
  const [format, setFormat] = useState('roundrobin');
  const [legs, setLegs] = useState('1');
  const [start, setStart] = useState('19:00');
  const [matchMin, setMatchMin] = useState('20');
  const [breakMin, setBreakMin] = useState('5');
  const [fields, setFields] = useState('1');
  const [dateText, setDateText] = useState('');

  const mm = toInt(matchMin); const bb = breakMin === '' ? 0 : toInt(breakMin); const ff = toInt(fields);
  const errors = [...teams.errors];
  if (!TIME_RE.test(start)) errors.push('Informe o horário de início (por exemplo, 19:00).');
  if (!Number.isInteger(mm) || mm < 1 || mm > 240) errors.push('Duração da partida: de 1 a 240 minutos.');
  if (!Number.isInteger(bb) || bb < 0 || bb > 120) errors.push('Intervalo: de 0 a 120 minutos.');
  if (!Number.isInteger(ff) || ff < 1 || ff > 32) errors.push('Campos: de 1 a 32.');

  const cal = useMemo(() => (errors.length ? null : assignTimes(scheduleFor(format, teams.names, { legs: legs === '2' ? 2 : 1 }), { startTime: start, matchMinutes: mm, breakMinutes: bb, fields: ff })),
    [errors.length, format, teams.names, legs, start, mm, bb, ff]);
  const text = cal ? calendarToText(cal, { dateText: dateText.trim() }) : '';
  const csv = cal ? toCsv([['Rodada', 'Início', 'Fim', 'Campo', 'Jogo', 'Mandante', 'Visitante'], ...cal.entries.map((e) => [e.round, e.start, e.end, e.field, e.id ?? '', e.home, e.away])]) : '';

  return (
    <ModeloLayout
      slug="calendario-de-partidas"
      intro="Transforme a tabela de jogos em calendário: cada jogo com horário e campo, e o horário previsto para o fim do torneio."
      howTo={[
        'Liste as equipes, escolha o formato e informe o horário de início, a duração das partidas, o intervalo e quantos campos há.',
        'Veja o calendário e o horário previsto de término. Copie, imprima ou baixe em CSV.',
      ]}
      premises={[
        'Cada rodada só começa depois que a anterior termina. Dentro da rodada, os jogos ocupam os campos disponíveis, e as faixas seguintes começam após a duração da partida mais o intervalo.',
        'É a mesma regra da calculadora de torneio, então a duração total bate com a estimativa de lá.',
        'Se o torneio passar da meia-noite, os horários recomeçam em 00:00.',
      ]}
      limitations="Estimativa sem atrasos, aquecimento, cerimônias ou prorrogação. Em pontos corridos, a ordem dos jogos não garante descanso mínimo entre as partidas de uma mesma equipe."
    >
      <Panel>
        <TeamsField teams={teams} rows={5} />
        <Segmented label="Formato" options={[{ value: 'roundrobin', label: 'Pontos corridos' }, { value: 'knockout', label: 'Mata-mata' }]} value={format} onChange={setFormat} />
        {format === 'roundrobin' && <Segmented label="Turnos" options={[{ value: '1', label: 'Só ida' }, { value: '2', label: 'Ida e volta' }]} value={legs} onChange={setLegs} />}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Horário de início"><input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} /></Field>
          <Field label="Data ou observação (opcional)"><input type="text" maxLength={60} value={dateText} onChange={(e) => setDateText(e.target.value)} className={inputCls} placeholder="Ex.: sábado, 8 de novembro" /></Field>
          <IntField label="Minutos por partida" value={matchMin} onChange={setMatchMin} min={1} max={240} />
          <IntField label="Intervalo entre faixas (min)" value={breakMin} onChange={setBreakMin} min={0} max={120} />
          <IntField label="Campos ou quadras" value={fields} onChange={setFields} min={1} max={32} />
        </div>
      </Panel>
      <ErrorList errors={errors} />
      {cal && (
        <section aria-live="polite" aria-labelledby="previa" className="space-y-3">
          <h2 id="previa" className="text-base font-black">Calendário</h2>
          <p className="text-sm opacity-75">{cal.entries.length} jogos · duração estimada {formatDuration(cal.totalMinutes)} · término previsto às {cal.endTime}</p>
          <Preview text={text} label="Prévia do calendário de partidas" />
          <OutputActions text={text} csv={csv} title="Calendário de partidas" filename="calendario-de-partidas" />
        </section>
      )}
    </ModeloLayout>
  );
}
