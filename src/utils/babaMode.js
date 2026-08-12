// src/utils/babaMode.js
// Sprint 1 — Feature flags por modo do baba.
// Nenhuma funcionalidade é removida — apenas ocultada conforme o modo.
//
// Fase 2 — Além do modo do baba (configurado pelo presidente, que é sempre
// assinante), agora também existe um teto por PLANO DO USUÁRIO: uma conta
// Free vê sempre o "modo básico" dela mesma, independente de como o
// presidente configurou o baba (ver plano de monetização, Fase 2).
// financial fica true no básico porque "cobranças" é liberado pro Free —
// só a parte avançada (IA, torneios, relatórios, temporadas etc.) é paga.

import { useBaba } from '../contexts/BabaContext';
import { usePlan } from '../hooks/usePlan';

// Feature flags por modo
export const FEATURES = {
  casual: {
    presence:    true,
    draw:        true,
    drawConstraints: true,
    scoreboard:  true,
    rankings:    'basic',   // só top 5, sem filtros
    history:     true,      // último jogo apenas
    financial:   false,
    ai:          false,
    tournaments: false,
    reports:     false,
    settings:    'simple',
    badges:      false,
    streaks:     false,
    comparisons: false,
    mvp:         true,      // MVP sempre — é emocional
    seasons:     false,
    reactions:   false,
  },
  competitive: {
    presence:    true,
    draw:        true,
    drawConstraints: true,
    scoreboard:  true,
    rankings:    'full',
    history:     true,
    financial:   false,
    ai:          false,
    tournaments: true,
    reports:     false,
    settings:    'simple',
    badges:      true,
    streaks:     true,
    comparisons: true,
    mvp:         true,
    seasons:     true,
    reactions:   true,
  },
  full: {
    presence:    true,
    draw:        true,
    drawConstraints: true,
    scoreboard:  true,
    rankings:    'full',
    history:     true,
    financial:   true,
    ai:          true,
    tournaments: true,
    reports:     true,
    settings:    'advanced',
    badges:      true,
    streaks:     true,
    comparisons: true,
    mvp:         true,
    seasons:     true,
    reactions:   true,
  },
};

// Teto de plano — conta Free (sem trial ativo) vê só isto, não importa o
// modo do baba: presença, times/sorteio, placar e cobranças (ver Fase 2 do
// plano de monetização). Tudo que é avançado fica reservado ao Assinante.
const FREE_PLAN_CAP = {
  presence:    true,
  draw:        true,
  drawConstraints: false,
  scoreboard:  true,
  rankings:    'basic',
  history:     true,
  financial:   true,   // "cobranças" — combinado que fica liberado no Free
  ai:          false,
  tournaments: false,
  reports:     false,
  settings:    'simple',
  badges:      false,
  streaks:     false,
  comparisons: false,
  mvp:         true,
  seasons:     false,
  reactions:   false,
};

// Hook para usar em qualquer componente
export const useFeatures = () => {
  const { currentBaba } = useBaba();
  const { isAssinante }  = usePlan();
  const mode = currentBaba?.mode ?? 'casual';
  const modeFeatures = FEATURES[mode] ?? FEATURES.casual;

  // Assinante (inclui presidente, que só chega a criar baba sendo assinante)
  // vê o modo do baba normalmente. Free fica travado no teto do plano.
  return isAssinante ? modeFeatures : FREE_PLAN_CAP;
};

// Helper para verificar feature específica
export const hasFeature = (baba, feature) => {
  const mode = baba?.mode ?? 'casual';
  const flags = FEATURES[mode] ?? FEATURES.casual;
  return !!flags[feature];
};
