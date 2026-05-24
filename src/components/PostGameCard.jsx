// src/components/PostGameCard.jsx
// Sprint 3 — Card visual de resultado da partida para Stories/WhatsApp.
// Complementa o ShareableCardModal com dados da partida atual.

import React from 'react';
import { Trophy, Zap } from 'lucide-react';

const PostGameCard = ({ match, babaName, mvpName }) => {
  if (!match) return null;

  const { teamA, teamB, scoreA = 0, scoreB = 0 } = match;
  const isDraw     = scoreA === scoreB;
  const winnerTeam = scoreA > scoreB ? teamA : teamB;

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl border border-cyan-electric/20"
      style={{
        background: 'linear-gradient(135deg, #000 60%, rgba(0,242,255,0.08) 100%)',
        minHeight: 220,
      }}
    >
      {/* Fundo decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-cyan-electric/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">RESULTADO</p>
            <p className="text-[11px] font-black uppercase text-text-low">{babaName}</p>
          </div>
          <Zap size={18} className="text-cyan-electric/40" />
        </div>

        {/* Placar */}
        <div className="flex items-center justify-center gap-6">
          <div className="flex-1 text-right">
            <p className="text-[10px] font-black uppercase text-cyan-electric/70 mb-1 truncate">
              {teamA?.name ?? 'Time A'}
            </p>
            <p className="text-5xl font-black tabular-nums text-white">{scoreA}</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-text-muted font-black text-2xl">×</p>
            {!isDraw && (
              <Trophy size={14} className="text-yellow-500" />
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="text-[10px] font-black uppercase text-yellow-500/70 mb-1 truncate">
              {teamB?.name ?? 'Time B'}
            </p>
            <p className="text-5xl font-black tabular-nums text-white">{scoreB}</p>
          </div>
        </div>

        {/* Resultado */}
        {isDraw ? (
          <p className="text-center text-[10px] font-black uppercase text-text-muted tracking-widest">
            🤝 Empate
          </p>
        ) : (
          <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <Trophy size={12} className="text-yellow-500" />
            <p className="text-[10px] font-black uppercase text-yellow-500">
              {winnerTeam?.name} venceu!
            </p>
          </div>
        )}

        {/* MVP */}
        {mvpName && (
          <div className="flex items-center justify-center gap-2">
            <span className="text-[9px] font-black uppercase text-text-muted tracking-widest">
              ⭐ MVP:
            </span>
            <span className="text-[10px] font-black uppercase text-white">{mvpName}</span>
          </div>
        )}

        {/* Rodapé */}
        <p className="text-center text-[8px] font-black uppercase text-text-muted/50 tracking-[0.3em]">
          DRAFT PLAY
        </p>
      </div>
    </div>
  );
};

export default PostGameCard;
