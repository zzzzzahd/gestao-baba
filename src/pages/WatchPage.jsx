// src/pages/WatchPage.jsx
// Ponto 7: substitui a antiga "página times" (descontinuada) — qualquer membro
// do baba pode acompanhar o sorteio do dia sem precisar controlar a partida:
// cronômetro, placar, ordem da fila e classificação do dia, atualizando sozinho.

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Users, Clock, Radio } from 'lucide-react';
import { useBaba } from '../contexts/BabaContext';
import { supabase } from '../services/supabase';
import { computeDailyTeamStandings } from '../utils/bracket';

const POLL_MS = 10000;

const formatTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const WatchPage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();

  const [teams,         setTeams]         = useState([]);
  const [goalkeeperQueue, setGoalkeeperQueue] = useState([]);
  const [liveMatch,     setLiveMatch]     = useState(null); // { team_a_name, team_b_name, team_a_score, team_b_score, clock_* }
  const [standings,     setStandings]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [sessionStatus, setSessionStatus] = useState(null); // 'active' | null (sem sessão ativa agora)
  const [nowTick,       setNowTick]       = useState(Date.now());

  const load = useCallback(async () => {
    if (!currentBaba?.id) return;
    const today = new Date().toISOString().split('T')[0];

    // Sessão ATIVA de hoje (pode ter mais de um sorteio no dia — só o mais
    // recente ainda ativo interessa aqui).
    const { data: draw } = await supabase
      .from('draw_results').select('*')
      .eq('baba_id', currentBaba.id).eq('draw_date', today)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle();

    setTeams(draw?.teams || []);
    setGoalkeeperQueue(draw?.goalkeeper_queue || []);
    setSessionStatus(draw?.status ?? null);

    if (draw?.id) {
      const { data: matches } = await supabase
        .from('matches')
        .select('team_a_name, team_b_name, team_a_score, team_b_score, status, clock_running, clock_ends_at, clock_remaining_seconds')
        .eq('baba_id', currentBaba.id)
        .eq('draw_result_id', draw.id);

      setStandings(computeDailyTeamStandings((matches || []).filter(m => m.status === 'finished')));
      setLiveMatch((matches || []).find(m => m.status === 'in_progress') || null);
    } else {
      setStandings([]);
      setLiveMatch(null);
    }
    setLoading(false);
  }, [currentBaba?.id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  // Tick de 1s só pro cronômetro contar certinho entre uma atualização e
  // outra (o placar/fila em si atualizam pelo poll de 10s acima).
  useEffect(() => {
    if (!liveMatch?.clock_running) return;
    const iv = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [liveMatch?.clock_running]);

  const clockDisplay = liveMatch
    ? (liveMatch.clock_running && liveMatch.clock_ends_at
        ? Math.max(0, Math.round((new Date(liveMatch.clock_ends_at).getTime() - nowTick) / 1000))
        : (liveMatch.clock_remaining_seconds ?? 600))
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="max-w-xl mx-auto px-5 pt-6 space-y-5">

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2.5 bg-surface-2 border border-border-subtle rounded-2xl text-text-low hover:text-white hover:bg-surface-3 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-black uppercase italic">Acompanhar Jogos</h1>
            <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{currentBaba?.name}</p>
          </div>
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-16 rounded-3xl bg-surface-1 border border-dashed border-border-mid px-6">
            <Users size={28} className="text-text-muted mx-auto mb-3" />
            <p className="text-[11px] font-black uppercase tracking-widest text-white">Nenhum sorteio hoje</p>
            <p className="text-[10px] text-text-low font-bold mt-1">Volte quando o baba começar.</p>
          </div>
        ) : (
          <>
            {sessionStatus === 'active' && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/30">
                <Radio size={13} className="text-red-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase text-red-400">Ao vivo — atualiza sozinho</span>
              </div>
            )}

            {/* Partida em quadra agora */}
            {liveMatch && (
              <div className="p-6 rounded-[2rem] bg-surface-1 border border-cyan-electric/30 text-center space-y-3">
                <p className="text-[9px] font-black text-cyan-electric uppercase tracking-widest">Em quadra agora</p>
                <div className={`text-4xl font-black font-mono tabular-nums tracking-tighter ${
                  clockDisplay !== null && clockDisplay < 60 ? 'text-red-500' : 'text-white'
                }`}>
                  {clockDisplay !== null ? formatTime(clockDisplay) : '--:--'}
                </div>
                <div className="flex items-center justify-center gap-4">
                  <div className="flex-1 text-right">
                    <p className="text-[10px] font-black uppercase text-cyan-electric/70 mb-1">{liveMatch.team_a_name}</p>
                    <p className="text-4xl font-black tabular-nums">{liveMatch.team_a_score ?? 0}</p>
                  </div>
                  <p className="text-text-muted font-black">×</p>
                  <div className="flex-1 text-left">
                    <p className="text-[10px] font-black uppercase text-yellow-500/70 mb-1">{liveMatch.team_b_name}</p>
                    <p className="text-4xl font-black tabular-nums">{liveMatch.team_b_score ?? 0}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Classificação do dia */}
            {standings.length > 0 && (
              <div className="rounded-2xl bg-surface-1 border border-border-subtle overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2 border-b border-border-subtle">
                  <Trophy size={13} className="text-yellow-500" />
                  <span className="text-[10px] font-black uppercase text-text-mid tracking-widest">Classificação do dia</span>
                </div>
                <div className="p-3 space-y-1.5">
                  {standings.map((t, i) => (
                    <div key={t.name} className="flex items-center gap-2 px-2 py-1.5 text-[11px]">
                      <span className="w-5 text-text-muted font-black">{i + 1}º</span>
                      <span className="flex-1 font-black uppercase truncate">{t.name}</span>
                      <span className="text-text-muted text-[9px] font-bold">{t.V}V {t.E}E {t.D}D</span>
                      <span className="font-black text-cyan-electric tabular-nums w-10 text-right">{t.Pts} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Times e ordem da fila */}
            <div className="rounded-2xl bg-surface-1 border border-border-subtle overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-2 border-b border-border-subtle">
                <Clock size={13} className="text-cyan-electric" />
                <span className="text-[10px] font-black uppercase text-text-mid tracking-widest">Fila (ordem de entrada)</span>
              </div>
              <div className="p-3 space-y-2">
                {teams.map((team, i) => (
                  <div key={team.name} className={`p-3 rounded-xl border ${
                    i < 2 ? 'bg-cyan-electric/5 border-cyan-electric/20' : 'bg-surface-2 border-border-subtle'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black uppercase">{team.name}</span>
                      <span className="text-[8px] font-black uppercase text-text-muted">
                        {i === 0 ? 'Em quadra' : i === 1 ? 'Em quadra' : `${i - 1}º na fila`}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-low font-bold truncate">
                      {team.players.map(p => p.name).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Goleiros da quadra, se houver fila própria */}
            {goalkeeperQueue.length > 0 && (
              <div className="rounded-2xl bg-surface-1 border border-border-subtle overflow-hidden">
                <div className="px-4 py-3 border-b border-border-subtle">
                  <span className="text-[10px] font-black uppercase text-text-mid tracking-widest">Goleiros da quadra</span>
                </div>
                <div className="p-3 flex flex-wrap gap-2">
                  {goalkeeperQueue.map((gk, i) => (
                    <span key={gk.id} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${
                      i < 2 ? 'bg-cyan-electric/10 text-cyan-electric border border-cyan-electric/30' : 'bg-surface-2 text-text-low border border-border-subtle'
                    }`}>
                      {gk.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WatchPage;