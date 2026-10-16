import React, { useState } from 'react';
import DivisionBadge from '../DivisionBadge';
import StreakBadge from '../StreakBadge';
import { Section, DemoNotice, PlayerSelect, Card, StatBox } from './shared';

const RATINGS = [['skill', 'Habilidade'], ['physical', 'Físico'], ['commitment', 'Compromisso']];

export default function PlayerProfileDemo({ stats }) {
  const [id, setId] = useState('alfa');
  const p = stats.find((s) => s.id === id);
  return (
    <Section id="perfil" title="Demonstração: perfil de jogador"
      intro="O perfil reúne, em um lugar só, o que o jogador fez no baba: gols, assistências, partidas, aproveitamento, a sequência de presenças e a divisão. Escolha um atleta de exemplo.">
      <DemoNotice />
      <Card className="space-y-4">
        <PlayerSelect label="Atleta de exemplo" value={id} onChange={setId} stats={stats} />
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-black">{p.name}</h3>
          <DivisionBadge rating={p.overall} />
          <StreakBadge streak={p.streak} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatBox label="Gols" value={p.goals} />
          <StatBox label="Assistências" value={p.assists} />
          <StatBox label="Partidas" value={p.games} />
          <StatBox label="Vitórias" value={p.wins} />
          <StatBox label="Aproveit." value={`${p.winRate}%`} />
        </div>
        <ul className="space-y-2" aria-label="Notas do jogador">
          {RATINGS.map(([k, label]) => (
            <li key={k} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3 text-sm">
              <span className="opacity-70">{label}</span>
              <span role="img" aria-label={`${label}: ${p.ratings[k].toFixed(1)} de 5`} className="h-2 rounded-full bg-white/10 overflow-hidden">
                <span className="block h-full bg-cyan-electric" style={{ width: `${(p.ratings[k] / 5) * 100}%` }} />
              </span>
              <span className="font-black text-right">{p.ratings[k].toFixed(1)}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs opacity-60 leading-relaxed">
          Média das três notas: <strong>{p.overall.toFixed(2)}</strong>, que coloca o jogador na divisão <strong>{p.division.label}</strong>.
          Nesta demonstração, a sequência conta as partidas seguidas em que o atleta esteve presente, da mais recente para trás.
        </p>
      </Card>
    </Section>
  );
}
