// src/pages/PublicProfilePage.jsx
// Sprint 19 — Perfil público via RPC get_public_profile (single round-trip).
// Inclui badges, stats, babas, follow/unfollow e compartilhamento.

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, UserPlus, UserMinus, Star, Trophy, Target, Zap, Users } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const RARITY_COLOR = {
  legendary: 'text-yellow-400',
  epic:      'text-purple-400',
  rare:      'text-blue-400',
  common:    'text-text-low',
};

const StatItem = ({ icon: Icon, label, value, color = 'text-cyan-electric' }) => (
  <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-surface-1 border border-border-mid">
    <Icon size={16} className={color} />
    <span className="text-lg font-black text-white leading-none">{value ?? 0}</span>
    <span className="text-[8px] font-black uppercase tracking-widest text-text-low">{label}</span>
  </div>
);

export default function PublicProfilePage() {
  const { userId }  = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();

  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);
  const [following, setFollowing] = useState(false);
  const [toggling,  setToggling]  = useState(false);

  const isOwnProfile = user?.id === userId;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc('get_public_profile', { p_user_id: userId });
      if (error || result?.error) {
        setNotFound(true);
        return;
      }
      setData(result);

      // Verificar se o usuário logado segue este perfil
      if (user && user.id !== userId) {
        const { data: follow } = await supabase
          .from('player_follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('followed_id', userId)
          .maybeSingle();
        setFollowing(!!follow);
      }
    } catch (err) {
      console.error('[PublicProfilePage]', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [userId, user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleFollow = async () => {
    if (!user) { navigate('/login'); return; }
    setToggling(true);
    try {
      const { data: result, error } = await supabase.rpc('toggle_follow', { p_target_id: userId });
      if (error) throw error;
      setFollowing(result.following);
      toast.success(result.following ? 'Seguindo!' : 'Deixou de seguir');
      setData(prev => prev ? {
        ...prev,
        followers: prev.followers + (result.following ? 1 : -1),
      } : prev);
    } catch (err) {
      toast.error('Erro');
    } finally {
      setToggling(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/player/${userId}`;
    if (navigator.share) {
      navigator.share({ title: data?.name, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-8 h-8 border-3 border-cyan-electric border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-center px-8">
        <span className="text-5xl">🔍</span>
        <p className="text-[10px] font-black uppercase tracking-widest text-text-low">
          Perfil não encontrado
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-xl border border-border-mid text-[10px] font-black uppercase text-text-low hover:text-white transition-colors"
        >
          Voltar
        </button>
      </div>
    );
  }

  const stats = data.stats || {};
  const badges = data.badges || [];
  const babas  = data.babas  || [];

  return (
    <div className="min-h-screen bg-black text-white pb-28">

      {/* Header com cover fictício */}
      <div className="relative h-36 bg-gradient-to-br from-cyan-electric/20 via-surface-2 to-black">
        {/* Gradiente decorativo */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-electric/10 to-transparent" />

        {/* Botões de navegação */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-black/50 border border-white/10 backdrop-blur-sm text-white hover:bg-black/70 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-black/50 border border-white/10 backdrop-blur-sm text-white hover:bg-black/70 transition-all"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Avatar + info */}
      <div className="relative px-6 -mt-12">
        <div className="flex items-end justify-between mb-4">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl ring-4 ring-black overflow-hidden bg-surface-2 flex items-center justify-center border border-border-mid">
            {data.avatar_url
              ? <img src={data.avatar_url} alt={data.name} className="w-full h-full object-cover" />
              : <span className="text-3xl font-black text-white">{(data.name || '?')[0].toUpperCase()}</span>
            }
          </div>

          {/* Botão follow */}
          {!isOwnProfile && (
            <button
              onClick={handleFollow}
              disabled={toggling}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
                following
                  ? 'bg-surface-2 border border-border-mid text-text-low hover:text-red-400 hover:border-red-500/30'
                  : 'bg-cyan-electric text-black hover:bg-cyan-400'
              }`}
            >
              {toggling
                ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : following ? <UserMinus size={12} /> : <UserPlus size={12} />}
              {following ? 'Seguindo' : 'Seguir'}
            </button>
          )}
        </div>

        {/* Nome e bio */}
        <div className="mb-4">
          <h1 className="text-xl font-black text-white leading-tight">{data.name}</h1>
          {data.instagram_handle && (
            <p className="text-[10px] font-black text-text-low mt-0.5">@{data.instagram_handle}</p>
          )}
          {data.bio && (
            <p className="text-xs text-text-mid mt-2 leading-relaxed">{data.bio}</p>
          )}
          <div className="flex items-center gap-4 mt-3">
            <span className="text-[10px] font-black text-text-low">
              <span className="text-white">{data.followers}</span> seguidores
            </span>
            <span className="text-[10px] font-black text-text-low">
              <span className="text-white">{data.following}</span> seguindo
            </span>
            <span className="text-[10px] font-black text-text-low">
              <span className="text-white">{data.profile_views}</span> visualizações
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <StatItem icon={Zap}    label="Jogos"    value={stats.matches}  color="text-cyan-electric" />
          <StatItem icon={Trophy} label="Vitórias"  value={stats.wins}     color="text-yellow-400" />
          <StatItem icon={Target} label="Gols"      value={stats.goals}    color="text-green-400" />
          <StatItem icon={Users}  label="Assists"   value={stats.assists}  color="text-purple-400" />
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-low mb-3">
              Conquistas ({badges.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {badges.map(b => (
                <div
                  key={b.badge_id}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-1 border border-border-mid"
                  title={b.name}
                >
                  <span className="text-base leading-none">{b.icon}</span>
                  <span className={`text-[9px] font-black uppercase ${RARITY_COLOR[b.rarity] || 'text-text-low'}`}>
                    {b.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Babas */}
        {babas.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-text-low mb-3">Babas</p>
            <div className="space-y-2">
              {babas.map(b => (
                <div
                  key={b.baba_id}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl bg-surface-1 border border-border-mid"
                >
                  <div>
                    <p className="text-xs font-black text-white">{b.baba_name}</p>
                    <p className="text-[9px] font-black text-text-low uppercase">{b.modality}</p>
                  </div>
                  {b.is_owner && (
                    <span className="px-2 py-0.5 rounded-lg bg-cyan-electric/10 border border-cyan-electric/20 text-[8px] font-black text-cyan-electric uppercase">
                      Presidente
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
