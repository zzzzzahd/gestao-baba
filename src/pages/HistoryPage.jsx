import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { supabase } from '../services/supabase';
import {
  ArrowLeft, Calendar, Trophy, Target,
  ChevronDown, ChevronUp, Users, Clock
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const statusLabel = {
  finished:    { text: 'Finalizada',  color: 'text-green-400  bg-green-400/10  border-green-400/20'  },
  in_progress: { text: 'Em andamento',color: 'text-cyan-electric bg-cyan-electric/10 border-cyan-electric/20' },
  scheduled:   { text: 'Agendada',   color: 'text-white/40   bg-white/5       border-white/10'       },
};

// ─── Card de partida ─────────────────────────────────────────────────────────

const MatchCard = ({ match }) => {
  const [open,        setOpen]        = useState(false);
  const [players,     setPlayers]     = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const st    = statusLabel[match.status] || statusLabel.scheduled;
  const scoreA = match.team_a_score ?? 0;
  const scoreB = match.team_b_score ?? 0;
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

  const teamA = players.filter(p => p.team === 'A' || p.team === 'a');
  const teamB = players.filter(p => p.team === 'B' || p.team === 'b');
  const scorers = players.filter(p => p.goals > 0 || p.assists > 0);

  return (
    <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] overflow-hidden">

      {/* Header do card */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[9px] text-white/30 font-black uppercase">
            <Calendar size={10} />
            <span>{formatDate(match.match_date)}</span>
            <span className="text-white/10">·</span>
            <Clock size={10} />
            <span>{formatTime(match.match_date)}</span>
          </div>
          <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg border ${st.color}`}>
            {st.text}
          </span>
        </div>

        {/* Placar */}
        <div className="flex items-center justify-between gap-4">
          {/* Time A */}
          <div className={`flex-1 text-center p-3 rounded-2xl transition-all ${winnerA ? 'bg-cyan-electric/10 border border-cyan-electric/20' : 'bg-white/5'}`}>
            <p className={`text-[10px] font-black uppercase tracking-wide mb-1 ${winnerA ? 'text-cyan-electric' : 'text-white/50'}`}>
              {match.team_a_name}
              {winnerA && <span className="ml-1">👑</span>}
            </p>
            <p className={`text-4xl font-black font-mono ${winnerA ? 'text-cyan-electric' : 'text-white/60'}`}>
              {scoreA}
            </p>
          </div>

          <div className="text-white/20 font-black text-sm italic">VS</div>

          {/* Time B */}
          <div className={`flex-1 text-center p-3 rounded-2xl transition-all ${winnerB ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-white/5'}`}>
            <p className={`text-[10px] font-black uppercase tracking-wide mb-1 ${winnerB ? 'text-yellow-500' : 'text-white/50'}`}>
              {match.team_b_name}
              {winnerB && <span className="ml-1">👑</span>}
            </p>
            <p className={`text-4xl font-black font-mono ${winnerB ? 'text-yellow-500' : 'text-white/60'}`}>
              {scoreB}
            </p>
          </div>
        </div>

        {/* Foto do vencedor */}
        {match.winner_photo_url && (
          <div className="mt-4">
            <img
              src={match.winner_photo_url}
              alt="Time vencedor"
              className="w-full rounded-2xl object-cover max-h-48 border border-white/10"
            />
          </div>
        )}

        {/* Botão expandir */}
        <button
          onClick={loadPlayers}
          className="w-full mt-4 py-2 flex items-center justify-center gap-2 text-[9px] font-black uppercase text-white/30 hover:text-cyan-electric transition-colors"
        >
          {loadingPlayers
            ? <div className="w-3 h-3 border-2 border-cyan-electric border-t-transparent rounded-full animate-spin" />
            : open
              ? <><ChevronUp size={12} /> Ocultar detalhes</>
              : <><ChevronDown size={12} /> Ver escalação e gols</>
          }
        </button>
      </div>

      {/* Detalhes expandidos */}
      {open && players.length > 0 && (
        <div className="border-t border-white/5 p-5 space-y-5 bg-black/20">

          {/* Artilheiros */}
          {scorers.length > 0 && (
            <div>
              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-3">
                ⚽ Gols & Assistências
              </p>
              <div className="space-y-2">
                {scorers.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[11px] font-black">{p.player?.name || '—'}</span>
                    <div className="flex items-center gap-3">
                      {p.goals > 0 && (
                        <span className="text-[10px] font-black text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-lg">
                          ⚽ {p.goals}
                        </span>
                      )}
                      {p.assists > 0 && (
                        <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-lg">
                          🎯 {p.assists}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Escalações */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: match.team_a_name, players: teamA, color: 'text-cyan-electric' },
              { label: match.team_b_name, players: teamB, color: 'text-yellow-500'   },
            ].map(({ label, players: list, color }) => (
              <div key={label}>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${color}`}>
                  {label}
                </p>
                <div className="space-y-1">
                  {list.map((p, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        p.player?.position === 'goleiro' ? 'bg-green-500' : 'bg-white/20'
                      }`} />
                      <span className="text-[10px] text-white/60 truncate">{p.player?.name}</span>
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

// ─── Página principal ────────────────────────────────────────────────────────

const HistoryPage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();

  const [matches,  setMatches]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all'); // 'all' | 'finished' | 'month'
  const [page,     setPage]     = useState(0);
  const [hasMore,  setHasMore]  = useState(false);

  const PAGE_SIZE = 10;

  const loadMatches = useCallback(async (reset = false) => {
    if (!currentBaba?.id) return;
    setLoading(true);

    const currentPage = reset ? 0 : page;
    if (reset) setPage(0);

    let query = supabase
      .from('matches')
      .select('*', { count: 'exact' })
      .eq('baba_id', currentBaba.id)
      .order('match_date', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (filter === 'finished') {
      query = query.eq('status', 'finished');
    } else if (filter === 'month') {
      const start = new Date();
      start.setDate(1); start.setHours(0, 0, 0, 0);
      query = query.gte('match_date', start.toISOString());
    }

    const { data, count, error } = await query;
    if (error) { console.error('[HistoryPage]', error); setLoading(false); return; }

    if (reset) {
      setMatches(data || []);
    } else {
      setMatches(prev => [...prev, ...(data || [])]);
    }

    setHasMore((currentPage + 1) * PAGE_SIZE < (count || 0));
    setLoading(false);
  }, [currentBaba?.id, filter, page]);

  // Recarrega quando filtro muda
  useEffect(() => { loadMatches(true); }, [currentBaba?.id, filter]);

  const loadMore = () => {
    setPage(p => p + 1);
  };

  useEffect(() => {
    if (page > 0) loadMatches(false);
  }, [page]);

  const stats = {
    total:    matches.length,
    finished: matches.filter(m => m.status === 'finished').length,
    goals:    matches.reduce((s, m) => s + (m.team_a_score || 0) + (m.team_b_score || 0), 0),
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-28">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">Histórico</h1>
            <p className="text-[10px] text-white/30 uppercase font-black">{currentBaba?.name}</p>
          </div>
        </div>

        {/* Resumo rápido */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Partidas',  value: stats.total,    icon: <Calendar size={14} /> },
            { label: 'Finalizadas', value: stats.finished, icon: <Trophy size={14} />   },
            { label: 'Gols',      value: stats.goals,    icon: <Target size={14} />   },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
              <div className="flex justify-center text-cyan-electric/60 mb-2">{s.icon}</div>
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
          {[
            { id: 'all',      label: 'Todas'    },
            { id: 'finished', label: 'Finalizadas' },
            { id: 'month',    label: 'Este mês' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${
                filter === f.id
                  ? 'bg-cyan-electric text-black shadow-lg shadow-cyan-500/20'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista de partidas */}
        <div className="space-y-4">
          {loading && matches.length === 0 ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-[2rem] bg-white/5 animate-pulse" />
            ))
          ) : matches.length > 0 ? (
            <>
              {matches.map(match => (
                <MatchCard key={match.id} match={match} />
              ))}
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  {loading ? 'Carregando...' : 'Carregar mais'}
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
              <Calendar size={32} className="text-white/10 mx-auto mb-3" />
              <p className="text-white/20 font-black uppercase text-sm">Nenhuma partida encontrada</p>
              <p className="text-white/10 text-[10px] mt-1">As partidas aparecerão aqui após o sorteio</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default HistoryPage;
