// src/pages/HistoryPage.jsx
// Sprint 12 — integra get_player_timeline (paginado, RPC)
// Mantém visão geral de partidas do baba + tab de timeline pessoal

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba }     from '../contexts/BabaContext';
import { useAuth }     from '../contexts/AuthContext';
import { supabase }    from '../services/supabase';
import {
  ArrowLeft, Calendar, Trophy, Target,
  ChevronDown, ChevronUp, Clock, TrendingUp,
  CheckCircle2, XCircle, Minus,
} from 'lucide-react';
import { MatchCardSkeleton }   from '../components/SkeletonLoader';
import { toastErrorWithRetry } from '../utils/toastUtils.jsx';
import { usePullToRefresh }    from '../hooks/usePullToRefresh';
import PullToRefreshIndicator  from '../components/PullToRefreshIndicator';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const statusLabel = {
  finished:    { text: 'Finalizada',   color: 'text-green-400 bg-green-400/10 border-green-400/20'            },
  in_progress: { text: 'Em andamento', color: 'text-cyan-electric bg-cyan-electric/10 border-cyan-electric/20' },
  scheduled:   { text: 'Agendada',     color: 'text-text-low bg-surface-2 border-border-mid'                   },
};

// ─── MatchCard ────────────────────────────────────────────────────────────────

const MatchCard = ({ match }) => {
  const [open,           setOpen]           = useState(false);
  const [players,        setPlayers]        = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const st      = statusLabel[match.status] || statusLabel.scheduled;
  const scoreA  = match.team_a_score ?? 0;
  const scoreB  = match.team_b_score ?? 0;
  const winnerA = match.winner_team === 'a' || match.winner_team === 'A';
  const winnerB = match.winner_team === 'b' || match.winner_team === 'B';

  const loadPlayers = async () => {
    if (players.length > 0) { setOpen(o => !o); return; }
    setLoadingPlayers(true);
    const { data } = await supabase
      .from('match_players')
      .select('team, goals, assists, player:players(name, position)')
      .eq('match_id', match.id)
      .order('team');
    setPlayers(data || []);
    setLoadingPlayers(false);
    setOpen(true);
  };

  const teamA   = players.filter(p => p.team === 'A' || p.team === 'a');
  const teamB   = players.filter(p => p.team === 'B' || p.team === 'b');
  const scorers = players.filter(p => p.goals > 0 || p.assists > 0);

  return (
    <div className="rounded-[2rem] border border-border-subtle bg-surface-1 overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[9px] text-text-low font-black uppercase">
            <Calendar size={10} />
            <span>{formatDate(match.match_date)}</span>
            <span className="text-text-muted">·</span>
            <Clock size={10} />
            <span>{formatTime(match.match_date)}</span>
          </div>
          <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg border ${st.color}`}>
            {st.text}
          </span>
        </div>

        {/* Placar */}
        <div className="flex items-center justify-between gap-4">
          <div className={`flex-1 text-center p-3 rounded-2xl transition-all ${
            winnerA ? 'bg-cyan-electric/10 border border-cyan-electric/20' : 'bg-surface-2'
          }`}>
            <p className={`text-[10px] font-black uppercase tracking-wide mb-1 ${winnerA ? 'text-cyan-electric' : 'text-text-mid'}`}>
              {match.team_a_name}{winnerA && <span className="ml-1">👑</span>}
            </p>
            <p className={`text-4xl font-black font-mono ${winnerA ? 'text-cyan-electric' : 'text-text-mid'}`}>
              {scoreA}
            </p>
          </div>
          <div className="text-text-muted font-black text-sm italic">VS</div>
          <div className={`flex-1 text-center p-3 rounded-2xl transition-all ${
            winnerB ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-surface-2'
          }`}>
            <p className={`text-[10px] font-black uppercase tracking-wide mb-1 ${winnerB ? 'text-yellow-500' : 'text-text-mid'}`}>
              {match.team_b_name}{winnerB && <span className="ml-1">👑</span>}
            </p>
            <p className={`text-4xl font-black font-mono ${winnerB ? 'text-yellow-500' : 'text-text-mid'}`}>
              {scoreB}
            </p>
          </div>
        </div>

        {match.winner_photo_url && (
          <div className="mt-4">
            <img src={match.winner_photo_url} alt="Time vencedor" className="w-full rounded-2xl object-cover max-h-48 border border-border-mid" />
          </div>
        )}

        <button
          onClick={loadPlayers}
          className="w-full mt-4 py-2 flex items-center justify-center gap-2 text-[9px] font-black uppercase text-text-low hover:text-cyan-electric transition-colors"
        >
          {loadingPlayers
            ? <div className="w-3 h-3 border-2 border-cyan-electric border-t-transparent rounded-full animate-spin" />
            : open
              ? <><ChevronUp size={12} /> Ocultar detalhes</>
              : <><ChevronDown size={12} /> Ver escalação e gols</>
          }
        </button>
      </div>

      {open && players.length > 0 && (
        <div className="border-t border-border-subtle p-5 space-y-5 bg-black/20">
          {scorers.length > 0 && (
            <div>
              <p className="text-[9px] font-black text-text-low uppercase tracking-widest mb-3">⚽ Gols & Assistências</p>
              <div className="space-y-2">
                {scorers.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[11px] font-black">{p.player?.name || '—'}</span>
                    <div className="flex items-center gap-2">
                      {p.goals > 0 && (
                        <span className="text-[10px] font-black text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-lg">⚽ {p.goals}</span>
                      )}
                      {p.assists > 0 && (
                        <span className="text-[10px] font-black text-cyan-electric bg-cyan-electric/10 px-2 py-0.5 rounded-lg">🎯 {p.assists}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: match.team_a_name, players: teamA, color: 'text-cyan-electric' },
              { label: match.team_b_name, players: teamB, color: 'text-yellow-500'    },
            ].map(({ label, players: list, color }) => (
              <div key={label}>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${color}`}>{label}</p>
                <div className="space-y-1">
                  {list.map((p, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        p.player?.position === 'goleiro' ? 'bg-green-500' : 'bg-surface-3'
                      }`} />
                      <span className="text-[10px] text-text-mid truncate">{p.player?.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── TimelineCard (Sprint 12) ─────────────────────────────────────────────────

const RESULT_CONFIG = {
  win:  { icon: CheckCircle2, color: 'text-green-400',  bg: 'bg-green-400/5  border-green-400/15',  label: 'Vitória'  },
  draw: { icon: Minus,        color: 'text-yellow-400', bg: 'bg-yellow-400/5 border-yellow-400/15', label: 'Empate'   },
  loss: { icon: XCircle,      color: 'text-red-400',    bg: 'bg-red-400/5    border-red-400/15',    label: 'Derrota'  },
};

const TimelineCard = ({ item }) => {
  const cfg = RESULT_CONFIG[item.result] || RESULT_CONFIG.draw;
  const Icon = cfg.icon;

  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border ${cfg.bg}`}>
      <Icon size={20} className={cfg.color} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
          <span className="text-[9px] font-black text-text-muted">
            {item.match_date ? new Date(item.match_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {item.goals_scored > 0 && (
            <span className="text-[9px] font-black text-orange-400">⚽ {item.goals_scored}</span>
          )}
          {item.assists_made > 0 && (
            <span className="text-[9px] font-black text-cyan-electric">🎯 {item.assists_made}</span>
          )}
          {item.goals_scored === 0 && item.assists_made === 0 && (
            <span className="text-[9px] font-black text-text-muted">Sem gols ou assistências</span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── HistoryPage ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const HistoryPage = () => {
  const navigate        = useNavigate();
  const { currentBaba, players } = useBaba();
  const { user }        = useAuth();

  const [tab,     setTab]     = useState('matches'); // 'matches' | 'timeline'
  const [filter,  setFilter]  = useState('all');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Timeline (Sprint 12)
  const [timeline,     setTimeline]     = useState([]);
  const [tlLoading,    setTlLoading]    = useState(false);
  const [tlPage,       setTlPage]       = useState(0);
  const [tlHasMore,    setTlHasMore]    = useState(false);
  const TL_PAGE = 20;

  const myPlayer = currentBaba
    ? players?.find(p => p.user_id === user?.id)
    : null;

  // ── Partidas do baba ──────────────────────────────────────────────────────
  const loadMatches = useCallback(async (reset = false) => {
    if (!currentBaba?.id) return;
    setLoading(true);
    const pg = reset ? 0 : page;
    if (reset) setPage(0);

    let query = supabase
      .from('matches')
      .select('*', { count: 'exact' })
      .eq('baba_id', currentBaba.id)
      .order('match_date', { ascending: false })
      .range(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE - 1);

    if (filter === 'finished') query = query.eq('status', 'finished');
    if (filter === 'month') {
      const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
      query = query.gte('match_date', start.toISOString());
    }

    const { data, count, error } = await query;
    if (error) {
      toastErrorWithRetry('Erro ao carregar histórico', () => loadMatches(true));
      setLoading(false);
      return;
    }
    setMatches(prev => reset ? (data || []) : [...prev, ...(data || [])]);
    setHasMore((pg + 1) * PAGE_SIZE < (count || 0));
    setLoading(false);
  }, [currentBaba?.id, filter, page]);

  useEffect(() => { loadMatches(true); }, [currentBaba?.id, filter]);
  useEffect(() => { if (page > 0) loadMatches(false); }, [page]);

  // ── Timeline pessoal (Sprint 12) ──────────────────────────────────────────
  const loadTimeline = useCallback(async (reset = false) => {
    if (!myPlayer?.id || !currentBaba?.id) return;
    setTlLoading(true);
    const pg = reset ? 0 : tlPage;
    if (reset) setTlPage(0);

    const { data, error } = await supabase.rpc('get_player_timeline', {
      p_player_id: myPlayer.id,
      p_baba_id:   currentBaba.id,
      p_limit:     TL_PAGE,
      p_offset:    pg * TL_PAGE,
    });

    if (!error) {
      setTimeline(prev => reset ? (data || []) : [...prev, ...(data || [])]);
      setTlHasMore((data || []).length === TL_PAGE);
    }
    setTlLoading(false);
  }, [myPlayer?.id, currentBaba?.id, tlPage]);

  useEffect(() => {
    if (tab === 'timeline') loadTimeline(true);
  }, [tab, myPlayer?.id, currentBaba?.id]);

  useEffect(() => { if (tlPage > 0) loadTimeline(false); }, [tlPage]);

  // Pull-to-refresh
  const { pulling, pullY, refreshing, progress } = usePullToRefresh(
    async () => {
      if (tab === 'matches') { setMatches([]); await loadMatches(true); }
      else                   { setTimeline([]); await loadTimeline(true); }
    },
    { disabled: loading || tlLoading },
  );

  const stats = {
    total:    matches.length,
    finished: matches.filter(m => m.status === 'finished').length,
    goals:    matches.reduce((s, m) => s + (m.team_a_score || 0) + (m.team_b_score || 0), 0),
  };

  const tlStats = {
    wins:    timeline.filter(t => t.result === 'win').length,
    losses:  timeline.filter(t => t.result === 'loss').length,
    goals:   timeline.reduce((s, t) => s + (t.goals_scored || 0), 0),
    assists: timeline.reduce((s, t) => s + (t.assists_made || 0), 0),
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-28">
      <PullToRefreshIndicator pulling={pulling} pullY={pullY} refreshing={refreshing} progress={progress} />

      <div className="max-w-xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface-2 border border-border-mid flex items-center justify-center">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">Histórico</h1>
            <p className="text-[10px] text-text-low uppercase font-black">{currentBaba?.name}</p>
          </div>
        </div>

        {/* Tabs principais */}
        <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border-mid">
          <button
            onClick={() => setTab('matches')}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase rounded-lg transition-all ${
              tab === 'matches' ? 'bg-cyan-electric text-black' : 'text-text-low hover:text-white'
            }`}
          >
            Partidas
          </button>
          {myPlayer && (
            <button
              onClick={() => setTab('timeline')}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === 'timeline' ? 'bg-cyan-electric text-black' : 'text-text-low hover:text-white'
              }`}
            >
              <TrendingUp size={11} /> Minha Timeline
            </button>
          )}
        </div>

        {/* ── TAB: PARTIDAS ── */}
        {tab === 'matches' && (
          <>
            {/* Resumo */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Partidas',    value: stats.total,    icon: <Calendar size={14} /> },
                { label: 'Finalizadas', value: stats.finished, icon: <Trophy size={14} />   },
                { label: 'Gols',        value: stats.goals,    icon: <Target size={14} />   },
              ].map(s => (
                <div key={s.label} className="p-4 rounded-2xl bg-surface-2 border border-border-subtle text-center">
                  <div className="flex justify-center text-cyan-electric/60 mb-2">{s.icon}</div>
                  <p className="text-2xl font-black text-white">{s.value}</p>
                  <p className="text-[8px] font-black text-text-low uppercase tracking-widest mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filtros */}
            <div className="flex gap-2 p-1 bg-surface-2 rounded-xl border border-border-mid">
              {[
                { id: 'all',      label: 'Todas'       },
                { id: 'finished', label: 'Finalizadas' },
                { id: 'month',    label: 'Este mês'    },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${
                    filter === f.id ? 'bg-cyan-electric text-black' : 'text-text-low hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Lista */}
            <div className="space-y-4">
              {loading && matches.length === 0 ? (
                <MatchCardSkeleton count={3} />
              ) : matches.length > 0 ? (
                <>
                  {matches.map(match => <MatchCard key={match.id} match={match} />)}
                  {hasMore && (
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={loading}
                      className="w-full py-4 rounded-2xl bg-surface-2 border border-border-mid text-text-low font-black uppercase text-[10px] tracking-widest hover:bg-surface-3 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Carregando...' : 'Carregar mais'}
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center py-20 border-2 border-dashed border-border-subtle rounded-3xl">
                  <Calendar size={32} className="text-text-muted mx-auto mb-3" />
                  <p className="text-text-muted font-black uppercase text-sm">Nenhuma partida encontrada</p>
                  <p className="text-text-muted text-[10px] mt-1">
                    {filter === 'month' ? 'Nenhuma partida este mês ainda'
                      : filter === 'finished' ? 'Nenhuma partida finalizada ainda'
                      : 'As partidas aparecerão aqui após o sorteio'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── TAB: TIMELINE PESSOAL (Sprint 12) ── */}
        {tab === 'timeline' && myPlayer && (
          <>
            {/* Mini stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Vitórias', value: tlStats.wins,    color: 'text-green-400'  },
                { label: 'Derrotas', value: tlStats.losses,  color: 'text-red-400'    },
                { label: 'Gols',     value: tlStats.goals,   color: 'text-orange-400' },
                { label: 'Assists',  value: tlStats.assists, color: 'text-cyan-electric' },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-2xl bg-surface-1 border border-border-subtle text-center">
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Cards da timeline */}
            <div className="space-y-2">
              {tlLoading && timeline.length === 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-16 rounded-2xl bg-surface-1 border border-border-subtle animate-pulse" />
                  ))}
                </div>
              ) : timeline.length > 0 ? (
                <>
                  {timeline.map((item, i) => <TimelineCard key={`${item.match_id}-${i}`} item={item} />)}
                  {tlHasMore && (
                    <button
                      onClick={() => setTlPage(p => p + 1)}
                      disabled={tlLoading}
                      className="w-full py-4 rounded-2xl bg-surface-2 border border-border-mid text-text-low font-black uppercase text-[10px] tracking-widest hover:bg-surface-3 transition-all disabled:opacity-50"
                    >
                      {tlLoading ? 'Carregando...' : 'Carregar mais'}
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center py-20 border-2 border-dashed border-border-subtle rounded-3xl">
                  <TrendingUp size={32} className="text-text-muted mx-auto mb-3" />
                  <p className="text-text-muted font-black uppercase text-sm">Nenhuma partida na timeline</p>
                  <p className="text-text-muted text-[10px] mt-1">Suas partidas aparecerão aqui</p>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default HistoryPage;
