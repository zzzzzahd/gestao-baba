// src/pages/FerramentasPage.jsx — hub das ferramentas públicas
import React from 'react';
import { Link } from 'react-router-dom';
import { Shuffle, Calculator, ListOrdered, Wallet, ClipboardCheck, ScrollText, PiggyBank, Trophy } from 'lucide-react';
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

export default function FerramentasPage() {
  usePageMeta(TOOLS_HUB.title, TOOLS_HUB.description);
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

          <ul className="grid sm:grid-cols-2 gap-4">
            {TOOLS.map((t) => {
              const Icon = ICONS[t.slug] ?? Calculator;
              return (
                <li key={t.slug}>
                  <Link to={t.path} className="block h-full card-glass p-5 rounded-2xl border border-border-mid hover:border-cyan-electric/40 transition-colors">
                    <Icon size={22} className="text-cyan-electric mb-3" aria-hidden="true" />
                    <h2 className="text-base font-black">{t.name}</h2>
                    <p className="text-xs opacity-65 mt-1.5 leading-relaxed">{t.short}</p>
                  </Link>
                </li>
              );
            })}
            <li>
              <Link to={MODELOS_HUB.path} className="block h-full card-glass p-5 rounded-2xl border border-border-mid hover:border-cyan-electric/40 transition-colors">
                <Trophy size={22} className="text-cyan-electric mb-3" aria-hidden="true" />
                <h2 className="text-base font-black">Modelos de torneio</h2>
                <p className="text-xs opacity-65 mt-1.5 leading-relaxed">Regulamento, tabelas, classificação, calendário, artilharia e orçamento prontos para copiar, imprimir ou baixar.</p>
              </Link>
            </li>
          </ul>

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
