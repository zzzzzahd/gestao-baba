// src/pages/ProfilePage.jsx
// Tabs limpas (stats | conquistas | editar), sem duplicação.
// Cartão de perfil público reorganizado com cara de rede social.

import React, { useState, useEffect, useReducer, useCallback } from 'react';
import { Share2, ExternalLink, Copy, Check, Shield, Globe, Lock, Users, Download, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth }  from '../contexts/AuthContext';
import { useBaba }  from '../contexts/BabaContext';
import { supabase } from '../services/supabase';
import toast        from 'react-hot-toast';

import ProfileHeader      from '../components/ProfileHeader';
import ProfileStats       from '../components/ProfileStats';
import ProfileEdit        from '../components/ProfileEdit';
import ShareableCardModal from '../components/ShareableCardModal';
import BadgesSection      from '../components/BadgesSection';
import ThemeToggle        from '../components/ThemeToggle';
import { PlanBadge }     from '../components/PlanBadge';
import ReferralPanel     from '../components/ReferralPanel';
import ExportDataModal   from '../components/ExportDataModal';
import DeleteAccountModal from '../components/DeleteAccountModal';
import DivisionChangeScreen from '../components/DivisionChangeScreen';
import { getDivision } from '../components/DivisionBadge';

// ─── Estado ──────────────────────────────────────────────────────────────────

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

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'stats',    label: 'Estatísticas'  },
  { id: 'badges',   label: 'Conquistas'    },
  { id: 'edit',     label: 'Editar'        },
];

// ─── ProfilePage ──────────────────────────────────────────────────────────────

const ProfilePage = () => {
  const navigate                          = useNavigate();
  const { profile, user, refreshProfile } = useAuth();
  const { myBabas, currentBaba, players } = useBaba();

  const [tab,           setTab]           = useState('stats');
  const [showShare,     setShowShare]     = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [followerCount, setFollowerCount] = useState(null);
  const [showExportData,   setShowExportData]   = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [divisionChange,   setDivisionChange]   = useState(null);
  const [state, dispatch]                 = useReducer(reducer, INITIAL);

  // Buscar contagem de seguidores do usuário logado
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('player_follows')
      .select('*', { count: 'exact', head: true })
      .eq('followed_id', user.id)
      .then(({ count }) => setFollowerCount(count || 0));
  }, [user?.id]);

  // player_id do usuário logado no baba atual (para BadgesSection)
  const myPlayer = currentBaba
    ? (players || []).find(p => p.user_id === user?.id)
    : null;

  // ── Load ──────────────────────────────────────────────────────────────────
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

  // ── Computed ──────────────────────────────────────────────────────────────
  const globalRating = (() => {
    const vals = state.ratings.map(r => r.final_rating).filter(v => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  })();

  const totalGoals   = state.matchStats.reduce((s, m) => s + (m.goals   || 0), 0);
  const totalAssists = state.matchStats.reduce((s, m) => s + (m.assists || 0), 0);
  const totalMatches = state.matchStats.reduce((s, m) => s + (m.matches || 0), 0);

  // Detecta mudança de divisão desde a última visita ao perfil neste aparelho
  useEffect(() => {
    if (state.loading || !user?.id || globalRating <= 0) return;
    const storageKey = `division_seen_${user.id}`;
    const stored      = localStorage.getItem(storageKey);
    if (stored !== null) {
      const storedRating = parseFloat(stored);
      if (!Number.isNaN(storedRating)) {
        const oldDivId = getDivision(storedRating).id;
        const newDivId = getDivision(globalRating).id;
        if (oldDivId !== newDivId) {
          setDivisionChange({ oldRating: storedRating, newRating: globalRating });
        }
      }
    }
    localStorage.setItem(storageKey, String(globalRating));
  }, [state.loading, globalRating, user?.id]);

  const profileShareData = profile ? {
    name:              profile.name       || 'Jogador',
    avatar_url:        profile.avatar_url || null,
    position:          profile.position   || null,
    rating:            globalRating,
    goals:             totalGoals,
    assists:           totalAssists,
    matches:           totalMatches,
    bio:               profile.bio               || null,
    instagram_handle:  profile.instagram_handle  || null,
    favorite_team:     profile.favorite_team     || null,
    babaCount:         myBabas?.length || 0,
  } : null;

  const publicProfileUrl = user ? `${window.location.origin}/player/${user.id}` : null;

  const handleCopyPublicLink = () => {
    if (!publicProfileUrl) return;
    navigator.clipboard.writeText(publicProfileUrl);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-28 font-sans selection:bg-cyan-electric selection:text-black">

      {/* Header — mantém o original sem alteração */}
      <ProfileHeader
        profile={profile}
        globalRating={globalRating}
        tab={tab}
        onTabChange={setTab}
        onProfileRefresh={refreshProfile}
      />

      <div className="max-w-xl mx-auto px-6 space-y-5 mt-4">

        {/* ── Tabs ── */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border-mid flex-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase rounded-lg transition-all ${
                  tab === t.id
                    ? 'bg-cyan-electric text-black shadow-lg shadow-cyan-500/20'
                    : 'text-text-low hover:text-white'
                }`}
              >
                {t.id === 'badges'
                  ? <span className="flex items-center justify-center gap-1"><Shield size={10} />{t.label}</span>
                  : t.label
                }
              </button>
            ))}
          </div>

          {/* Compartilhar stats — só na aba stats */}
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

        {/* ── Cartão de perfil público ── */}
        {user && tab !== 'edit' && (
          <div className="rounded-3xl bg-surface-1 border border-border-subtle overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4">
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase text-text-muted tracking-widest">
                {profile?.is_public === false
                  ? <Lock size={11} className="text-text-muted" />
                  : <Globe size={11} className="text-cyan-electric" />}
                Perfil público
              </p>
              <button
                onClick={handleCopyPublicLink}
                className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest transition-colors ${
                  copied ? 'text-green-400' : 'text-text-muted hover:text-white'
                }`}
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? 'Copiado' : 'Copiar link'}
              </button>
            </div>

            {profile?.is_public === false ? (
              /* Perfil oculto — direciona pra ativar em Editar em vez de duplicar o toggle aqui */
              <div className="flex items-center gap-3 px-4 py-4">
                <p className="flex-1 text-[10px] text-text-muted font-bold leading-relaxed">
                  Seu perfil está oculto. Ative em <button onClick={() => setTab('edit')} className="text-cyan-electric font-black underline underline-offset-2">Editar</button> para outros jogadores poderem ver.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-4">
                <button
                  onClick={() => navigate(`/player/${user.id}`)}
                  className="flex-1 min-w-0 flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                >
                  <div className="w-12 h-12 rounded-2xl border-2 border-cyan-electric/30 bg-gray-900 overflow-hidden shrink-0 flex items-center justify-center">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.name} />
                    ) : (
                      <span className="text-sm font-black text-cyan-electric">
                        {(profile?.name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white truncate">{profile?.name || 'Jogador'}</p>
                    <p className="text-[10px] text-text-muted font-bold truncate">
                      {profile?.bio || 'Toque para ver como outros jogadores veem seu perfil'}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => navigate(`/followers/${user.id}`)}
                  className="flex flex-col items-center px-1 shrink-0 hover:opacity-70 transition-opacity"
                >
                  <span className="flex items-center gap-1 text-xs font-black text-white">
                    <Users size={10} className="text-text-muted" /> {followerCount ?? '—'}
                  </span>
                  <span className="text-[8px] font-black text-text-muted uppercase">seguidores</span>
                </button>

                <ExternalLink size={16} className="text-cyan-electric shrink-0" />
              </div>
            )}
          </div>
        )}

        {/* ── Erro ── */}
        {state.error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
            <p className="text-[10px] font-black text-red-400 uppercase">Erro ao carregar dados</p>
            <button
              onClick={loadData}
              className="mt-2 text-[9px] font-black text-red-400/60 hover:text-red-400 uppercase transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* ── Conteúdo por tab ── */}
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

        {tab === 'badges' && (
          <BadgesSection
            playerId={myPlayer?.id}
            babaId={currentBaba?.id}
          />
        )}

        {tab === 'edit' && (
          <ProfileEdit
            profile={profile}
            onCancel={() => setTab('stats')}
            onSaved={() => { setTab('stats'); refreshProfile?.(); }}
            onProfileRefresh={refreshProfile}
          />
        )}

        {/* ── Preferências ── */}
        {tab === 'stats' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-1 border border-border-subtle">
              <div>
                <p className="text-[10px] font-black uppercase text-text-low tracking-widest">Tema</p>
                <p className="text-[9px] text-text-muted mt-0.5">Aparência do app</p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        )}

        {/* ── Privacidade e dados (LGPD) ── */}
        {tab === 'stats' && (
          <div className="rounded-2xl bg-surface-1 border border-border-subtle overflow-hidden">
            <p className="px-4 pt-4 text-[9px] font-black uppercase text-text-muted tracking-widest">
              Privacidade e dados
            </p>
            <button
              onClick={() => setShowExportData(true)}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-surface-2/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Download size={16} className="text-cyan-electric" />
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase text-text-low tracking-widest">Exportar meus dados</p>
                  <p className="text-[9px] text-text-muted mt-0.5">Baixe um arquivo .json com tudo que temos sobre você</p>
                </div>
              </div>
            </button>
            <div className="border-t border-border-subtle" />
            <button
              onClick={() => setShowDeleteAccount(true)}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-red-500/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Trash2 size={16} className="text-red-400" />
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase text-red-400 tracking-widest">Excluir minha conta</p>
                  <p className="text-[9px] text-text-muted mt-0.5">Remove seus dados pessoais permanentemente</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* ── Indicações ── */}
        {tab === 'stats' && (
          <div className="bg-surface-1 border border-border-subtle rounded-3xl p-5">
            <ReferralPanel />
          </div>
        )}

      </div>

      <ShareableCardModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        rankingType="profile"
        profileData={profileShareData}
      />

      {showExportData && (
        <ExportDataModal onClose={() => setShowExportData(false)} />
      )}

      {showDeleteAccount && (
        <DeleteAccountModal onClose={() => setShowDeleteAccount(false)} />
      )}

      {divisionChange && (
        <DivisionChangeScreen
          oldRating={divisionChange.oldRating}
          newRating={divisionChange.newRating}
          playerName={profile?.name || 'Atleta'}
          onDone={() => setDivisionChange(null)}
        />
      )}
    </div>
  );
};

export default ProfilePage;
