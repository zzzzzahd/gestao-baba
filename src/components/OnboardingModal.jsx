// src/components/OnboardingModal.jsx
// Sprint 6 — Onboarding revisado: mais curto, direto, com CTA por modo.
// 3 steps máximo. Foca no que o usuário vai fazer AGORA.

import React, { useState } from 'react';
import { Users, Shuffle, CheckCircle2, X, ChevronRight } from 'lucide-react';

const STEPS = [
  {
    icon:        <span className="text-5xl">⚽</span>,
    title:       'Bem-vindo ao Draft Play',
    subtitle:    'Baba organizado em segundos',
    description: 'Confirme presença, sorteie times equilibrados e acompanhe o placar — tudo no celular.',
    cta:         'Próximo',
  },
  {
    icon:        <Shuffle size={40} className="text-cyan-electric" />,
    title:       'Times equilibrados',
    subtitle:    'Sem briga na hora do sorteio',
    description: 'O app usa a avaliação dos jogadores para montar times justos automaticamente.',
    cta:         'Próximo',
  },
  {
    icon:        <CheckCircle2 size={40} className="text-green-400" />,
    title:       'Confirme sua presença',
    subtitle:    'Simples assim',
    description: 'Abra o app, toque em confirmar e pronto. Você está dentro do baba.',
    cta:         'Entrar no Baba',
  },
];

const ONBOARDING_KEY = 'draft_play_onboarding_done_v2';

export const shouldShowOnboarding = () => {
  try { return !localStorage.getItem(ONBOARDING_KEY); }
  catch { return false; }
};

export const markOnboardingDone = () => {
  try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
};

const OnboardingModal = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) { markOnboardingDone(); onClose(); }
    else setStep(s => s + 1);
  };

  const handleSkip = () => { markOnboardingDone(); onClose(); };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="w-full max-w-sm bg-[#0a0a0a] border border-border-mid rounded-[2.5rem] overflow-hidden shadow-2xl animate-slide-up">

        {/* Barra de progresso */}
        <div className="flex gap-1.5 p-5 pb-0">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full transition-all duration-500"
              style={{
                background: i <= step
                  ? 'linear-gradient(90deg, #00f2ff, #0066ff)'
                  : 'rgba(255,255,255,0.08)',
              }}
            />
          ))}
        </div>

        {/* Fechar */}
        <div className="flex justify-end px-5 pt-3">
          <button onClick={handleSkip} className="p-2 text-text-muted hover:text-text-mid transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="px-8 pb-8 space-y-5 text-center">
          <div className="w-20 h-20 rounded-[1.75rem] bg-surface-2 border border-border-mid flex items-center justify-center mx-auto">
            {current.icon}
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-cyan-electric/60 uppercase tracking-[0.2em]">
              {current.subtitle}
            </p>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white leading-tight">
              {current.title}
            </h2>
            <p className="text-[13px] text-text-low font-medium leading-relaxed">
              {current.description}
            </p>
          </div>

          <button
            onClick={handleNext}
            className="w-full py-5 rounded-2xl font-black uppercase italic tracking-tighter text-black flex items-center justify-center gap-2 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
          >
            {current.cta}
            {!isLast && <ChevronRight size={18} />}
          </button>

          {!isLast && (
            <button onClick={handleSkip} className="text-[10px] text-text-muted font-black uppercase tracking-widest hover:text-text-low transition-colors">
              Pular
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
