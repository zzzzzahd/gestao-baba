// src/pages/ProfilePage.jsx
// Sprint 12 fix:
// 1. Card compartilhável usa template 'profile' com rating, gols, assists, jogos
// 2. Botão "Ver perfil público" para navegar até /player/:userId
// 3. Botão de compartilhar no ranking não depende de dados hardcoded

import React, { useState, useEffect, useReducer, useCallback } from 'react';
import { Share2, ExternalLink, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBaba } from '../contexts/BabaContext';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

import ProfileHeader      from '../components/ProfileHeader';
import ProfileStats       from '../components/ProfileStats';
import ProfileEdit        from '../components/ProfileEdit';
import ShareableCardModal from '../components/ShareableCardModal';

// ─────────────────────────────────────────────
// ESTADO
// ─────────────────────────────────────────────

const INITIAL = {
  ratings:     [],
  matchStats:  [],
  bestOfMonth: [],
  ranking:     [],
  loading:     true,
  error:       null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'LOADING': return { ...state, loading: true,  error: null };
    case 'SUCCESS': return { ...state, loading: false, error: null, ...action.payload };
    case 'ERROR':   return { ...state, loading: false, error: action.error };
    default:        return state;
  }
};

// ─────────────────────────────────────────────
// PROFILE PAGE
// ─────────────────────────────────────────────

const ProfilePage = () => {
  const navigate                          = useNavigate();
  const { profile, user, refreshProfile } = useAuth();
  const { myBabas, currentBaba }          = useBaba();

  const [tab,       setTab]       = useState('stats');
  const [showShare, setShowShare] = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [state, dispatch]         = useReducer(reducer, INITIAL);

  // ── Load ──────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user || !myBabas?.length) {
      dispatch({ type: 'SUCCESS', payload: { loading: false } });
      return;
    }
    dispatch({ type: 'LOADING' });
    try {
      const babaIds = myBabas.map(b => b.id);
      const { data, error } = await supabase.rpc('get_player_full_profile', {
        p_user_id:  user.id,
        p_baba_ids: babaIds,
      });
      if (error) throw error;

      const result  = data || {};
      const babaMap = new Map(myBabas.map(b => [b.id, b.name]));

      dispatch({
        type: 'SUCCESS',
        payload: {
          ratings:     (result.ratings     || []).map(r => ({ ...r, baba_name: r.baba_name || babaMap.get(r.baba_id) || 'Baba' })),
          matchStats:  (result.match_stats || []).map(m => ({ ...m, baba_name: m.baba_name || babaMap.get(m.baba_id) || 'Baba' })),
          bestOfMonth: (result.best_of_month || []).map(b => b.baba_name),
          ranking:     result.ranking || [],
        },
      });
    } catch (e) {
      console.error('[ProfilePage]', e);
      dispatch({ type: 'ERROR', error: e.message });
    }
  }, [user, myBabas]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Computed ──────────────────────────────────
  const globalRating = (() => {
    const vals = state.ratings.map(r => r.final_rating).filter(v => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  })();

  const totalGoals   = state.matchStats.reduce((s, m) => s + (m.goals   || 0), 0);
  const totalAssists = state.matchStats.reduce((s, m) => s + (m.assists || 0), 0);
  const totalMatches = state.matchStats.reduce((s, m) => s + (m.matches || 0), 0);

  // Dados para o card de perfil — agora com rating, gols, assists, jogos
  const profileShareData = profile ? {
    name:       profile.name || 'Jogador',
    avatar_url: profile.avatar_url || null,
    position:   profile.position   || null,
    rating:     globalRating,
    goals:      totalGoals,
    assists:    totalAssists,
    matches:    totalMatches,
  } : null;

  // URL do perfil público
  const publicProfileUrl = user ? `${window.location.origin}/player/${user.id}` : null;

  const handleCopyPublicLink = () => {
    if (!publicProfileUrl) return;
    navigator.clipboard.writeText(publicProfileUrl);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleViewPublicProfile = () => {
    if (user) navigate(`/player/${user.id}`);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-28 font-sans selection:bg-cyan-electric selection:text-black">

      <ProfileHeader
        profile={profile}
        globalRating={globalRating}
        tab={tab}
        onTabChange={setTab}
        onProfileRefresh={refreshProfile}
      />

      <div className="max-w-xl mx-auto px-6 space-y-6 mt-4">

        {/* Tabs + botão compartilhar */}
        <div className="flex items-center gap-2">
          <div className="flex gap-2 p-1 bg-surface-2 rounded-xl border border-border-mid flex-1">
            {[
              { id: 'stats', label: 'Estatísticas'  },
              { id: 'edit',  label: 'Editar Perfil' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase rounded-lg transition-all ${
                  tab === t.id
                    ? 'bg-cyan-electric text-black shadow-lg shadow-cyan-500/20'
                    : 'text-text-low hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Botão compartilhar card de stats */}
          {tab === 'stats' && (
            <button
              onClick={() => setShowShare(true)}
              disabled={state.loading || !profileShareData}
              className="p-2.5 bg-surface-2 border border-border-mid rounded-xl hover:bg-surface-3 transition-colors disabled:opacity-30"
              title="Compartilhar suas stats"
            >
              <Share2 size={18} className="text-cyan-electric" />
            </button>
          )}
        </div>

        {/* Banner: perfil público */}
        {user && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface-1 border border-border-subtle">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase text-text-low tracking-widest mb-0.5">
                Seu perfil público
              </p>
              <p className="text-[10px] text-text-muted truncate font-mono">
                /player/{user.id.slice(0, 12)}...
              </p>
            </div>
            <button
              onClick={handleCopyPublicLink}
              className={`p-2 rounded-xl border transition-all ${
                copied
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-surface-2 border-border-mid text-text-low hover:text-white'
              }`}
              title="Copiar link"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
            <button
              onClick={handleViewPublicProfile}
              className="p-2 bg-cyan-electric/10 border border-cyan-electric/20 rounded-xl text-cyan-electric hover:bg-cyan-electric/20 transition-all"
              title="Ver perfil público"
            >
              <ExternalLink size={15} />
            </button>
          </div>
        )}

        {/* Erro */}
        {state.error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
            <p className="text-[10px] font-black text-red-400 uppercase">Erro ao carregar dados</p>
            <button onClick={loadData} className="mt-2 text-[9px] font-black text-red-400/60 hover:text-red-400 uppercase transition-colors">
              Tentar novamente
            </button>
          </div>
        )}

        {tab === 'stats' && (
          <ProfileStats
            statsData={{
              ratings:     state.ratings,
              matchStats:  state.matchStats,
              bestOfMonth: state.bestOfMonth,
              ranking:     state.ranking,
            }}
            loading={state.loading}
          />
        )}

        {tab === 'edit' && (
          <ProfileEdit
            profile={profile}
            onCancel={() => setTab('stats')}
            onSaved={() => setTab('stats')}
            onProfileRefresh={refreshProfile}
          />
        )}
      </div>

      {/* Card de perfil — template 'profile' — sem nome de baba (é card pessoal) */}
      <ShareableCardModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        rankingType="profile"
        profileData={profileShareData}
      />
    </div>
  );
};

export default ProfilePage;
