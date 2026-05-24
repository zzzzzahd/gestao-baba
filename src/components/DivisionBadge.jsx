// src/components/DivisionBadge.jsx
// Sprint 4 — Divisão calculada pela média de rating do jogador.

import React from 'react';

const DIVISIONS = [
  { min: 0,   max: 2.0, id: 'ferro',     label: 'Ferro',     emoji: '⚙️', color: 'text-gray-400  bg-gray-400/10  border-gray-400/20'    },
  { min: 2.0, max: 2.8, id: 'bronze',    label: 'Bronze',    emoji: '🥉', color: 'text-orange-600 bg-orange-600/10 border-orange-600/20' },
  { min: 2.8, max: 3.5, id: 'prata',     label: 'Prata',     emoji: '🥈', color: 'text-gray-300  bg-gray-300/10  border-gray-300/20'    },
  { min: 3.5, max: 4.2, id: 'ouro',      label: 'Ouro',      emoji: '🥇', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' },
  { min: 4.2, max: 4.7, id: 'platina',   label: 'Platina',   emoji: '💎', color: 'text-cyan-400  bg-cyan-400/10  border-cyan-400/20'    },
  { min: 4.7, max: 5.0, id: 'diamante',  label: 'Diamante',  emoji: '👑', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
];

export const getDivision = (rating = 0) =>
  DIVISIONS.find(d => rating >= d.min && rating < d.max) ?? DIVISIONS[0];

const DivisionBadge = ({ rating = 0, compact = false }) => {
  const div = getDivision(rating);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest ${div.color}`}
      title={`Divisão ${div.label} — Rating ${Number(rating).toFixed(2)}`}
    >
      <span>{div.emoji}</span>
      {!compact && <span>{div.label}</span>}
    </span>
  );
};

export default DivisionBadge;
