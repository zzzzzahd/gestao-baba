// src/pages/FollowersPage.jsx
// Exibe seguidores e quem o usuário segue, com botão de follow/unfollow

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, UserMinus } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth }  from '../contexts/AuthContext';
import toast        from 'react-hot-toast';

const Avatar = ({ name, avatarUrl, size = 'md' }) => {
  const sz = size === 'sm' ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-base';
  return (
    <div className={`${sz} rounded-2xl bg-gray-800 border border-border-mid overflow-hidden flex items-center justify-center font-black text-white flex-shrink-0`}>
      {avatarUrl
        ? <img src={avatarUrl} className="w-full h-full object-cover" alt={name} />
        : (name || '?').charAt(0).toUpperCase()}
    </div>
  );
};

const UserRow = ({ profile, isFollowing, onToggle, isSelf, toggling }) => {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-1 border border-border-subtle">
      <button onClick={() => navigate(`/player/${profile.id}`)} className="hover:opacity-80 transition-opacity">
        <Avatar name={profile.name} avatarUrl={profile.avatar_url} />
      </button>

      <div className="flex-1 min-w-0">
        <button
          onClick={() => navigate(`/player/${profile.id}`)}
          className="text-left hover:opacity-80 transition-opacity"
        >
          <p className="text-sm font-black text-white truncate">{profile.name}</p>
          {profile.preferred_position && (
            <p className="text-[9px] font-black text-cyan-electric uppercase">{profile.preferred_position}</p>
          )}
        </button>
      </div>

      {!isSelf && (
        <button
          onClick={() => onToggle(profile.id)}
          disabled={toggling === profile.id}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
            isFollowing
              ? 'bg-surface-2 border border-border-mid text-text-low hover:text-red-400 hover:border-red-500/30'
              : 'bg-cyan-electric text-black hover:bg-cyan-400'
          }`}
        >
          {toggling === profile.id
            ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : isFollowing ? <UserMinus size={11} /> : <UserPlus size={11} />}
          {isFollowing ? 'Seguindo' : 'Seguir'}
        </button>
      )}
    </div>
  );
};

export default function FollowersPage() {
  const { userId }  = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();

  const [tab,         setTab]         = useState('followers');
  const [followers,   setFollowers]   = useState([]);
  const [following,   setFollowing]   = useState([]);
  const [myFollowing, setMyFollowing] = useState(new Set());
  const [loading,     setLoading]     = useState(true);
  const [toggling,    setToggling]    = useState(null);
  const [profileName, setProfileName] = useState('');

  const targetId = userId || user?.id;
  const isSelf   = targetId === user?.id;

  const load = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      // Nome do perfil
      const { data: prof } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', targetId)
        .single();
      setProfileName(prof?.name || 'Jogador');

      // Seguidores (quem segue targetId)
      const { data: fols } = await supabase
        .from('player_follows')
        .select('follower:profiles!player_follows_follower_id_fkey(id, name, avatar_url, preferred_position)')
        .eq('followed_id', targetId);
      setFollowers((fols || []).map(f => f.follower).filter(Boolean));

      // Seguindo (quem targetId segue)
      const { data: fing } = await supabase
        .from('player_follows')
        .select('followed:profiles!player_follows_followed_id_fkey(id, name, avatar_url, preferred_position)')
        .eq('follower_id', targetId);
      setFollowing((fing || []).map(f => f.followed).filter(Boolean));

      // Quem o usuário logado segue (para mostrar botão correto)
      if (user) {
        const { data: myF } = await supabase
          .from('player_follows')
          .select('followed_id')
          .eq('follower_id', user.id);
        setMyFollowing(new Set((myF || []).map(f => f.followed_id)));
      }
    } catch (err) {
      console.error('[FollowersPage]', err);
    } finally {
      setLoading(false);
    }
  }, [targetId, user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleToggleFollow = async (profileId) => {
    if (!user) { navigate('/login'); return; }
    setToggling(profileId);
    try {
      const { data, error } = await supabase.rpc('toggle_follow', { p_target_id: profileId });
      if (error) throw error;

      setMyFollowing(prev => {
        const next = new Set(prev);
        data.following ? next.add(profileId) : next.delete(profileId);
        return next;
      });

      // Atualizar contagem local
      if (profileId === targetId) await load();
    } catch (err) {
      toast.error('Erro ao seguir/deixar de seguir');
    } finally {
      setToggling(null);
    }
  };

  const list = tab === 'followers' ? followers : following;

  return (
    <div className="min-h-screen bg-black text-white pb-24">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-md border-b border-border-subtle px-5 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-surface-2 border border-border-mid flex items-center justify-center"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-sm font-black uppercase tracking-widest">{profileName}</h1>
          <p className="text-[9px] font-black text-text-muted uppercase">Conexões</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-subtle">
        <button
          onClick={() => setTab('followers')}
          className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all ${
            tab === 'followers'
              ? 'text-cyan-electric border-b-2 border-cyan-electric'
              : 'text-text-low'
          }`}
        >
          Seguidores · {followers.length}
        </button>
        <button
          onClick={() => setTab('following')}
          className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all ${
            tab === 'following'
              ? 'text-cyan-electric border-b-2 border-cyan-electric'
              : 'text-text-low'
          }`}
        >
          Seguindo · {following.length}
        </button>
      </div>

      {/* Lista */}
      <div className="px-5 py-4 space-y-2 max-w-xl mx-auto">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-surface-1 border border-border-subtle animate-pulse" />
          ))
        ) : list.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-[10px] font-black uppercase text-text-muted tracking-widest">
              {tab === 'followers' ? 'Nenhum seguidor ainda' : 'Não está seguindo ninguém'}
            </p>
          </div>
        ) : (
          list.map(profile => (
            <UserRow
              key={profile.id}
              profile={profile}
              isFollowing={myFollowing.has(profile.id)}
              onToggle={handleToggleFollow}
              isSelf={profile.id === user?.id}
              toggling={toggling}
            />
          ))
        )}
      </div>
    </div>
  );
}
