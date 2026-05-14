// src/pages/ComparisonPage.jsx
// Feature: Comparação 1v1 entre dois jogadores do mesmo baba.
// Acessível via /comparison?a=<player_id>&b=<player_id>

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Trophy, Target, Star, Zap, TrendingUp } from 'lucide-react';
import { useBaba }  from '../contexts/BabaContext';
import { supabase } from '../services/supabase';
import { ProfileSkeleton } from '../components/SkeletonLoader';

// ── Mini avatar ───────────────────────────────────────────────────────────────
const Avatar = ({ url, name, size = 16 }) => (
  url
    ? <img src={url} alt={name} className={`w-${size} h-${size} rounded-full object-cover ring-2 ring-cyan-electric/30`} />
    : <div className={`w-${size} h-${size} rounded-full bg-cyan-electric/10 border border-cyan-electric/20 flex items-center justify-center text-cyan-electric font-black text-lg`}>
        {name?.charAt(0)?.toUpperCase() ?? '?'}
      </div>
);

// ── Barra de comparação ───────────────────────────────────────────────────────
const CompBar = ({ labelA, valA, labelB, valB, unit = '' }) => {
  const total = (valA || 0) + (valB || 0);
  const pctA  = total === 0 ? 50 : Math.round(((valA || 0) / total) * 100);
  const pctB  = 100 - pctA;
  const winA  = valA > valB;
  const winB  = valB > valA;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-text-low">
        <span className={winA ? 'text-cyan-electric' : ''}>{valA ?? 0}{unit}</span>
        <span className="text-text-muted">{labelA ?? ''}</span>
        <span className={winB ? 'text-cyan-electric' : ''}>{valB ?? 0}{unit}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        <div
          className={`h-full transition-all duration-700 rounded-l-full ${winA ? 'bg-cyan-electric' : 'bg-surface-3'}`}
          style={{ width: `${pctA}%` }}
        />
        <div
          className={`h-full transition-all duration-700 rounded-r-full ${winB ? 'bg-cyan-electric' : 'bg-surface-3'}`}
          style={{ width: `${pctB}%` }}
        />
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ComparisonPage() {
  const [searchParams]         = useSearchParams();
  const navigate               = useNavigate();
  const { currentBaba, players } = useBaba();

  const pidA = searchParams.get('a');
  const pidB = searchParams.get('b');

  const [profileA, setProfileA] = useState(null);
  const [profileB, setProfileB] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [selA,     setSelA]     = useState(pidA ?? '');
  const [selB,     setSelB]     = useState(pidB ?? '');

  const loadProfile = useCallback(async (playerId) => {
    if (!playerId || !currentBaba?.id) return null;
    const { data } = await supabase.rpc('get_player_full_profile', {
      p_player_id: playerId,
      p_baba_id:   currentBaba.id,
    });
    return data;
  }, [currentBaba?.id]);

  useEffect(() => {
    if (!selA || !selB || selA === selB) { setLoading(false); return; }
    setLoading(true);
    Promise.all([loadProfile(selA), loadProfile(selB)]).then(([a, b]) => {
      setProfileA(a);
      setProfileB(b);
      setLoading(false);
    });
  }, [selA, selB, loadProfile]);

  const PlayerSelect = ({ value, onChange, exclude }) => (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="flex-1 bg-surface-2 border border-border-mid rounded-xl px-3 py-2 text-[11px] font-bold text-white appearance-none"
      aria-label="Selecionar jogador"
    >
      <option value="">Escolher jogador…</option>
      {(players ?? [])
        .filter(p => p.id !== exclude)
        .map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
    </select>
  );

  const canCompare = selA && selB && selA !== selB;

  return (
    <div className="min-h-screen bg-black text-white px-5 pt-6 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="p-2 rounded-xl bg-surface-2 border border-border-mid text-text-low hover:text-white transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <div>
          <h1 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
            <Users size={14} className="text-cyan-electric" aria-hidden="true" /> Comparação 1v1
          </h1>
          <p className="text-[9px] text-text-low font-black uppercase mt-0.5">{currentBaba?.name}</p>
        </div>
      </div>

      {/* Seletores */}
      <div className="flex items-center gap-2 mb-6">
        <PlayerSelect value={selA} onChange={setSelA} exclude={selB} />
        <span className="text-cyan-electric font-black text-sm">VS</span>
        <PlayerSelect value={selB} onChange={setSelB} exclude={selA} />
      </div>

      {!canCompare && (
        <div className="text-center text-text-low text-[11px] font-bold mt-16">
          Selecione dois jogadores diferentes para comparar
        </div>
      )}

      {canCompare && loading && <ProfileSkeleton />}

      {canCompare && !loading && profileA && profileB && (() => {
        const pA    = profileA?.player ?? {};
        const pB    = profileB?.player ?? {};
        const sA    = profileA?.stats  ?? {};
        const sB    = profileB?.stats  ?? {};
        const strA  = profileA?.streak ?? {};
        const strB  = profileB?.streak ?? {};
        const wrA   = profileA?.win_rate ?? 0;
        const wrB   = profileB?.win_rate ?? 0;

        const METRICS = [
          { label: 'Gols',       icon: Trophy,    valA: sA.goals,        valB: sB.goals        },
          { label: 'Assistências', icon: Target,  valA: sA.assists,      valB: sB.assists       },
          { label: 'Partidas',   icon: Zap,       valA: sA.matches_played, valB: sB.matches_played },
          { label: 'Vitórias',   icon: Star,      valA: sA.wins,         valB: sB.wins          },
          { label: 'Aproveitamento', icon: TrendingUp, valA: wrA,        valB: wrB, unit: '%'   },
          { label: 'Sequência',  icon: Star,      valA: strA.current_streak, valB: strB.current_streak, unit: '🔥' },
          { label: 'Avaliação',  icon: Star,      valA: Number(pA.overall ?? 5).toFixed(1), valB: Number(pB.overall ?? 5).toFixed(1) },
        ];

        return (
          <div className="space-y-6">
            {/* Avatares */}
            <div className="flex items-center justify-between px-4">
              <div className="flex flex-col items-center gap-2">
                <Avatar url={pA.avatar_url} name={pA.name} size={16} />
                <span className="text-[11px] font-black text-white text-center max-w-[80px] truncate">{pA.name}</span>
                <span className="text-[8px] text-text-low font-bold uppercase">{pA.position ?? 'linha'}</span>
              </div>
              <div className="text-2xl font-black text-cyan-electric">VS</div>
              <div className="flex flex-col items-center gap-2">
                <Avatar url={pB.avatar_url} name={pB.name} size={16} />
                <span className="text-[11px] font-black text-white text-center max-w-[80px] truncate">{pB.name}</span>
                <span className="text-[8px] text-text-low font-bold uppercase">{pB.position ?? 'linha'}</span>
              </div>
            </div>

            {/* Métricas */}
            <div className="bg-surface-1 border border-border-subtle rounded-3xl p-5 space-y-5">
              {METRICS.map(({ label, icon: Icon, valA, valB, unit = '' }) => (
                <div key={label}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon size={11} className="text-text-low" aria-hidden="true" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-text-low">{label}</span>
                  </div>
                  <CompBar valA={Number(valA) || 0} valB={Number(valB) || 0} unit={unit} />
                </div>
              ))}
            </div>

            {/* Vencedor geral */}
            {(() => {
              const scoreA = METRICS.reduce((s, m) => s + (Number(m.valA) > Number(m.valB) ? 1 : 0), 0);
              const scoreB = METRICS.reduce((s, m) => s + (Number(m.valB) > Number(m.valA) ? 1 : 0), 0);
              const winner = scoreA > scoreB ? pA.name : scoreB > scoreA ? pB.name : null;
              return (
                <div className={`p-4 rounded-2xl border text-center ${winner ? 'bg-cyan-electric/10 border-cyan-electric/30' : 'bg-surface-2 border-border-mid'}`}>
                  {winner
                    ? <><p className="text-[9px] font-black uppercase text-text-low">Vantagem geral</p>
                        <p className="text-base font-black text-cyan-electric mt-1">{winner} 🏆</p></>
                    : <p className="text-[11px] font-black text-text-mid">Empate técnico!</p>
                  }
                </div>
              );
            })()}
          </div>
        );
      })()}
    </div>
  );
}
