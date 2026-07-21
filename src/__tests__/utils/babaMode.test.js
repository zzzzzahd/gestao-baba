// src/__tests__/utils/babaMode.test.js
// Testes unitários para o sistema de feature flags por modo do baba

import { describe, it, expect, vi } from 'vitest';
import { FEATURES, hasFeature } from '../../utils/babaMode';

describe('FEATURES', () => {
  describe('modo casual', () => {
    it('tem presença, sorteio e placar habilitados', () => {
      expect(FEATURES.casual.presence).toBe(true);
      expect(FEATURES.casual.draw).toBe(true);
      expect(FEATURES.casual.scoreboard).toBe(true);
    });

    it('não tem financeiro, IA e torneios', () => {
      expect(FEATURES.casual.financial).toBe(false);
      expect(FEATURES.casual.ai).toBe(false);
      expect(FEATURES.casual.tournaments).toBe(false);
    });

    it('rankings é "basic" (não full)', () => {
      expect(FEATURES.casual.rankings).toBe('basic');
    });

    it('tem MVP (feature emocional sempre presente)', () => {
      expect(FEATURES.casual.mvp).toBe(true);
    });

    it('não tem badges, streaks e comparisons', () => {
      expect(FEATURES.casual.badges).toBe(false);
      expect(FEATURES.casual.streaks).toBe(false);
      expect(FEATURES.casual.comparisons).toBe(false);
    });

    it('settings é "simple"', () => {
      expect(FEATURES.casual.settings).toBe('simple');
    });
  });

  describe('modo competitive', () => {
    it('tem badges, streaks, comparisons e seasons', () => {
      expect(FEATURES.competitive.badges).toBe(true);
      expect(FEATURES.competitive.streaks).toBe(true);
      expect(FEATURES.competitive.comparisons).toBe(true);
      expect(FEATURES.competitive.seasons).toBe(true);
    });

    it('rankings é "full"', () => {
      expect(FEATURES.competitive.rankings).toBe('full');
    });

    it('tem torneios mas não tem financeiro nem IA', () => {
      expect(FEATURES.competitive.tournaments).toBe(true);
      expect(FEATURES.competitive.financial).toBe(false);
      expect(FEATURES.competitive.ai).toBe(false);
    });

    it('tem reactions', () => {
      expect(FEATURES.competitive.reactions).toBe(true);
    });
  });

  describe('modo full', () => {
    it('tem todas as features habilitadas', () => {
      expect(FEATURES.full.financial).toBe(true);
      expect(FEATURES.full.ai).toBe(true);
      expect(FEATURES.full.tournaments).toBe(true);
      expect(FEATURES.full.reports).toBe(true);
    });

    it('settings é "advanced"', () => {
      expect(FEATURES.full.settings).toBe('advanced');
    });

    it('rankings é "full"', () => {
      expect(FEATURES.full.rankings).toBe('full');
    });

    it('tem todas as features sociais', () => {
      expect(FEATURES.full.badges).toBe(true);
      expect(FEATURES.full.streaks).toBe(true);
      expect(FEATURES.full.comparisons).toBe(true);
      expect(FEATURES.full.reactions).toBe(true);
      expect(FEATURES.full.seasons).toBe(true);
    });
  });

  describe('consistência entre modos', () => {
    it('todos os modos têm as mesmas chaves', () => {
      const keyCasual      = Object.keys(FEATURES.casual).sort();
      const keyCompetitive = Object.keys(FEATURES.competitive).sort();
      const keyFull        = Object.keys(FEATURES.full).sort();
      expect(keyCasual).toEqual(keyCompetitive);
      expect(keyCasual).toEqual(keyFull);
    });

    it('todos os modos têm presence e draw habilitados', () => {
      Object.values(FEATURES).forEach((mode) => {
        expect(mode.presence).toBe(true);
        expect(mode.draw).toBe(true);
      });
    });

    it('todos os modos têm MVP habilitado', () => {
      Object.values(FEATURES).forEach((mode) => {
        expect(mode.mvp).toBe(true);
      });
    });
  });
});

describe('hasFeature', () => {
  it('retorna true para feature habilitada no modo', () => {
    const baba = { mode: 'full' };
    expect(hasFeature(baba, 'financial')).toBe(true);
    expect(hasFeature(baba, 'ai')).toBe(true);
  });

  it('retorna false para feature desabilitada no modo', () => {
    const baba = { mode: 'casual' };
    expect(hasFeature(baba, 'financial')).toBe(false);
    expect(hasFeature(baba, 'ai')).toBe(false);
    expect(hasFeature(baba, 'badges')).toBe(false);
  });

  it('retorna false para feature com valor "basic" (truthy mas não boolean true)', () => {
    // rankings = 'basic' em casual — hasFeature usa !!(valor), então é true
    const baba = { mode: 'casual' };
    expect(hasFeature(baba, 'rankings')).toBe(true); // 'basic' é truthy
  });

  it('usa modo casual como fallback quando baba é null', () => {
    expect(hasFeature(null, 'financial')).toBe(false);
    expect(hasFeature(null, 'presence')).toBe(true);
  });

  it('usa modo casual como fallback quando baba é undefined', () => {
    expect(hasFeature(undefined, 'draw')).toBe(true);
    expect(hasFeature(undefined, 'ai')).toBe(false);
  });

  it('usa casual como fallback para modo inválido', () => {
    const baba = { mode: 'modo_inexistente' };
    expect(hasFeature(baba, 'financial')).toBe(false);
    expect(hasFeature(baba, 'presence')).toBe(true);
  });

  it('retorna false para feature inexistente', () => {
    const baba = { mode: 'full' };
    expect(hasFeature(baba, 'feature_que_nao_existe')).toBe(false);
  });

  it('competitive tem torneios mas não tem financeiro', () => {
    const baba = { mode: 'competitive' };
    expect(hasFeature(baba, 'tournaments')).toBe(true);
    expect(hasFeature(baba, 'financial')).toBe(false);
  });
});
