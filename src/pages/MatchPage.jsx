import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { supabase } from '../services/supabase';
import { ArrowLeft, Play, Pause, Users, X, Target, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

const MatchPage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();
  
  const [allTeams, setAllTeams] = useState([]); 
  const [currentMatch, setCurrentMatch] = useState(null);
  const [timer, setTimer] = useState(600); // 10 minutos
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);

  // ⭐ NOVO: Estados para stats
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTeam, setGoalTeam] = useState(null); // 'A' ou 'B'
  const [selectedScorer, setSelectedScorer] = useState('');
  const [selectedAssist, setSelectedAssist] = useState('');
  const [matchId, setMatchId] = useState(null);

  // 1. Carregar times do draw_results
  useEffect(() => {
    const loadTeams = async () => {
      if (!currentBaba) return;

      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('draw_results')
          .select('*')
          .eq('baba_id', currentBaba.id)
          .eq('draw_date', today)
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        
        if (data && data.teams && data.teams.length >= 2) {
          setAllTeams(data.teams);
          setCurrentMatch({
            teamA: data.teams[0],
            teamB: data.teams[1],
            scoreA: 0,
            scoreB: 0
          });

          // ⭐ NOVO: Buscar ou criar match do dia
          await loadOrCreateMatch(data.teams[0], data.teams[1]);
        } else {
          toast.error('Nenhum sorteio encontrado!');
          navigate('/teams');
        }
      } catch (error) {
        console.error('Erro ao carregar times:', error);
        toast.error('Erro ao carregar times!');
        navigate('/teams');
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, [currentBaba, navigate]);

// ⭐ CORRIGIDO: Buscar ou criar match
const loadOrCreateMatch = async (teamA, teamB) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Buscar match existente
    const { data: existingMatch, error: searchError } = await supabase
      .from('matches')
      .select('id')
      .eq('baba_id', currentBaba.id)
      .eq('match_date', today)
      .limit(1)
      .maybeSingle();

    if (searchError && searchError.code !== 'PGRST116') throw searchError;

    let matchId;

    if (existingMatch) {
      matchId = existingMatch.id;
      console.log('✅ Match já existe:', matchId);
    } else {
      // Criar novo match
      const { data: newMatch, error: createError } = await supabase
        .from('matches')
        .insert([{
          baba_id: currentBaba.id,
          match_date: today,
          team_a_name: teamA.name,
          team_b_name: teamB.name,
          status: 'in_progress'
        }])
        .select()
        .single();

      if (createError) throw createError;
      matchId = newMatch.id;
      console.log('✅ Match criado:', matchId);
    }

    setMatchId(matchId);

    // ⭐ SEMPRE verificar e criar registros de match_players
    const matchPlayers = [
      ...teamA.players.map(p => ({
        match_id: matchId,
        player_id: p.id,
        team: 'Team A',
        position: p.position || 'linha',
        goals: 0,
        assists: 0
      })),
      ...teamB.players.map(p => ({
        match_id: matchId,
        player_id: p.id,
        team: 'Team B',
        position: p.position || 'linha',
        goals: 0,
        assists: 0
      }))
    ];

    // Verificar quais jogadores já existem
    const { data: existingPlayers } = await supabase
      .from('match_players')
      .select('player_id')
      .eq('match_id', matchId);

    const existingPlayerIds = existingPlayers?.map(p => p.player_id) || [];

    // Inserir apenas jogadores que ainda não existem
    const newPlayers = matchPlayers.filter(mp => !existingPlayerIds.includes(mp.player_id));

    if (newPlayers.length > 0) {
      const { error: playersError } = await supabase
        .from('match_players')
        .insert(newPlayers);

      if (playersError) throw playersError;
      console.log(`✅ ${newPlayers.length} jogadores adicionados ao match`);
    } else {
      console.log('✅ Todos os jogadores já estão no match');
    }

  } catch (error) {
    console.error('Erro ao criar/carregar match:', error);
  }
};
  useEffect(() => {
    let interval = null;
    if (isActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsActive(false);
      handleMatchEnd();
    }
    return () => clearInterval(interval);
  }, [isActive, timer]);

  // 3. Regra de 2 Gols (Morte Súbita)
  useEffect(() => {
    if (currentMatch && (currentMatch.scoreA >= 2 || currentMatch.scoreB >= 2)) {
      setIsActive(false);
      handleMatchEnd();
    }
  }, [currentMatch?.scoreA, currentMatch?.scoreB]);

  // ⭐ NOVO: Abrir modal de gol
  const handleGoalClick = (team) => {
    setGoalTeam(team);
    setSelectedScorer('');
    setSelectedAssist('');
    setShowGoalModal(true);
  };

  // ⭐ NOVO: Salvar gol com stats - CORRIGIDO!
  const handleSaveGoal = async () => {
    if (!selectedScorer) {
      toast.error('Selecione quem fez o gol!');
      return;
    }

    try {
      // ✅ BUSCAR gols atuais do jogador
      const { data: playerData, error: fetchError } = await supabase
        .from('match_players')
        .select('goals, assists')
        .eq('match_id', matchId)
        .eq('player_id', selectedScorer)
        .single();

      if (fetchError) throw fetchError;

      // ✅ ATUALIZAR gols do jogador (incrementa +1)
      const { error: goalError } = await supabase
        .from('match_players')
        .update({ goals: (playerData?.goals || 0) + 1 })
        .eq('match_id', matchId)
        .eq('player_id', selectedScorer);

      if (goalError) throw goalError;

      // ✅ ATUALIZAR assistência (se houver)
      if (selectedAssist) {
        const { data: assistData, error: fetchAssistError } = await supabase
          .from('match_players')
          .select('assists')
          .eq('match_id', matchId)
          .eq('player_id', selectedAssist)
          .single();

        if (fetchAssistError) throw fetchAssistError;

        const { error: assistError } = await supabase
          .from('match_players')
          .update({ assists: (assistData?.assists || 0) + 1 })
          .eq('match_id', matchId)
          .eq('player_id', selectedAssist);

        if (assistError) throw assistError;
      }

      // Atualizar placar local
      if (goalTeam === 'A') {
        setCurrentMatch({...currentMatch, scoreA: currentMatch.scoreA + 1});
      } else {
        setCurrentMatch({...currentMatch, scoreB: currentMatch.scoreB + 1});
      }

      setShowGoalModal(false);
      toast.success('Gol registrado!');
    } catch (error) {
      console.error('Erro ao salvar gol:', error);
      toast.error('Erro ao registrar gol');
    }
  };

  // 4. Finalizar partida e gerenciar fila
  const handleMatchEnd = () => {
    if (!currentMatch) return;

    const { scoreA, scoreB, teamA, teamB } = currentMatch;
    let winner = null;
    let queue = [...allTeams];

    // Determinar vencedor
    if (scoreA > scoreB) {
      winner = "A";
      toast.success(`${teamA.name} VENCEU!`);
    } else if (scoreB > scoreA) {
      winner = "B";
      toast.success(`${teamB.name} VENCEU!`);
    } else {
      toast.error('EMPATE! Saem os dois times.');
    }

    // Gerenciar a Fila (Quem ganha fica)
    if (winner === "A") {
      const loser = queue.splice(1, 1)[0];
      queue.push(loser);
    } else if (winner === "B") {
      const loser = queue.splice(0, 1)[0];
      queue.push(loser);
    } else {
      const team1 = queue.shift();
      const team2 = queue.shift();
      queue.push(team1, team2);
    }

    // Verificar se ainda tem times suficientes
    if (queue.length < 2) {
      toast.success('Fim das partidas!');
      setTimeout(() => navigate('/teams'), 2000);
      return;
    }

    // Atualizar estado
    setAllTeams(queue);
    
    // Preparar próxima partida
    setTimer(600);
    setCurrentMatch({
      teamA: queue[0],
      teamB: queue[1],
      scoreA: 0,
      scoreB: 0
    });
  };

  // 5. Formatar tempo
  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Loading state
  if (loading || !currentMatch) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white/20 uppercase font-black italic">
        Carregando Partida...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-5 font-sans">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center text-[10px] font-black opacity-40">
          <button 
            onClick={() => navigate('/teams')}
            className="hover:text-cyan-electric transition-colors"
          >
            ← VER TIMES
          </button>
          <span className="text-cyan-electric italic tracking-widest">JOGO AO VIVO</span>
        </div>

        {/* Placar Principal */}
        <div className="card-glass p-8 border border-white/10 text-center relative overflow-hidden rounded-[2.5rem]">
          
          {/* Cronômetro */}
          <div className={`text-7xl font-black mb-6 font-mono tracking-tighter transition-colors ${
            timer < 60 ? 'text-red-500' : 'text-white'
          }`}>
            {formatTime(timer)}
          </div>
          
          {/* Placar */}
          <div className="flex justify-between items-center gap-4">
            {/* Time A */}
            <div className="flex-1">
              <p className="text-[10px] font-black mb-2 text-cyan-electric uppercase truncate tracking-tighter">
                {currentMatch.teamA.name}
              </p>
              <button 
                onClick={() => handleGoalClick('A')}
                className="text-6xl font-black w-full py-6 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 active:scale-90 transition-all shadow-inner"
              >
                {currentMatch.scoreA}
              </button>
            </div>
            
            {/* VS */}
            <div className="text-xl font-black opacity-10 italic mt-6">VS</div>

            {/* Time B */}
            <div className="flex-1">
              <p className="text-[10px] font-black mb-2 text-yellow-500 uppercase truncate tracking-tighter">
                {currentMatch.teamB.name}
              </p>
              <button 
                onClick={() => handleGoalClick('B')}
                className="text-6xl font-black w-full py-6 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 active:scale-90 transition-all shadow-inner"
              >
                {currentMatch.scoreB}
              </button>
            </div>
          </div>

          {/* Botão Cronômetro */}
          <button 
            onClick={() => setIsActive(!isActive)}
            className={`mt-10 w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[4px] transition-all ${
              isActive 
                ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                : 'bg-cyan-electric text-black shadow-[0_0_20px_rgba(0,242,255,0.2)]'
            }`}
          >
            {isActive ? '⏸ PAUSAR JOGO' : '▶ INICIAR CRONÔMETRO'}
          </button>

          {/* Botão Finalizar Manualmente */}
          <button
            onClick={handleMatchEnd}
            className="mt-3 w-full py-3 bg-white/5 border border-white/10 rounded-xl font-black text-xs uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            Finalizar Partida
          </button>
        </div>

        {/* Times Jogando Agora */}
        <div className="card-glass p-4 border border-white/5 rounded-2xl">
          <p className="text-[10px] font-black opacity-40 mb-3 uppercase tracking-widest">Jogando Agora:</p>
          <div className="grid grid-cols-2 gap-4">
            {/* Jogadores Time A */}
            <div>
              <p className="text-xs font-black text-cyan-electric mb-2">{currentMatch.teamA.name}</p>
              <div className="space-y-1">
                {currentMatch.teamA.players?.map((player, i) => (
                  <div key={i} className="text-[10px] opacity-60 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${player.position === 'goleiro' ? 'bg-green-500' : 'bg-cyan-electric'}`}></span>
                    {player.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Jogadores Time B */}
            <div>
              <p className="text-xs font-black text-yellow-500 mb-2">{currentMatch.teamB.name}</p>
              <div className="space-y-1">
                {currentMatch.teamB.players?.map((player, i) => (
                  <div key={i} className="text-[10px] opacity-60 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${player.position === 'goleiro' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                    {player.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Fila de Espera */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black opacity-30 italic px-2 uppercase tracking-[0.2em]">
            Próximo na Fila:
          </h3>
          {allTeams.length > 2 ? (
            <div className="bg-white/5 p-5 rounded-[1.5rem] border border-white/5 flex justify-between items-center">
              <span className="font-black text-sm text-cyan-electric italic uppercase">
                {allTeams[2].name}
              </span>
              <span className="text-[8px] opacity-40 font-black uppercase tracking-tighter bg-white/10 px-2 py-1 rounded">
                Aguardando
              </span>
            </div>
          ) : (
            <p className="text-[10px] opacity-20 text-center uppercase font-black py-4 border border-dashed border-white/10 rounded-2xl">
              Apenas dois times em campo
            </p>
          )}
        </div>

        {/* Regras */}
        <div className="text-center text-[9px] opacity-20 uppercase font-black tracking-wider">
          <p>Regras: 2 Gols ou 10 Minutos</p>
          <p className="mt-1">Quem Ganha Fica • Empate Sai os Dois</p>
        </div>
      </div>

      {/* ⭐ MODAL DE GOL */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-cyan-electric/30 rounded-3xl p-6 max-w-sm w-full space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="text-cyan-electric" size={24} />
                <h3 className="text-xl font-black uppercase">GOL!</h3>
              </div>
              <button
                onClick={() => setShowGoalModal(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Time */}
            <div className={`p-3 rounded-xl text-center font-black ${
              goalTeam === 'A' ? 'bg-cyan-electric/10 text-cyan-electric' : 'bg-yellow-500/10 text-yellow-500'
            }`}>
              {goalTeam === 'A' ? currentMatch.teamA.name : currentMatch.teamB.name}
            </div>

            {/* Quem fez o gol */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-white/60 mb-2">
                Quem fez o gol? *
              </label>
              <select
                value={selectedScorer}
                onChange={(e) => setSelectedScorer(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-cyan-electric transition-colors"
              >
                <option value="">Selecione...</option>
                {(goalTeam === 'A' ? currentMatch.teamA.players : currentMatch.teamB.players)?.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assistência */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-white/60 mb-2 flex items-center gap-2">
                <UserPlus size={14} />
                Assistência de? (opcional)
              </label>
              <select
                value={selectedAssist}
                onChange={(e) => setSelectedAssist(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-cyan-electric transition-colors"
              >
                <option value="">Nenhuma / Não sei</option>
                {(goalTeam === 'A' ? currentMatch.teamA.players : currentMatch.teamB.players)
                  ?.filter(p => p.id !== selectedScorer)
                  .map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowGoalModal(false)}
                className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-black uppercase text-xs hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveGoal}
                className="flex-1 py-3 bg-cyan-electric text-black rounded-xl font-black uppercase text-xs hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,242,255,0.3)]"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchPage;
