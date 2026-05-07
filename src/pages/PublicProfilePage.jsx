// src/pages/PublicProfilePage.jsx
// Sprint 12 fix:
// - Avatar não corta mais (removido -mt-14, layout ajustado)
// - Query de stats corrigida: busca player_ids primeiro, depois agrega
// - Rota: /player/:userId

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { ArrowLeft, Star } from 'lucide-react';
import StreakBadge from '../components/StreakBadge';

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
      // 1. Perfil público
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, position, favorite_team')
        .eq('id', userId)
        .single();

      if (profErr || !prof) { setNotFound(true); return; }
      setProfile(prof);

      // 2. Buscar todos os player_ids do usuário (pode estar em vários babas)
      const { data: playerRows } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', userId);

      const playerIds = (playerRows || []).map(p => p.id);

      if (playerIds.length === 0) {
        // Usuário existe mas nunca entrou em um baba
        setStats({ goals: 0, assists: 0, matches: 0, rating: 0, babaCount: 0 });
        setStreak(0);
        return;
      }

      // 3. Contar babas distintos que o jogador participa (para badge Multi-Baba)
      const babaCount = playerRows.length; // cada row é um baba diferente

      // 4. Estatísticas agregadas de partidas
      const { data: mp } = await supabase
        .from('match_players')
        .select('goals, assists')
        .in('player_id', playerIds);

      const goals   = (mp || []).reduce((s, r) => s + (r.goals   || 0), 0);
      const assists = (mp || []).reduce((s, r) => s + (r.assists || 0), 0);
      const matches = (mp || []).length;

      // 4. Rating médio de todos os babas
      const { data: ratings } = await supabase
        .from('player_rating_summary')
        .select('final_rating')
        .in('player_id', playerIds);

      const ratingVals = (ratings || []).map(r => r.final_rating).filter(v => v > 0);
      const avgRating  = ratingVals.length
        ? ratingVals.reduce((a, b) => a + b, 0) / ratingVals.length
        : 0;

      // 5. Streak — confirmações ordenadas por data desc
      const { data: confs } = await supabase
        .from('game_confirmations')
        .select('game_date')
        .in('player_id', playerIds)
        .eq('status', 'confirmed')
        .order('game_date', { ascending: false })
        .limit(30);

      let s = (confs || []).length > 0 ? 1 : 0;
      for (let i = 1; i < (confs || []).length; i++) {
        const prev = new Date(confs[i - 1].game_date);
        const curr = new Date(confs[i].game_date);
        const diffDays = (prev - curr) / (1000 * 60 * 60 * 24);
        if (diffDays <= 14) s++;
        else break;
      }
      setStreak(s);
      setStats({ goals, assists, matches, rating: avgRating, babaCount });

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

  const unlockedBadges = stats
    ? BADGE_DEFINITIONS.filter(b => b.condition(stats))
    : [];

  return (
    <div className="min-h-screen bg-black text-white pb-12">

      {/* Header */}
      <div className="relative px-6 pt-14 pb-6 flex flex-col items-center bg-black">
        {/* Glow fundo */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,243,255,0.08)_0%,_transparent_70%)] pointer-events-none" />

        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 p-2.5 bg-black/60 backdrop-blur-md rounded-2xl border border-border-mid text-text-low hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        <p className="absolute top-6 right-6 text-[9px] font-black uppercase tracking-widest text-text-muted">
          Perfil Público
        </p>

        {/* Avatar — sem margem negativa, dentro do flow normal */}
        <div className="w-28 h-28 rounded-[2rem] border-4 border-cyan-electric/40 bg-gray-900 overflow-hidden shadow-2xl flex items-center justify-center mt-2 mb-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-black text-cyan-electric">
              {(profile.name || '?').charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Nome + posição + time */}
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-center leading-tight">
          {profile.name}
        </h1>
        <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
          {profile.position && (
            <span className="text-[10px] font-black uppercase text-cyan-electric">
              {POSITION_LABEL[profile.position] || profile.position}
            </span>
          )}
          {profile.favorite_team && (
            <>
              <span className="text-text-muted">·</span>
              <span className="text-[10px] font-black uppercase text-text-low">
                {profile.favorite_team}
              </span>
            </>
          )}
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

        {/* Sem dados ainda */}
        {stats && stats.matches === 0 && !stats.rating && (
          <div className="text-center py-10 border border-dashed border-border-subtle rounded-2xl">
            <p className="text-3xl mb-2">⚽</p>
            <p className="text-[11px] font-black text-text-muted uppercase">Nenhuma partida ainda</p>
          </div>
        )}
      </div>
    </div>
  );
}
