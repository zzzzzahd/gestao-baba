import React from 'react';
import { Link } from 'react-router-dom';
import { DIVISIONS } from '../DivisionBadge';
import { Section, Card } from './shared';

export default function CriteriaSection() {
  return (
    <Section id="criterios" title="Como o jogador é avaliado"
      intro="Além dos números do jogo, o Draft Play tem notas dadas ao jogador. Entender o que cada uma mede evita usá-las do jeito errado.">
      <Card className="space-y-4">
        <ul className="space-y-3 text-sm leading-relaxed">
          <li><strong>Habilidade, físico e compromisso (1 a 5 estrelas).</strong> <span className="opacity-75">Aparecem no perfil do jogador. Segundo o próprio app, essas três notas não afetam o sorteio.</span></li>
          <li><strong>Nível.</strong> <span className="opacity-75">É um valor separado, usado para equilibrar os times no sorteio. Compare-o com o nível médio do grupo.</span></li>
          <li><strong>Divisão.</strong> <span className="opacity-75">É calculada pela média das notas e vai de Ferro a Diamante, conforme a tabela abaixo.</span></li>
        </ul>
        <div className="overflow-x-auto rounded-xl border border-border-mid">
          <table className="w-full text-sm">
            <caption className="sr-only">Divisões e faixas de média das notas</caption>
            <thead className="text-[10px] uppercase tracking-wider opacity-60 text-left">
              <tr><th scope="col" className="p-3">Divisão</th><th scope="col" className="p-3">Média das notas</th></tr>
            </thead>
            <tbody>
              {DIVISIONS.map((d) => (
                <tr key={d.id} className="border-t border-white/5">
                  <th scope="row" className="p-3 text-left font-bold">{d.emoji} {d.label}</th>
                  <td className="p-3">{d.min.toFixed(1)} a {d.max.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs opacity-60 leading-relaxed">
          Notas são opinião: quem avalia pode ser generoso ou duro, e amizade pesa. Use a divisão como retrato do que o grupo pensa, não como medida objetiva. Gols e assistências, por outro lado, são fatos registrados, mas dependem de posição e de companheiros.
          Para sortear com seu próprio critério, teste o <Link to="/ferramentas/sorteador" className="text-cyan-electric underline">sorteador gratuito</Link>.
        </p>
      </Card>
    </Section>
  );
}
