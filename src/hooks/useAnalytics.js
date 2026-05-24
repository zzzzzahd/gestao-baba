// src/hooks/useAnalytics.js
// Sprint 1–5 — Novos eventos adicionados ao catálogo.

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const POSTHOG_KEY  = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST ?? 'https://app.posthog.com';
const IS_PROD      = import.meta.env.PROD;

let ph = null;

const loadPostHog = async () => {
  if (ph || !POSTHOG_KEY || !IS_PROD) return ph;
  try {
    const { default: posthog } = await import('posthog-js');
    posthog.init(POSTHOG_KEY, {
      api_host:                    POSTHOG_HOST,
      autocapture:                 false,
      capture_pageview:            false,
      capture_pageleave:           false,
      disable_session_recording:   true,
      persistence:                 'localStorage',
      ip:                          false,
      sanitize_properties:         (props) => {
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

export function useAnalytics() {
  const { user, profile } = useAuth();
  const identifiedRef      = useRef(false);

  useEffect(() => {
    if (!user || identifiedRef.current) return;
    loadPostHog().then(posthog => {
      if (!posthog) return;
      posthog.identify(user.id, {
        has_profile:  !!profile,
        created_at:   user.created_at,
        games_played: profile?.games_played ?? 0,
      });
      identifiedRef.current = true;
    });
  }, [user, profile]);

  useEffect(() => {
    if (!user && identifiedRef.current) {
      loadPostHog().then(posthog => posthog?.reset());
      identifiedRef.current = false;
    }
  }, [user]);

  const trackPage = useCallback((pageName) => {
    if (!IS_PROD) { console.debug('[Analytics] page:', pageName); return; }
    loadPostHog().then(posthog => posthog?.capture('$pageview', { page: pageName }));
  }, []);

  const track = useCallback((event, properties = {}) => {
    if (!IS_PROD) { console.debug('[Analytics] event:', event, properties); return; }
    loadPostHog().then(posthog => posthog?.capture(event, {
      ...properties,
      user_id: undefined,
      email:   undefined,
      name:    undefined,
      phone:   undefined,
    }));
  }, []);

  const isFeatureEnabled = useCallback(async (flag) => {
    const posthog = await loadPostHog();
    return posthog?.isFeatureEnabled(flag) ?? false;
  }, []);

  return { track, trackPage, isFeatureEnabled };
}

// ── Eventos de produto catalogados ───────────────────────────────────────────
export const EVENTS = {
  // Autenticação
  LOGIN:              'user_login',
  SIGNUP:             'user_signup',
  LOGOUT:             'user_logout',

  // Baba
  BABA_CREATED:       'baba_created',
  BABA_JOINED:        'baba_joined',
  BABA_SWITCHED:      'baba_switched',
  BABA_MODE_SET:      'baba_mode_set',       // Sprint 1

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
  MATCH_INTRO_SHOWN:  'match_intro_shown',   // Sprint 3
  REACTION_SENT:      'reaction_sent',       // Sprint 3

  // MVP
  MVP_VOTED:          'mvp_voted',           // Sprint 3
  MVP_REVEALED:       'mvp_revealed',        // Sprint 3

  // Pós-jogo
  POST_GAME_VIEWED:   'post_game_viewed',    // Sprint 3
  NARRATIVE_GENERATED:'narrative_generated', // Sprint 5

  // Avaliação
  PLAYER_RATED:       'player_rated',

  // Divisão
  DIVISION_CHANGED:   'division_changed',    // Sprint 4

  // Temporada
  SEASON_CREATED:     'season_created',      // Sprint 4
  SEASON_VIEWED:      'season_viewed',       // Sprint 4

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

  // Onboarding Sprint 6
  FEATURE_UNLOCKED:   'feature_unlocked',    // Sprint 1
};
