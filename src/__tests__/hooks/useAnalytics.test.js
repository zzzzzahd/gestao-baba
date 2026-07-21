// src/__tests__/hooks/useAnalytics.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Controlar IS_PROD via import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_POSTHOG_KEY:  '',
      VITE_POSTHOG_HOST: 'https://app.posthog.com',
      PROD:              false,
      DEV:               true,
      MODE:              'test',
    },
  },
});

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock posthog-js (para testes de modo PROD)
const mockPosthog = {
  init:             vi.fn(),
  identify:         vi.fn(),
  reset:            vi.fn(),
  capture:          vi.fn(),
  isFeatureEnabled: vi.fn().mockReturnValue(false),
};
vi.mock('posthog-js', () => ({ default: mockPosthog }));

// Spy no console
const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

import { useAnalytics, EVENTS } from '../../hooks/useAnalytics';

describe('useAnalytics — modo dev (IS_PROD=false)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, profile: null });
  });

  it('trackPage não chama PostHog — apenas console.debug', () => {
    const { result } = renderHook(() => useAnalytics());
    act(() => { result.current.trackPage('home'); });
    expect(consoleSpy).toHaveBeenCalledWith('[Analytics] page:', 'home');
    expect(mockPosthog.capture).not.toHaveBeenCalled();
  });

  it('track não chama PostHog — apenas console.debug', () => {
    const { result } = renderHook(() => useAnalytics());
    act(() => { result.current.track('baba_created', { mode: 'casual' }); });
    expect(consoleSpy).toHaveBeenCalledWith('[Analytics] event:', 'baba_created', { mode: 'casual' });
    expect(mockPosthog.capture).not.toHaveBeenCalled();
  });

  it('track com objeto de properties vazio não crasha', () => {
    const { result } = renderHook(() => useAnalytics());
    expect(() => act(() => { result.current.track('test_event'); })).not.toThrow();
  });

  it('trackPage não crasha sem argumento', () => {
    const { result } = renderHook(() => useAnalytics());
    expect(() => act(() => { result.current.trackPage(); })).not.toThrow();
  });
});

describe('useAnalytics — identify', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('não chama identify quando user é null', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null });
    renderHook(() => useAnalytics());
    expect(mockPosthog.identify).not.toHaveBeenCalled();
  });

  it('não chama identify em modo dev mesmo com user', () => {
    mockUseAuth.mockReturnValue({
      user:    { id: 'u-1', created_at: '2025-01-01' },
      profile: { games_played: 5 },
    });
    renderHook(() => useAnalytics());
    // Em modo dev (IS_PROD=false) o PostHog não é carregado
    expect(mockPosthog.identify).not.toHaveBeenCalled();
  });
});

describe('useAnalytics — reset', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('não chama reset quando user já é null desde o início', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null });
    renderHook(() => useAnalytics());
    expect(mockPosthog.reset).not.toHaveBeenCalled();
  });
});

describe('useAnalytics — estabilidade de funções', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null, profile: null });
  });

  it('trackPage é estável entre re-renders (useCallback)', () => {
    const { result, rerender } = renderHook(() => useAnalytics());
    const fn1 = result.current.trackPage;
    rerender();
    expect(result.current.trackPage).toBe(fn1);
  });

  it('track é estável entre re-renders (useCallback)', () => {
    const { result, rerender } = renderHook(() => useAnalytics());
    const fn1 = result.current.track;
    rerender();
    expect(result.current.track).toBe(fn1);
  });

  it('isFeatureEnabled é estável entre re-renders (useCallback)', () => {
    const { result, rerender } = renderHook(() => useAnalytics());
    const fn1 = result.current.isFeatureEnabled;
    rerender();
    expect(result.current.isFeatureEnabled).toBe(fn1);
  });
});

describe('useAnalytics — isFeatureEnabled', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null, profile: null });
  });

  it('retorna false quando PostHog não está disponível (modo dev)', async () => {
    const { result } = renderHook(() => useAnalytics());
    const enabled = await result.current.isFeatureEnabled('minha-flag');
    expect(enabled).toBe(false);
  });

  it('não crasha ao chamar isFeatureEnabled com flag inexistente', async () => {
    const { result } = renderHook(() => useAnalytics());
    await expect(result.current.isFeatureEnabled('flag-inexistente')).resolves.not.toThrow();
  });
});

describe('EVENTS — catálogo de eventos', () => {
  it('tem evento de login', () => {
    expect(EVENTS.LOGIN).toBe('user_login');
  });

  it('tem evento de logout', () => {
    expect(EVENTS.LOGOUT).toBe('user_logout');
  });

  it('tem evento de baba criado', () => {
    expect(EVENTS.BABA_CREATED).toBe('baba_created');
  });

  it('tem evento de presença confirmada', () => {
    expect(EVENTS.PRESENCE_CONFIRMED).toBe('presence_confirmed');
  });

  it('tem evento de sorteio completado', () => {
    expect(EVENTS.DRAW_COMPLETED).toBe('draw_completed');
  });

  it('tem evento de partida finalizada', () => {
    expect(EVENTS.MATCH_FINISHED).toBe('match_finished');
  });

  it('tem evento de MVP votado', () => {
    expect(EVENTS.MVP_VOTED).toBe('mvp_voted');
  });

  it('tem evento de feature desbloqueada', () => {
    expect(EVENTS.FEATURE_UNLOCKED).toBe('feature_unlocked');
  });

  it('tem evento de feedback enviado', () => {
    expect(EVENTS.FEEDBACK_SENT).toBe('feedback_sent');
  });

  it('todos os valores são strings não-vazias', () => {
    Object.entries(EVENTS).forEach(([key, value]) => {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    });
  });

  it('não tem valores duplicados', () => {
    const values = Object.values(EVENTS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('todos os valores usam snake_case', () => {
    Object.values(EVENTS).forEach((v) => {
      expect(v).toMatch(/^[a-z][a-z0-9_]*$/);
    });
  });
});
