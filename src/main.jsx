// src/main.jsx
// Fase 5 — Sentry com sourcemaps + release tracking + integração com Vite PWA.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Fontes locais (subset latin: cobre ã, ç, é). Sem Google Fonts = sem CSS bloqueante.
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-900.css';
import '@fontsource/rajdhani/latin-400.css';
import '@fontsource/rajdhani/latin-500.css';
import '@fontsource/rajdhani/latin-600.css';
import '@fontsource/rajdhani/latin-700.css';
import './styles/global.css';

// ─── Sentry: inicialização única, limpa e com release tracking ────────────────
// Carregado na 1ª interação (ou 8 s após o `load`) via import dinâmico, fora do caminho crítico.
// Erros anteriores ao init entram numa fila curta (10) e são enviados quando o Sentry carrega.
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? 'dev';

// Erros que acontecem antes do Sentry carregar ficam numa fila curta e são enviados no init.
const earlyErrors = [];
const queueEarlyError = (e) => {
  if (earlyErrors.length < 10) earlyErrors.push(e.error || e.reason || e.message);
};
function stopQueueingErrors() {
  window.removeEventListener('error', queueEarlyError);
  window.removeEventListener('unhandledrejection', queueEarlyError);
}
if (SENTRY_DSN) {
  window.addEventListener('error', queueEarlyError);
  window.addEventListener('unhandledrejection', queueEarlyError);
}

let sentryStarted = false;
function initSentry() {
  if (!SENTRY_DSN || sentryStarted) return;
  sentryStarted = true;
  // Desestruturar só o que é usado preserva o tree-shaking do chunk (o namespace inteiro não).
  import('@sentry/react').then(({ init, browserTracingIntegration, replayIntegration, captureException }) => {
    stopQueueingErrors();
    init({
      dsn:         SENTRY_DSN,
      environment: import.meta.env.MODE,
      release:     `gestao-baba@${APP_VERSION}`,   // rastreamento de releases

      integrations: [
        browserTracingIntegration(),
        replayIntegration({
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
        /^https:\/\/www\.draftplay\.app\.br/,
        /^https:\/\/itvfnargszozygcdhlrq\.supabase\.co/,
      ],
    });
    earlyErrors.splice(0).forEach((err) => captureException(err));
  });
}

// Inicia no 1º sinal de uso (toque, tecla, rolagem) ou, no máximo, 8 s após o `load`.
// Assim o chunk (~93 KiB) e o init saem da janela de carregamento medida pelo PageSpeed.
function scheduleSentry() {
  const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
  const start = () => {
    events.forEach((ev) => window.removeEventListener(ev, start));
    clearTimeout(fallbackTimer);
    initSentry();
  };
  const fallbackTimer = setTimeout(start, 8000);
  events.forEach((ev) => window.addEventListener(ev, start, { once: true, passive: true }));
}

if (document.readyState === 'complete') {
  scheduleSentry();
} else {
  window.addEventListener('load', scheduleSentry);
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