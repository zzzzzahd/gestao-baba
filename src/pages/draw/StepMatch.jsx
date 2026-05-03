// src/pages/draw/StepMatch.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Wizard /draw — Step 3: Partida ao vivo.
// Placar, timer, registro de gols, fila de times, encerramento.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { X, Target, UserPlus, ChevronLeft } from 'lucide-react';
import { useBaba } from '../../contexts/BabaContext';
import { supabase } from '../../services/supabase';
import WinnerPhotoModal from '../../components/WinnerPhotoModal';
import toast from 'react-hot-toast';

const formatTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const StepMatch = ({ drawResult, matchState, setMatchState, onBack, onReset }) => {
  const { currentBaba } = useBaba();

  const [loading,         setLoading]         = useState(!matchState?.allTeams);
  const [allTeams,        setAllTeams]        = useState(matchState?.allTeams || []);
  const [currentMatch,    setCurrentMatch]    = useState(matchState?.currentMatch || null);
  const [timer,           setTimer]           = useState(matchState?.timer ?? 600);
  const [isActive,        setIsActive]        = useState(false);
  const [matchId,         setMatchId]         = useState(matchState?.matchId || null);
  const [showGoalModal,   setShowGoalModal]   = useState(false);
  const [goalTeam,        setGoalTeam]        = useState(null);
  const [selectedScorer,  setSelectedScorer]  = useState('');
  const [selectedAssist,  setSelectedAssist]  = useState('');
  const [showWinnerPhoto, setShowWinnerPhoto] = useState(false);
  const [winnerInfo,      setWinnerInfo]      = useState({ name: '', matchId: null });
  const [pendingQueue,    setPendingQueue]    = useState([]);

  // ── Carregar times ao montar (se ainda não há matchState) ─────────────────
  useEffect(() => {
    if (matchState?.allTeams) {
      setAllTeams(matchState.allTeams);
      setCurrentMatch(matchState.currentMatch);
      setTimer(matchState.timer ?? 600);
      setMatchId(matchState.matchId);
      setLoading(false);
      return;
    }

    if (!drawResult?.teams?.length) return;
    const teams = drawResult.teams;
    const match = { teamA: teams[0], teamB: teams[1], scoreA: 0, scoreB: 0 };
    setAllTeams(teams);
    setCurrentMatch(match);
    loadOrCreateMatch(teams[0], teams[1]);
    setLoading(false);
  }, []);

  // ── Persistir estado no wizard ────────────────────────────────────────────
  useEffect(() => {
    if (!currentMatch) return;
    setMatchState({ allTeams, currentMatch, timer, matchId });
  }, [allTeams, currentMatch, timer, matchId]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let iv = null;
    if (isActive && timer > 0) {
      iv = setInterval(() => setTimer(p => p - 1), 1000);
    } else if (timer === 0 && isActive) {
      setIsActive(false);
      handleMatchEnd();
    }
    return () => clearInterval(iv);
  }, [isActive, timer]);

  // ── Auto-fim por placar ───────────────────────────────────────────────────
  useEffect(() => {
    if (currentMatch && (currentMatch.scoreA >= 2 || currentMatch.scoreB >= 2)) {
      setIsActive(false);
      handleMatchEnd();
    }
  }, [currentMatch?.scoreA, currentMatch?.scoreB]);

  const loadOrCreateMatch = useCallback(async (teamA, teamB) => {
    if (!currentBaba) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: ex } = await supabase.from('matches').select('id')
        .eq('baba_id', currentBaba.id)
        .gte('match_date', `${today}T00:00:00`)
        .lte('match_date', `${today}T23:59:59`)
        .eq('status', 'in_progress').limit(1).maybeSingle();

      let mid;
      if (ex) {
        mid = ex.id;
      } else {
        const gt = currentBaba.game_time ? String(currentBaba.game_time).substring(0, 5) : '20:00';
        const { data: nm, error: ce } = await supabase.from('matches')
          .insert([{
            baba_id: currentBaba.id,
            match_date: `${today}T${gt}:00`,
            team_a_name: teamA.name,
            team_b_name: teamB.name,
            status: 'in_progress',
          }]).select().single();
        if (ce) throw ce;
        mid = nm.id;
      }
      setMatchId(mid);

      const mps = [
        ...teamA.players.map(p => ({ match_id: mid, player_id: p.id, team: 'A', position: p.position || 'linha', goals: 0, assists: 0 })),
        ...teamB.players.map(p => ({ match_id: mid, player_id: p.id, team: 'B', position: p.position || 'linha', goals: 0, assists: 0 })),
      ];
      const { data: exPs } = await supabase.from('match_players').select('player_id').eq('match_id', mid);
      const exIds = (exPs || []).map(p => p.player_id);
      const newPs = mps.filter(mp => !exIds.includes(mp.player_id));
      if (newPs.length > 0) await supabase.from('match_players').insert(newPs);
    } catch (err) {
      console.error('[StepMatch] loadOrCreateMatch:', err);
    }
  }, [currentBaba]);

  const handleGoalClick = (team) => {
    setGoalTeam(team); setSelectedScorer(''); setSelectedAssist(''); setShowGoalModal(true);
  };

  const handleSaveGoal = async () => {
    if (!selectedScorer) { toast.error('Selecione quem fez o gol!'); return; }
    try {
      const { data: pd } = await supabase.from('match_players').select('goals,assists')
        .eq('match_id', matchId).eq('player_id', selectedScorer).single();
      await supabase.from('match_players').update({ goals: (pd?.goals || 0) + 1 })
        .eq('match_id', matchId).eq('player_id', selectedScorer);
      if (selectedAssist) {
        const { data: ad } = await supabase.from('match_players').select('assists')
          .eq('match_id', matchId).eq('player_id', selectedAssist).single();
        await supabase.from('match_players').update({ assists: (ad?.assists || 0) + 1 })
          .eq('match_id', matchId).eq('player_id', selectedAssist);
      }
      setCurrentMatch(prev => ({
        ...prev,
        scoreA: goalTeam === 'A' ? prev.scoreA + 1 : prev.scoreA,
        scoreB: goalTeam === 'B' ? prev.scoreB + 1 : prev.scoreB,
      }));
      setShowGoalModal(false);
      if (navigator.vibrate) navigator.vibrate(80);
      toast.success('⚽ Gol registrado!');
    } catch (err) {
      console.error(err); toast.error('Erro ao registrar gol');
    }
  };

  const handleMatchEnd = useCallback(async () => {
    if (!currentMatch) return;
    const { scoreA, scoreB, teamA, teamB } = currentMatch;
    let queue = [...allTeams];
    let winnerName = null;
    let winnerTeam = null;

    if (scoreA > scoreB) {
      winnerName = teamA.name; winnerTeam = 'A';
      toast.success(`🏆 ${teamA.name} VENCEU!`);
      const l = queue.splice(1, 1)[0]; queue.push(l);
    } else if (scoreB > scoreA) {
      winnerName = teamB.name; winnerTeam = 'B';
      toast.success(`🏆 ${teamB.name} VENCEU!`);
      const l = queue.splice(0, 1)[0]; queue.push(l);
    } else {
      toast('EMPATE! Saem os dois times.', { icon: '🤝' });
      const t1 = queue.shift(); const t2 = queue.shift(); queue.push(t1, t2);
    }

    if (matchId) {
      await supabase.from('matches').update({
        status: 'finished', winner_team: winnerTeam,
        team_a_score: scoreA, team_b_score: scoreB,
        finished_at: new Date().toISOString(),
      }).eq('id', matchId);
    }

    setPendingQueue(queue);
    if (winnerName && matchId) {
      setWinnerInfo({ name: winnerName, matchId });
      setShowWinnerPhoto(true);
      return;
    }
    continueAfterMatch(queue);
  }, [currentMatch, allTeams, matchId]);

  const continueAfterMatch = useCallback(async (queue) => {
    if (queue.length < 2) {
      toast.success('Fim das partidas!');
      onReset();
      return;
    }
    setAllTeams(queue);
    setTimer(600);
    setIsActive(false);
    const match = { teamA: queue[0], teamB: queue[1], scoreA: 0, scoreB: 0 };
    setCurrentMatch(match);
    setMatchId(null);
    await loadOrCreateMatch(queue[0], queue[1]);
  }, [loadOrCreateMatch, onReset]);

  if (loading || !currentMatch) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-text-low">
        Preparando partida...
      </p>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Placar + timer */}
      <div className="p-6 rounded-[2.5rem] bg-surface-1 border border-border-mid text-center space-y-4">
        <div className={`text-6xl font-black font-mono tabular-nums tracking-tighter ${
          timer < 60 ? 'text-red-500 animate-pulse' : 'text-white'
        }`}>
          {formatTime(timer)}
        </div>

        <div className="flex items-center gap-4">
          {/* Time A */}
          <div className="flex-1 space-y-2">
            <p className="text-[10px] font-black text-cyan-electric uppercase truncate">
              {currentMatch.teamA.name}
            </p>
            <button
              onClick={() => handleGoalClick('A')}
              className="text-5xl font-black tabular-nums w-full py-5 bg-surface-2 rounded-2xl border border-border-mid hover:bg-surface-3 active:scale-90 transition-all"
            >
              {currentMatch.scoreA}
            </button>
          </div>

          <span className="text-lg font-black text-text-muted italic">VS</span>

          {/* Time B */}
          <div className="flex-1 space-y-2">
            <p className="text-[10px] font-black text-yellow-500 uppercase truncate">
              {currentMatch.teamB.name}
            </p>
            <button
              onClick={() => handleGoalClick('B')}
              className="text-5xl font-black tabular-nums w-full py-5 bg-surface-2 rounded-2xl border border-border-mid hover:bg-surface-3 active:scale-90 transition-all"
            >
              {currentMatch.scoreB}
            </button>
          </div>
        </div>

        <button
          onClick={() => setIsActive(a => !a)}
          className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
            isActive
              ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
              : 'bg-cyan-electric text-black'
          }`}
        >
          {isActive ? '⏸ Pausar' : '▶ Iniciar Cronômetro'}
        </button>

        <button
          onClick={handleMatchEnd}
          className="w-full py-3 bg-surface-2 border border-border-mid rounded-xl font-black text-xs uppercase tracking-widest text-text-low hover:text-white hover:bg-surface-3 transition-all"
        >
          Finalizar Partida
        </button>
      </div>

      {/* Jogadores em campo */}
      <div className="p-4 rounded-2xl bg-surface-1 border border-border-subtle">
        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-3">
          Em campo
        </p>
        <div className="grid grid-cols-2 gap-4">
          {[
            { team: currentMatch.teamA, color: 'text-cyan-electric', dot: 'bg-cyan-electric' },
            { team: currentMatch.teamB, color: 'text-yellow-500',    dot: 'bg-yellow-500'    },
          ].map(({ team, color, dot }) => (
            <div key={team.name}>
              <p className={`text-[10px] font-black mb-2 uppercase ${color}`}>{team.name}</p>
              <div className="space-y-1">
                {team.players?.map((p, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] text-text-low">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      p.position === 'goleiro' ? 'bg-green-500' : dot
                    }`} />
                    <span className="truncate">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fila */}
      {allTeams.length > 2 && (
        <div className="p-4 rounded-2xl bg-surface-1 border border-border-subtle flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Próximo</p>
            <p className="text-sm font-black uppercase text-cyan-electric italic mt-0.5">
              {allTeams[2].name}
            </p>
          </div>
          <span className="text-[8px] font-black text-text-muted uppercase bg-surface-2 px-2 py-1 rounded">
            Aguardando
          </span>
        </div>
      )}

      {/* Voltar */}
      <button
        onClick={onBack}
        className="w-full py-3 rounded-2xl bg-surface-1 border border-border-subtle text-text-muted font-black uppercase text-[10px] tracking-widest hover:bg-surface-2 transition-all flex items-center justify-center gap-2"
      >
        <ChevronLeft size={12} /> Ver times
      </button>

      {/* Modal de gol */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-border-mid rounded-3xl p-6 max-w-sm w-full space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="text-cyan-electric" size={22} />
                <h3 className="text-xl font-black uppercase">GOL!</h3>
              </div>
              <button onClick={() => setShowGoalModal(false)} className="text-text-low hover:text-white">
                <X size={22} />
              </button>
            </div>

            <div className={`p-3 rounded-xl text-center font-black text-sm ${
              goalTeam === 'A' ? 'bg-cyan-electric/10 text-cyan-electric' : 'bg-yellow-500/10 text-yellow-500'
            }`}>
              {goalTeam === 'A' ? currentMatch.teamA.name : currentMatch.teamB.name}
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-text-mid mb-2">
                Quem fez o gol? *
              </label>
              <select
                value={selectedScorer}
                onChange={e => setSelectedScorer(e.target.value)}
                className="w-full bg-surface-2 border border-border-mid rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-cyan-electric"
              >
                <option value="">Selecione...</option>
                {(goalTeam === 'A' ? currentMatch.teamA.players : currentMatch.teamB.players)?.map(p =>
                  <option key={p.id} value={p.id}>{p.name}</option>
                )}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-text-mid mb-2">
                <UserPlus size={12} /> Assistência (opcional)
              </label>
              <select
                value={selectedAssist}
                onChange={e => setSelectedAssist(e.target.value)}
                className="w-full bg-surface-2 border border-border-mid rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-cyan-electric"
              >
                <option value="">Nenhuma</option>
                {(goalTeam === 'A' ? currentMatch.teamA.players : currentMatch.teamB.players)
                  ?.filter(p => p.id !== selectedScorer)
                  .map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                }
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowGoalModal(false)}
                className="flex-1 py-3 bg-surface-2 border border-border-mid rounded-xl font-black uppercase text-[10px]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveGoal}
                className="flex-1 py-3 bg-cyan-electric text-black rounded-xl font-black uppercase text-[10px] active:scale-95 transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <WinnerPhotoModal
        isOpen={showWinnerPhoto}
        onClose={() => { setShowWinnerPhoto(false); continueAfterMatch(pendingQueue); }}
        matchId={winnerInfo.matchId}
        babaId={currentBaba?.id}
        winnerName={winnerInfo.name}
        onSaved={() => { setShowWinnerPhoto(false); continueAfterMatch(pendingQueue); }}
      />
    </div>
  );
};

export default StepMatch;
