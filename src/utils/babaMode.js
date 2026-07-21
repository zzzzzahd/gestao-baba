// src/utils/babaMode.js
// Sprint 1 — Feature flags por modo do baba.
// Nenhuma funcionalidade é removida — apenas ocultada conforme o modo.

import { useBaba } from '../contexts/BabaContext';

// Feature flags por modo
export const FEATURES = {
  casual: {
    presence:    true,
    draw:        true,
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

// Hook para usar em qualquer componente
export const useFeatures = () => {
  const { currentBaba } = useBaba();
  const mode = currentBaba?.mode ?? 'casual';
  return FEATURES[mode] ?? FEATURES.casual;
};

// Helper para verificar feature específica
export const hasFeature = (baba, feature) => {
  const mode = baba?.mode ?? 'casual';
  const flags = FEATURES[mode] ?? FEATURES.casual;
  return !!flags[feature];
};
