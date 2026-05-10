// src/pages/dashboard/TabPostGame.jsx
// Sprint 18 — AiInsightsPanel integrado na aba pós-jogo

import React, { useState, useEffect } from 'react';
import { useNavigate }    from 'react-router-dom';
import { Trophy, Calendar, ChevronRight, Star, Target, Zap, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase }       from '../../services/supabase';
import { useBaba }        from '../../contexts/BabaContext';
import { MatchCardSkeleton } from '../../components/SkeletonLoader';
import AiInsightsPanel    from '../../components/AiInsightsPanel';

// ─── Últimas partidas compactas ───────────────────────────────────────────────

const RecentMatchCard = ({ match }) => {
  const date = match.match_date
    ? new Date(match.match_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : '—';
  const isFinished = match.status === 'finished';
  const scoreA     = match.team_a_score ?? '—';
  const scoreB     = match.team_b_score ?? '—';

  return (
    <div className="flex items-center gap-4 p-4 bg-surface-1 rounded-2xl border border-border-subtle">
      <div className="text-center shrink-0">
        <p className="text-[10px] font-black text-text-muted uppercase">{date}</p>
        {isFinished && (
          <span className="text-[8px] font-black text-green-500 uppercase">Finalizado</span>
        )}
      </div>
      <div className="flex-1 flex items-center justify-between">
        <p className="text-[11px] font-black uppercase truncate max-w-[80px]">
          {match.team_a_name || 'Time A'}
        </p>
        <div className="flex items-center gap-2 mx-2 shrink-0">
          <span className="text-lg font-black tabular-nums text-white">{scoreA}</span>
          <span className="text-text-muted font-black">×</span>
          <span className="text-lg font-black tabular-nums text-white">{scoreB}</span>
        </div>
        <p className="text-[11px] font-black uppercase truncate max-w-[80px] text-right">
          {match.team_b_name || 'Time B'}
        </p>
      </div>
    </div>
  );
};

// ─── TabPostGame ──────────────────────────────────────────────────────────────

const TabPostGame = ({ currentBaba, isPresident }) => {
  const navigate              = useNavigate();
  const [recentMatches,   setRecentMatches]   = useState([]);
  const [loadingMatches,  setLoadingMatches]  = useState(true);
  const [showInsights,    setShowInsights]    = useState(true);

  useEffect(() => {
    if (!currentBaba?.id) return;
    setLoadingMatches(true);
    supabase
      .from('matches')
      .select('id, match_date, status, team_a_name, team_b_name, team_a_score, team_b_score, winner_team')
      .eq('baba_id', currentBaba.id)
      .order('match_date', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setRecentMatches(data || []);
        setLoadingMatches(false);
      });
  }, [currentBaba?.id]);

  return (
    <div className="space-y-5">

      {/* Sprint 18 — AI Insights */}
      <div className="rounded-3xl bg-surface-1 border border-border-subtle overflow-hidden">
        <button
          onClick={() => setShowInsights(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-cyan-electric" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">
              Insights da IA
            </span>
          </div>
          {showInsights
            ? <ChevronUp   size={14} className="text-text-low" />
            : <ChevronDown size={14} className="text-text-low" />}
        </button>
        {showInsights && (
          <div className="px-5 pb-5 border-t border-border-subtle pt-4">
            <AiInsightsPanel babaId={currentBaba?.id} isPresident={isPresident} />
          </div>
        )}
      </div>

      {/* Acessos rápidos */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Trophy,   label: 'Rankings',  sub: 'Ver classificação', path: '/rankings', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { icon: Calendar, label: 'Histórico', sub: 'Partidas passadas',  path: '/history',  color: 'text-cyan-electric', bg: 'bg-cyan-electric/10 border-cyan-electric/20' },
        ].map(item => (
          <div
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`p-4 rounded-2xl border cursor-pointer hover:opacity-80 transition-all active:scale-95 ${item.bg}`}
          >
            <item.icon size={20} className={`${item.color} mb-2`} />
            <p className="text-xs font-black text-white uppercase tracking-wide">{item.label}</p>
            <p className="text-[9px] text-text-low font-black">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Últimas partidas */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[10px] font-black text-text-low uppercase tracking-widest">
            Últimas partidas
          </span>
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-1 text-[9px] font-black text-cyan-electric uppercase hover:text-white transition-colors"
          >
            Ver todas <ChevronRight size={10} />
          </button>
        </div>

        <div className="space-y-2">
          {loadingMatches ? (
            <MatchCardSkeleton count={3} />
          ) : recentMatches.length > 0 ? (
            recentMatches.map(m => <RecentMatchCard key={m.id} match={m} />)
          ) : (
            <div className="text-center py-10 border-2 border-dashed border-border-subtle rounded-3xl">
              <Calendar size={28} className="text-text-muted mx-auto mb-2" />
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                Nenhuma partida ainda
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TabPostGame;
