// src/hooks/usePlan.js
// Fase 2 — Fonte única de verdade sobre o plano do usuário (Modo Visitante,
// Free ou Assinante), agora lendo as colunas reais `plan` e `trial_ends_at`
// da tabela `profiles` (migration fase2_plan_gating_columns).
//
// Regra do mês grátis: mesmo com plan='free' no banco, quem ainda está
// dentro do trial_ends_at é tratado como assinante nesta sessão (sem
// anúncio, sem limite de baba) — o valor de `plan` só muda pra 'assinante'
// de verdade quando o pagamento é confirmado.

import { useAuth } from '../contexts/AuthContext';

export function usePlan() {
  const { user, profile } = useAuth();

  const isAnonimo = !user;

  const trialAtivo = !isAnonimo
    && !!profile?.trial_ends_at
    && new Date(profile.trial_ends_at) > new Date();

  const planBase = isAnonimo ? 'visitante' : (profile?.plan ?? 'free');
  const isAssinante = planBase === 'assinante' || trialAtivo;

  return {
    plan: isAssinante && planBase !== 'assinante' ? 'trial' : planBase, // 'visitante' | 'free' | 'trial' | 'assinante'
    isAnonimo,
    isAssinante,
    trialAtivo,
    trialEndsAt: profile?.trial_ends_at ?? null,
    // Regra de negócio central (ver plano de monetização): anúncio nunca
    // aparece pro assinante (nem pro trial) — só pra Free e Modo Visitante.
    showAds: !isAssinante,
  };
}
