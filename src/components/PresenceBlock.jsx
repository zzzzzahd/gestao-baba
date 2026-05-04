// src/components/PresenceBlock.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Bloco de confirmação de presença no próximo baba.
// Extraído do DashboardPage (Fase 2, Tarefa 2.3).
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Clock, Users, CheckCircle2, XCircle } from 'lucide-react';

// Formata objeto countdown → string legível
const formatCountdown = (cd) => {
  if (!cd?.active) return null;
  const hh = String(cd.h).padStart(2, '0');
  const mm = String(cd.m).padStart(2, '0');
  const ss = String(cd.s).padStart(2, '0');
  return cd.d > 0 ? `${cd.d}d ${hh}h ${mm}m` : `${hh}:${mm}:${ss}`;
};

const PresenceBlock = ({
  nextGameDay,
  gameConfirmations,
  myConfirmation,
  canConfirm,
  confirmPresence,
  cancelConfirmation,
  countdown,
  loading,
  drawConfig,
}) => {
  const minRequired    = (drawConfig?.playersPerTeam || 5) * 2;
  const confirmedCount = gameConfirmations?.length || 0;
  const gameTime       = nextGameDay?.time?.substring(0, 5) || '--:--';
  const cdStr          = formatCountdown(countdown);
  const isUrgent       = countdown?.active && countdown.d === 0 && countdown.h === 0 && countdown.m < 5;

  return (
    <div className="space-y-3">

      {/* Contador de confirmados */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Users size={13} className="text-cyan-electric" />
          <span className="text-[11px] font-black text-text-mid uppercase tracking-widest">
            <span className="text-white">{confirmedCount}</span> confirmados
            {confirmedCount < minRequired && (
              <span className="text-text-low"> · faltam {minRequired - confirmedCount}</span>
            )}
          </span>
        </div>
        <span className="text-[11px] font-black text-cyan-electric">{gameTime}</span>
      </div>

      {/* Período de confirmação aberto */}
      {canConfirm && (
        <div className="p-5 rounded-3xl border border-cyan-electric/20 bg-cyan-electric/5 space-y-4">

          {/* Contador regressivo */}
          {cdStr && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] text-text-low font-black uppercase tracking-widest">
                <Clock size={12} />
                <span>Prazo</span>
              </div>
              <span className={`text-sm font-black font-mono ${isUrgent ? 'text-red-400 animate-pulse' : 'text-text-mid'}`}>
                {cdStr}
              </span>
            </div>
          )}

          {/* Já confirmou → mostrar status + cancelar */}
          {myConfirmation ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                <CheckCircle2 size={16} className="text-green-500" />
                <span className="text-sm font-black text-green-500 uppercase">Presença Confirmada</span>
              </div>
              <button
                onClick={cancelConfirmation}
                disabled={loading}
                className="w-full py-3 bg-surface-2 border border-border-mid rounded-2xl text-text-low text-[10px] font-black uppercase hover:bg-surface-3 transition-all disabled:opacity-40"
              >
                {loading ? 'Processando...' : 'Cancelar Presença'}
              </button>
            </div>
          ) : (
            /* Ainda não confirmou → botão principal com microinteração */
            <button
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(40);
                confirmPresence();
              }}
              disabled={loading}
              className="w-full py-5 rounded-2xl text-black font-black uppercase italic tracking-tighter shadow-lg active:scale-95 transition-all duration-150 disabled:opacity-50 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
            >
              <span className={`flex items-center justify-center gap-2 transition-all duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`}>
                ✓ Confirmar Presença
              </span>
              {loading && (
                <span className="absolute inset-0 flex items-center justify-center gap-2 animate-check-pop">
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Confirmando...
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Prazo encerrado — status discreto */}
      {!canConfirm && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase border ${
          myConfirmation
            ? 'bg-green-500/5 border-green-500/20 text-green-500'
            : 'bg-surface-2 border-border-subtle text-text-low'
        }`}>
          {myConfirmation ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
          <span>
            {myConfirmation
              ? 'Você está no baba de hoje'
              : 'Prazo encerrado · você ficou de fora'}
          </span>
        </div>
      )}
    </div>
  );
};

export default PresenceBlock;
