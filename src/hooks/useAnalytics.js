// src/hooks/useAnalytics.js
// Fase 5 — PostHog analytics de produto (privacidade-first).
// Substitui o stub anterior e integra com o PostHog real.
// Configurar VITE_POSTHOG_KEY e VITE_POSTHOG_HOST nas env vars do Vercel.

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const POSTHOG_KEY  = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST ?? 'https://app.posthog.com';
const IS_PROD      = import.meta.env.PROD;

let ph = null; // instância PostHog (carregada lazy)

// ── Carregamento lazy do SDK PostHog ──────────────────────────────────────────
const loadPostHog = async () => {
  if (ph || !POSTHOG_KEY || !IS_PROD) return ph;
  try {
    const { default: posthog } = await import('posthog-js');
    posthog.init(POSTHOG_KEY, {
      api_host:                    POSTHOG_HOST,
      autocapture:                 false,   // só eventos manuais (LGPD)
      capture_pageview:            false,   // controlamos manualmente
      capture_pageleave:           false,
      disable_session_recording:   true,    // sem gravação de sessão
      persistence:                 'localStorage',
      opt_out_capturing_by_default: false,
      // Anonimizar IPs por padrão
      ip:                          false,
      sanitize_properties:         (props) => {
        // Remove qualquer dado que possa identificar o usuário
        delete props.$ip;
        delete props.$referrer;
        delete props.$referring_domain;
        return props;
      },
    });
    ph = posthog;
    return ph;
  } catch (e) {
    console.warn('[Analytics] PostHog não disponível:', e);
    return null;
  }
};

// ── Hook principal ────────────────────────────────────────────────────────────
export function useAnalytics() {
  const { user, profile } = useAuth();
  const identifiedRef      = useRef(false);

  // Identificar usuário (sem dados pessoais — só ID anonimizado e role)
  useEffect(() => {
    if (!user || identifiedRef.current) return;
    loadPostHog().then(posthog => {
      if (!posthog) return;
      posthog.identify(user.id, {
        // NÃO enviar email, nome ou qualquer PII
        has_profile: !!profile,
        created_at:  user.created_at,
      });
      identifiedRef.current = true;
    });
  }, [user, profile]);

  // Resetar ao fazer logout
  useEffect(() => {
    if (!user && identifiedRef.current) {
      loadPostHog().then(posthog => posthog?.reset());
      identifiedRef.current = false;
    }
  }, [user]);

  /** Rastrear pageview */
  const trackPage = useCallback((pageName) => {
    if (!IS_PROD) { console.debug('[Analytics] page:', pageName); return; }
    loadPostHog().then(posthog => posthog?.capture('$pageview', { page: pageName }));
  }, []);

  /** Rastrear evento de produto */
  const track = useCallback((event, properties = {}) => {
    if (!IS_PROD) { console.debug('[Analytics] event:', event, properties); return; }
    loadPostHog().then(posthog => posthog?.capture(event, {
      ...properties,
      // Nunca enviar dados pessoais acidentalmente
      user_id:   undefined,
      email:     undefined,
      name:      undefined,
      phone:     undefined,
    }));
  }, []);

  /** Feature flag */
  const isFeatureEnabled = useCallback(async (flag) => {
    const posthog = await loadPostHog();
    return posthog?.isFeatureEnabled(flag) ?? false;
  }, []);

  return { track, trackPage, isFeatureEnabled };
}

// ── Eventos de produto catalogados ───────────────────────────────────────────
// Usar como constantes em vez de strings hardcoded
export const EVENTS = {
  // Autenticação
  LOGIN:             'user_login',
  SIGNUP:            'user_signup',
  LOGOUT:            'user_logout',

  // Baba
  BABA_CREATED:      'baba_created',
  BABA_JOINED:       'baba_joined',
  BABA_SWITCHED:     'baba_switched',

  // Presença
  PRESENCE_CONFIRMED: 'presence_confirmed',
  PRESENCE_CANCELLED: 'presence_cancelled',
  WAITLIST_JOINED:    'waitlist_joined',

  // Sorteio
  DRAW_STARTED:       'draw_started',
  DRAW_COMPLETED:     'draw_completed',
  DRAW_RESHUFFLED:    'draw_reshuffled',

  // Partida
  MATCH_STARTED:      'match_started',
  MATCH_FINISHED:     'match_finished',
  GOAL_SCORED:        'goal_scored',

  // Avaliação
  PLAYER_RATED:       'player_rated',

  // Compartilhamento
  MATCH_SHARED:       'match_shared',
  INVITE_SHARED:      'invite_shared',
  ICS_EXPORTED:       'ics_exported',

  // Pagamento
  PAYMENT_INTENT_CREATED: 'payment_intent_created',
  PAYMENT_COMPLETED:      'payment_completed',

  // UI
  THEME_TOGGLED:      'theme_toggled',
  FEEDBACK_SENT:      'feedback_sent',
  COMPARISON_VIEWED:  'comparison_viewed',
};
