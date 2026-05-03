// src/components/Tooltip.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Tooltip contextual reutilizável. Fase 4, Tarefa 4.2.
// Abre ao tocar no ícone de info (?) e fecha ao clicar fora.
//
// Uso:
//   <Tooltip text="Explicação aqui" />
//
// Com título:
//   <Tooltip title="Reserva" text="Jogadores extras ficam de reserva aguardando." />
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, X } from 'lucide-react';

const Tooltip = ({ title, text, iconSize = 13, iconClassName = 'text-text-muted hover:text-cyan-electric' }) => {
  const [open, setOpen]   = useState(false);
  const ref               = useRef(null);

  // Fechar ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        onClick={() => setOpen(o => !o)}
        className={`transition-colors ${iconClassName}`}
        aria-label="Ajuda"
      >
        <HelpCircle size={iconSize} />
      </button>

      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 animate-fade-in">
          <div className="bg-[#0a0a0a] border border-cyan-electric/20 rounded-2xl p-4 shadow-2xl shadow-black/80 relative">
            {/* Seta */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0a0a0a] border-b border-r border-cyan-electric/20 rotate-45" />

            {/* Botão fechar */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2.5 right-2.5 text-text-muted hover:text-text-mid transition-colors"
            >
              <X size={11} />
            </button>

            {title && (
              <p className="text-[10px] font-black text-cyan-electric uppercase tracking-widest mb-1.5 pr-4">
                {title}
              </p>
            )}
            <p className="text-[11px] text-text-mid font-medium leading-relaxed">
              {text}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
