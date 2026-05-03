// src/components/RatePlayerModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modal de avaliação técnica de jogador.
// Extraído do DashboardPage (Fase 2, Tarefa 2.1).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import Tooltip from './Tooltip';

const CATEGORIES = [
  {
    id: 'skill',
    label: '⚽ Habilidade',
    color: 'text-cyan-electric',
    tip: 'Técnica com a bola: passe, dribble, finalização.',
  },
  {
    id: 'physical',
    label: '💪 Físico',
    color: 'text-orange-500',
    tip: 'Velocidade, resistência e força durante o jogo.',
  },
  {
    id: 'commitment',
    label: '🤝 Compromisso',
    color: 'text-purple-500',
    tip: 'Pontualidade, presença nos babas e espírito de equipe.',
  },
];

const RatePlayerModal = ({ player, onClose, onRate }) => {
  const [ratings,    setRatings]    = useState({ skill: 3, physical: 3, commitment: 3 });
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onRate(player.id, ratings);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Avatar + nome */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gray-800 mx-auto mb-4 border-2 border-cyan-electric overflow-hidden flex items-center justify-center">
            {player.avatar_url
              ? <img src={player.avatar_url} className="w-full h-full object-cover" alt="" />
              : <span className="text-3xl font-black text-white">{(player.display_name || '?').charAt(0)}</span>}
          </div>
          <h3 className="text-xl font-black uppercase italic text-white tracking-tighter">
            {player.display_name}
          </h3>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] mt-1">
            Avaliação Técnica
          </p>
        </div>

        {/* Sliders */}
        <div className="space-y-6">
          {CATEGORIES.map(cat => (
            <div key={cat.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${cat.color}`}>
                    {cat.label}
                  </span>
                  <Tooltip text={cat.tip} iconClassName={`${cat.color} opacity-50 hover:opacity-100`} />
                </div>
                <span className="text-lg font-black font-mono text-white">{ratings[cat.id]}</span>
              </div>
              <input
                type="range" min="1" max="5" step="1"
                className="w-full accent-cyan-electric h-2 rounded-full appearance-none cursor-pointer"
                value={ratings[cat.id]}
                onChange={e => setRatings(prev => ({ ...prev, [cat.id]: parseInt(e.target.value) }))}
              />
              <div className="flex justify-between text-[8px] text-white/20 font-bold px-0.5">
                <span>Fraco</span><span>Médio</span><span>Elite</span>
              </div>
            </div>
          ))}
        </div>

        {/* Botões */}
        <div className="grid grid-cols-2 gap-3 mt-8">
          <button
            onClick={onClose}
            disabled={submitting}
            className="py-4 rounded-2xl bg-white/5 text-white/40 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="py-4 rounded-2xl bg-cyan-electric text-black font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting
              ? <><RefreshCw size={12} className="animate-spin" /> Enviando...</>
              : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatePlayerModal;
