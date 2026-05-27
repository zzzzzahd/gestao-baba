// src/components/ChangelogModal.jsx
// Sprint 6 — Changelog atualizado com novidades dos Sprints 1-5.

import React from 'react';
import { X, Sparkles, Shield, Zap, Bug, Trophy, Star } from 'lucide-react';

const CURRENT_VERSION = '2.0.0';
const STORAGE_KEY     = `draft_play_changelog_seen_${CURRENT_VERSION}`;

const CHANGELOG = [
  {
    version: '2.0.0',
    date:    'Jun 2026',
    items: [
      { type: 'feature',  icon: Zap,      text: 'Modo do baba: Casual, Competitivo ou Completo — você escolhe o nível de complexidade' },
      { type: 'feature',  icon: Sparkles, text: 'Animação de intro antes de cada partida com os dois times' },
      { type: 'feature',  icon: Trophy,   text: 'MVP do jogo — vote no craque após a partida' },
      { type: 'feature',  icon: Zap,      text: 'Reações em tempo real durante a partida (emojis ao vivo)' },
      { type: 'feature',  icon: Star,     text: 'Sistema de divisões: Ferro → Bronze → Prata → Ouro → Platina → Diamante' },
      { type: 'feature',  icon: Trophy,   text: 'Temporadas mensais com ranking de pontos' },
      { type: 'feature',  icon: Sparkles, text: 'Narrativa da partida gerada por IA (Gemini)' },
      { type: 'feature',  icon: Zap,      text: 'Sons de gol, apito e vitória' },
      { type: 'feature',  icon: Sparkles, text: 'Features desbloqueadas progressivamente conforme você joga' },
      { type: 'fix',      icon: Bug,      text: 'Menu de navegação agora se adapta ao modo do baba' },
    ],
  },
];

const TYPE_CONFIG = {
  feature:  { label: 'Novo',      className: 'bg-cyan-electric/10 text-cyan-electric border-cyan-electric/20' },
  security: { label: 'Segurança', className: 'bg-green-500/10 text-green-400 border-green-500/20'             },
  fix:      { label: 'Correção',  className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'          },
};

export const shouldShowChangelog = () => {
  try { return !localStorage.getItem(STORAGE_KEY); }
  catch { return false; }
};

export const markChangelogSeen = () => {
  try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
};

export default function ChangelogModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  const entry = CHANGELOG[0];

  const handleClose = () => { markChangelogSeen(); onClose?.(); };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-labelledby="changelog-title"
    >
      <div className="w-full max-w-sm bg-surface-1 border border-border-mid rounded-3xl overflow-hidden shadow-2xl animate-page-in">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-electric/10 border border-cyan-electric/20 flex items-center justify-center">
              <Sparkles size={16} className="text-cyan-electric" />
            </div>
            <div>
              <h2 id="changelog-title" className="text-sm font-black uppercase tracking-widest text-white">
                Novidades
              </h2>
              <p className="text-[9px] text-text-low font-black uppercase">
                v{entry.version} · {entry.date}
              </p>
            </div>
          </div>
          <button onClick={handleClose} aria-label="Fechar" className="p-2 rounded-xl text-text-low hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Lista */}
        <div className="p-5 space-y-2.5 max-h-[55vh] overflow-y-auto">
          {entry.items.map((item, i) => {
            const cfg  = TYPE_CONFIG[item.type] || TYPE_CONFIG.feature;
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-start gap-3">
                <div className={`flex-shrink-0 px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest ${cfg.className}`}>
                  {cfg.label}
                </div>
                <p className="text-[11px] text-text-mid leading-relaxed flex-1">{item.text}</p>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border-subtle">
          <button
            onClick={handleClose}
            className="w-full py-3 rounded-2xl bg-cyan-electric/10 border border-cyan-electric/20 text-cyan-electric text-[10px] font-black uppercase tracking-widest hover:bg-cyan-electric/20 transition-all active:scale-95"
          >
            Entendido, vamos jogar! ⚽
          </button>
        </div>
      </div>
    </div>
  );
}
