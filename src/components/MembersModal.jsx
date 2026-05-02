// src/components/MembersModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Bottom-sheet com lista de atletas do baba + botão de avaliar.
// Extraído do DashboardPage (Fase 2, Tarefa 2.2).
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { X, Star, Shield } from 'lucide-react';
import { POSITION_LABEL } from '../utils/constants';

const MembersModal = ({ players, onClose, onOpenRate, currentUserId }) => (
  <div
    className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm"
    onClick={onClose}
  >
    <div
      className="w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-t-[2.5rem] p-6 max-h-[80vh] flex flex-col shadow-2xl"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-black uppercase tracking-widest text-white">Atletas</h2>
          <p className="text-[10px] text-white/40 font-bold uppercase">{players.length} membros</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-2xl bg-white/5 text-white/40 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Lista */}
      <div className="overflow-y-auto space-y-3 flex-1 pr-1">
        {players.map((p, i) => (
          <div
            key={p.id || i}
            className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5"
          >
            {/* Avatar */}
            <div className="w-12 h-12 rounded-2xl bg-gray-800 border border-white/10 overflow-hidden flex items-center justify-center text-white font-black text-lg flex-shrink-0">
              {p.avatar_url
                ? <img src={p.avatar_url} className="w-full h-full object-cover" alt={p.display_name} />
                : (p.display_name || '?').charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-black text-white text-sm truncate">{p.display_name || 'Sem nome'}</p>
                {p.final_rating > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-black text-cyan-electric bg-cyan-electric/10 px-1.5 py-0.5 rounded shrink-0">
                    <Star size={8} fill="currentColor" /> {Number(p.final_rating).toFixed(1)}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-cyan-electric font-bold uppercase tracking-widest">
                {POSITION_LABEL[p.position] || p.position || 'Linha'}
              </p>
            </div>

            {/* Botão avaliar (não avalia a si mesmo) */}
            {p.user_id !== currentUserId && (
              <button
                onClick={() => onOpenRate(p)}
                className="p-3 bg-white/5 text-white/20 rounded-xl hover:bg-cyan-electric hover:text-black transition-all flex-shrink-0"
              >
                <Star size={16} />
              </button>
            )}

            {/* Ícone goleiro */}
            {p.position === 'goleiro' && (
              <Shield size={14} className="text-yellow-500 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default MembersModal;
