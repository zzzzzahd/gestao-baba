// src/pages/ModelosTorneioPage.jsx — hub da biblioteca de modelos de torneio
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import PublicPagesFooter from '../components/PublicPagesFooter';
import { usePageMeta } from '../hooks/usePageMeta';
import { MODELOS, MODELOS_HUB, MODELO_CATEGORIAS, modeloPath } from '../content/modelosCatalog';

export default function ModelosTorneioPage() {
  usePageMeta(MODELOS_HUB.title, MODELOS_HUB.description);
  const [cat, setCat] = useState('Todos');
  const list = cat === 'Todos' ? MODELOS : MODELOS.filter((m) => m.categoria === cat);
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="max-w-3xl mx-auto px-5 py-6 space-y-8">
        <header className="flex items-center justify-between">
          <Link to="/"><Logo size="small" as="p" /></Link>
          <Link to="/ferramentas" className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-electric">Ferramentas</Link>
        </header>

        <div className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-black italic tracking-tight text-cyan-electric">Modelos para organizar torneio de futebol amador</h1>
            <p className="text-sm opacity-70 leading-relaxed">
              Regulamento, tabelas de jogos, classificação, calendário, súmulas, artilharia e orçamento: materiais
              prontos para copiar, imprimir ou baixar. Em vários deles você informa as suas equipes e os modelos já
              saem preenchidos. Tudo é gerado no navegador, sem cadastro.
            </p>
          </div>

          <div role="group" aria-label="Filtrar por categoria" className="flex flex-wrap gap-2">
            {['Todos', ...MODELO_CATEGORIAS].map((c) => (
              <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}
                className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider border ${cat === c ? 'bg-cyan-electric text-black border-cyan-electric' : 'bg-white/5 text-white/60 border-white/10'}`}>
                {c}
              </button>
            ))}
          </div>

          <ul className="grid sm:grid-cols-2 gap-4">
            {list.map((m) => (
              <li key={m.slug}>
                <Link to={modeloPath(m.slug)} className="block h-full card-glass p-5 rounded-2xl border border-border-mid hover:border-cyan-electric/40 transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-electric/80">{m.categoria}</span>
                  <h2 className="text-base font-black mt-1">{m.name}</h2>
                  <p className="text-xs opacity-65 mt-1.5 leading-relaxed">{m.short}</p>
                </Link>
              </li>
            ))}
          </ul>

          <section aria-labelledby="como-usar-lib" className="card-glass p-5 rounded-2xl border border-border-mid space-y-3">
            <h2 id="como-usar-lib" className="text-base font-black">Como aproveitar a biblioteca</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm opacity-75 leading-relaxed">
              <li>Comece pelo <Link to={modeloPath('regulamento-torneio-interno')} className="text-cyan-electric underline">regulamento</Link> e pelos <Link to={modeloPath('criterios-de-desempate')} className="text-cyan-electric underline">critérios de desempate</Link>: combinar as regras antes evita conflito depois.</li>
              <li>Monte a <Link to={modeloPath('tabela-mata-mata')} className="text-cyan-electric underline">tabela</Link> ou os <Link to={modeloPath('grupos-e-classificacao')} className="text-cyan-electric underline">grupos</Link> e transforme em <Link to={modeloPath('calendario-de-partidas')} className="text-cyan-electric underline">calendário com horários</Link>.</li>
              <li>Durante o torneio, use a <Link to={modeloPath('pontos-corridos')} className="text-cyan-electric underline">classificação automática</Link>, o controle de <Link to={modeloPath('artilharia')} className="text-cyan-electric underline">artilharia</Link> e as súmulas.</li>
              <li>Antes de abrir as inscrições, faça o <Link to={modeloPath('orcamento-do-torneio')} className="text-cyan-electric underline">orçamento</Link>. Para números rápidos, veja as <Link to="/ferramentas" className="text-cyan-electric underline">ferramentas gratuitas</Link>.</li>
            </ul>
            <p className="text-xs opacity-55 leading-relaxed">Os modelos são pontos de partida: revise e adapte ao seu torneio. Para guardar histórico, ranking e financeiro do seu baba, conheça o <Link to="/login" className="text-cyan-electric underline">Draft Play</Link>.</p>
          </section>
        </div>

        <PublicPagesFooter current="modelos" className="pb-6" />
      </div>
    </div>
  );
}
