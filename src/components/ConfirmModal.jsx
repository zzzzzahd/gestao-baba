// src/components/ConfirmModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modal de confirmação customizado.
// Substitui window.confirm() nativo, mantendo consistência com o design system.
//
// Uso:
//   const [confirmState, setConfirmState] = useState({ open: false, message: '', onConfirm: null });
//
//   <ConfirmModal
//     open={confirmState.open}
//     message={confirmState.message}
//     confirmLabel="Excluir"        // opcional, padrão "Confirmar"
//     cancelLabel="Cancelar"        // opcional
//     danger                        // opcional — botão confirmar fica vermelho
//     onConfirm={confirmState.onConfirm}
//     onCancel={() => setConfirmState(s => ({ ...s, open: false }))}
//   />
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react'; 
import { AlertTriangle } from 'lucide-react';

const ConfirmModal = ({
  open,
  message,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel  = 'Cancelar',
  danger       = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-7 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Ícone */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 ${
          danger ? 'bg-red-500/10 border border-red-500/20' : 'bg-cyan-electric/10 border border-cyan-electric/20'
        }`}>
          <AlertTriangle
            size={24}
            className={danger ? 'text-red-400' : 'text-cyan-electric'}
          />
        </div>

        {/* Texto */}
        <p className="text-base font-black text-white text-center uppercase tracking-tight leading-snug">
          {message}
        </p>
        {description && (
          <p className="text-[11px] text-white/40 text-center mt-2 leading-relaxed font-medium">
            {description}
          </p>
        )}

        {/* Botões */}
        <div className="grid grid-cols-2 gap-3 mt-7">
          <button
            onClick={onCancel}
            className="py-4 rounded-2xl bg-white/5 border border-white/10 text-white/50 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => { onConfirm?.(); onCancel?.(); }}
            className={`py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all ${
              danger
                ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
                : 'text-black'
            }`}
            style={!danger ? { background: 'linear-gradient(135deg, #00f2ff, #0066ff)' } : undefined}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
