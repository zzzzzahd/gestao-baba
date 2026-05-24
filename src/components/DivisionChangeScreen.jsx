// src/components/DivisionChangeScreen.jsx
// Sprint 4 — Tela animada quando o jogador muda de divisão.

import React, { useEffect, useState } from 'react';
import { getDivision } from './DivisionBadge';
import { Sounds } from '../utils/sounds';

const DivisionChangeScreen = ({ oldRating, newRating, playerName, onDone }) => {
  const [phase, setPhase] = useState(0);
  const oldDiv  = getDivision(oldRating);
  const newDiv  = getDivision(newRating);
  const promoted = newRating > oldRating;

  useEffect(() => {
    Sounds.unlock();
    const t1 = setTimeout(() => setPhase(1), 600);
    const t2 = setTimeout(() => setPhase(2), 1800);
    const t3 = setTimeout(() => onDone?.(), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[110] flex items-center justify-center bg-black transition-opacity duration-500 ${
        phase === 2 ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Partículas de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {promoted && [1,2,3,4,5].map(i => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-yellow-500 animate-bounce"
            style={{
              left:            `${15 + i * 15}%`,
              top:             `${20 + (i % 3) * 20}%`,
              animationDelay:  `${i * 0.1}s`,
              animationDuration:'0.8s',
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-8 text-center">

        {/* Título */}
        <p className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-500 ${
          phase >= 0 ? 'opacity-100' : 'opacity-0'
        } ${promoted ? 'text-yellow-500' : 'text-red-400'}`}>
          {promoted ? '🎉 Subiu de divisão!' : '📉 Desceu de divisão'}
        </p>

        {/* Divisão antiga → nova */}
        <div className={`flex items-center gap-4 transition-all duration-500 ${
          phase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}>
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl opacity-40">{oldDiv.emoji}</span>
            <span className="text-[9px] font-black uppercase text-text-muted">{oldDiv.label}</span>
          </div>

          <span className="text-2xl text-white">{promoted ? '→' : '→'}</span>

          <div className="flex flex-col items-center gap-1">
            <span className="text-5xl">{newDiv.emoji}</span>
            <span className={`text-[11px] font-black uppercase tracking-widest ${
              promoted ? 'text-yellow-500' : 'text-red-400'
            }`}>{newDiv.label}</span>
          </div>
        </div>

        {/* Nome do jogador */}
        <p className={`text-lg font-black uppercase italic text-white tracking-tighter transition-all duration-300 ${
          phase >= 1 ? 'opacity-100' : 'opacity-0'
        }`}>
          {playerName}
        </p>

        <p className="text-[9px] font-black uppercase text-text-muted tracking-widest animate-pulse">
          Continua jogando!
        </p>
      </div>
    </div>
  );
};

export default DivisionChangeScreen;
