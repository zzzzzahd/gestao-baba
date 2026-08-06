// src/components/TeamsShareButton.jsx
// Compartilhar o sorteio de times via WhatsApp / navigator.share.

import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';

/**
 * @param {Object} props
 * @param {Array}  props.teams     - [{ name, players: [{ name, position }] }]
 * @param {Array}  [props.reserves] - [{ name, position }]
 * @param {string} [props.babaName]
 * @param {string} [props.className]
 */
export default function TeamsShareButton({ teams = [], reserves = [], babaName, className = '' }) {
  const [shared, setShared] = useState(false);

  if (!teams.length) return null;

  const buildText = () => {
    const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    const teamLines = teams.map((team) => {
      const players = (team.players || [])
        .map((p, idx) => `  ${idx + 1}. ${p.name}${p.position === 'goleiro' ? ' (GOL)' : ''}`)
        .join('\n');
      return `*${team.name}*\n${players}`;
    }).join('\n\n');

    const reserveLines = reserves.length
      ? `\n\n*Reservas:*\n${reserves.map((p) => `  • ${p.name}`).join('\n')}`
      : '';

    return [
      `⚽ *${babaName || 'Draft Play'}* — Sorteio de ${date}`,
      ``,
      teamLines,
      reserveLines,
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
        // fallback abaixo
      }
    }

    // Fallback: copia para a área de transferência
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 3000);
        return;
      } catch {
        // fallback final abaixo
      }
    }

    // Último recurso: abrir WhatsApp direto
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    setShared(true);
    setTimeout(() => setShared(false), 3000);
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={shared ? 'Sorteio compartilhado' : 'Compartilhar sorteio de times'}
      className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 ${
        shared
          ? 'bg-green-500/10 border-green-500/30 text-green-400'
          : 'bg-surface-2 border-border-mid text-text-low hover:text-white hover:border-border-strong'
      } ${className}`}
    >
      {shared ? <Check size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
      {shared ? 'Copiado / Compartilhado!' : 'Compartilhar Sorteio'}
    </button>
  );
}
