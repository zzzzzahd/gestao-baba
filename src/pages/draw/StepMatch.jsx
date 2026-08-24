// src/pages/draw/StepMatch.jsx
// Sprint 3 — Integra MatchIntro, PostGameScreen, MatchReactions e sons.

import React, { useState, useEffect, useCallback } from 'react';
import { X, Target, UserPlus, ChevronLeft, Trophy, ChevronDown, Square } from 'lucide-react';
import { useBaba }           from '../../contexts/BabaContext';
import { useAuth }           from '../../contexts/AuthContext';
import { supabase }          from '../../services/supabase';
import WinnerPhotoModal      from '../../components/WinnerPhotoModal';
import DailyMVPScreen        from '../../components/DailyMVPScreen';
import MatchShareButton      from '../../components/MatchShareButton';
import MatchIntro            from '../../components/MatchIntro';
import PostGameScreen        from '../../components/PostGameScreen';
import MatchReactions        from '../../components/MatchReactions';
import { useRealtimeMatch }  from '../../hooks/useRealtimeMatch';
import { Sounds }            from '../../utils/sounds';
import { fmt, GOAL_MESSAGES } from '../../utils/messages';
import { useFeatures }       from '../../utils/babaMode';
import { computeDailyTeamStandings } from '../../utils/bracket';
import toast                 from 'react-hot-toast';

const formatTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const StepMatch = ({ drawResult, matchState, setMatchState, onBack, onReset }) => {
  const { currentBaba }   = useBaba();
  const { user }          = useAuth();
  const features          = useFeatures();

  const [loading,          setLoading]          = useState(!matchState?.allTeams);
  const [allTeams,         setAllTeams]         = useState(matchState?.allTeams || []);
  const [currentMatch,     setCurrentMatch]     = useState(matchState?.currentMatch || null);
  const [timer,            setTimer]            = useState(matchState?.timer ?? 600);
  const [isActive,         setIsActive]         = useState(false);
  const [matchId,          setMatchId]          = useState(matchState?.matchId || null);
  const [showGoalModal,    setShowGoalModal]    = useState(false);
  const [goalTeam,         setGoalTeam]         = useState(null);
  const [selectedScorer,   setSelectedScorer]   = useState('');
  const [selectedAssist,   setSelectedAssist]   = useState('');
  const [showCardModal,    setShowCardModal]    = useState(false);
  const [cardTeam,         setCardTeam]         = useState(null);
  const [selectedCardPlayer, setSelectedCardPlayer] = useState('');
  const [selectedCardType,   setSelectedCardType]   = useState('yellow');
  const [savingCard,       setSavingCard]       = useState(false);
  const [pendingQueue,     setPendingQueue]     = useState([]);
  const [showIntro,        setShowIntro]        = useState(false);
  const [showPostGame,     setShowPostGame]     = useState(false);
  const [finishedMatch,    setFinishedMatch]    = useState(null);
  const [allMatchPlayers,  setAllMatchPlayers]  = useState([]);
  const [dailyStandings,   setDailyStandings]   = useState([]);
  const [showStandings,    setShowStandings]    = useState(false);

  // Ponto 4 do fluxo real do baba: fila de goleiro própria da quadra (só quando
  // drawResult.goalkeeperQueue tem gente — ou seja, faltou goleiro pra 1 por time).
  // Índice 0 = goleiro ativo do lado "Time A" da quadra, índice 1 = "Time B";
  // resto = banco. Gira em paralelo à fila de times (mesmas operações, ver handleMatchEnd).
  const [goalkeeperQueue,  setGoalkeeperQueue]  = useState(matchState?.goalkeeperQueue || []);
  // Substituição temporária por cansaço/lesão: { A: jogador|null, B: jogador|null }.
  // Fica valendo pro lado da quadra até o titular voltar (não é por partida só).
  const [gkOverride,       setGkOverride]       = useState(matchState?.gkOverride || { A: null, B: null });
  const [showGkSubModal,   setShowGkSubModal]   = useState(false);
  const [gkSubSlot,        setGkSubSlot]        = useState(null);
  const [showFinishDay,    setShowFinishDay]    = useState(false);
  const [finishingDay,     setFinishingDay]     = useState(false);
  // Sequência do fim de baba: 'confirm' -> 'photo' (time que mais pontuou) -> 'mvp' -> encerra de vez
  const [finishPhase,      setFinishPhase]      = useState(null);

  // Ponto 1a: reserva PRÓPRIA do time (isReserve) pode trocar de lugar com
  // qualquer titular do mesmo time, a qualquer momento, até o fim do baba.
  // { [teamName]: playerId } — quem do time de 6 está NO BANCO agora (default:
  // o marcado isReserve no sorteio).
  const [benchedByTeam,    setBenchedByTeam]    = useState(matchState?.benchedByTeam || {});
  const [showBenchModal,   setShowBenchModal]   = useState(false);
  const [benchModalTeam,   setBenchModalTeam]   = useState(null);

  // Ponto 1b: time incompleto (estratégia 'substitute') pode puxar gente de
  // qualquer outro time do sorteio — menos do adversário da vez — pra completar
  // as vagas que faltam. { [teamName]: [player, ...] }
  const [borrowedByTeam,   setBorrowedByTeam]   = useState(matchState?.borrowedByTeam || {});
  const [showBorrowModal,  setShowBorrowModal]  = useState(false);
  const [borrowModalTeam,  setBorrowModalTeam]  = useState(null);

  // Realtime
  useRealtimeMatch(matchId, ({ scoreA, scoreB }) => {
    setCurrentMatch(prev => prev ? { ...prev, scoreA, scoreB } : prev);
  }, { enabled: !!matchId });

  // Carregar ao montar
  useEffect(() => {
    if (matchState?.allTeams) {
      setAllTeams(matchState.allTeams);
      setCurrentMatch(matchState.currentMatch);
      setTimer(matchState.timer ?? 600);
      setMatchId(matchState.matchId);
      setGoalkeeperQueue(matchState.goalkeeperQueue || []);
      setGkOverride(matchState.gkOverride || { A: null, B: null });
      setBenchedByTeam(matchState.benchedByTeam || {});
      setBorrowedByTeam(matchState.borrowedByTeam || {});
      setLoading(false);
      return;
    }
    if (!drawResult?.teams?.length) return;
    const teams = drawResult.teams;
    const match = { teamA: teams[0], teamB: teams[1], scoreA: 0, scoreB: 0 };
    setAllTeams(teams);
    setCurrentMatch(match);
    setGoalkeeperQueue(drawResult.goalkeeperQueue || []);
    // Banco inicial: quem foi marcado isReserve no sorteio começa no banco.
    const initialBench = {};
    teams.forEach(t => {
      const r = t.players.find(p => p.isReserve);
      if (r) initialBench[t.name] = r.id;
    });
    setBenchedByTeam(initialBench);
    loadOrCreateMatch(teams[0], teams[1], drawResult.goalkeeperQueue || [], { A: null, B: null }, initialBench, {});
    setLoading(false);
    setShowIntro(true);
  }, []);

  // Persistir estado no wizard
  useEffect(() => {
    if (!currentMatch) return;
    setMatchState({ allTeams, currentMatch, timer, matchId, goalkeeperQueue, gkOverride, benchedByTeam, borrowedByTeam });
  }, [allTeams, currentMatch, timer, matchId, goalkeeperQueue, gkOverride, benchedByTeam, borrowedByTeam]);

  // Time de linha ativo (titulares) de um time: todos menos quem está no banco,
  // mais qualquer jogador emprestado (ponto 1b, time incompleto).
  const getActiveLineup = useCallback((team) => {
    if (!team) return [];
    const benchedId = benchedByTeam[team.name];
    const base = benchedId ? team.players.filter(p => p.id !== benchedId) : team.players;
    const borrowed = borrowedByTeam[team.name] || [];
    return [...base, ...borrowed];
  }, [benchedByTeam, borrowedByTeam]);

  // Timer
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

  // Auto-fim por placar (2 gols)
  useEffect(() => {
    if (currentMatch && (currentMatch.scoreA >= 2 || currentMatch.scoreB >= 2)) {
      setIsActive(false);
      handleMatchEnd();
    }
  }, [currentMatch?.scoreA, currentMatch?.scoreB]);

  const loadDailyStandings = useCallback(async () => {
    if (!currentBaba) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase.from('matches')
        .select('team_a_name, team_b_name, team_a_score, team_b_score, status')
        .eq('baba_id', currentBaba.id)
        .eq('status', 'finished')
        .gte('match_date', `${today}T00:00:00`)
        .lte('match_date', `${today}T23:59:59`);
      if (error) throw error;
      setDailyStandings(computeDailyTeamStandings(data || []));
    } catch (err) {
      console.error('[StepMatch] loadDailyStandings:', err);
    }
  }, [currentBaba]);

  useEffect(() => { loadDailyStandings(); }, [loadDailyStandings]);

  const loadOrCreateMatch = useCallback(async (teamA, teamB, gkQueue = [], gkOv = { A: null, B: null }, benchMap = benchedByTeam, borrowMap = borrowedByTeam) => {
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
            baba_id:     currentBaba.id,
            match_date:  `${today}T${gt}:00`,
            team_a_name: teamA.name,
            team_b_name: teamB.name,
            status:      'in_progress',
          }]).select().single();
        if (ce) throw ce;
        mid = nm.id;
      }
      setMatchId(mid);

      // Goleiro ativo da quadra pra cada lado (fila própria): override manual
      // (cansaço/lesão) tem prioridade; senão é o goleiro na frente da fila.
      const gkA = gkOv?.A || gkQueue[0] || null;
      const gkB = gkOv?.B || gkQueue[1] || null;

      // Titulares (banco + empréstimo já aplicados — ver getActiveLineup)
      const benchedA = benchMap[teamA.name];
      const benchedB = benchMap[teamB.name];
      const activeA  = [...(benchedA ? teamA.players.filter(p => p.id !== benchedA) : teamA.players), ...(borrowMap[teamA.name] || [])];
      const activeB  = [...(benchedB ? teamB.players.filter(p => p.id !== benchedB) : teamB.players), ...(borrowMap[teamB.name] || [])];

      const mps = [
        ...activeA.map(p => ({ match_id: mid, player_id: p.id, team: 'A', position: p.position || 'linha', goals: 0, assists: 0 })),
        ...activeB.map(p => ({ match_id: mid, player_id: p.id, team: 'B', position: p.position || 'linha', goals: 0, assists: 0 })),
        ...(gkA ? [{ match_id: mid, player_id: gkA.id, team: 'A', position: 'goleiro', goals: 0, assists: 0 }] : []),
        ...(gkB ? [{ match_id: mid, player_id: gkB.id, team: 'B', position: 'goleiro', goals: 0, assists: 0 }] : []),
      ];
      const { data: exPs } = await supabase.from('match_players').select('player_id').eq('match_id', mid);
      const exIds = (exPs || []).map(p => p.player_id);
      const newPs = mps.filter(mp => !exIds.includes(mp.player_id));
      if (newPs.length > 0) await supabase.from('match_players').insert(newPs);

      // Buscar jogadores para reações
      const allP = [...activeA, ...activeB, ...(gkA ? [gkA] : []), ...(gkB ? [gkB] : [])];
      setAllMatchPlayers(allP);
    } catch (err) {
      console.error('[StepMatch] loadOrCreateMatch:', err);
    }
  }, [currentBaba, benchedByTeam, borrowedByTeam]);

  const winningTeamOfDay = dailyStandings[0]
    ? allTeams.find(t => t.name === dailyStandings[0].name)
    : null;

  const handleConfirmFinishDay = () => {
    setShowFinishDay(false);
    // Time que mais pontuou no dia merece o registro — só ele, não mais toda partida.
    setFinishPhase(winningTeamOfDay ? 'photo' : 'mvp');
  };

  const handleReallyFinish = async () => {
    if (!currentBaba) return;
    setFinishingDay(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase.rpc('finish_baba_day', {
        p_baba_id: currentBaba.id,
        p_draw_date: today,
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success('Baba do dia encerrado!');
      onReset();
    } catch (err) {
      console.error('[StepMatch] finishDay:', err);
      toast.error('Erro ao encerrar o baba');
      setFinishPhase(null);
    } finally {
      setFinishingDay(false);
    }
  };

  const openGkSubModal = (slot) => { setGkSubSlot(slot); setShowGkSubModal(true); };

  const handleGkSub = (player) => {
    const next = { ...gkOverride, [gkSubSlot]: player };
    setGkOverride(next);
    setShowGkSubModal(false);
    if (currentMatch) loadOrCreateMatch(currentMatch.teamA, currentMatch.teamB, goalkeeperQueue, next);
    toast.success(`${player.name} no gol até o titular voltar`);
  };

  const handleGkReturn = (slot) => {
    const next = { ...gkOverride, [slot]: null };
    setGkOverride(next);
    if (currentMatch) loadOrCreateMatch(currentMatch.teamA, currentMatch.teamB, goalkeeperQueue, next);
    toast.success('Titular de volta ao gol');
  };

  const openBenchModal = (team) => { setBenchModalTeam(team); setShowBenchModal(true); };

  const handleBenchSwap = (playerId) => {
    const next = { ...benchedByTeam, [benchModalTeam.name]: playerId };
    setBenchedByTeam(next);
    setShowBenchModal(false);
    if (currentMatch) loadOrCreateMatch(currentMatch.teamA, currentMatch.teamB, goalkeeperQueue, gkOverride, next, borrowedByTeam);
    const swapped = benchModalTeam.players.find(p => p.id === playerId);
    toast.success(`${swapped?.name} entrou no lugar do titular`);
  };

  const openBorrowModal = (team) => { setBorrowModalTeam(team); setShowBorrowModal(true); };

  const handleBorrow = (player) => {
    const next = { ...borrowedByTeam, [borrowModalTeam.name]: [...(borrowedByTeam[borrowModalTeam.name] || []), player] };
    setBorrowedByTeam(next);
    setShowBorrowModal(false);
    if (currentMatch) loadOrCreateMatch(currentMatch.teamA, currentMatch.teamB, goalkeeperQueue, gkOverride, benchedByTeam, next);
    toast.success(`${player.name} completando o time por essa partida`);
  };

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
      const scorer = (goalTeam === 'A' ? currentMatch.teamA.players : currentMatch.teamB.players)
        ?.find(p => p.id === selectedScorer);
      const scorerName = scorer?.name ?? 'Jogador';

      setCurrentMatch(prev => ({
        ...prev,
        scoreA: goalTeam === 'A' ? prev.scoreA + 1 : prev.scoreA,
        scoreB: goalTeam === 'B' ? prev.scoreB + 1 : prev.scoreB,
      }));
      setShowGoalModal(false);
      if (navigator.vibrate) navigator.vibrate(80);
      Sounds.goal();
      toast.success(fmt(GOAL_MESSAGES, { name: scorerName }));
    } catch (err) {
      console.error(err); toast.error('Erro ao registrar gol');
    }
  };

  const handleCardClick = (team) => {
    setCardTeam(team); setSelectedCardPlayer(''); setSelectedCardType('yellow'); setShowCardModal(true);
  };

  const handleSaveCard = async () => {
    if (!selectedCardPlayer) { toast.error('Selecione o jogador!'); return; }
    setSavingCard(true);
    try {
      const { error } = await supabase.from('cards').insert([{
        match_id:  matchId,
        player_id: selectedCardPlayer,
        card_type: selectedCardType,
      }]);
      if (error) throw error;
      setShowCardModal(false);
      toast.success(selectedCardType === 'yellow' ? 'Cartão amarelo registrado!' : 'Cartão vermelho registrado!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar cartão');
    } finally {
      setSavingCard(false);
    }
  };

  const handleMatchEnd = useCallback(async () => {
    if (!currentMatch) return;
    Sounds.whistle();
    const { scoreA, scoreB, teamA, teamB } = currentMatch;
    let queue = [...allTeams];
    let gkQueue = [...goalkeeperQueue];
    let winnerName = null;
    let winnerTeam = null;

    // Espelha exatamente a mesma operação na fila de goleiro (se houver) que na
    // fila de times — mantém o goleiro vinculado ao lado da quadra, não ao time.
    if (scoreA > scoreB) {
      winnerName = teamA.name; winnerTeam = 'A';
      const l = queue.splice(1, 1)[0]; queue.push(l);
      if (gkQueue.length) { const gl = gkQueue.splice(1, 1)[0]; gkQueue.push(gl); }
    } else if (scoreB > scoreA) {
      winnerName = teamB.name; winnerTeam = 'B';
      const l = queue.splice(0, 1)[0]; queue.push(l);
      if (gkQueue.length) { const gl = gkQueue.splice(0, 1)[0]; gkQueue.push(gl); }
    } else {
      const t1 = queue.shift(); const t2 = queue.shift(); queue.push(t1, t2);
      if (gkQueue.length) { const g1 = gkQueue.shift(); const g2 = gkQueue.shift(); gkQueue.push(g1, g2); }
    }
    setGoalkeeperQueue(gkQueue);

    if (matchId) {
      await supabase.from('matches').update({
        status:       'finished',
        winner_team:  winnerTeam,
        team_a_score: scoreA,
        team_b_score: scoreB,
        finished_at:  new Date().toISOString(),
      }).eq('id', matchId);
      loadDailyStandings();
    }

    // Ponto 7: grava a fila atualizada no banco pra quem está só acompanhando
    // (não controlando a partida) ver a ordem real, não só quem tem o celular na mão.
    if (currentBaba) {
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('draw_results')
        .update({ teams: queue, goalkeeper_queue: gkQueue })
        .eq('baba_id', currentBaba.id).eq('draw_date', today);
    }

    // Mostrar tela pós-jogo
    setFinishedMatch({ teamA, teamB, scoreA, scoreB });
    setPendingQueue(queue);
    setShowPostGame(true);
  }, [currentMatch, allTeams, goalkeeperQueue, matchId, loadDailyStandings, currentBaba]);

  const continueAfterMatch = useCallback(async (queue) => {
    setShowPostGame(false);
    proceedToNextMatch(queue);
  }, []);

  const proceedToNextMatch = useCallback(async (queue) => {
    if (queue.length < 2) { toast.success('Fim das partidas!'); onReset(); return; }
    setAllTeams(queue);
    setTimer(600);
    setIsActive(false);
    const match = { teamA: queue[0], teamB: queue[1], scoreA: 0, scoreB: 0 };
    setCurrentMatch(match);
    setMatchId(null);
    setFinishedMatch(null);
    // Empréstimo é decidido na hora — some ao trocar de partida (o banco do
    // time, esse sim, continua valendo até o fim do baba).
    const nextBorrowed = { ...borrowedByTeam };
    delete nextBorrowed[queue[0].name];
    delete nextBorrowed[queue[1].name];
    setBorrowedByTeam(nextBorrowed);
    await loadOrCreateMatch(queue[0], queue[1], goalkeeperQueue, gkOverride, benchedByTeam, nextBorrowed);
    setShowIntro(true);
  }, [loadOrCreateMatch, goalkeeperQueue, gkOverride, benchedByTeam, borrowedByTeam, onReset]);

  if (loading || !currentMatch) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-text-low">
        Preparando partida...
      </p>
    </div>
  );

  return (
    <>
      {/* Intro dos times */}
      {showIntro && (
        <MatchIntro
          teamA={currentMatch.teamA}
          teamB={currentMatch.teamB}
          onDone={() => setShowIntro(false)}
        />
      )}

      {/* Tela pós-jogo */}
      {showPostGame && finishedMatch && (
        <PostGameScreen
          match={finishedMatch}
          babaName={currentBaba?.name}
          standings={dailyStandings}
          onClose={() => continueAfterMatch(pendingQueue)}
        />
      )}

      <div className="space-y-5">
        {/* Placar + timer */}
        <div className="p-6 rounded-[2.5rem] bg-surface-1 border border-border-mid text-center space-y-4">
          <div className={`text-6xl font-black font-mono tabular-nums tracking-tighter ${
            timer < 60 ? 'text-red-500 animate-pulse' : 'text-white'
          }`}>
            {formatTime(timer)}
          </div>

          {matchId && (
            <div className="flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Ao vivo
            </div>
          )}

          <div className="flex items-center gap-4">
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
              <button
                onClick={() => handleCardClick('A')}
                className="w-full py-1.5 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase text-text-low hover:text-yellow-500 transition-colors"
              >
                <Square size={10} className="fill-current" /> Cartão
              </button>
            </div>
            <span className="text-lg font-black text-text-muted italic">VS</span>
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
              <button
                onClick={() => handleCardClick('B')}
                className="w-full py-1.5 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase text-text-low hover:text-yellow-500 transition-colors"
              >
                <Square size={10} className="fill-current" /> Cartão
              </button>
            </div>
          </div>

          <button
            onClick={() => { setIsActive(a => !a); if (!isActive) Sounds.whistle(); }}
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

          <button
            onClick={() => setShowFinishDay(true)}
            className="w-full py-2.5 text-[9px] font-black uppercase tracking-widest text-red-400/70 hover:text-red-400 transition-colors"
          >
            Encerrar o baba de hoje
          </button>
        </div>

        {/* Goleiros da quadra — só aparece quando o baba usa fila de goleiro (falta goleiro pra 1 por time) */}
        {goalkeeperQueue.length > 0 && (
          <div className="p-4 rounded-2xl bg-surface-1 border border-border-subtle space-y-2">
            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Goleiros da quadra</p>
            <div className="grid grid-cols-2 gap-2">
              {['A', 'B'].map((slot, idx) => {
                const active = gkOverride[slot] || goalkeeperQueue[idx];
                const isTemp = !!gkOverride[slot];
                return (
                  <div key={slot} className="p-2.5 rounded-xl bg-surface-2 border border-border-subtle">
                    <p className="text-[8px] font-black text-text-muted uppercase">Time {slot}</p>
                    <p className="text-[11px] font-black text-white truncate">{active?.name || '—'}</p>
                    {isTemp && <p className="text-[8px] font-bold text-yellow-500 uppercase mt-0.5">Emprestado</p>}
                    <button
                      onClick={() => isTemp ? handleGkReturn(slot) : openGkSubModal(slot)}
                      className="mt-1.5 w-full py-1 rounded-lg bg-surface-3 text-[8px] font-black uppercase text-text-low hover:text-white transition-colors"
                    >
                      {isTemp ? 'Titular voltou' : 'Cansou / se machucou'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Banco do time — reserva próprio (estratégia 'reserva') pode trocar com
            qualquer titular do mesmo time, valendo até o fim do baba */}
        {[currentMatch.teamA, currentMatch.teamB].some(t => t.players.some(p => p.isReserve)) && (
          <div className="p-4 rounded-2xl bg-surface-1 border border-border-subtle space-y-2">
            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Banco do time</p>
            <div className="grid grid-cols-2 gap-2">
              {[currentMatch.teamA, currentMatch.teamB].map((team, i) => {
                if (!team.players.some(p => p.isReserve)) return <div key={i} />;
                const benchedId = benchedByTeam[team.name];
                const benched   = team.players.find(p => p.id === benchedId) || team.players.find(p => p.isReserve);
                return (
                  <div key={team.name} className="p-2.5 rounded-xl bg-surface-2 border border-border-subtle">
                    <p className="text-[8px] font-black text-text-muted uppercase">{team.name}</p>
                    <p className="text-[10px] font-bold text-text-low truncate">No banco: {benched?.name || '—'}</p>
                    <button
                      onClick={() => openBenchModal(team)}
                      className="mt-1.5 w-full py-1 rounded-lg bg-surface-3 text-[8px] font-black uppercase text-text-low hover:text-white transition-colors"
                    >
                      Trocar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completar time — time incompleto (estratégia 'incompleto') pode puxar
            alguém de qualquer outro time do sorteio, menos do adversário da vez */}
        {(() => {
          const expectedSize = Math.max(...allTeams.map(t => t.players.length), 0);
          const incompleteTeams = [currentMatch.teamA, currentMatch.teamB]
            .filter(t => getActiveLineup(t).length < expectedSize);
          if (incompleteTeams.length === 0) return null;
          return (
            <div className="p-4 rounded-2xl bg-surface-1 border border-border-subtle space-y-2">
              <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Time incompleto</p>
              {incompleteTeams.map(team => (
                <div key={team.name} className="p-2.5 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold text-text-low">
                    {team.name} — {getActiveLineup(team).length}/{expectedSize} jogadores
                  </p>
                  <button
                    onClick={() => openBorrowModal(team)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-electric text-black text-[8px] font-black uppercase shrink-0"
                  >
                    Completar
                  </button>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Classificação do dia */}
        {dailyStandings.length > 0 && (
          <div className="rounded-2xl bg-surface-1 border border-border-subtle overflow-hidden">
            <button
              onClick={() => setShowStandings(v => !v)}
              className="w-full p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-yellow-500" />
                <div className="text-left">
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Líder do dia</p>
                  <p className="text-sm font-black uppercase italic text-yellow-500">
                    {dailyStandings[0].name} · {dailyStandings[0].Pts} pts
                  </p>
                </div>
              </div>
              <ChevronDown size={16} className={`text-text-muted transition-transform ${showStandings ? 'rotate-180' : ''}`} />
            </button>

            {showStandings && (
              <div className="px-4 pb-4 space-y-1.5">
                {dailyStandings.map((t, i) => (
                  <div key={t.name} className="flex items-center gap-2 text-[10px]">
                    <span className="w-4 text-text-muted font-black">{i + 1}º</span>
                    <span className="flex-1 font-black uppercase truncate">{t.name}</span>
                    <span className="text-text-muted">{t.V}V {t.E}E {t.D}D</span>
                    <span className="w-10 text-right font-black text-cyan-electric tabular-nums">{t.Pts} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reações — apenas se feature habilitada */}
        {features.reactions && matchId && (
          <div className="p-4 rounded-2xl bg-surface-1 border border-border-subtle">
            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2 text-center">
              Reagir
            </p>
            <MatchReactions matchId={matchId} currentUserId={user?.id} />
          </div>
        )}

        {/* Jogadores em campo */}
        <div className="p-4 rounded-2xl bg-surface-1 border border-border-subtle">
          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-3">Em campo</p>
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

        <button
          onClick={onBack}
          className="w-full py-3 rounded-2xl bg-surface-1 border border-border-subtle text-text-muted font-black uppercase text-[10px] tracking-widest hover:bg-surface-2 transition-all flex items-center justify-center gap-2"
        >
          <ChevronLeft size={12} /> Ver times
        </button>
      </div>

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

      {/* Modal de cartão */}
      {showCardModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-border-mid rounded-3xl p-6 max-w-sm w-full space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Square className="text-yellow-500 fill-current" size={20} />
                <h3 className="text-xl font-black uppercase">Cartão</h3>
              </div>
              <button onClick={() => setShowCardModal(false)} className="text-text-low hover:text-white">
                <X size={22} />
              </button>
            </div>

            <div className={`p-3 rounded-xl text-center font-black text-sm ${
              cardTeam === 'A' ? 'bg-cyan-electric/10 text-cyan-electric' : 'bg-yellow-500/10 text-yellow-500'
            }`}>
              {cardTeam === 'A' ? currentMatch.teamA.name : currentMatch.teamB.name}
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-text-mid mb-2">
                Jogador *
              </label>
              <select
                value={selectedCardPlayer}
                onChange={e => setSelectedCardPlayer(e.target.value)}
                className="w-full bg-surface-2 border border-border-mid rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-yellow-500"
              >
                <option value="">Selecione...</option>
                {(cardTeam === 'A' ? currentMatch.teamA.players : currentMatch.teamB.players)?.map(p =>
                  <option key={p.id} value={p.id}>{p.name}</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-text-mid mb-2">
                Tipo de cartão
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedCardType('yellow')}
                  className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] border flex items-center justify-center gap-2 transition-all ${
                    selectedCardType === 'yellow' ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-surface-2 text-text-low border-border-mid'
                  }`}
                >
                  <Square size={11} className="fill-current" /> Amarelo
                </button>
                <button
                  onClick={() => setSelectedCardType('red')}
                  className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] border flex items-center justify-center gap-2 transition-all ${
                    selectedCardType === 'red' ? 'bg-red-500 text-white border-red-500' : 'bg-surface-2 text-text-low border-border-mid'
                  }`}
                >
                  <Square size={11} className="fill-current" /> Vermelho
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCardModal(false)}
                className="flex-1 py-3 bg-surface-2 border border-border-mid rounded-xl font-black uppercase text-[10px]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCard}
                disabled={savingCard}
                className="flex-1 py-3 bg-yellow-500 text-black rounded-xl font-black uppercase text-[10px] active:scale-95 transition-all disabled:opacity-40"
              >
                {savingCard ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFinishDay && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-border-mid rounded-3xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-black uppercase text-red-400">Encerrar o baba de hoje?</h3>
            <p className="text-[11px] font-bold text-text-low leading-relaxed">
              Isso finaliza as partidas de hoje pra valer — ninguém mais vai poder marcar placar ou continuar a fila. Um novo sorteio só fica liberado depois disso.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFinishDay(false)}
                className="flex-1 py-3 rounded-xl bg-surface-2 border border-border-mid font-black text-[10px] uppercase text-text-low"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmFinishDay}
                disabled={finishingDay}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-black text-[10px] uppercase disabled:opacity-50"
              >
                {finishingDay ? 'Encerrando...' : 'Encerrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBenchModal && benchModalTeam && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-border-mid rounded-3xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black uppercase">Quem fica no banco?</h3>
              <button onClick={() => setShowBenchModal(false)} className="text-text-low hover:text-white">
                <X size={22} />
              </button>
            </div>
            <p className="text-[10px] font-bold text-text-low leading-relaxed">
              Escolha quem senta — os outros 5 de {benchModalTeam.name} entram em quadra.
            </p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {benchModalTeam.players.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleBenchSwap(p.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors text-[11px] font-bold ${
                    benchedByTeam[benchModalTeam.name] === p.id
                      ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400'
                      : 'bg-surface-2 border-border-subtle hover:border-cyan-electric/40 text-white'
                  }`}
                >
                  {p.name} {p.isReserve && '(reserva original)'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showBorrowModal && borrowModalTeam && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-border-mid rounded-3xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black uppercase">Puxar quem?</h3>
              <button onClick={() => setShowBorrowModal(false)} className="text-text-low hover:text-white">
                <X size={22} />
              </button>
            </div>
            <p className="text-[10px] font-bold text-text-low leading-relaxed">
              Vale gente de qualquer outro time do sorteio, menos do adversário de agora. Só vale pra essa partida.
            </p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {(() => {
                const opponent = borrowModalTeam.name === currentMatch.teamA.name ? currentMatch.teamB : currentMatch.teamA;
                const alreadyBorrowed = new Set((borrowedByTeam[borrowModalTeam.name] || []).map(p => p.id));
                const eligible = allTeams
                  .filter(t => t.name !== borrowModalTeam.name && t.name !== opponent.name)
                  .flatMap(t => getActiveLineup(t))
                  .filter(p => !alreadyBorrowed.has(p.id));
                if (eligible.length === 0) {
                  return <p className="text-[10px] font-bold text-text-muted text-center py-4">Não tem ninguém disponível pra puxar agora.</p>;
                }
                return eligible.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleBorrow(p)}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-surface-2 border border-border-subtle hover:border-cyan-electric/40 transition-colors text-[11px] font-bold text-white"
                  >
                    {p.name}
                  </button>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {showGkSubModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-border-mid rounded-3xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black uppercase">Quem vai pro gol?</h3>
              <button onClick={() => setShowGkSubModal(false)} className="text-text-low hover:text-white">
                <X size={22} />
              </button>
            </div>
            <p className="text-[10px] font-bold text-text-low leading-relaxed">
              Escolha um jogador do time que está esperando na fila — assim ninguém do time atual perde a vez de jogar na linha.
            </p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {(allTeams[2]?.players || []).length === 0 && (
                <p className="text-[10px] font-bold text-text-muted text-center py-4">Não tem time esperando na fila agora.</p>
              )}
              {(allTeams[2]?.players || []).map(p => (
                <button
                  key={p.id}
                  onClick={() => handleGkSub(p)}
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-surface-2 border border-border-subtle hover:border-cyan-electric/40 transition-colors text-[11px] font-bold text-white"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {finishPhase === 'photo' && winningTeamOfDay && (
        <WinnerPhotoModal
          isOpen={true}
          onClose={() => setFinishPhase('mvp')}
          matchId={matchId}
          babaId={currentBaba?.id}
          winnerName={winningTeamOfDay.name}
          onSaved={() => setFinishPhase('mvp')}
        />
      )}

      {finishPhase === 'mvp' && (
        <DailyMVPScreen
          babaId={currentBaba?.id}
          drawDate={new Date().toISOString().split('T')[0]}
          candidates={
            currentBaba?.mvp_scope === 'winning_team' && winningTeamOfDay
              ? winningTeamOfDay.players
              : allTeams.flatMap(t => t.players)
          }
          myPlayerId={allMatchPlayers.find(p => p.user_id === user?.id)?.id}
          onClose={handleReallyFinish}
          onSkip={handleReallyFinish}
        />
      )}
    </>
  );
};

export default StepMatch;
