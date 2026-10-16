import React, { useState } from 'react';
import { Section, DemoNotice, Card } from './shared';
import { rankBy } from '../../utils/estatisticasDemo';

const TABS = [
  { id: 'goals', label: 'Gols', unit: 'gols' },
  { id: 'assists', label: 'Assistências', unit: 'assist.' },
  { id: 'mvp', label: 'MVP', unit: 'G + A' },
];

export default function RankingDemo({ stats }) {
  const [tab, setTab] = useState('goals');
  const rows = rankBy(stats, tab).slice(0, 10);
  const cur = TABS.find((t) => t.id === tab);
  return (
    <Section id="ranking" title="Demonstração: ranking"
      intro="O ranking ordena os jogadores por uma métrica. Aqui, os três mais usados: gols, assistências e MVP, que soma gols e assistências.">
      <DemoNotice />
      <Card className="space-y-4">
        <div role="group" aria-label="Escolher ranking" className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider border ${tab === t.id ? 'bg-cyan-electric text-black border-cyan-electric' : 'bg-white/5 text-white/60 border-white/10'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-xl border border-border-mid">
          <table className="w-full text-sm">
            <caption className="sr-only">Ranking de {cur.label} (dados fictícios)</caption>
            <thead className="text-[10px] uppercase tracking-wider opacity-60 text-left">
              <tr><th scope="col" className="p-3">#</th><th scope="col" className="p-3">Atleta</th><th scope="col" className="p-3">{cur.unit}</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="p-3">{r.pos}º</td>
                  <th scope="row" className="p-3 text-left font-bold">{r.name}</th>
                  <td className="p-3 font-black text-cyan-electric">{r.value}{tab === 'mvp' ? <span className="ml-2 text-[10px] font-normal opacity-50">({r.goals} + {r.assists})</span> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs opacity-60 leading-relaxed">
          Jogadores com o mesmo valor dividem a posição. O app também tem um ranking de fair-play e permite filtrar por período; esta demonstração usa o conjunto completo das 10 partidas fictícias.
        </p>
      </Card>
    </Section>
  );
}
