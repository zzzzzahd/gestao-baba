// src/main.jsx
// Fase 5 — Sentry com sourcemaps + release tracking + integração com Vite PWA.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import * as Sentry from '@sentry/react';

// ─── Sentry: inicialização única, limpa e com release tracking ────────────────
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? 'dev';

if (SENTRY_DSN) {
  Sentry.init({
    dsn:         SENTRY_DSN,
    environment: import.meta.env.MODE,
    release:     `gestao-baba@${APP_VERSION}`,   // rastreamento de releases

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText:   true,     // LGPD: mascarar textos
        blockAllMedia: true,
      }),
    ],

    tracesSampleRate:     import.meta.env.PROD ? 0.1  : 0,
    replaysSessionSampleRate:  0,
    replaysOnErrorSampleRate:  import.meta.env.PROD ? 0.05 : 0,

    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      /^chrome-extension/,
      /^moz-extension/,
      /safari-extension/,
      'NetworkError',
      'AbortError',
    ],

    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
        delete event.user.username;
      }
      return event;
    },

    tracePropagationTargets: [
      /^https:\/\/gestao-baba\.vercel\.app/,
      /^https:\/\/itvfnargszozygcdhlrq\.supabase\.co/,
    ],
  });
}

// ─── Google AdSense ───────────────────────────────────────────────────────
// O script/meta tag do AdSense agora é injetado direto no HTML no build
// (ver adsensePlugin em vite.config.js), não mais aqui via JS em runtime.

// ─── PWA: Service Worker via Vite PWA plugin ─────────────────────────────────
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // 1h — checagem periódica em segundo plano

if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(reg => {
        // ── Caso 1: já existe uma atualização esperando quando o app abre ──
        // Cobre o cenário em que o SW atualizou com o app fechado/em segundo
        // plano e o usuário só reabriu depois — sem isso, o banner nunca
        // aparecia nesse caso.
        if (reg.waiting) {
          window.dispatchEvent(new CustomEvent('pwa-update-available'));
        }

        // ── Caso 2: atualização é encontrada com o app já aberto ──
        reg.onupdatefound = () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.onstatechange = () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent('pwa-update-available'));
            }
          };
        };

        // ── Caso 3: forçar checagem quando o app volta do segundo plano ──
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update();
        });

        // ── Caso 4: checagem periódica de segurança ──
        setInterval(() => reg.update(), UPDATE_CHECK_INTERVAL);
      })
      .catch(err => console.warn('[PWA] Service Worker falhou:', err));

    // Sem isso, o SW novo fica "esperando" pra sempre num PWA instalado —
    // quando o usuário confirma no UpdatePrompt (SKIP_WAITING), esse
    // listener recarrega a página já com o código novo.
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);