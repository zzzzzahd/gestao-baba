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

    // Sourcemaps: o Sentry usa o campo release para mapear
    // Configurar upload via @sentry/vite-plugin (ver vite.config.js)
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText:   true,     // LGPD: mascarar textos
        blockAllMedia: true,
      }),
    ],

    // 10% das sessões em produção para não estourar o free tier
    tracesSampleRate:     import.meta.env.PROD ? 0.1  : 0,
    // 5% das sessões com replay (só em erros)
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

    // LGPD: remover dados pessoais antes de enviar
    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
        delete event.user.username;
      }
      return event;
    },

    // Não rastrear rotas internas de auth
    tracePropagationTargets: [
      /^https:\/\/gestao-baba\.vercel\.app/,
      /^https:\/\/itvfnargszozygcdhlrq\.supabase\.co/,
    ],
  });
}

// ─── Google AdSense — Fase 1.1/1.2: injeta o script só quando o client ID
// existir de verdade. Diferente da tag estática no index.html, aqui a checagem
// roda em JS (import.meta.env), então uma env var vazia simplesmente não gera
// nenhuma requisição — nada de client= quebrado nem erro no console à toa
// enquanto a conta AdSense não for aprovada. ───────────────────────────────────
const ADSENSE_CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID;
if (ADSENSE_CLIENT_ID) {
  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
  document.head.appendChild(script);
}

// ─── PWA: Service Worker via Vite PWA plugin ─────────────────────────────────
// O registerSW é injetado automaticamente pelo vite-plugin-pwa.
// Mantemos listener manual apenas como fallback.
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')   // Workbox gera /sw.js via vite-plugin-pwa
      .then(reg => {
        reg.onupdatefound = () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.onstatechange = () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              // Disparar evento customizado para o app mostrar banner de atualização
              window.dispatchEvent(new CustomEvent('pwa-update-available'));
            }
          };
        };
      })
      .catch(err => console.warn('[PWA] Service Worker falhou:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
