// src/pages/DrawPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Wizard de sorteio. Rota: /draw
// Step 1 — Config | Step 2 — Times | Step 3 — Partida
// Estado persiste em localStorage via useDrawWizard.
// ─────────────────────────────────────────────────────────────────────────────

import React, { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useDrawWizard, clearDrawWizard } from '../hooks/useDrawWizard';
import { ArrowLeft, Settings2, Users, Play } from 'lucide-react';

const StepConfig = lazy(() => import('./draw/StepConfig'));
const StepTeams  = lazy(() => import('./draw/StepTeams'));
const StepMatch  = lazy(() => import('./draw/StepMatch'));

// ─── Stepper visual ───────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: 'Config',  icon: <Settings2 size={13} /> },
  { n: 2, label: 'Times',   icon: <Users     size={13} /> },
  { n: 3, label: 'Partida', icon: <Play      size={13} /> },
];

const Stepper = ({ current }) => (
  <div className="flex items-center gap-1">
    {STEPS.map((s, i) => {
      const done   = s.n < current;
      const active = s.n === current;
      return (
        <React.Fragment key={s.n}>
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            active ? 'bg-cyan-electric/10 border border-cyan-electric/30 text-cyan-electric'
                   : done ? 'text-text-mid' : 'text-text-muted'
          }`}>
            <span className={active ? 'text-cyan-electric' : done ? 'text-text-mid' : 'text-text-muted'}>
              {s.icon}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
            <span className="sm:hidden">{s.n}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-px ${done ? 'bg-cyan-electric/30' : 'bg-border-subtle'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Fallback de loading ──────────────────────────────────────────────────────

const StepLoader = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-3">
    <div className="w-10 h-10 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
    <p className="text-[10px] font-black uppercase tracking-widest text-text-low">Carregando...</p>
  </div>
);

// ─── DrawPage ─────────────────────────────────────────────────────────────────

const DrawPage = () => {
  const navigate        = useNavigate();
  const { currentBaba } = useBaba();

  const {
    step, drawConfig, drawResult, matchState,
    setStep, setDrawConfig, setDrawResult, setMatchState, reset,
  } = useDrawWizard(currentBaba?.id);

  const handleBack = () => {
    if (step === 1) navigate('/dashboard');
    else setStep(step - 1);
  };

  const handleReset = () => {
    clearDrawWizard();
    reset();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="max-w-xl mx-auto px-5 pt-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2.5 bg-surface-2 border border-border-subtle rounded-2xl text-text-low hover:text-white hover:bg-surface-3 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black uppercase italic tracking-tighter leading-none">
              {currentBaba?.name || 'Sorteio'}
            </h1>
            <p className="text-[9px] text-text-muted font-bold uppercase mt-0.5">
              Wizard de sorteio
            </p>
          </div>
        </div>

        {/* Stepper */}
        <Stepper current={step} />

        {/* Conteúdo do step ativo */}
        <Suspense fallback={<StepLoader />}>
          {step === 1 && (
            <StepConfig
              drawConfig={drawConfig}
              setDrawConfig={setDrawConfig}
              onNext={(result) => { setDrawResult(result); }}
            />
          )}
          {step === 2 && (
            <StepTeams
              drawResult={drawResult}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepMatch
              drawResult={drawResult}
              matchState={matchState}
              setMatchState={setMatchState}
              onBack={() => setStep(2)}
              onReset={handleReset}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default DrawPage;
