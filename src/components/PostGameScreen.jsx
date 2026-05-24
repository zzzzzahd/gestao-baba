// src/components/PostGameScreen.jsx
// Sprint 3 — Tela pós-jogo: resumo do placar, MVP e CTA de compartilhamento.

import React, { useState } from 'react';
import { Trophy, Share2, Star, X, Crown } from 'lucide-react';
import MVPScreen from './MVPScreen';
import { fmt, WIN_MESSAGES, DRAW_MESSAGES } from '../utils/messages';

const PostGameScreen = ({
  match,        // { teamA, teamB, scoreA, scoreB }
  players = [],
  matchId,
  babaId,
  babaName,
  onClose,
}) => {
  const [showMVP, setShowMVP] = useState(false);

  if (!match) return null;

  const { teamA, teamB, scoreA = 0, scoreB = 0 } = match;
  const isDraw  = scoreA === scoreB;
  const winnerTeam = scoreA > scoreB ? teamA : teamB;

  const headline = isDraw
    ? fmt(DRAW_MESSAGES)
    : fmt(WIN_MESSAGES, { team: winnerTeam?.name ?? 'Time vencedor' });

  const handleShare = async () => {
    const text = [
      `⚽ ${babaName ?? 'Baba'}`,
      `${teamA?.name ?? 'Time A'} ${scoreA} × ${scoreB} ${teamB?.name ?? 'Time B'}`,
      isDraw ? '🤝 Empate!' : `🏆 Vencedor: ${winnerTeam?.name}`,
      '📱 gestao-baba.vercel.app',
    ].join('\n');
    if (navigator.share) {
      try { await navigator.share({ text }); } catch {}
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
        <div className="w-full max-w-xs bg-[#0a0a0a] border border-border-mid rounded-[2.5rem] p-6 space-y-5 shadow-2xl animate-slide-up">

          {/* Fechar */}
          <div className="flex justify-end">
            <button onClick={onClose} className="p-2 bg-surface-2 rounded-xl text-text-low hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Placar */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-4">
              <div className="flex-1 text-right">
                <p className="text-[10px] font-black uppercase text-cyan-electric/70 mb-1">{teamA?.name ?? 'Time A'}</p>
                <p className="text-5xl font-black tabular-nums text-white">{scoreA}</p>
              </div>
              <p className="text-text-muted font-black text-xl">×</p>
              <div className="flex-1 text-left">
                <p className="text-[10px] font-black uppercase text-yellow-500/70 mb-1">{teamB?.name ?? 'Time B'}</p>
                <p className="text-5xl font-black tabular-nums text-white">{scoreB}</p>
              </div>
            </div>
            <p className="text-[11px] text-text-low font-black mt-2 px-2">{headline}</p>
          </div>

          {/* Trophy se não-empate */}
          {!isDraw && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
              <Trophy size={16} className="text-yellow-500" />
              <span className="text-[11px] font-black uppercase text-yellow-500">
                {winnerTeam?.name} venceu! 🏆
              </span>
            </div>
          )}

          {/* Botões */}
          <div className="space-y-3">
            <button
              onClick={() => setShowMVP(true)}
              className="w-full py-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Crown size={15} /> Votar no MVP
            </button>
            <button
              onClick={handleShare}
              className="w-full py-4 rounded-2xl bg-surface-2 border border-border-mid text-text-low font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all hover:text-white"
            >
              <Share2 size={15} /> Compartilhar
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 text-text-muted font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors"
            >
              Próxima partida →
            </button>
          </div>
        </div>
      </div>

      {showMVP && (
        <MVPScreen
          matchId={matchId}
          babaId={babaId}
          players={players}
          onClose={() => setShowMVP(false)}
        />
      )}
    </>
  );
};

export default PostGameScreen;
