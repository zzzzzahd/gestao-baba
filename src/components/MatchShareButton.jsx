// src/components/MatchShareButton.jsx
// Fase 3 — Compartilhar resultado de partida via WhatsApp / navigator.share.

import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';

/**
 * @param {Object} props
 * @param {Object} props.match  - { team_a_name, team_b_name, team_a_score, team_b_score, match_date }
 * @param {string} props.babaName
 * @param {Array}  props.topScorers - [{ name, goals }] — top 3 artilheiros
 * @param {string} [props.className]
 */
export default function MatchShareButton({ match, babaName, topScorers = [], className = '' }) {
  const [shared, setShared] = useState(false);

  if (!match) return null;

  const buildText = () => {
    const date   = match.match_date
      ? new Date(match.match_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      : '';
    const winner = match.team_a_score > match.team_b_score
      ? match.team_a_name
      : match.team_b_score > match.team_a_score
        ? match.team_b_name
        : null;

    const scorerLines = topScorers.slice(0, 3)
      .map(s => `  ⚽ ${s.name} (${s.goals} gol${s.goals !== 1 ? 's' : ''})`)
      .join('\n');

    return [
      `🏟️ *${babaName || 'Draft Play'}*${date ? ` — ${date}` : ''}`,
      ``,
      `*${match.team_a_name || 'Time A'}* ${match.team_a_score ?? 0} × ${match.team_b_score ?? 0} *${match.team_b_name || 'Time B'}*`,
      winner ? `🏆 Vencedor: ${winner}` : `🤝 Empate`,
      scorerLines ? `\n*Artilheiros:*\n${scorerLines}` : '',
      ``,
      `📱 Gerencie seu baba em: https://gestao-baba.vercel.app`,
    ].filter(Boolean).join('\n');
  };

  const handleShare = async () => {
    const text = buildText();

    // Tenta Web Share API primeiro (nativo no mobile)
    if (navigator.share) {
      try {
        await navigator.share({ text });
        setShared(true);
        setTimeout(() => setShared(false), 3000);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // usuário cancelou
        // fallback para WhatsApp
      }
    }

    // Fallback: abrir WhatsApp
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    setShared(true);
    setTimeout(() => setShared(false), 3000);
  };

  return (
    <button
      onClick={handleShare}
      aria-label="Compartilhar resultado da partida"
      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all active:scale-95 ${
        shared
          ? 'bg-green-500/10 border-green-500/30 text-green-400'
          : 'bg-surface-2 border-border-mid text-text-low hover:text-white hover:border-border-strong'
      } ${className}`}
    >
      {shared ? <Check size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
      <span className="text-[10px] font-black uppercase tracking-widest">
        {shared ? 'Compartilhado!' : 'Compartilhar'}
      </span>
    </button>
  );
}
