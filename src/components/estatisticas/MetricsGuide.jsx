import React from 'react';
import { Section, Card } from './shared';

const METRICS = [
  ['Gols', 'Quantos gols o jogador marcou nas partidas registradas.', 'Depende da posição e de quantas partidas ele jogou.'],
  ['Assistências', 'Passes que resultaram diretamente em gol.', 'Dependem de alguém registrar a assistência e de quem finaliza.'],
  ['Partidas', 'Quantas partidas o jogador disputou.', 'É o contexto de todas as outras métricas: sem ele, totais enganam.'],
  ['Vitórias e aproveitamento', 'Vitórias do time do jogador; o aproveitamento relaciona vitórias e partidas.', 'Reflete o time inteiro e o sorteio, não só o jogador.'],
  ['Sequência', 'Presenças consecutivas confirmadas, da partida mais recente para trás.', 'Mede assiduidade, não desempenho: um jogador ausente pode ser ótimo quando joga.'],
  ['Avaliação', 'Média das notas de habilidade, físico e compromisso.', 'É subjetiva e define a divisão.'],
  ['MVP', 'No ranking do app, soma de gols e assistências.', 'Valoriza quem participa de gols; não mede defesa nem marcação.'],
];

export default function MetricsGuide() {
  return (
    <Section id="metricas" title="O que cada estatística significa"
      intro="Antes de olhar rankings, vale saber o que cada número realmente diz e o que ele não diz.">
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Métricas, o que medem e cuidados de leitura</caption>
            <thead className="text-[10px] uppercase tracking-wider opacity-60 text-left">
              <tr><th scope="col" className="p-3">Métrica</th><th scope="col" className="p-3">O que mede</th><th scope="col" className="p-3">Cuidado ao interpretar</th></tr>
            </thead>
            <tbody>
              {METRICS.map(([m, what, care]) => (
                <tr key={m} className="border-t border-white/5 align-top">
                  <th scope="row" className="p-3 text-left font-bold whitespace-nowrap">{m}</th>
                  <td className="p-3 opacity-80 leading-relaxed">{what}</td>
                  <td className="p-3 opacity-65 leading-relaxed">{care}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Section>
  );
}
