// src/components/MatchReactionsBar.jsx
// Reações persistidas por partida, pensadas pro Histórico (pós-jogo).
// Diferente do MatchReactions.jsx (broadcast efêmero, só ao vivo dentro da
// partida), aqui cada reação é gravada na tabela match_reactions e fica
// disponível pra sempre — qualquer membro do baba pode reagir a qualquer
// partida finalizada, a qualquer momento, não só durante o jogo.

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

const REACTIONS = ['⚽', '🔥', '😱', '👑', '💪', '🤣', '😤', '🎯'];

const MatchReactionsBar = ({ matchId, babaId, myPlayerId }) => {
  const [counts,  setCounts]  = useState({});   // { emoji: count }
  const [mine,    setMine]    = useState(new Set()); // emojis que eu já reagi
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState(null); // emoji em voo (evita double-tap)

  const load = useCallback(async () => {
    if (!matchId) return;
    const { data, error } = await supabase
      .from('match_reactions')
      .select('emoji, player_id')
      .eq('match_id', matchId);

    if (!error) {
      const c = {};
      const mineSet = new Set();
      (data || []).forEach(r => {
        c[r.emoji] = (c[r.emoji] || 0) + 1;
        if (myPlayerId && r.player_id === myPlayerId) mineSet.add(r.emoji);
      });
      setCounts(c);
      setMine(mineSet);
    }
    setLoading(false);
  }, [matchId, myPlayerId]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (emoji) => {
    if (busy || !myPlayerId || !matchId || !babaId) return;
    setBusy(emoji);

    const already = mine.has(emoji);

    // Otimista
    setCounts(prev => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] || 0) + (already ? -1 : 1)) }));
    setMine(prev => {
      const next = new Set(prev);
      already ? next.delete(emoji) : next.add(emoji);
      return next;
    });

    try {
      if (already) {
        await supabase
          .from('match_reactions')
          .delete()
          .eq('match_id', matchId)
          .eq('player_id', myPlayerId)
          .eq('emoji', emoji);
      } else {
        const { error } = await supabase.from('match_reactions').insert({
          match_id:  matchId,
          baba_id:   babaId,
          player_id: myPlayerId,
          emoji,
        });
        // 23505 = já reagiu com esse emoji noutra aba/dispositivo; ignora
        if (error && error.code !== '23505') throw error;
      }
    } catch {
      // Reverte otimismo em caso de erro
      await load();
    } finally {
      setBusy(null);
    }
  };

  const totalReactions = Object.values(counts).reduce((s, n) => s + n, 0);

  if (loading) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1">
      {REACTIONS.map(emoji => {
        const count = counts[emoji] || 0;
        const active = mine.has(emoji);
        if (count === 0 && !myPlayerId) return null; // visitante sem player_id não pode reagir nem ver botão vazio
        return (
          <button
            key={emoji}
            type="button"
            disabled={!myPlayerId || busy === emoji}
            onClick={() => toggle(emoji)}
            aria-label={`Reagir com ${emoji}${count > 0 ? `, ${count}` : ''}`}
            aria-pressed={active}
            className={`flex items-center gap-1 px-2 py-1 rounded-xl border text-sm transition-all active:scale-90 disabled:opacity-40 ${
              active
                ? 'bg-cyan-electric/10 border-cyan-electric/40'
                : count > 0
                  ? 'bg-surface-2 border-border-mid'
                  : 'bg-surface-1 border-border-subtle hover:border-border-mid'
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-[10px] font-black text-text-low">{count}</span>}
          </button>
        );
      })}
      {totalReactions === 0 && !myPlayerId && null}
    </div>
  );
};

export default MatchReactionsBar;
