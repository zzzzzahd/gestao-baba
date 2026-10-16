import React, { useState } from 'react';
import { Section, DemoNotice, PlayerSelect, Card } from './shared';
import { winRateSeries } from '../../utils/estatisticasDemo';

function LineChart({ title, values, max, unit = '', labelPrefix = 'Partida' }) {
  const W = 560; const H = 200; const padL = 36; const padR = 12; const padT = 14; const padB = 28;
  const n = values.length;
  const x = (i) => padL + (n === 1 ? 0 : (i * (W - padL - padR)) / (n - 1));
  const y = (v) => padT + (1 - v / max) * (H - padT - padB);
  const pts = values.map((v, i) => (v === null ? null : [x(i), y(v)]));
  const d = pts.filter(Boolean).map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const ticks = [0, max / 2, max];
  return (
    <figure className="space-y-2">
      <figcaption className="text-sm font-black">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${values.map((v, i) => `${labelPrefix} ${i + 1}, ${v === null ? 'sem dado' : `${v}${unit}`}`).join('; ')}`} className="w-full h-auto">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity="0.12" />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="currentColor" fillOpacity="0.6">{Math.round(t)}{unit}</text>
          </g>
        ))}
        <path d={d} fill="none" stroke="#00f2ff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((pt, i) => pt && <circle key={i} cx={pt[0]} cy={pt[1]} r="3.5" fill="#00f2ff" />)}
        {values.map((_, i) => <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity="0.6">{i + 1}</text>)}
      </svg>
      <details className="text-xs">
        <summary className="cursor-pointer opacity-70">Ver os números</summary>
        <table className="mt-2 w-full">
          <caption className="sr-only">{title}</caption>
          <thead className="text-left opacity-60"><tr><th scope="col" className="py-1">{labelPrefix}</th><th scope="col" className="py-1">Valor</th></tr></thead>
          <tbody>{values.map((v, i) => <tr key={i} className="border-t border-white/5"><td className="py-1">{i + 1}</td><td className="py-1">{v === null ? '—' : `${v}${unit}`}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

export default function EvolutionDemo({ stats }) {
  const [id, setId] = useState('alfa');
  const p = stats.find((s) => s.id === id);
  const wr = winRateSeries(id);
  const gMax = Math.max(4, Math.ceil(Math.max(...p.cumGoals) / 4) * 4);
  return (
    <Section id="evolucao" title="Demonstração: evolução de desempenho"
      intro="Acompanhar a evolução mostra tendências que o total esconde: se o jogador está marcando mais, se o aproveitamento sobe ou cai conforme as partidas passam.">
      <DemoNotice />
      <Card className="space-y-5">
        <PlayerSelect label="Atleta de exemplo" value={id} onChange={setId} stats={stats} />
        <LineChart title="Gols acumulados" values={p.cumGoals} max={gMax} />
        <LineChart title="Aproveitamento acumulado" values={wr} max={100} unit="%" />
        <p className="text-xs opacity-60 leading-relaxed">
          No começo, o aproveitamento oscila muito: com 1 ou 2 partidas, uma vitória a mais muda tudo. A curva se estabiliza conforme o número de jogos cresce, e é por isso que comparações com poucos jogos pedem cautela. Partidas em que o atleta não jogou repetem o valor anterior.
        </p>
      </Card>
    </Section>
  );
}
