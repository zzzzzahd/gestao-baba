import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { LogIn, Zap, Users, Shuffle, Radio, Star } from 'lucide-react';

// Passos do fluxo mostrados na landing: criar baba → sorteio → placar ao vivo.
// Os "mockups" abaixo são miniaturas ilustrativas feitas em CSS (não screenshots reais)
// para não depender de imagens externas — se quiser, é só trocar <StepMockup> por
// um <img src="/screenshots/xxx.png" /> apontando pra prints reais do app.
const steps = [
  {
    key: 'criar',
    label: 'Criar baba',
    icon: Users,
    title: 'Crie ou entre em um baba',
    desc: 'Cadastre seu grupo, ou entre em um já existente com o link/código de convite do coordenador.',
  },
  {
    key: 'sorteio',
    label: 'Sorteio',
    icon: Shuffle,
    title: 'Sorteio automático e balanceado',
    desc: 'O app monta os times com base na avaliação dos jogadores, sem discussão pra escalar.',
  },
  {
    key: 'placar',
    label: 'Placar ao vivo',
    icon: Radio,
    title: 'Acompanhe o placar em tempo real',
    desc: 'Todo mundo vê o resultado, o tempo de jogo e quem está na fila pra próxima partida.',
  },
];

const StepMockup = ({ step }) => {
  if (step.key === 'criar') {
    return (
      <div className="space-y-3">
        <div className="h-3 w-2/3 rounded-full bg-white/10" />
        <div className="h-9 rounded-xl bg-surface-3 border border-border-mid" />
        <div className="h-9 rounded-xl bg-surface-3 border border-border-mid" />
        <div className="h-9 rounded-xl bg-gradient-to-r from-cyan-electric to-blue-500 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-black">
          Entrar / Criar baba
        </div>
      </div>
    );
  }
  if (step.key === 'sorteio') {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((col) => (
          <div key={col} className="space-y-2">
            <div className={`h-2 w-1/2 rounded-full ${col === 0 ? 'bg-cyan-electric/60' : 'bg-white/20'}`} />
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-6 rounded-lg bg-surface-3 border border-border-mid flex items-center px-2 gap-2">
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="h-1.5 w-10 rounded-full bg-white/10" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-2">
        <div className="h-2 w-12 rounded-full bg-white/20" />
        <span className="text-2xl font-black text-cyan-electric">2 x 1</span>
        <div className="h-2 w-12 rounded-full bg-white/20" />
      </div>
      <div className="h-1 w-full rounded-full bg-surface-3 overflow-hidden">
        <div className="h-full w-2/3 bg-cyan-electric animate-pulse" />
      </div>
      <div className="flex items-center gap-2 justify-center text-[10px] font-bold text-red-400 uppercase tracking-widest">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> Ao vivo · 12'
      </div>
    </div>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const step = steps[activeStep];

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <div className="max-w-md mx-auto space-y-10 py-6">

        {/* Logo */}
        <div className="flex justify-center animate-fade-in">
          <Logo size="large" />
        </div>

        {/* Título com contexto do produto, pra quem cai direto no link */}
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="text-3xl font-black uppercase italic tracking-tighter bg-gradient-to-r from-white via-cyan-electric to-white bg-clip-text text-transparent">
            Organize o baba sem zap lotado
          </h1>
          <p className="text-xs font-medium opacity-50 px-4 leading-relaxed">
            Sorteio automático de times, presença confirmada e placar ao vivo — pra quem organiza e pra quem joga.
          </p>
        </div>

        {/* CTAs — texto neutro: serve tanto pra quem cria/coordena um baba quanto pra quem só entra como jogador */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/login')}
            className="w-full py-5 rounded-2xl font-black text-black shadow-[0_10px_30px_rgba(0,242,255,0.25)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 uppercase text-sm tracking-widest"
            style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
          >
            <LogIn size={20} />
            Começar agora
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border-mid" />
            </div>
            <div className="relative flex justify-center text-[9px] uppercase font-black tracking-[0.3em]">
              <span className="bg-black px-4 text-text-muted">ou</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/visitor')}
            className="w-full py-4 rounded-2xl font-black bg-surface-2 border border-border-mid text-text-mid hover:text-white hover:bg-surface-3 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
          >
            <Zap size={18} />
            Modo Visitante (Sem Conta)
          </button>
        </div>

        {/* Showcase do fluxo: criar baba → sorteio → placar ao vivo */}
        <div className="card-glass p-5 border border-cyan-electric/30 rounded-[2rem] relative overflow-hidden animate-slide-up">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-cyan-electric/10 blur-[80px] rounded-full" />
          <div className="relative z-10 space-y-4">

            <div className="flex gap-2 justify-center flex-wrap">
              {steps.map((s, i) => {
                const Icon = s.icon;
                const active = i === activeStep;
                return (
                  <button
                    key={s.key}
                    onClick={() => setActiveStep(i)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-all ${
                      active
                        ? 'bg-cyan-electric text-black'
                        : 'bg-surface-2 text-text-muted border border-border-mid'
                    }`}
                  >
                    <Icon size={12} />
                    {s.label}
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl bg-surface-2 border border-border-mid p-4 min-h-[140px] flex flex-col justify-center">
              <StepMockup step={step} />
            </div>

            <div className="text-center px-2">
              <p className="text-sm font-bold">{step.title}</p>
              <p className="text-[11px] opacity-50 mt-1 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        </div>

        {/* Depoimento social — troque pelo relato real de um coordenador ou jogador que já usa o app */}
        <div className="card-glass p-5 border border-border-mid rounded-[1.5rem] space-y-3 animate-fade-in">
          <div className="flex gap-0.5 text-cyan-electric">
            {[...Array(5)].map((_, i) => <Star key={i} size={13} fill="currentColor" />)}
          </div>
          <p className="text-xs leading-relaxed opacity-80 italic">
            "Antes era zap lotado de mensagem discutindo time. Hoje o app sorteia e todo mundo já sabe pra que lado vai."
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">
            Coordenador de baba{/* TODO: trocar por nome real com autorização da pessoa */}
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-[9px] font-bold opacity-20 uppercase tracking-[0.4em]">
          Powered by Draft Baba v3.0
        </p>
      </div>
    </div>
  );
};

export default LandingPage;