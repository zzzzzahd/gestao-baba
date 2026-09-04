// src/pages/PublicProfilePage.jsx
// Rota: /player/:userId
// Conquistas vêm só do banco (badge_definitions/player_badges) — mesma fonte
// que BadgesSection.jsx usa no perfil privado. Antes havia uma segunda lista
// de conquistas fixa no código rodando em paralelo; removida.

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { getPublicProfileData } from '../services/publicProfileService';
import { useAuth }                     from '../contexts/AuthContext';
import { ArrowLeft, Star, UserPlus, UserMinus, Share2, Instagram, Users, Edit3 } from 'lucide-react';
import StreakBadge from '../components/StreakBadge';
import DivisionBadge from '../components/DivisionBadge';
import { POSITION_LABEL } from '../constants/positions';
import AdBanner from '../components/AdBanner';

const RARITY_COLOR = {
  legendary: 'text-yellow-400',
  epic:      'text-purple-400',
  rare:      'text-blue-400',
  common:    'text-text-low',
};

export default function PublicProfilePage({ initialData = null }) {
  const { userId } = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();

const [profile, setProfile] = useState(initialData?.profile || null);
const [stats, setStats] = useState(initialData?.stats || null);
const [streak, setStreak] = useState(initialData?.streak || 0);
const [earnedBadges, setEarnedBadges] = useState(
  initialData?.earnedBadges || []
);
const [following, setFollowing] = useState(false);
const [followers, setFollowers] = useState(
  initialData?.followers || 0
);
const [loading, setLoading] = useState(!initialData);
const [notFound, setNotFound] = useState(false);
const [toggling, setToggling] = useState(false);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (!userId) return;
  
    // No SSR os dados já foram carregados pelo entry-server.
    // No navegador, carregamos/atualizamos os dados normalmente.
    loadPublicProfile();
  }, [userId, user]);

  const loadPublicProfile = async () => {
    setLoading(true);
  
    try {
      const data = await getPublicProfileData(userId);
  
      if (!data) {
        setNotFound(true);
        return;
      }
  
      setProfile(data.profile);
      setStats(data.stats);
      setStreak(data.streak);
      setEarnedBadges(data.earnedBadges);
      setFollowers(data.followers);
  
      // ---------------------------------------------------------
      // FOLLOWING CONTINUA SENDO VERIFICADO NO CLIENTE
      // ---------------------------------------------------------
      if (user && user.id !== userId) {
        const { data: fol } = await supabase
          .from('player_follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('followed_id', userId)
          .maybeSingle();
  
        setFollowing(!!fol);
      } else {
        setFollowing(false);
      }
    } catch (error) {
      console.error('[PublicProfilePage]', error);
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

  // Conquistas: só o que veio do banco (player_badges) — fonte única, mesma do perfil privado
  const allBadges = earnedBadges.map(b => ({
    id:     b.badge_id,
    icon:   b.badge?.icon,
    label:  b.badge?.name,
    rarity: b.badge?.rarity,
  }));

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
          {isOwnProfile ? (
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-cyan-electric/10 border border-cyan-electric/20 text-cyan-electric hover:bg-cyan-electric/20 transition-all"
            >
              <Edit3 size={12} /> Editar
            </button>
          ) : user && (
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
          {(profile.position || profile.preferred_position) && (
            <span className="text-[10px] font-black uppercase text-cyan-electric">
              {POSITION_LABEL[profile.position || profile.preferred_position] || profile.position}
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
        <button
          onClick={() => navigate(`/followers/${userId}`)}
          className="flex items-center gap-1.5 mt-3 hover:opacity-70 transition-opacity"
        >
          <Users size={11} className="text-text-muted" />
          <span className="text-[10px] font-black text-text-low">
            <span className="text-white">{followers}</span> seguidores
          </span>
        </button>
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
          <div className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-surface-1 border border-cyan-electric/20 flex-wrap">
            <Star size={18} className="text-cyan-electric" fill="currentColor" />
            <span className="text-3xl font-black font-mono text-white">
              {Number(stats.rating).toFixed(2)}
            </span>
            <span className="text-[10px] text-text-low font-black uppercase">rating global</span>
            <DivisionBadge rating={stats.rating} />
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

        {/* ── Banner AdSense — página pública, com conteúdo editorial real (perfil do jogador) ── */}
        <AdBanner slot={import.meta.env.VITE_ADSENSE_SLOT_PUBLIC_PROFILE} className="mt-2" />
      </div>
    </div>
  );
}
