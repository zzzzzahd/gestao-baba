import React from 'react';
import { Section, DemoNotice, Card, nameOf } from './shared';
import { resolvedMatches, collectiveStats } from '../../utils/estatisticasDemo';

const short = (stats, id) => nameOf(stats, id).replace('Atleta ', '');

export default function MatchesDemo({ stats }) {
  const matches = resolvedMatches();
  const c = collectiveStats();
  return (
    <Section id="historico" title="Demonstração: histórico de partidas"
      intro="Cada partida guarda quem jogou em cada time e quem fez e deu assistência a cada gol. Todos os números dos jogadores nesta página são calculados a partir destas 10 partidas fictícias.">
      <DemoNotice />
      <Card className="space-y-4">
        <ul className="space-y-2">
          {matches.map((m) => (
            <li key={m.n}>
              <details className="rounded-xl border border-white/10 bg-white/5 p-3">
                <summary className="cursor-pointer text-sm font-bold">
                  Partida {m.n}: Time A {m.scoreA} x {m.scoreB} Time B
                  <span className="ml-2 text-[11px] font-normal opacity-60">{m.result === 'draw' ? 'empate' : `vitória do Time ${m.result === 'a' ? 'A' : 'B'}`}</span>
                </summary>
                <div className="mt-3 space-y-2 text-xs leading-relaxed">
                  <p><strong>Time A:</strong> {m.a.map((id) => short(stats, id)).join(', ')}</p>
                  <p><strong>Time B:</strong> {m.b.map((id) => short(stats, id)).join(', ')}</p>
                  <p><strong>Gols:</strong> {m.events.map((e) => `${short(stats, e.scorer)}${e.assist ? ` (assist. ${short(stats, e.assist)})` : ''}`).join(' · ')}</p>
                </div>
              </details>
            </li>
          ))}
        </ul>
        <div>
          <h3 className="text-sm font-black mb-2">Números coletivos do baba de exemplo</h3>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm">
            <li className="bg-white/5 rounded-xl border border-white/10 p-3"><strong>{c.matches}</strong> partidas, <strong>{c.goals}</strong> gols</li>
            <li className="bg-white/5 rounded-xl border border-white/10 p-3">Média de <strong>{String(c.avgGoals).replace('.', ',')}</strong> gols por partida</li>
            <li className="bg-white/5 rounded-xl border border-white/10 p-3"><strong>{c.draws}</strong> empates e <strong>{c.decided}</strong> partidas decididas</li>
            <li className="bg-white/5 rounded-xl border border-white/10 p-3">Maior placar: <strong>{c.biggest.score}</strong> (partida {c.biggest.n})</li>
          </ul>
          <p className="text-xs opacity-60 leading-relaxed mt-3">
            Estatísticas coletivas ajudam a enxergar o baba como um todo: se os jogos têm muitos gols, se terminam empatados com frequência, se os times saem equilibrados. Placares muito desiguais repetidos sugerem times mal balanceados.
          </p>
        </div>
      </Card>
    </Section>
  );
}
