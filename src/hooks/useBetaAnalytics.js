// src/hooks/useBetaAnalytics.js
// Sprint 9 — Analytics do beta fechado.
// Rastreia funis de retenção: cadastro → primeiro baba → primeiro jogo → retorno.

import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

// Funil de ativação
const FUNNEL_STEPS = {
  SIGNED_UP:            'signed_up',
  FIRST_BABA_CREATED:   'first_baba_created',
  FIRST_PRESENCE:       'first_presence_confirmed',
  FIRST_MATCH:          'first_match_played',
  RETURNED_DAY_3:       'returned_day_3',
  RETURNED_DAY_7:       'returned_day_7',
};

const BETA_KEY = 'draft_play_beta_funnel';

const loadFunnel = () => {
  try { return JSON.parse(localStorage.getItem(BETA_KEY) || '{}'); }
  catch { return {}; }
};

const saveFunnel = (data) => {
  try { localStorage.setItem(BETA_KEY, JSON.stringify(data)); } catch {}
};

export function useBetaAnalytics() {
  const { user, profile } = useAuth();

  // Registrar step do funil no Supabase (tabela beta_events se existir, senão só local)
  const trackFunnelStep = useCallback(async (step, metadata = {}) => {
    const funnel = loadFunnel();
    if (funnel[step]) return; // já registrado

    funnel[step] = new Date().toISOString();
    saveFunnel(funnel);

    // Tentar salvar no banco (ignora erro se tabela não existir)
    try {
      await supabase.from('beta_events').insert({
        user_id:    user?.id ?? null,
        event:      step,
        metadata,
        created_at: new Date().toISOString(),
      });
    } catch {}

    console.debug('[BetaAnalytics] funnel step:', step, metadata);
  }, [user?.id]);

  // Verificar retorno (D+3, D+7)
  useEffect(() => {
    if (!user) return;
    const funnel = loadFunnel();
    const signedUp = funnel[FUNNEL_STEPS.SIGNED_UP]
      ? new Date(funnel[FUNNEL_STEPS.SIGNED_UP])
      : null;

    if (!signedUp) {
      trackFunnelStep(FUNNEL_STEPS.SIGNED_UP);
      return;
    }

    const daysSince = (Date.now() - signedUp.getTime()) / 86400000;

    if (daysSince >= 3 && !funnel[FUNNEL_STEPS.RETURNED_DAY_3]) {
      trackFunnelStep(FUNNEL_STEPS.RETURNED_DAY_3, { days: Math.floor(daysSince) });
    }
    if (daysSince >= 7 && !funnel[FUNNEL_STEPS.RETURNED_DAY_7]) {
      trackFunnelStep(FUNNEL_STEPS.RETURNED_DAY_7, { days: Math.floor(daysSince) });
    }
  }, [user?.id]);

  return {
    trackFunnelStep,
    FUNNEL_STEPS,
    getFunnelData: loadFunnel,
  };
}

// ── Componente de debug (só em dev) ──────────────────────────────────────────
export function BetaFunnelDebug() {
  if (import.meta.env.PROD) return null;
  const funnel = loadFunnel();
  const steps  = Object.values(FUNNEL_STEPS);
  const done   = steps.filter(s => funnel[s]).length;

  return (
    <div className="fixed top-4 left-4 z-[999] bg-black/90 border border-cyan-electric/30 rounded-xl p-3 text-[9px] font-mono">
      <p className="text-cyan-electric font-black mb-1">BETA FUNNEL {done}/{steps.length}</p>
      {steps.map(s => (
        <p key={s} className={funnel[s] ? 'text-green-400' : 'text-text-muted'}>
          {funnel[s] ? '✓' : '○'} {s}
        </p>
      ))}
    </div>
  );
}
