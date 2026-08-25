// src/components/PostBabaVotePanel.jsx
// Votação de craque e goleiro do dia — pensada pro Histórico.
// Substitui o antigo fluxo (DailyMVPScreen dentro de StepMatch, só visível
// pra quem estava com a tela de partida aberta na hora de encerrar). Agora
// qualquer membro do baba pode votar, em qualquer dispositivo, dentro de uma
// janela de X horas após o baba ser encerrado (rating_open_hours). A votação
// é por dia jogado (draw_date), não por partida — um craque e um goleiro pro
// dia inteiro, mesmo que tenham rolado várias partidas.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Trophy, Shield, Clock, X, Check } from 'lucide-react';
import { supabase } from '../services/supabase';
import { computeDailyTeamStandings } from '../utils/bracket';
import toast from 'react-hot-toast';

const formatTimeLeft = (ms) => {
  if (ms <= 0) return 'encerrada';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h${m > 0 ? ` ${m}min` : ''}`;
  return `${m}min`;
};

const CandidateRow = ({ player, count, isMine, canVote, onVote }) => (
  <button
    type="button"
    disabled={!canVote}
    onClick={() => onVote(player.id)}
    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left transition-colors ${
      isMine
        ? 'bg-cyan-electric/10 border-cyan-electric/40'
        : 'bg-surface-2 border-border-mid hover:border-cyan-electric/30'
    } disabled:opacity-70 disabled:cursor-default`}
  >
    <span className="text-[11px] font-bold text-white truncate">
      {player.display_name || player.name}
    </span>
    <span className="flex items-center gap-1.5 flex-shrink-0">
      {isMine && <Check size={12} className="text-cyan-electric" />}
      {count > 0 && (
        <span className="text-[9px] font-black text-text-low bg-surface-3 px-1.5 py-0.5 rounded-md">
          {count}
        </span>
      )}
    </span>
  </button>
);

const PostBabaVotePanel = ({ babaId, myPlayerId, ratingEnabled, ratingOpenHours, mvpScope }) => {
  const [drawResult, setDrawResult]     = useState(null);
  const [standings,  setStandings]      = useState([]);
  const [votes,      setVotes]          = useState({ player: {}, goalkeeper: {} });
  const [myVotes,    setMyVotes]        = useState({ player: null, goalkeeper: null });
  const [loading,    setLoading]        = useState(true);
  const [showModal,  setShowModal]      = useState(false);
  const [voting,     setVoting]         = useState(false);
  const [now,        setNow]            = useState(Date.now());

  const load = useCallback(async () => {
    if (!babaId || !ratingEnabled) { setLoading(false); return; }
    setLoading(true);

    const { data: dr } = await supabase
      .from('draw_results')
      .select('id, draw_date, teams, finished_at')
      .eq('baba_id', babaId)
      .eq('status', 'finished')
      .order('finished_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!dr) { setDrawResult(null); setLoading(false); return; }
    setDrawResult(dr);

    const [{ data: matchesData }, { data: voteRows }] = await Promise.all([
      supabase
        .from('matches')
        .select('team_a_name, team_b_name, team_a_score, team_b_score, status')
        .eq('baba_id', babaId)
        .eq('status', 'finished')
        .gte('match_date', `${dr.draw_date}T00:00:00`)
        .lte('match_date', `${dr.draw_date}T23:59:59`),
      supabase
        .from('daily_mvp_votes')
        .select('category, voted_player_id, voter_player_id')
        .eq('baba_id', babaId)
        .eq('draw_date', dr.draw_date),
    ]);

    setStandings(computeDailyTeamStandings(matchesData || []));

    const counts = { player: {}, goalkeeper: {} };
    const mine   = { player: null, goalkeeper: null };
    (voteRows || []).forEach(v => {
      counts[v.category][v.voted_player_id] = (counts[v.category][v.voted_player_id] || 0) + 1;
      if (myPlayerId && v.voter_player_id === myPlayerId) mine[v.category] = v.voted_player_id;
    });
    setVotes(counts);
    setMyVotes(mine);
    setLoading(false);
  }, [babaId, ratingEnabled, myPlayerId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const { windowOpen, timeLeftMs, playerCandidates, goalkeeperCandidates } = useMemo(() => {
    if (!drawResult?.finished_at) {
      return { windowOpen: false, timeLeftMs: 0, playerCandidates: [], goalkeeperCandidates: [] };
    }
    const windowMs   = (ratingOpenHours ?? 1) * 60 * 60 * 1000;
    const finishedAt = new Date(drawResult.finished_at).getTime();
    const windowEnd  = finishedAt + windowMs;

    const allTeams  = drawResult.teams || [];
    const allPlayers = allTeams.flatMap(t => t.players || []);
    const winningTeam = standings[0]
      ? allTeams.find(t => t.name === standings[0].name)
      : null;

    const playerCandidates = mvpScope === 'winning_team' && winningTeam
      ? winningTeam.players || []
      : allPlayers;

    const goalkeeperCandidates = playerCandidates.filter(p => p.position === 'goleiro');

    return {
      windowOpen: now < windowEnd,
      timeLeftMs: windowEnd - now,
      playerCandidates,
      goalkeeperCandidates,
    };
  }, [drawResult, standings, mvpScope, ratingOpenHours, now]);

  const handleVote = async (category, votedPlayerId) => {
    if (voting || !myPlayerId || myVotes[category]) return;
    setVoting(true);

    // Otimista
    setMyVotes(prev => ({ ...prev, [category]: votedPlayerId }));
    setVotes(prev => ({
      ...prev,
      [category]: { ...prev[category], [votedPlayerId]: (prev[category][votedPlayerId] || 0) + 1 },
    }));

    const { error } = await supabase.from('daily_mvp_votes').insert({
      baba_id: babaId,
      draw_date: drawResult.draw_date,
      voter_player_id: myPlayerId,
      voted_player_id: votedPlayerId,
      category,
    });

    if (error && error.code !== '23505') {
      toast.error('Erro ao registrar seu voto');
      await load();
    }
    setVoting(false);
  };

  if (loading || !ratingEnabled || !drawResult || !myPlayerId) return null;
  if (!windowOpen && Object.keys(votes.player).length === 0 && Object.keys(votes.goalkeeper).length === 0) {
    return null;
  }

  const topOf = (category) => {
    const entries = Object.entries(votes[category]);
    if (entries.length === 0) return null;
    const [id] = entries.sort((a, b) => b[1] - a[1])[0];
    const candidates = category === 'player' ? playerCandidates : goalkeeperCandidates;
    return candidates.find(p => p.id === id);
  };

  // ── Janela fechada: só mostra o resultado, sem interação ──────────────────
  if (!windowOpen) {
    const topPlayer     = topOf('player');
    const topGoalkeeper = topOf('goalkeeper');
    if (!topPlayer && !topGoalkeeper) return null;

    return (
      <div className="rounded-[2rem] border border-border-subtle bg-surface-1 p-5 space-y-3">
        <p className="text-[9px] font-black text-text-low uppercase tracking-widest">
          Craque e goleiro do dia · votação encerrada
        </p>
        <div className="flex flex-wrap gap-3">
          {topPlayer && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-electric/10 border border-cyan-electric/20">
              <Trophy size={14} className="text-cyan-electric" />
              <span className="text-[11px] font-black text-white">
                {topPlayer.display_name || topPlayer.name}
              </span>
            </div>
          )}
          {topGoalkeeper && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
              <Shield size={14} className="text-green-400" />
              <span className="text-[11px] font-black text-white">
                {topGoalkeeper.display_name || topGoalkeeper.name}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const alreadyVotedBoth = myVotes.player && (goalkeeperCandidates.length === 0 || myVotes.goalkeeper);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="w-full rounded-[2rem] border border-cyan-electric/30 bg-cyan-electric/5 p-5 text-left hover:border-cyan-electric/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-cyan-electric" />
            <span className="text-[12px] font-black text-white">
              {alreadyVotedBoth ? 'Você já votou' : 'Vote no craque e no goleiro do dia'}
            </span>
          </div>
          <span className="flex items-center gap-1 text-[9px] font-black text-text-low uppercase">
            <Clock size={10} />
            {formatTimeLeft(timeLeftMs)}
          </span>
        </div>
        {!alreadyVotedBoth && (
          <p className="text-[10px] text-text-low mt-1">Toque pra escolher</p>
        )}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-1 border border-border-mid rounded-t-[2rem] sm:rounded-[2rem] p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-white">Craque e goleiro do dia</h3>
              <button onClick={() => setShowModal(false)} aria-label="Fechar">
                <X size={18} className="text-text-low" />
              </button>
            </div>

            <p className="text-[10px] text-text-low flex items-center gap-1.5">
              <Clock size={11} /> Votação encerra em {formatTimeLeft(timeLeftMs)}
            </p>

            <div>
              <p className="text-[9px] font-black text-text-low uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Trophy size={11} className="text-cyan-electric" /> Craque do dia
              </p>
              <div className="space-y-1.5">
                {playerCandidates.map(p => (
                  <CandidateRow
                    key={p.id}
                    player={p}
                    count={votes.player[p.id] || 0}
                    isMine={myVotes.player === p.id}
                    canVote={!myVotes.player && !voting}
                    onVote={(id) => handleVote('player', id)}
                  />
                ))}
              </div>
            </div>

            {goalkeeperCandidates.length > 0 && (
              <div>
                <p className="text-[9px] font-black text-text-low uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Shield size={11} className="text-green-400" /> Goleiro do dia
                </p>
                <div className="space-y-1.5">
                  {goalkeeperCandidates.map(p => (
                    <CandidateRow
                      key={p.id}
                      player={p}
                      count={votes.goalkeeper[p.id] || 0}
                      isMine={myVotes.goalkeeper === p.id}
                      canVote={!myVotes.goalkeeper && !voting}
                      onVote={(id) => handleVote('goalkeeper', id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PostBabaVotePanel;
