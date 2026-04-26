import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

// ─── MON-001: Sentry — Error Tracking em Produção ─────────────────────────
// Instalar: npm install @sentry/react
// Configurar VITE_SENTRY_DSN no .env e no painel da Vercel
// Documentação: https://docs.sentry.io/platforms/javascript/guides/react/

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

if (SENTRY_DSN && import.meta.env.PROD) {
  import('@sentry/react').then(Sentry => {
    Sentry.init({
      dsn:         SENTRY_DNS,
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
