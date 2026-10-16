import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shuffle } from 'lucide-react';
import { Section, DemoNotice, Card } from './shared';
import { balanceTeams } from '../../utils/teamBalancer';
import { toBalancerStars } from '../../utils/estatisticasDemo';

// Gerador pseudoaleatório com semente: o resultado inicial é sempre o mesmo (importante
// para o HTML pré-renderizado); o botão "sortear de novo" usa Math.random.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function TeamBuilderDemo({ stats }) {
  const players = useMemo(() => stats.map((s) => ({ id: s.id, name: s.name, position: 'linha', stars: toBalancerStars(s.overall), overall: s.overall })), [stats]);
  const [draw, setDraw] = useState(() => balanceTeams(players, 2, 5, 'reserve', seeded(7)));
  const avg = (t) => (t.players.reduce((s, p) => s + p.overall, 0) / t.players.length).toFixed(2);
  return (
    <Section id="times" title="Demonstração: montagem de equipes"
      intro="Equilibrar os times é o que mais evita briga no baba. Aqui, 10 atletas fictícios são distribuídos em dois times de 5 pelo método do sorteador gratuito do Draft Play.">
      <DemoNotice />
      <Card className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          {draw.teams.map((t) => (
            <div key={t.id} className="rounded-xl border border-border-mid bg-white/5 p-4">
              <h3 className="text-sm font-black text-cyan-electric">{t.name}</h3>
              <p className="text-[11px] opacity-60 mb-2">soma dos níveis {t.starSum} · média das notas {avg(t)}</p>
              <ul className="text-sm space-y-1">{t.players.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setDraw(balanceTeams(players, 2, 5, 'reserve'))}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-cyan-electric/30 bg-cyan-electric/10 text-cyan-electric text-xs font-black uppercase tracking-wider">
          <Shuffle size={14} aria-hidden="true" /> Sortear de novo
        </button>
        <div className="text-xs opacity-65 leading-relaxed space-y-2">
          <p>Como funciona: os atletas são ordenados por nível (nesta demonstração, derivado da média das notas: abaixo de 3, de 3 a 4 e acima de 4) e distribuídos em serpentina, de modo que cada time receba perfis parecidos. Dentro do mesmo nível, a ordem é aleatória, então cada sorteio pode dar um resultado diferente.</p>
          <p>Limitação: é uma heurística. Com poucos jogadores, as somas podem diferir, e o resultado só é tão bom quanto os níveis informados. Esta demonstração usa o método do sorteador público, que é independente do sorteio dentro do app.</p>
          <p>Quer testar com a sua lista? Use o <Link to="/ferramentas/sorteador" className="text-cyan-electric underline">sorteador de times equilibrados</Link>.</p>
        </div>
      </Card>
    </Section>
  );
}
