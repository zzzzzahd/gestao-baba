// src/components/ModeSelector.jsx
// Sprint 1 — Seletor de modo exibido UMA VEZ após criar baba (presidente).

import React, { useState } from 'react';
import { Zap, Trophy, Settings2 } from 'lucide-react';
import { useBaba } from '../contexts/BabaContext';
import toast from 'react-hot-toast';

const MODES = [
  {
    id:        'casual',
    icon:      Zap,
    emoji:     '⚽',
    title:     'Casual',
    sub:       'Só o essencial. Presença, times e placar.',
    badge:     'Recomendado',
    color:     'border-cyan-electric/40 bg-cyan-electric/5',
    textColor: 'text-cyan-electric',
    checkBg:   'bg-cyan-electric',
  },
  {
    id:        'competitive',
    icon:      Trophy,
    emoji:     '🏆',
    title:     'Competitivo',
    sub:       'Rankings, badges, MVPs e temporadas.',
    badge:     null,
    color:     'border-yellow-500/40 bg-yellow-500/5',
    textColor: 'text-yellow-500',
    checkBg:   'bg-yellow-500',
  },
  {
    id:        'full',
    icon:      Settings2,
    emoji:     '⚙️',
    title:     'Completo',
    sub:       'Tudo: financeiro, IA e relatórios.',
    badge:     null,
    color:     'border-purple-500/40 bg-purple-500/5',
    textColor: 'text-purple-400',
    checkBg:   'bg-purple-400',
  },
];

const ModeSelector = ({ onClose }) => {
  const { currentBaba, updateBaba } = useBaba();
  const [selected, setSelected] = useState('casual');
  const [saving,   setSaving]   = useState(false);

  const handleConfirm = async () => {
    if (!currentBaba || saving) return;
    setSaving(true);
    try {
      await updateBaba(currentBaba.id, { mode: selected });
      const msgs = {
        casual:      'Modo Casual ativado. Simples e direto! ⚽',
        competitive: 'Modo Competitivo ativado. Que comecem os jogos! 🏆',
        full:        'Modo Completo ativado. Você tem controle total. ⚙️',
      };
      toast.success(msgs[selected]);
      onClose?.();
    } catch {
      toast.error('Erro ao salvar modo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#0a0a0a] border border-border-mid rounded-t-[2.5rem] p-6 space-y-5 shadow-2xl">

        <div className="text-center">
          <h2 className="text-xl font-black uppercase italic tracking-tighter">
            Como vocês jogam?
          </h2>
          <p className="text-[10px] text-text-low mt-1 font-black uppercase tracking-widest">
            Você pode mudar isso depois nas configurações
          </p>
        </div>

        <div className="space-y-3">
          {MODES.map(mode => {
            const isActive = selected === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setSelected(mode.id)}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ${
                  isActive ? mode.color : 'border-border-mid bg-surface-2'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{mode.emoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-black uppercase ${
                          isActive ? mode.textColor : 'text-white'
                        }`}>
                          {mode.title}
                        </p>
                        {mode.badge && (
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-cyan-electric/20 text-cyan-electric">
                            {mode.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-text-low mt-0.5">{mode.sub}</p>
                    </div>
                  </div>
                  {isActive && (
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${mode.checkBg}`}>
                      <span className="text-black text-xs font-black">✓</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleConfirm}
          disabled={saving}
          className="w-full py-4 rounded-2xl font-black uppercase text-black text-sm active:scale-95 transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
        >
          {saving ? 'Salvando...' : 'Confirmar →'}
        </button>
      </div>
    </div>
  );
};

export default ModeSelector;
