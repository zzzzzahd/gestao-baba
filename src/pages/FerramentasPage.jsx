// src/pages/FerramentasPage.jsx — hub das ferramentas públicas
import React from 'react';
import { Link } from 'react-router-dom';
import { Shuffle, Calculator, ListOrdered, Wallet, ClipboardCheck, ScrollText, PiggyBank, Trophy, Timer, ArrowRight } from 'lucide-react';
import Logo from '../components/Logo';
import PublicPagesFooter from '../components/PublicPagesFooter';
import { usePageMeta } from '../hooks/usePageMeta';
import { TOOLS, TOOLS_HUB } from '../content/toolsCatalog';
import { MODELOS_HUB } from '../content/modelosCatalog';

const ICONS = {
  'sorteador': Shuffle,
  'calculadora-torneio': Calculator,
  'tabela-de-jogos': ListOrdered,
  'divisao-de-despesas': Wallet,
  'lista-de-presenca': ClipboardCheck,
  'gerador-de-regulamento': ScrollText,
  'controle-financeiro': PiggyBank,
};

const FEATURED_SLUG = 'sorteador';

const FLOW = [
  { n: '1', title: 'Sorteie os times', desc: 'Cole a lista e monte times parelhos por nível e posição.' },
  { n: '2', title: 'Acompanhe a partida', desc: 'Cronômetro, placar e fila de times na mesma tela.' },
  { n: '3', title: 'Compartilhe', desc: 'Copie os times ou baixe a imagem para o grupo.' },
];

export default function FerramentasPage() {
  usePageMeta(TOOLS_HUB.title, TOOLS_HUB.description);
  const featured = TOOLS.find((t) => t.slug === FEATURED_SLUG);
  const others = TOOLS.filter((t) => t.slug !== FEATURED_SLUG);
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="max-w-3xl mx-auto px-5 py-6 space-y-8">
        <header className="flex items-center justify-between">
          <Link to="/"><Logo size="small" as="p" /></Link>
          <Link to="/login" className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-electric">Entrar</Link>
        </header>

        <main id="main-content" tabIndex={-1} className="space-y-8 outline-none">
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-black italic tracking-tight text-cyan-electric">Ferramentas gratuitas para organizar o baba</h1>
            <p className="text-sm opacity-70 leading-relaxed">
              Organizar futebol amador dá trabalho: fechar a lista, dividir a conta da quadra, montar times parelhos,
              planejar um torneio. Estas ferramentas resolvem cada uma dessas etapas, sem cadastro e sem enviar
              seus dados a lugar nenhum: tudo é calculado no seu navegador.
            </p>
          </div>

          {featured && (
            <section
              aria-labelledby="destaque"
              className="relative overflow-hidden rounded-3xl border border-cyan-electric/40 bg-gradient-to-br from-cyan-electric/10 via-black to-black p-5 md:p-7 shadow-[0_0_40px_rgba(0,229,255,0.12)]"
            >
              <span className="inline-block mb-3 rounded-full border border-cyan-electric/40 bg-cyan-electric/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-electric">
                Comece por aqui
              </span>
              <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Shuffle size={26} className="text-cyan-electric shrink-0" aria-hidden="true" />
                    <Timer size={26} className="text-cyan-electric shrink-0" aria-hidden="true" />
                    <h2 id="destaque" className="text-xl md:text-2xl font-black leading-tight">
                      Sorteador de times + placar da partida
                    </h2>
                  </div>
                  <p className="text-sm opacity-75 leading-relaxed">
                    Sorteie times equilibrados e comece o jogo na hora: o placar já abre com os times sorteados,
                    com cronômetro e fila. Sem cadastro, tudo no seu navegador.
                  </p>

                  <ol className="grid sm:grid-cols-3 gap-3">
                    {FLOW.map((s) => (
                      <li key={s.n} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-electric text-black text-xs font-black">{s.n}</span>
                        <p className="mt-2 text-sm font-black">{s.title}</p>
                        <p className="mt-1 text-[11px] opacity-65 leading-snug">{s.desc}</p>
                      </li>
                    ))}
                  </ol>

                  <Link
                    to={featured.path}
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-black uppercase tracking-widest text-black transition hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
                  >
                    Sortear times agora <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>

                <img
                  src="/marketing/placar-ao-vivo.webp"
                  srcSet="/marketing/placar-ao-vivo-202.webp 202w, /marketing/placar-ao-vivo.webp 360w"
                  sizes="(min-width: 768px) 180px, 140px"
                  width="360"
                  height="733"
                  alt="Tela do placar com cronômetro, placar dos dois times e fila de próximos times"
                  loading="lazy"
                  decoding="async"
                  className="hidden md:block w-[180px] h-auto rounded-2xl border border-white/10"
                />
              </div>
            </section>
          )}

          <section aria-labelledby="outras" className="space-y-4">
            <h2 id="outras" className="text-xs font-black uppercase tracking-[0.2em] opacity-60">Outras ferramentas</h2>
            <ul className="grid sm:grid-cols-2 gap-4">
              {others.map((t) => {
                const Icon = ICONS[t.slug] ?? Calculator;
                return (
                  <li key={t.slug}>
                    <Link to={t.path} className="block h-full card-glass p-5 rounded-2xl border border-border-mid hover:border-cyan-electric/40 transition-colors">
                      <Icon size={22} className="text-cyan-electric mb-3" aria-hidden="true" />
                      <h3 className="text-base font-black">{t.name}</h3>
                      <p className="text-xs opacity-65 mt-1.5 leading-relaxed">{t.short}</p>
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link to={MODELOS_HUB.path} className="block h-full card-glass p-5 rounded-2xl border border-border-mid hover:border-cyan-electric/40 transition-colors">
                  <Trophy size={22} className="text-cyan-electric mb-3" aria-hidden="true" />
                  <h3 className="text-base font-black">Modelos de torneio</h3>
                  <p className="text-xs opacity-65 mt-1.5 leading-relaxed">Regulamento, tabelas, classificação, calendário, artilharia e orçamento prontos para copiar, imprimir ou baixar.</p>
                </Link>
              </li>
            </ul>
          </section>

          <section aria-labelledby="ordem" className="card-glass p-5 rounded-2xl border border-border-mid space-y-3">
            <h2 id="ordem" className="text-base font-black">Por onde começar?</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm opacity-75 leading-relaxed">
              <li>Baba semanal: use a <strong>lista de presença</strong> para fechar quem joga, o <strong>sorteador</strong> para montar os times, a <strong>divisão de despesas</strong> para acertar a quadra e o <strong>controle financeiro</strong> para acompanhar o caixa do mês.</li>
              <li>Torneio interno: use a <strong>calculadora de torneio</strong> para saber quantos jogos e quanto tempo você precisa, o <strong>gerador de tabela</strong> para montar os confrontos e o <strong>gerador de regulamento</strong> para registrar as regras por escrito.</li>
            </ul>
            <p className="text-xs opacity-55 leading-relaxed">
              As ferramentas são independentes do aplicativo e não usam dados de nenhum baba cadastrado. Para guardar
              histórico, ranking, presença e caixa do seu grupo, conheça o <Link to="/login" className="text-cyan-electric underline">Draft Play</Link>.
            </p>
          </section>
        </main>

        <PublicPagesFooter current="ferramentas" className="pb-6" />
      </div>
    </div>
  );
}
