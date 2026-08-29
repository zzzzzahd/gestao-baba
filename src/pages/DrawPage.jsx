// src/pages/DrawPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Wizard de sorteio. Rota: /draw
// Step 1 — Config | Step 2 — Times | Step 3 — Partida
// Estado persiste em localStorage via useDrawWizard.
// ─────────────────────────────────────────────────────────────────────────────

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useDrawWizard, clearDrawWizard } from '../hooks/useDrawWizard';
import { supabase } from '../services/supabase';
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
          <div
            data-testid={`step-nav-${s.n}`}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
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
  const [searchParams]  = useSearchParams();
  const forceResume     = searchParams.get('resume') === '1';
  const { currentBaba } = useBaba();

  const {
    step, drawConfig, drawResult, matchState,
    setStep, setDrawConfig, setDrawResult, setMatchState, reset,
  } = useDrawWizard(currentBaba?.id);

  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Enquanto o baba do dia estiver com sessão ATIVA (ninguém finalizou ainda),
  // pula direto pra Partida — vale tanto pro sorteio automático quanto pro
  // manual. Isso é o que trava um novo sorteio simultâneo: só dá pra reconfigurar
  // de novo depois que o presidente/coordenador encerrar o baba do dia.
  //
  // forceResume (?resume=1, usado pelo card "Partidas em andamento" do
  // Dashboard) ignora qualquer step/drawResult travado no localStorage de uma
  // sessão anterior (ex: preso na tela de Times) e busca o estado real do
  // banco — sem isso, clicar no card podia cair numa etapa antiga em vez de
  // ir direto pra partida ao vivo.
  useEffect(() => {
    if (!currentBaba?.id) return;

    let cancelled = false;

    const loadActiveSession = async () => {
        setCheckingSession(true);
        setSessionChecked(false);

        try {
          const {
    data: { session },
    error: sessionError
} = await supabase.auth.getSession();

if (sessionError) throw sessionError;

console.log('[DrawPage] USUÁRIO AUTENTICADO:', {
    userId: session?.user?.id,
    email: session?.user?.email,
});
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('draw_results')
                .select('*')
                .eq('baba_id', currentBaba.id)
                .eq('draw_date', today)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            if (cancelled) return;

            if (data?.teams?.length >= 2) {


                setDrawResult({
                    teams: data.teams,
                    reserves: data.reserves || [],
                    goalkeeperQueue: data.goalkeeper_queue || [],
                    drawResultId: data.id
                });

                setMatchState(null);
                setStep(3);
            } else if (forceResume) {
                setStep(1);
            }

            setSessionChecked(true);

        } catch (err) {
            if (!cancelled) {
                console.error(
                    '[DrawPage] erro ao buscar sessão ativa:',
                    err
                );

                setSessionChecked(true);
            }
        } finally {
            if (!cancelled) {
                setCheckingSession(false);
            }
        }
    };

    loadActiveSession();

    return () => {
        cancelled = true;
    };
}, [currentBaba?.id, forceResume]);

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
        {!sessionChecked || checkingSession ? (
    <StepLoader />
) : step === 1 && currentBaba?.auto_draw_enabled && !showManualOverride ? (
            <div className="text-center py-16 rounded-3xl bg-surface-1 border border-dashed border-border-mid space-y-3 px-6">
              <Settings2 size={28} className={`text-cyan-electric mx-auto ${checkingSession ? 'animate-spin' : ''}`} />
              <p className="text-[11px] font-black uppercase tracking-widest text-white">
                Sorteio automático ligado
              </p>
              <p className="text-[10px] text-text-low font-bold leading-relaxed">
                {currentBaba.auto_draw_time
                  ? `O sorteio roda sozinho às ${String(currentBaba.auto_draw_time).substring(0, 5)}. Volte aqui depois desse horário.`
                  : 'O sorteio roda sozinho no horário configurado. Volte aqui depois desse horário.'}
              </p>
              <button
                onClick={() => setShowManualOverride(true)}
                className="text-[9px] font-black uppercase text-text-muted underline underline-offset-2 hover:text-text-low"
              >
                Sortear manualmente agora mesmo
              </button>
            </div>
          ) : step === 1 && (
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
              onUpdateDrawResult={(partial) => setDrawResult({ ...drawResult, ...partial })}
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
