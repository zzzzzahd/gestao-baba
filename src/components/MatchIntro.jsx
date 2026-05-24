// src/components/MatchIntro.jsx
// Sprint 3 — Tela de introdução da partida com animação de 3 segundos.
// Exibe os dois times se confrontando antes do cronômetro iniciar.

import React, { useEffect, useState } from 'react';
import { Swords } from 'lucide-react';

const MatchIntro = ({ teamA, teamB, onDone }) => {
  const [phase, setPhase] = useState(0);
  // phase 0 = fade-in times | 1 = VS brilha | 2 = fade-out

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 2000);
    const t3 = setTimeout(() => onDone?.(), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black transition-opacity duration-500 ${
        phase === 2 ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Fundo animado */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-cyan-electric/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-8 text-center w-full max-w-xs">

        {/* Time A */}
        <div className={`transition-all duration-500 ${
          phase >= 0 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
        }`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-cyan-electric/60 mb-1">Time A</p>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-cyan-electric leading-none">
            {teamA?.name ?? 'Time A'}
          </h2>
          <p className="text-[10px] text-text-low mt-1">
            {teamA?.players?.length ?? 0} atletas
          </p>
        </div>

        {/* VS */}
        <div className={`transition-all duration-300 ${
          phase >= 1
            ? 'scale-110 opacity-100'
            : 'scale-75 opacity-0'
        }`}>
          <div className="flex items-center justify-center w-16 h-16 rounded-full border-2 border-white/20 bg-surface-1">
            <Swords size={28} className="text-white/60" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mt-2">VS</p>
        </div>

        {/* Time B */}
        <div className={`transition-all duration-500 ${
          phase >= 0 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
        }`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500/60 mb-1">Time B</p>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-yellow-500 leading-none">
            {teamB?.name ?? 'Time B'}
          </h2>
          <p className="text-[10px] text-text-low mt-1">
            {teamB?.players?.length ?? 0} atletas
          </p>
        </div>

        <p className="text-[9px] font-black uppercase tracking-widest text-white/20 animate-pulse">
          Boa bola!
        </p>
      </div>
    </div>
  );
};

export default MatchIntro;
