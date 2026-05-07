// src/pages/PublicProfilePage.jsx
// Sprint 12 — Perfil público de um jogador acessível sem login.
// Rota: /player/:userId

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { ArrowLeft, Star, Zap, TrendingUp, Users, Trophy, Shield, Crown, Flame, Target } from 'lucide-react';
import StreakBadge from '../components/StreakBadge';

const BADGE_DEFINITIONS = [
  { id: 'estreante',    icon: '🌱', label: 'Estreante',      condition: ({ matches }) => matches >= 1  },
  { id: 'veterano',     icon: '🛡️', label: 'Veterano',       condition: ({ matches }) => matches >= 10 },
  { id: 'lenda',        icon: '👑', label: 'Lenda',          condition: ({ matches }) => matches >= 30 },
  { id: 'artilheiro',   icon: '⚡', label: 'Artilheiro',     condition: ({ goals })   => goals   >= 10 },
  { id: 'maquina',      icon: '🔥', label: 'Máquina de Gol', condition: ({ goals })   => goals   >= 30 },
  { id: 'garcom',       icon: '🎯', label: 'Garçom',         condition: ({ assists }) => assists >= 10 },
  { id: 'bem_avaliado', icon: '⭐', label: 'Bem Avaliado',   condition: ({ rating })  => rating  >= 4.0 },
  { id: 'elite',        icon: '💎', label: 'Elite',          condition: ({ rating })  => rating  >= 4.5 },
];

export default function PublicProfilePage() {
  const { userId } = useParams();
  const navigate   = useNavigate();

  const [profile,  setProfile]  = useState(null);
  const [stats,    setStats]    = useState(null);
  const [streak,   setStreak]   = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) return;
    loadPublicProfile();
  }, [userId]);

  const loadPublicProfile = async () => {
    setLoading(true);
    try {
      // Perfil público
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, position, favorite_team')
        .eq('id', userId)
        .single();

      if (!prof) { setNotFound(true); return; }
      setProfile(prof);

      // Estatísticas agregadas de todos os babas
      const { data: mp } = await supabase
        .from('match_players')
        .select('goals, assists, player:players!inner(user_id)')
        .eq('player.user_id', userId);

      const goals   = (mp || []).reduce((s, r) => s + (r.goals   || 0), 0);
      const assists = (mp || []).reduce((s, r) => s + (r.assists || 0), 0);
      const matches = mp?.length || 0;

      // Rating médio
      const { data: ratings } = await supabase
        .from('player_rating_summary')
        .select('final_rating')
        .in('player_id', (await supabase.from('players').select('id').eq('user_id', userId)).data?.map(p => p.id) || []);

      const ratingVals = (ratings || []).map(r => r.final_rating).filter(v => v > 0);
      const avgRating  = ratingVals.length ? ratingVals.reduce((a, b) => a + b, 0) / ratingVals.length : 0;

      // Streak
      const { data: confs } = await supabase
        .from('game_confirmations')
        .select('game_date, status')
        .in('player_id', (await supabase.from('players').select('id').eq('user_id', userId)).data?.map(p => p.id) || [])
        .eq('status', 'confirmed')
        .order('game_date', { ascending: false })
        .limit(30);

      const sorted = confs || [];
      let s = sorted.length > 0 ? 1 : 0;
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1].game_date);
        const curr = new Date(sorted[i].game_date);
        if ((prev - curr) / (1000 * 60 * 60 * 24) <= 14) s++;
        else break;
      }
      setStreak(s);
      setStats({ goals, assists, matches, rating: avgRating });
    } catch (err) {
      console.error('[PublicProfilePage]', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-center px-6">
      <p className="text-5xl">🔍</p>
      <h1 className="text-xl font-black text-white uppercase">Jogador não encontrado</h1>
      <button onClick={() => navigate(-1)} className="text-cyan-electric font-black uppercase text-sm">
        ← Voltar
      </button>
    </div>
  );

  const POSITION_LABEL = {
    goleiro: 'Goleiro', zagueiro: 'Zagueiro', lateral: 'Lateral',
    meia: 'Meia', atacante: 'Atacante', linha: 'Linha',
    fixo: 'Fixo', ala: 'Ala', pivo: 'Pivô',
  };

  const unlockedBadges = BADGE_DEFINITIONS.filter(b => b.condition(stats));

  return (
    <div className="min-h-screen bg-black text-white pb-12">

      {/* Header fundo */}
      <div className="h-32 relative bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,243,255,0.08)_0%,_transparent_70%)]" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 p-2.5 bg-black/60 backdrop-blur-md rounded-2xl border border-border-mid text-text-low hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <p className="absolute top-6 right-6 text-[9px] font-black uppercase tracking-widest text-text-muted">
          Perfil Público
        </p>
      </div>

      {/* Avatar */}
      <div className="flex justify-center -mt-14 mb-4">
        <div className="w-28 h-28 rounded-[2rem] border-4 border-black bg-gray-900 overflow-hidden shadow-2xl flex items-center justify-center">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-black text-cyan-electric">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <div className="px-6 space-y-6 max-w-md mx-auto">

        {/* Nome + posição */}
        <div className="text-center">
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">{profile.name}</h1>
          <div className="flex items-center justify-center gap-3 mt-1.5 flex-wrap">
            {profile.position && (
              <span className="text-[10px] font-black uppercase text-cyan-electric">
                {POSITION_LABEL[profile.position] || profile.position}
              </span>
            )}
            {profile.favorite_team && (
              <>
                <span className="text-text-muted">·</span>
                <span className="text-[10px] font-black uppercase text-text-low">{profile.favorite_team}</span>
              </>
            )}
          </div>
        </div>

        {/* Streak */}
        {streak > 0 && (
          <div className="flex justify-center">
            <StreakBadge streak={streak} animate />
          </div>
        )}

        {/* Rating */}
        {stats.rating > 0 && (
          <div className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-surface-1 border border-cyan-electric/20">
            <Star size={18} className="text-cyan-electric" fill="currentColor" />
            <span className="text-3xl font-black font-mono text-white">{Number(stats.rating).toFixed(2)}</span>
            <span className="text-[10px] text-text-low font-black uppercase">rating global</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Zap size={16} />,         label: 'Gols',    value: stats.goals,   color: 'text-orange-400' },
            { icon: <TrendingUp size={16} />,   label: 'Assists', value: stats.assists, color: 'text-cyan-electric' },
            { icon: <Users size={16} />,        label: 'Jogos',   value: stats.matches, color: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-2xl bg-surface-1 border border-border-subtle text-center">
              <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
              <p className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</p>
              <p className="text-[8px] text-text-low font-black uppercase">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Conquistas */}
        {unlockedBadges.length > 0 && (
          <div>
            <p className="text-[9px] font-black text-text-low uppercase tracking-widest mb-3">
              Conquistas ({unlockedBadges.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {unlockedBadges.map(b => (
                <div
                  key={b.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-1 border border-border-subtle rounded-xl"
                >
                  <span>{b.icon}</span>
                  <span className="text-[10px] font-black text-white uppercase">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
