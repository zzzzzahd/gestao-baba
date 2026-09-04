// src/pages/AboutPage.jsx
// Página institucional pública — reforça credibilidade do site pro crawler
// e pra qualquer visitante, sem depender de login.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Mail } from 'lucide-react';
import AdBanner from '../components/AdBanner';

const Section = ({ title, children }) => (
  <div className="space-y-2">
    <h2 className="text-sm font-black uppercase tracking-widest text-cyan-electric">{title}</h2>
    <div className="text-xs text-text-mid leading-relaxed space-y-2 font-bold">{children}</div>
  </div>
);

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white pb-16">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-md border-b border-border-subtle px-5 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-surface-2 border border-border-mid flex items-center justify-center"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <Info size={16} className="text-cyan-electric" />
          <h1 className="text-sm font-black uppercase tracking-widest">Sobre o Draft Play</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 py-6 space-y-6">

        <Section title="O que é o Draft Play">
          <p>
            O Draft Play é uma plataforma de gestão de peladas e babas de futebol.
            Organiza sorteio equilibrado de times, controle de presença, financeiro
            do grupo e ranking dos jogadores — tudo em um só lugar, no lugar do
            grupo de WhatsApp lotado de mensagem discutindo escalação.
          </p>
        </Section>

        <Section title="Pra quem é">
          <p>
            Pra qualquer grupo de futebol amador que se organiza com regularidade —
            do racha de fim de semana entre amigos ao baba fixo semanal com
            mensalidade e cobrança de quem falta.
          </p>
        </Section>

        <Section title="Modo Visitante">
          <p>
            Quem só quer sortear os times de uma pelada avulsa, sem criar conta nem
            vincular a um grupo fixo, pode usar o{' '}
            <a href="/visitor" className="text-cyan-electric underline">Modo Visitante</a>{' '}
            — sorteio de times equilibrados na hora, de graça, sem cadastro.
          </p>
        </Section>

        {/* ── Banner AdSense — página pública, com conteúdo editorial real ── */}
        <AdBanner slot={import.meta.env.VITE_ADSENSE_SLOT_ABOUT} className="my-2" />

        <Section title="Contato">
          <p className="flex items-center gap-2">
            <Mail size={14} className="text-cyan-electric shrink-0" />
            <a href="mailto:contato@draftplay.app" className="text-cyan-electric underline">
              contato@draftplay.app
            </a>
          </p>
        </Section>

      </div>
    </div>
  );
}
