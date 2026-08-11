// src/hooks/usePlan.js
// Fase 1.2 — Fonte única de verdade sobre o plano do usuário (Modo Visitante,
// Free ou Assinante). Hoje a coluna `plan` ainda não existe em `profiles`
// (isso é implementado na Fase 2 — gating de funcionalidades); até lá este
// hook trata qualquer usuário logado como 'free' por padrão, o que já é
// suficiente pra decidir quando mostrar anúncio (Fases 1 e 4).
//
// Quando a Fase 2 adicionar a coluna `plan` (e `trial_ends_at`) em `profiles`,
// só o retorno de `profile?.plan` abaixo precisa mudar — nenhum componente
// que consome este hook precisa ser tocado.

import { useAuth } from '../contexts/AuthContext';

const ASSINANTE_PLANS = ['pro', 'assinante', 'enterprise'];

export function usePlan() {
  const { user, profile } = useAuth();

  const isAnonimo = !user;
  const plan = isAnonimo ? 'visitante' : (profile?.plan ?? 'free');
  const isAssinante = ASSINANTE_PLANS.includes(plan);

  return {
    plan,          // 'visitante' | 'free' | 'pro' | 'assinante' | 'enterprise'
    isAnonimo,
    isAssinante,
    // Regra de negócio central (ver plano de monetização): anúncio nunca
    // aparece pro assinante — só pra Free e Modo Visitante.
    showAds: !isAssinante,
  };
}
