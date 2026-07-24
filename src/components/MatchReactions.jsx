// src/components/MatchReactions.jsx
// Sprint 3/7 — Reações em tempo real durante a partida.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';

const REACTIONS = ['⚽', '🔥', '😱', '👑', '💪', '🤣', '😤', '🎯'];

const FloatingEmoji = ({ emoji, id }) => (
  <div
    key={id}
    className="absolute pointer-events-none text-3xl animate-bounce"
    style={{
      left: `${20 + Math.random() * 60}%`,
      bottom: `${10 + Math.random() * 40}%`,
      animation: 'floatUp 2s ease-out forwards',
    }}
  >
    {emoji}
  </div>
);

const MatchReactions = ({ matchId, currentUserId }) => {
  const [floating, setFloating] = useState([]);
  const [cooldown, setCooldown] = useState(false);

  // Guarda o canal para reutilizar
  const channelRef = useRef(null);

  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`reactions:${matchId}`)
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const id = Date.now() + Math.random();

        setFloating(prev => [...prev, { id, emoji: payload.emoji }]);

        setTimeout(() => {
          setFloating(prev => prev.filter(f => f.id !== id));
        }, 2000);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [matchId]);

  const sendReaction = useCallback(async (emoji) => {
    if (cooldown || !matchId || !channelRef.current) return;

    setCooldown(true);

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: {
          emoji,
          user_id: currentUserId,
        },
      });
    } finally {
      setTimeout(() => {
        setCooldown(false);
      }, 1000);
    }
  }, [cooldown, matchId, currentUserId]);

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-80px) scale(0.5); opacity: 0; }
        }
      `}</style>

      <div className="fixed inset-0 z-[40] pointer-events-none overflow-hidden">
        {floating.map(f => (
          <FloatingEmoji
            key={f.id}
            id={f.id}
            emoji={f.emoji}
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 py-2">
        {REACTIONS.map(emoji => (
          <button
            key={emoji}
            type="button"
            disabled={cooldown}
            onClick={() => sendReaction(emoji)}
            aria-label={emoji}
            className="text-2xl active:scale-125 transition-transform disabled:opacity-50 hover:scale-110"
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
};

export default MatchReactions;