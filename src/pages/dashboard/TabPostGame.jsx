// src/pages/dashboard/TabPostGame.jsx
// Sprint 4/5 — SeasonCard + ActivityFeed + narrativa IA integrados.

import React, { useState, useEffect } from 'react';
import { useNavigate }    from 'react-router-dom';
import { Trophy, Calendar, ChevronRight, Sparkles, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { supabase }       from '../../services/supabase';
import { useBaba }        from '../../contexts/BabaContext';
import { useFeatures }    from '../../utils/babaMode';
import { MatchCardSkeleton } from '../../components/SkeletonLoader';
import AiInsightsPanel    from '../../components/AiInsightsPanel';
import SeasonCard         from '../../components/SeasonCard';
import ActivityFeed       from '../../components/ActivityFeed';

// ─── Narrativa da última partida ──────────────────────────────────────────────

const MatchNarrative = ({ babaId }) => {
  const [narrative, setNarrative] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [matchId,   setMatchId]   = useState(null);

  useEffect(() => {
    if (!babaId) return;
    // Buscar última partida finalizada
    supabase
      .from('matches')
      .select('id')
      .eq('baba_id', babaId)
      .eq('status', 'finished')
      .order('finished_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.id) {
          setMatchId(data.id);
          // Verificar se já tem narrativa
          supabase
            .from('match_narratives')
            .select('narrative')
            .eq('match_id', data.id)
            .maybeSingle()
            .then(({ data: n }) => { if (n) setNarrative(n.narrative); });
        }
      });
  }, [babaId]);

  const generate = async () => {
    if (!matchId || loading) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/narrate-match`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ match_id: matchId, baba_id: babaId }),
        }
      );
      const result = await res.json();
      if (result.narrative) setNarrative(result.narrative);
    } catch (err) {
      console.error('[MatchNarrative]', err);
    } finally {
      setLoading(false);
    }
  };

  if (!matchId) return null;

  return (
    <div className="p-4 rounded-2xl bg-surface-1 border border-border-subtle space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-cyan-electric" />
          <span className="text-[10px] font-black uppercase tracking-widest text-text-low">
            Narrativa do último jogo
          </span>
        </div>
        {!narrative && (
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-electric/10 border border-cyan-electric/20 text-cyan-electric text-[9px] font-black uppercase disabled:opacity-50"
          >
            {loading ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />}
            {loading ? 'Gerando...' : 'Gerar'}
          </button>
        )}
      </div>
      {narrative ? (
        <p className="text-[12px] text-text-mid leading-relaxed font-bold italic">
          "{narrative}"
        </p>
      ) : (
        <p className="text-[10px] text-text-muted font-black">
          Clique em Gerar para a IA narrar a última pelada 🎙️
        </p>
      )}
    </div>
  );
};

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
  const features              = useFeatures();
  const [recentMatches,   setRecentMatches]   = useState([]);
  const [loadingMatches,  setLoadingMatches]  = useState(true);
  const [showInsights,    setShowInsights]    = useState(false);

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

      {/* Sprint 4 — Temporada ativa */}
      {features.seasons && (
        <SeasonCard babaId={currentBaba?.id} />
      )}

      {/* Sprint 5 — Narrativa IA da última partida */}
      {features.ai && (
        <MatchNarrative babaId={currentBaba?.id} />
      )}

      {/* Sprint 7 — Feed de atividade */}
      {features.reactions && (
        <div className="p-5 rounded-3xl bg-surface-1 border border-border-subtle">
          <ActivityFeed babaId={currentBaba?.id} limit={8} />
        </div>
      )}

      {/* Sprint 5 — AI Insights (colapsável) */}
      {features.ai && (
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
      )}

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
