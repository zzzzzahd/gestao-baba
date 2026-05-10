// src/pages/PublicProfilePage.jsx
// Corrigido: baseado no original funcional + campos novos (bio, instagram, follow)
// Rota: /player/:userId

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate }      from 'react-router-dom';
import { supabase }                    from '../services/supabase';
import { useAuth }                     from '../contexts/AuthContext';
import { ArrowLeft, Star, UserPlus, UserMinus, Share2, Instagram } from 'lucide-react';
import StreakBadge from '../components/StreakBadge';

// ── Badge definitions (mantidas do original) ──────────────────────────────────
const BADGE_DEFINITIONS = [
  { id: 'estreante',    icon: '🌱', label: 'Estreante',      condition: ({ matches })   => matches   >= 1  },
  { id: 'veterano',     icon: '🛡️', label: 'Veterano',       condition: ({ matches })   => matches   >= 10 },
  { id: 'lenda',        icon: '👑', label: 'Lenda',          condition: ({ matches })   => matches   >= 30 },
  { id: 'artilheiro',   icon: '⚡', label: 'Artilheiro',     condition: ({ goals })     => goals     >= 10 },
  { id: 'maquina',      icon: '🔥', label: 'Máquina de Gol', condition: ({ goals })     => goals     >= 30 },
  { id: 'garcom',       icon: '🎯', label: 'Garçom',         condition: ({ assists })   => assists   >= 10 },
  { id: 'bem_avaliado', icon: '⭐', label: 'Bem Avaliado',   condition: ({ rating })    => rating    >= 4.0 },
  { id: 'elite',        icon: '💎', label: 'Elite',          condition: ({ rating })    => rating    >= 4.5 },
  { id: 'multi_baba',   icon: '🏟️', label: 'Multi-Baba',    condition: ({ babaCount }) => babaCount >= 2  },
];

const POSITION_LABEL = {
  goleiro: 'Goleiro', zagueiro: 'Zagueiro', lateral: 'Lateral',
  meia: 'Meia', atacante: 'Atacante', linha: 'Linha',
  fixo: 'Fixo', ala: 'Ala', pivo: 'Pivô',
};

const RARITY_COLOR = {
  legendary: 'text-yellow-400',
  epic:      'text-purple-400',
  rare:      'text-blue-400',
  common:    'text-text-low',
};

export default function PublicProfilePage() {
  const { userId } = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const [profile,   setProfile]   = useState(null);
  const [stats,     setStats]     = useState(null);
  const [streak,    setStreak]    = useState(0);
  const [earnedBadges, setEarnedBadges] = useState([]); // badges do Sprint 14
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);
  const [toggling,  setToggling]  = useState(false);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (!userId) return;
    loadPublicProfile();
  }, [userId]);

  const loadPublicProfile = async () => {
    setLoading(true);
    try {
      // 1. Perfil (inclui campos novos do Sprint 19)
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, position, favorite_team, bio, instagram_handle, preferred_position, is_public')
        .eq('id', userId)
        .single();

      if (profErr || !prof) { setNotFound(true); return; }
      if (prof.is_public === false) { setNotFound(true); return; }
      setProfile(prof);

      // 2. Player IDs
      const { data: playerRows } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', userId);

      const playerIds = (playerRows || []).map(p => p.id);

      if (playerIds.length === 0) {
        setStats({ goals: 0, assists: 0, matches: 0, rating: 0, babaCount: 0 });
        setStreak(0);
        setLoading(false);
        return;
      }

      const babaCount = playerRows.length;

      // 3. Stats de partidas
      const { data: mp } = await supabase
        .from('match_players')
        .select('goals, assists')
        .in('player_id', playerIds);

      const goals   = (mp || []).reduce((s, r) => s + (r.goals   || 0), 0);
      const assists = (mp || []).reduce((s, r) => s + (r.assists || 0), 0);
      const matches = (mp || []).length;

      // 4. Rating médio
      const { data: ratings } = await supabase
        .from('player_rating_summary')
        .select('final_rating')
        .in('player_id', playerIds);

      const ratingVals = (ratings || []).map(r => r.final_rating).filter(v => v > 0);
      const avgRating  = ratingVals.length
        ? ratingVals.reduce((a, b) => a + b, 0) / ratingVals.length
        : 0;

      // 5. Streak
      const { data: confs } = await supabase
        .from('game_confirmations')
        .select('game_date')
        .in('player_id', playerIds)
        .eq('status', 'confirmed')
        .order('game_date', { ascending: false })
        .limit(30);

      let s = (confs || []).length > 0 ? 1 : 0;
      for (let i = 1; i < (confs || []).length; i++) {
        const prev     = new Date(confs[i - 1].game_date);
        const curr     = new Date(confs[i].game_date);
        const diffDays = (prev - curr) / (1000 * 60 * 60 * 24);
        if (diffDays <= 14) s++;
        else break;
      }
      setStreak(s);
      setStats({ goals, assists, matches, rating: avgRating, babaCount });

      // 6. Badges do Sprint 14 (player_badges)
      const { data: pb } = await supabase
        .from('player_badges')
        .select('badge_id, earned_at, badge:badge_definitions(name, icon, rarity)')
        .in('player_id', playerIds)
        .order('earned_at', { ascending: false });
      setEarnedBadges(pb || []);

      // 7. Followers
      const { count: fCount } = await supabase
        .from('player_follows')
        .select('*', { count: 'exact', head: true })
        .eq('followed_id', userId);
      setFollowers(fCount || 0);

      // 8. Verificar se o usuário logado segue
      if (user && user.id !== userId) {
        const { data: fol } = await supabase
          .from('player_follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('followed_id', userId)
          .maybeSingle();
        setFollowing(!!fol);
      }

    } catch (err) {
      console.error('[PublicProfilePage]', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user) { navigate('/login'); return; }
    setToggling(true);
    try {
      const { data, error } = await supabase.rpc('toggle_follow', { p_target_id: userId });
      if (error) throw error;
      setFollowing(data.following);
      setFollowers(prev => prev + (data.following ? 1 : -1));
    } catch (err) {
      console.error('[follow]', err);
    } finally {
      setToggling(false);
    }
  };

  const handleShare = () => {
    const url  = window.location.href;
    const text = `Confere o perfil de ${profile?.name} no Draft Play! ⚽`;
    if (navigator.share) {
      navigator.share({ title: text, url });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-center px-6">
      <p className="text-5xl">🔍</p>
      <h1 className="text-xl font-black text-white uppercase">Jogador não encontrado</h1>
      <p className="text-[10px] text-text-muted font-black uppercase">Perfil inexistente ou privado</p>
      <button
        onClick={() => navigate(-1)}
        className="px-6 py-3 rounded-2xl border border-border-mid text-[10px] font-black uppercase text-text-low hover:text-white transition-colors"
      >
        ← Voltar
      </button>
    </div>
  );

  // Badges locais (original) + badges do banco (Sprint 14)
  const localBadges   = stats ? BADGE_DEFINITIONS.filter(b => b.condition(stats)) : [];
  const dbBadgeIds    = new Set(earnedBadges.map(b => b.badge_id));
  const allBadges     = [
    ...earnedBadges.map(b => ({ id: b.badge_id, icon: b.badge?.icon, label: b.badge?.name, rarity: b.badge?.rarity, fromDb: true })),
    ...localBadges.filter(b => !dbBadgeIds.has(b.id)),
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-12">

      {/* Header */}
      <div className="relative px-6 pt-14 pb-6 flex flex-col items-center bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,243,255,0.08)_0%,_transparent_70%)] pointer-events-none" />

        {/* Botão voltar */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 p-2.5 bg-black/60 backdrop-blur-md rounded-2xl border border-border-mid text-text-low hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Ações */}
        <div className="absolute top-6 right-6 flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2.5 bg-black/60 backdrop-blur-md rounded-2xl border border-border-mid text-text-low hover:text-white transition-colors"
          >
            <Share2 size={16} />
          </button>
          {!isOwnProfile && user && (
            <button
              onClick={handleFollow}
              disabled={toggling}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
                following
                  ? 'bg-surface-2 border border-border-mid text-text-low'
                  : 'bg-cyan-electric text-black'
              }`}
            >
              {toggling
                ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : following ? <UserMinus size={12} /> : <UserPlus size={12} />}
              {following ? 'Seguindo' : 'Seguir'}
            </button>
          )}
        </div>

        <p className="absolute top-6 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest text-text-muted">
          Perfil Público
        </p>

        {/* Avatar */}
        <div className="w-28 h-28 rounded-[2rem] border-4 border-cyan-electric/40 bg-gray-900 overflow-hidden shadow-2xl flex items-center justify-center mt-2 mb-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-black text-cyan-electric">
              {(profile.name || '?').charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Nome */}
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-center leading-tight">
          {profile.name}
        </h1>

        {/* Posição + time */}
        <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
          {(profile.preferred_position || profile.position) && (
            <span className="text-[10px] font-black uppercase text-cyan-electric">
              {POSITION_LABEL[profile.preferred_position || profile.position] || profile.position}
            </span>
          )}
          {profile.favorite_team && (
            <>
              <span className="text-text-muted">·</span>
              <span className="text-[10px] font-black uppercase text-text-low">{profile.favorite_team}</span>
            </>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-xs text-text-mid text-center mt-3 max-w-xs leading-relaxed font-bold">
            {profile.bio}
          </p>
        )}

        {/* Instagram */}
        {profile.instagram_handle && (
          <a
            href={`https://instagram.com/${profile.instagram_handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 mt-2 text-[10px] font-black text-text-low hover:text-pink-400 transition-colors"
          >
            <Instagram size={12} />
            @{profile.instagram_handle}
          </a>
        )}

        {/* Followers */}
        <div className="flex items-center gap-4 mt-3">
          <span className="text-[10px] font-black text-text-low">
            <span className="text-white">{followers}</span> seguidores
          </span>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="px-6 space-y-5 max-w-md mx-auto">

        {/* Streak */}
        {streak > 0 && (
          <div className="flex justify-center">
            <StreakBadge streak={streak} animate />
          </div>
        )}

        {/* Rating */}
        {stats?.rating > 0 && (
          <div className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-surface-1 border border-cyan-electric/20">
            <Star size={18} className="text-cyan-electric" fill="currentColor" />
            <span className="text-3xl font-black font-mono text-white">
              {Number(stats.rating).toFixed(2)}
            </span>
            <span className="text-[10px] text-text-low font-black uppercase">rating global</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { emoji: '⚽', label: 'Gols',    value: stats?.goals   ?? 0, color: 'text-orange-400'    },
            { emoji: '🎯', label: 'Assists', value: stats?.assists ?? 0, color: 'text-cyan-electric' },
            { emoji: '🏟️', label: 'Jogos',   value: stats?.matches ?? 0, color: 'text-purple-400'    },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-2xl bg-surface-1 border border-border-subtle text-center">
              <p className="text-lg mb-1">{s.emoji}</p>
              <p className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</p>
              <p className="text-[8px] text-text-low font-black uppercase mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Conquistas (banco Sprint 14 + locais) */}
        {allBadges.length > 0 && (
          <div>
            <p className="text-[9px] font-black text-text-low uppercase tracking-widest mb-3">
              Conquistas ({allBadges.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {allBadges.map((b, i) => (
                <div
                  key={b.id || i}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-1 border border-border-subtle rounded-xl"
                >
                  <span className="text-base leading-none">{b.icon}</span>
                  <span className={`text-[10px] font-black uppercase ${
                    b.rarity ? (RARITY_COLOR[b.rarity] || 'text-text-low') : 'text-white'
                  }`}>
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sem dados */}
        {stats && stats.matches === 0 && (
          <div className="text-center py-10 border border-dashed border-border-subtle rounded-2xl">
            <p className="text-3xl mb-2">⚽</p>
            <p className="text-[11px] font-black text-text-muted uppercase">Nenhuma partida ainda</p>
          </div>
        )}
      </div>
    </div>
  );
}
