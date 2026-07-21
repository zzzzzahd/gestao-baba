// src/__tests__/utils/progressiveFeaturesUnlock.test.js
// Testes unitários para o sistema de desbloqueio progressivo de features

import { describe, it, expect } from 'vitest';
import {
  getUnlockedFeatures,
  getNewlyUnlocked,
  UNLOCK_MESSAGES,
} from '../../utils/progressiveFeaturesUnlock';

describe('getUnlockedFeatures', () => {
  describe('usuário novo (0 jogos)', () => {
    it('não tem nenhuma feature desbloqueada', () => {
      const features = getUnlockedFeatures(0);
      expect(features.rankings).toBe(false);
      expect(features.badges).toBe(false);
      expect(features.history).toBe(false);
      expect(features.ai).toBe(false);
      expect(features.tournaments).toBe(false);
      expect(features.seasons).toBe(false);
      expect(features.reactions).toBe(false);
    });

    it('financeiro nunca é desbloqueado automaticamente', () => {
      expect(getUnlockedFeatures(0).financial).toBe(false);
      expect(getUnlockedFeatures(100).financial).toBe(false);
    });
  });

  describe('após 1 jogo', () => {
    it('desbloqueia histórico e reações', () => {
      const features = getUnlockedFeatures(1);
      expect(features.history).toBe(true);
      expect(features.reactions).toBe(true);
    });

    it('não desbloqueia rankings e badges ainda', () => {
      const features = getUnlockedFeatures(1);
      expect(features.rankings).toBe(false);
      expect(features.badges).toBe(false);
    });
  });

  describe('após 3 jogos', () => {
    it('desbloqueia rankings, badges e seasons', () => {
      const features = getUnlockedFeatures(3);
      expect(features.rankings).toBe(true);
      expect(features.badges).toBe(true);
      expect(features.seasons).toBe(true);
    });

    it('não desbloqueia IA e torneios ainda', () => {
      const features = getUnlockedFeatures(3);
      expect(features.ai).toBe(false);
      expect(features.tournaments).toBe(false);
    });
  });

  describe('após 5 jogos', () => {
    it('desbloqueia IA e torneios', () => {
      const features = getUnlockedFeatures(5);
      expect(features.ai).toBe(true);
      expect(features.tournaments).toBe(true);
    });

    it('mantém tudo que já estava desbloqueado', () => {
      const features = getUnlockedFeatures(5);
      expect(features.history).toBe(true);
      expect(features.reactions).toBe(true);
      expect(features.rankings).toBe(true);
      expect(features.badges).toBe(true);
      expect(features.seasons).toBe(true);
    });
  });

  describe('limites de threshold exatos', () => {
    it('2 jogos: ainda sem rankings', () => {
      expect(getUnlockedFeatures(2).rankings).toBe(false);
    });

    it('4 jogos: ainda sem IA', () => {
      expect(getUnlockedFeatures(4).ai).toBe(false);
    });

    it('retorna false para valores negativos', () => {
      const features = getUnlockedFeatures(-1);
      expect(Object.values(features).filter(v => v === true)).toHaveLength(0);
    });

    it('aceita valores altos sem erros', () => {
      expect(() => getUnlockedFeatures(999)).not.toThrow();
      const features = getUnlockedFeatures(999);
      expect(features.ai).toBe(true);
      expect(features.tournaments).toBe(true);
    });
  });
});

describe('getNewlyUnlocked', () => {
  it('retorna vazio quando nenhuma feature nova foi desbloqueada', () => {
    expect(getNewlyUnlocked(5, 6)).toHaveLength(0);
  });

  it('detecta desbloqueio de histórico e reações (0 → 1)', () => {
    const newFeats = getNewlyUnlocked(0, 1);
    expect(newFeats).toContain('history');
    expect(newFeats).toContain('reactions');
  });

  it('detecta desbloqueio de rankings, badges, seasons (2 → 3)', () => {
    const newFeats = getNewlyUnlocked(2, 3);
    expect(newFeats).toContain('rankings');
    expect(newFeats).toContain('badges');
    expect(newFeats).toContain('seasons');
  });

  it('detecta desbloqueio de IA e torneios (4 → 5)', () => {
    const newFeats = getNewlyUnlocked(4, 5);
    expect(newFeats).toContain('ai');
    expect(newFeats).toContain('tournaments');
  });

  it('não detecta financeiro como desbloqueado (nunca automático)', () => {
    const newFeats = getNewlyUnlocked(0, 10);
    expect(newFeats).not.toContain('financial');
  });

  it('detecta múltiplos desbloqueios em salto grande (0 → 5)', () => {
    const newFeats = getNewlyUnlocked(0, 5);
    expect(newFeats).toContain('history');
    expect(newFeats).toContain('reactions');
    expect(newFeats).toContain('rankings');
    expect(newFeats).toContain('badges');
    expect(newFeats).toContain('ai');
    expect(newFeats).toContain('tournaments');
  });

  it('retorna array vazio quando before === after', () => {
    expect(getNewlyUnlocked(3, 3)).toHaveLength(0);
  });
});

describe('UNLOCK_MESSAGES', () => {
  it('tem mensagem para cada feature que pode ser desbloqueada', () => {
    const featuresThatUnlock = ['rankings', 'badges', 'ai', 'tournaments', 'seasons'];
    featuresThatUnlock.forEach((feat) => {
      expect(UNLOCK_MESSAGES[feat]).toBeDefined();
      expect(typeof UNLOCK_MESSAGES[feat]).toBe('string');
      expect(UNLOCK_MESSAGES[feat].length).toBeGreaterThan(0);
    });
  });

  it('mensagens contêm emoji (feedback visual)', () => {
    Object.values(UNLOCK_MESSAGES).forEach((msg) => {
      // Verifica que a mensagem tem pelo menos um caractere não-ASCII (emoji)
      expect(/[^\u0000-\u007F]/.test(msg)).toBe(true);
    });
  });
});
