// src/components/OnboardingModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modal de boas-vindas para novos usuários. Fase 4, Tarefa 4.1.
// Exibido uma única vez após o primeiro cadastro, usando localStorage
// como flag para não repetir.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Users, Trophy, Shuffle, ChevronRight, X } from 'lucide-react';

const STEPS = [
  {
    icon: <Users size={36} className="text-cyan-electric" />,
    title: 'Bem-vindo ao Draft Play',
    subtitle: 'Seu baba nunca mais vai ser o mesmo',
    description:
      'Gerencie seu grupo de futebol com sorteio automático de times, ranking de artilheiros, histórico de partidas e muito mais.',
    cta: 'Próximo',
  },
  {
    icon: <Shuffle size={36} className="text-cyan-electric" />,
    title: 'Crie ou entre em um baba',
    subtitle: 'Dois caminhos para começar',
    description:
      'Crie seu próprio grupo como presidente e convide seus amigos com um código de 6 dígitos. Ou entre em um grupo existente usando o código que alguém compartilhou.',
    cta: 'Próximo',
  },
  {
    icon: <Trophy size={36} className="text-cyan-electric" />,
    title: 'Confirme presença e jogue',
    subtitle: 'O sorteio é automático',
    description:
      'Antes de cada baba, confirme sua presença. 30 minutos antes do horário, os times são sorteados automaticamente com base na avaliação técnica dos jogadores.',
    cta: 'Começar agora',
  },
];

const ONBOARDING_KEY = 'draft_play_onboarding_done';

export const shouldShowOnboarding = () => {
  try {
    return !localStorage.getItem(ONBOARDING_KEY);
  } catch {
    return false;
  }
};

export const markOnboardingDone = () => {
  try {
    localStorage.setItem(ONBOARDING_KEY, '1');
  } catch {}
};

// ─── Componente ───────────────────────────────────────────────────────────────

const OnboardingModal = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      markOnboardingDone();
      onClose();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSkip = () => {
    markOnboardingDone();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-slide-up">

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

        {/* Botão fechar */}
        <div className="flex justify-end px-5 pt-3">
          <button
            onClick={handleSkip}
            className="p-2 text-white/20 hover:text-white/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="px-8 pb-8 space-y-6 text-center">

          {/* Ícone */}
          <div className="w-20 h-20 rounded-[1.75rem] bg-cyan-electric/10 border border-cyan-electric/20 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(0,242,255,0.1)]">
            {current.icon}
          </div>

          {/* Textos */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-cyan-electric/60 uppercase tracking-[0.2em]">
              {current.subtitle}
            </p>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white leading-tight">
              {current.title}
            </h2>
            <p className="text-[13px] text-white/40 font-medium leading-relaxed">
              {current.description}
            </p>
          </div>

          {/* Botão principal */}
          <button
            onClick={handleNext}
            className="w-full py-5 rounded-2xl font-black uppercase italic tracking-tighter text-black flex items-center justify-center gap-2 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
          >
            {current.cta}
            {!isLast && <ChevronRight size={18} />}
          </button>

          {/* Pular */}
          {!isLast && (
            <button
              onClick={handleSkip}
              className="text-[10px] text-white/20 font-black uppercase tracking-widest hover:text-white/40 transition-colors"
            >
              Pular introdução
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
