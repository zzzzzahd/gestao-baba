import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import * as Sentry from '@sentry/react';

// ─── Sentry — Monitoramento de erros em produção (Sprint 10.5 Fase B) ────────
// Configurar VITE_SENTRY_DSN nas env vars do Vercel antes de ativar.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn:         import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Não enviar dados pessoais (LGPD)
    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
    // Capturar apenas erros, não performance em dev
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
  });
}
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

if (SENTRY_DSN && import.meta.env.PROD) {
  import('@sentry/react').then(Sentry => {
    Sentry.init({
      dsn:         SENTRY_DSN, // ← CORRIGIDO: era SENTRY_DNS (typo)
      environment:  'production',
      // Captura apenas 20% das sessões para não estourar o free tier
      tracesSampleRate: 0.2,
      // Ignora erros comuns de extensões de browser
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        /^chrome-extension/,
        /^moz-extension/,
      ],
      beforeSend(event) {
        // Remove dados sensíveis antes de enviar
        if (event.user) {
          delete event.user.email;
          delete event.user.ip_address;
        }
        return event;
      },
    });
    console.log('[Sentry] Inicializado em produção');
  }).catch(err => {
    console.warn('[Sentry] Falha ao carregar:', err);
  });
}

// ─── Service Worker (PWA) ─────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(registration => {
        registration.onupdatefound = () => {
          const worker = registration.installing;
          worker.onstatechange = () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] Nova versão disponível. Recarregue para atualizar.');
            }
          };
        };
      })
      .catch(err => console.error('[PWA] Erro ao registrar Service Worker:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
