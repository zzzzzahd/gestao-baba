import React, { useState, useEffect, useReducer, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBaba } from '../contexts/BabaContext';
import { supabase } from '../services/supabase';

import ProfileHeader from '../components/ProfileHeader';
import ProfileStats  from '../components/ProfileStats';
import ProfileEdit   from '../components/ProfileEdit';

// ─────────────────────────────────────────────
// ESTADO — useReducer no lugar de 5x useState
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
  const { profile, user, refreshProfile } = useAuth();
  const { myBabas }                        = useBaba();

  const [tab,   setTab]   = useState('stats');
  const [state, dispatch] = useReducer(reducer, INITIAL);

  // ── LOAD — 1 round-trip via RPC ──────────────

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
          ratings:     (result.ratings    || []).map(r => ({ ...r, baba_name: r.baba_name || babaMap.get(r.baba_id) || 'Baba' })),
          matchStats:  (result.match_stats|| []).map(m => ({ ...m, baba_name: m.baba_name || babaMap.get(m.baba_id) || 'Baba' })),
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

  // Rating global para o header
  const globalRating = (() => {
    const vals = state.ratings.map(r => r.final_rating).filter(v => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  })();

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

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-surface-2 rounded-xl border border-border-mid">
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
            statsData={{ ratings: state.ratings, matchStats: state.matchStats, bestOfMonth: state.bestOfMonth, ranking: state.ranking }}
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
    </div>
  );
};

export default ProfilePage;
