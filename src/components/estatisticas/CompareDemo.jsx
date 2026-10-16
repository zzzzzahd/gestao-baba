import React, { useState } from 'react';
import { Section, DemoNotice, PlayerSelect, Card, nameOf } from './shared';
import { compareStats, perGameRow } from '../../utils/estatisticasDemo';

export default function CompareDemo({ stats }) {
  const [aId, setA] = useState('alfa');
  const [bId, setB] = useState('bravo');
  const a = stats.find((s) => s.id === aId);
  const b = stats.find((s) => s.id === bId);
  const same = aId === bId;
  const rows = same ? [] : [...compareStats(a, b), perGameRow(a, b)];
  const gamesGap = !same && a.games !== b.games;
  return (
    <Section id="comparacao" title="Demonstração: comparação entre dois jogadores"
      intro="Comparar mostra, métrica por métrica, quem está à frente. Isso descreve números, não decide quem é melhor: leia sempre junto com o contexto abaixo.">
      <DemoNotice />
      <Card className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <PlayerSelect label="Jogador A" value={aId} onChange={setA} stats={stats} />
          <PlayerSelect label="Jogador B" value={bId} onChange={setB} stats={stats} />
        </div>
        {same ? (
          <p role="alert" className="text-sm text-red-300 font-bold">Escolha dois jogadores diferentes para comparar.</p>
        ) : (
          <div aria-live="polite" className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-border-mid">
              <table className="w-full text-sm">
                <caption className="sr-only">Comparação entre {a.name} e {b.name} (dados fictícios)</caption>
                <thead className="text-[10px] uppercase tracking-wider opacity-60">
                  <tr>
                    <th scope="col" className="p-3 text-left">Métrica</th>
                    <th scope="col" className="p-3 text-center">{a.name}</th>
                    <th scope="col" className="p-3 text-center">{b.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key} className="border-t border-white/5">
                      <th scope="row" className="p-3 text-left font-bold">{r.label}</th>
                      <td className={`p-3 text-center ${r.leader === 'a' ? 'font-black text-cyan-electric' : ''}`}>{r.a}{r.leader === 'a' ? <span className="sr-only"> (à frente)</span> : null}</td>
                      <td className={`p-3 text-center ${r.leader === 'b' ? 'font-black text-cyan-electric' : ''}`}>{r.b}{r.leader === 'b' ? <span className="sr-only"> (à frente)</span> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs opacity-60">Destaque em azul = à frente na métrica. Valores iguais não destacam ninguém.</p>
            {gamesGap && (
              <p role="status" className="text-xs text-yellow-200 leading-relaxed">
                {nameOf(stats, aId)} jogou {a.games} partidas e {nameOf(stats, bId)} jogou {b.games}: totais de quem jogou mais tendem a ser maiores. Veja "Gols por partida" para uma leitura proporcional.
              </p>
            )}
          </div>
        )}
        <div className="text-xs opacity-70 leading-relaxed space-y-1">
          <p className="font-black uppercase tracking-wider opacity-80">Como interpretar</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Poucas partidas deixam os números instáveis: um jogo a mais muda muito a média.</li>
            <li>Posição importa: quem joga mais recuado costuma marcar menos, e isso não diz nada sobre qualidade.</li>
            <li>Vitória e aproveitamento dependem também dos companheiros de time e do sorteio.</li>
            <li>A avaliação é uma nota subjetiva; trate-a como opinião do grupo, não como medida exata.</li>
          </ul>
        </div>
      </Card>
    </Section>
  );
}
