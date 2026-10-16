// src/pages/EstatisticasPage.jsx — /estatisticas
// Explicação das estatísticas do futebol amador + demonstrações interativas com
// DADOS FICTÍCIOS (src/content/estatisticasDemo.js). Não lê nada do banco.
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import PublicPagesFooter from '../components/PublicPagesFooter';
import { usePageMeta } from '../hooks/usePageMeta';
import { ESTATISTICAS_PAGE } from '../content/estatisticasDemo';
import { deriveStats } from '../utils/estatisticasDemo';
import { DemoNotice, Section, Card } from '../components/estatisticas/shared';
import MetricsGuide from '../components/estatisticas/MetricsGuide';
import PlayerProfileDemo from '../components/estatisticas/PlayerProfileDemo';
import RankingDemo from '../components/estatisticas/RankingDemo';
import CompareDemo from '../components/estatisticas/CompareDemo';
import MatchesDemo from '../components/estatisticas/MatchesDemo';
import EvolutionDemo from '../components/estatisticas/EvolutionDemo';
import CriteriaSection from '../components/estatisticas/CriteriaSection';
import TeamBuilderDemo from '../components/estatisticas/TeamBuilderDemo';

const TOC = [
  ['metricas', 'O que cada estatística significa'],
  ['perfil', 'Perfil de jogador'],
  ['ranking', 'Ranking'],
  ['comparacao', 'Comparação entre jogadores'],
  ['historico', 'Histórico de partidas'],
  ['evolucao', 'Evolução de desempenho'],
  ['criterios', 'Como o jogador é avaliado'],
  ['times', 'Montagem de equipes'],
  ['leitura', 'Como ler com cuidado'],
];

export default function EstatisticasPage() {
  usePageMeta(ESTATISTICAS_PAGE.title, ESTATISTICAS_PAGE.description);
  const stats = useMemo(() => deriveStats(), []);
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="max-w-3xl mx-auto px-5 py-6 space-y-10">
        <header className="flex items-center justify-between">
          <Link to="/"><Logo size="small" as="p" /></Link>
          <Link to="/ferramentas" className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-electric">Ferramentas</Link>
        </header>

        <div className="space-y-12">
          <div className="space-y-4">
            <h1 className="text-2xl md:text-3xl font-black italic tracking-tight text-cyan-electric">Estatísticas do futebol amador: como ler e usar no seu baba</h1>
            <p className="text-sm opacity-70 leading-relaxed">
              Gols, assistências, aproveitamento, sequência de presenças, avaliação e divisão: cada número conta uma parte da história do baba, e todos podem enganar quando lidos sozinhos.
              Aqui você entende o que cada estatística significa e explora demonstrações de perfil, ranking, comparação, histórico, evolução e montagem de times.
            </p>
            <DemoNotice>Todas as demonstrações usam atletas e partidas fictícios, criados só para explicar. Nenhuma informação vem de jogadores ou grupos reais, e nada aqui é estatística oficial.</DemoNotice>
            <nav aria-label="Nesta página" className="card-glass p-4 rounded-2xl border border-border-mid">
              <p className="text-[11px] font-black uppercase tracking-wider opacity-60 mb-2">Nesta página</p>
              <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm list-decimal pl-5">
                {TOC.map(([id, label]) => <li key={id}><a href={`#${id}`} className="text-cyan-electric underline">{label}</a></li>)}
              </ol>
            </nav>
          </div>

          <MetricsGuide />
          <PlayerProfileDemo stats={stats} />
          <RankingDemo stats={stats} />
          <CompareDemo stats={stats} />
          <MatchesDemo stats={stats} />
          <EvolutionDemo stats={stats} />
          <CriteriaSection />
          <TeamBuilderDemo stats={stats} />

          <Section id="leitura" title="Como ler estatísticas com cuidado"
            intro="Números ajudam a conversar sobre o baba, mas só funcionam se lidos com contexto.">
            <Card className="space-y-4 text-sm leading-relaxed">
              <div>
                <h3 className="font-black mb-1">Individuais e coletivas</h3>
                <p className="opacity-75">Estatísticas individuais (gols, assistências, notas) falam de cada jogador. As coletivas (média de gols por jogo, empates, diferença de placar) falam do baba: se os times saem equilibrados, se os jogos são movimentados. Placares muito desiguais com frequência são sinal de times mal sorteados.</p>
              </div>
              <div>
                <h3 className="font-black mb-1">Cinco cuidados</h3>
                <ol className="list-decimal pl-5 space-y-1.5 opacity-75">
                  <li><strong>Amostra pequena:</strong> com poucas partidas, qualquer média é instável. Espere acumular jogos antes de tirar conclusões.</li>
                  <li><strong>Posição:</strong> goleiros e zagueiros marcam pouco; compare jogadores de funções parecidas.</li>
                  <li><strong>Contexto:</strong> vitórias dependem do time inteiro e do sorteio, e não só do jogador.</li>
                  <li><strong>Subjetividade:</strong> notas são opinião. Trate-as como retrato do que o grupo pensa.</li>
                  <li><strong>Presença:</strong> quem joga mais acumula mais. Prefira taxas por partida quando comparar jogadores com participações diferentes.</li>
                </ol>
              </div>
              <p className="text-xs opacity-60">
                Para registrar partidas reais, montar ranking e acompanhar o histórico do seu grupo, conheça o <Link to="/login" className="text-cyan-electric underline">Draft Play</Link>.
                Para organizar torneios, veja as <Link to="/ferramentas" className="text-cyan-electric underline">ferramentas gratuitas</Link> e os <Link to="/modelos-de-torneio" className="text-cyan-electric underline">modelos de torneio</Link>.
              </p>
            </Card>
          </Section>
        </div>

        <PublicPagesFooter current="estatisticas" className="pb-6" />
      </div>
    </div>
  );
}
