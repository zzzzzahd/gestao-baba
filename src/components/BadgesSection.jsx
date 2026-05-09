// src/components/BadgesSection.jsx
// Sprint 14 — Exibe badges conquistados pelo jogador, com animação de revelação.

import React, { useState, useEffect } from 'react';
import { Shield, Lock } from 'lucide-react';
import { supabase } from '../services/supabase';

const RARITY_STYLES = {
  common:    { glow: 'shadow-white/10',     ring: 'ring-white/20',       label: 'Comum',     bg: 'bg-white/5'      },
  rare:      { glow: 'shadow-blue-500/20',  ring: 'ring-blue-500/30',    label: 'Raro',      bg: 'bg-blue-500/5'   },
  epic:      { glow: 'shadow-purple-500/30',ring: 'ring-purple-500/40',  label: 'Épico',     bg: 'bg-purple-500/5' },
  legendary: { glow: 'shadow-yellow-400/40',ring: 'ring-yellow-400/50',  label: 'Lendário',  bg: 'bg-yellow-400/5' },
};

const BadgeCard = ({ badge, earned, earnedAt }) => {
  const rarity = RARITY_STYLES[badge.rarity] || RARITY_STYLES.common;
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), 100);
    return () => clearTimeout(id);
  }, []);

  return (
    <div
      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border ring-1 transition-all duration-500 ${
        earned
          ? `${rarity.bg} ${rarity.ring} shadow-lg ${rarity.glow} ${revealed ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`
          : 'bg-surface-1 border-border-subtle ring-transparent opacity-40 grayscale'
      }`}
    >
      {/* Ícone */}
      <span className={`text-2xl leading-none ${!earned ? 'blur-[2px]' : ''}`}>
        {earned ? badge.icon : '🔒'}
      </span>

      {/* Nome */}
      <span className={`text-[9px] font-black uppercase tracking-widest text-center leading-tight ${
        earned ? 'text-white' : 'text-text-muted'
      }`}>
        {earned ? badge.name : '???'}
      </span>

      {/* Raridade */}
      {earned && (
        <span className={`text-[8px] font-black uppercase ${
          badge.rarity === 'legendary' ? 'text-yellow-400'
          : badge.rarity === 'epic'    ? 'text-purple-400'
          : badge.rarity === 'rare'    ? 'text-blue-400'
          : 'text-text-low'
        }`}>
          {rarity.label}
        </span>
      )}

      {/* Data de conquista */}
      {earned && earnedAt && (
        <span className="text-[8px] text-text-muted font-black">
          {new Date(earnedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
        </span>
      )}
    </div>
  );
};

export default function BadgesSection({ playerId, babaId }) {
  const [allBadges,    setAllBadges]    = useState([]);
  const [earnedMap,    setEarnedMap]    = useState(new Map());
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState('all'); // 'all' | 'earned' | 'locked'

  useEffect(() => {
    if (!playerId || !babaId) return;
    load();
  }, [playerId, babaId]);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: defs }, { data: earned }] = await Promise.all([
        supabase.from('badge_definitions').select('*').eq('is_active', true).order('rarity'),
        supabase.from('player_badges').select('badge_id, earned_at').eq('player_id', playerId),
      ]);

      setAllBadges(defs || []);
      const map = new Map((earned || []).map(b => [b.badge_id, b.earned_at]));
      setEarnedMap(map);

      // Marcar como visto
      if (earned?.some(b => !b.seen)) {
        await supabase.rpc('mark_badges_seen', { p_player_id: playerId });
      }
    } catch (err) {
      console.error('[BadgesSection]', err);
    } finally {
      setLoading(false);
    }
  };

  const earnedCount = earnedMap.size;
  const filtered = allBadges.filter(b => {
    if (filter === 'earned') return earnedMap.has(b.id);
    if (filter === 'locked') return !earnedMap.has(b.id);
    return true;
  });

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-surface-1 border border-border-subtle animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-cyan-electric" />
          <span className="text-[10px] font-black uppercase tracking-widest text-text-low">
            Conquistas
          </span>
        </div>
        <span className="text-[10px] font-black text-cyan-electric">
          {earnedCount}/{allBadges.length}
        </span>
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5">
        {[
          { id: 'all',    label: 'Todas'       },
          { id: 'earned', label: 'Conquistadas' },
          { id: 'locked', label: 'Bloqueadas'   },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
              filter === f.id
                ? 'bg-cyan-electric text-black'
                : 'bg-surface-1 border border-border-mid text-text-low hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid de badges */}
      {filtered.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-[10px] font-black uppercase text-text-muted tracking-widest">
            {filter === 'earned' ? 'Nenhuma conquista ainda' : 'Tudo desbloqueado!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {filtered.map(badge => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              earned={earnedMap.has(badge.id)}
              earnedAt={earnedMap.get(badge.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

