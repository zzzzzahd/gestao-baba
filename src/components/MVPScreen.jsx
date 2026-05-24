// src/components/MVPScreen.jsx
// Sprint 3 — Votação e revelação do MVP após a partida.

import React, { useState, useEffect } from 'react';
import { Star, Crown, X } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Sounds } from '../utils/sounds';
import { fmt, MVP_MESSAGES } from '../utils/messages';
import toast from 'react-hot-toast';

const MVPScreen = ({ matchId, babaId, players = [], onClose }) => {
  const [phase,   setPhase]   = useState('vote');   // 'vote' | 'reveal'
  const [votes,   setVotes]   = useState({});        // playerId → count
  const [voted,   setVoted]   = useState(false);
  const [winner,  setWinner]  = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(false);

  // Buscar votos existentes
  useEffect(() => {
    if (!matchId) return;
    supabase
      .from('mvp_votes')
      .select('voted_player_id')
      .eq('match_id', matchId)
      .then(({ data }) => {
        const counts = {};
        (data || []).forEach(v => {
          counts[v.voted_player_id] = (counts[v.voted_player_id] || 0) + 1;
        });
        setVotes(counts);
      });
  }, [matchId]);

  const handleVote = async (playerId) => {
    if (voted || saving) return;
    setSaving(true);
    const { error } = await supabase.from('mvp_votes').insert({
      match_id:         matchId,
      voted_player_id:  playerId,
    });
    if (error && error.code !== '23505') {
      toast.error('Erro ao votar');
      setSaving(false);
      return;
    }
    setVotes(prev => ({ ...prev, [playerId]: (prev[playerId] || 0) + 1 }));
    setVoted(true);
    setSaving(false);
    toast.success('Voto registrado! ✅');
  };

  const handleReveal = () => {
    const mvpId = Object.keys(votes).sort((a, b) => (votes[b] || 0) - (votes[a] || 0))[0];
    const mvp   = players.find(p => p.id === mvpId);
    setWinner(mvp || null);
    setPhase('reveal');
    Sounds.mvp();
  };

  const allPlayers = players.filter(p => p.id);
  const sortedPlayers = [...allPlayers].sort(
    (a, b) => (votes[b.id] || 0) - (votes[a.id] || 0)
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="w-full max-w-sm bg-[#0a0a0a] border border-yellow-500/20 rounded-t-[2.5rem] p-6 space-y-5 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center border border-yellow-500/20">
              <Crown size={20} className="text-yellow-500" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase italic">MVP do Jogo</h3>
              <p className="text-[9px] text-yellow-500/60 font-black uppercase">
                {phase === 'vote' ? 'Vote no craque' : 'E o MVP é...'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-surface-2 rounded-xl text-text-low hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Fase: votação */}
        {phase === 'vote' && (
          <>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sortedPlayers.map(p => {
                const count = votes[p.id] || 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleVote(p.id)}
                    disabled={voted || saving}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-95 ${
                      voted
                        ? 'bg-surface-1 border-border-subtle opacity-70'
                        : 'bg-surface-2 border-border-mid hover:border-yellow-500/30 hover:bg-yellow-500/5'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-sm font-black overflow-hidden">
                      {p.avatar_url
                        ? <img src={p.avatar_url} className="w-full h-full object-cover" alt="" />
                        : (p.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-[11px] font-black uppercase text-left truncate">{p.name}</span>
                    {count > 0 && (
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star size={11} fill="currentColor" />
                        <span className="text-[10px] font-black">{count}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {Object.keys(votes).length > 0 && (
              <button
                onClick={handleReveal}
                className="w-full py-4 rounded-2xl bg-yellow-500 text-black font-black uppercase text-xs tracking-widest active:scale-95 transition-all"
              >
                Revelar MVP 👑
              </button>
            )}
          </>
        )}

        {/* Fase: revelação */}
        {phase === 'reveal' && winner && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-24 h-24 rounded-full border-4 border-yellow-500 overflow-hidden bg-surface-3 flex items-center justify-center">
                {winner.avatar_url
                  ? <img src={winner.avatar_url} className="w-full h-full object-cover" alt="" />
                  : <span className="text-3xl font-black text-yellow-500">{winner.name?.charAt(0)}</span>}
              </div>
              <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 text-yellow-500" size={28} />
            </div>
            <div>
              <p className="text-2xl font-black uppercase italic text-white tracking-tighter">
                {winner.name}
              </p>
              <p className="text-[10px] text-yellow-500 font-black uppercase tracking-widest mt-1">
                MVP do Baba 🌟
              </p>
              <p className="text-[11px] text-text-low mt-2">
                {fmt(MVP_MESSAGES, { name: winner.name })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-2xl bg-yellow-500 text-black font-black uppercase text-xs tracking-widest active:scale-95 transition-all"
            >
              Fechar
            </button>
          </div>
        )}

        {phase === 'reveal' && !winner && (
          <div className="text-center py-6">
            <p className="text-text-muted font-black uppercase text-sm">Sem votos registrados</p>
            <button onClick={onClose} className="mt-3 text-[10px] text-cyan-electric uppercase font-black">Fechar</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MVPScreen;
