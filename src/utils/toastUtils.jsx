// src/utils/toastUtils.js
// ─────────────────────────────────────────────────────────────────────────────
// Utilitários de toast customizados. Fase 3, Tarefa 3.5.
// Substitui toast.error() simples por toast com opção de retry quando relevante.
// ─────────────────────────────────────────────────────────────────────────────

import toast from 'react-hot-toast';

/**
 * Toast de erro simples — substituto direto de toast.error()
 */
export const toastError = (message) => {
  toast.error(message, {
    style: {
      background: '#1a0505',
      border: '1px solid rgba(239,68,68,0.3)',
      color: '#fff',
      borderRadius: '1rem',
      fontSize: '12px',
      fontWeight: 900,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    iconTheme: { primary: '#ef4444', secondary: '#1a0505' },
    duration: 4000,
  });
};

/**
 * Toast de erro com botão de retry.
 *
 * Uso:
 *   toastErrorWithRetry('Falha ao carregar rankings', () => loadRankings());
 */
export const toastErrorWithRetry = (message, onRetry) => {
  toast(
    (t) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: '#fff' }}>
          ⚠ {message}
        </span>
        <button
          onClick={() => {
            toast.dismiss(t.id);
            onRetry?.();
          }}
          style={{
            background: 'rgba(239,68,68,0.2)',
            border: '1px solid rgba(239,68,68,0.4)',
            color: '#f87171',
            borderRadius: '8px',
            padding: '4px 10px',
            fontSize: '10px',
            fontWeight: 900,
            textTransform: 'uppercase',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Tentar novamente
        </button>
      </div>
    ),
    {
      style: {
        background: '#1a0505',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: '1rem',
        padding: '12px 16px',
        maxWidth: '420px',
      },
      duration: 7000,
    }
  );
};

/**
 * Toast de sucesso no padrão visual do app.
 */
export const toastSuccess = (message) => {
  toast.success(message, {
    style: {
      background: '#001a1a',
      border: '1px solid rgba(0,242,255,0.3)',
      color: '#fff',
      borderRadius: '1rem',
      fontSize: '12px',
      fontWeight: 900,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    iconTheme: { primary: '#00f2ff', secondary: '#001a1a' },
    duration: 3000,
  });
};
