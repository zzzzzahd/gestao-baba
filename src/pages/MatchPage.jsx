import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import toast from 'react-hot-toast';

const MatchPage = () => {
  const navigate = useNavigate();
  const { currentBaba, registerMatchStat } = useBaba(); // Função que criaremos no Contexto
  
  const [allTeams, setAllTeams] = useState([]); 
  const [currentMatch, setCurrentMatch] = useState(null);
  const [timer, setTimer] = useState(600); 
  const [isActive, setIsActive] = useState(false);
  
  // Estados do Modal
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [pendingGoalTeam, setPendingGoalTeam] = useState(null);
  const [selectedScorer, setSelectedScorer] = useState('');
  const [selectedAssister, setSelectedAssister] = useState('');

  // Carrega times do sorteio (localStorage para persistência rápida)
  useEffect(() => {
    const saved = localStorage.getItem('temp_teams');
    if (saved) {
      const parsed = JSON.parse(saved);
      setAllTeams(parsed);
      if (parsed.length >= 2) {
        setCurrentMatch({
          teamA: parsed[0],
          teamB: parsed[1],
          scoreA: 0,
          scoreB: 0
        });
      }
    } else { 
      navigate('/home'); 
    }
  }, [navigate]);

  // Lógica do Cronômetro
  useEffect(() => {
    let interval = null;
    if (isActive && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0) {
      setIsActive(false);
      handleMatchEnd();
    }
    return () => clearInterval(interval);
  }, [isActive, timer]);

  const openGoalModal = (team) => {
    setPendingGoalTeam(team);
    setShowGoalModal(true);
  };

  const confirmGoal = async () => {
    if (!selectedScorer) {
      toast.error("Quem fez o gol?");
      return;
    }

    try {
      const isTeamA = pendingGoalTeam === 'A';
      
      // Registrar estatísticas no banco via Contexto (se houver um Baba ativo)
      if (currentBaba?.id && selectedScorer !== 'GOL_CONTRA') {
        await registerMatchStat({
          baba_id: currentBaba.id,
          player_id: selectedScorer,
          assister_id: (selectedAssister && selectedAssister !== 'SEM_ASSISTENCIA') ? selectedAssister : null,
          team: pendingGoalTeam
        });
      }

      // Atualizar Placar Local
      setCurrentMatch(prev => ({
        ...prev,
        scoreA: isTeamA ? prev.scoreA + 1 : prev.scoreA,
        scoreB: !isTeamA ? prev.scoreB + 1 : prev.scoreB
      }));

      toast.success("GOL REGISTRADO!");
      setShowGoalModal(false);
      setSelectedScorer('');
      setSelectedAssister('');

      // Regra de "2 gols ganha" ou "morte súbita"
      const newScore = isTeamA ? currentMatch.scoreA + 1 : currentMatch.scoreB + 1;
      if (newScore >= 2) handleMatchEnd();

    } catch (e) { 
      toast.error("Erro ao salvar estatísticas."); 
    }
  };

  const handleMatchEnd = () => {
    setIsActive(false);
    const { scoreA, scoreB, teamA, teamB } = currentMatch;
    let queue = [...allTeams];
    
    if (scoreA > scoreB) {
      const loser = queue.splice(1, 1)[0];
      queue.push(loser);
      toast.success(`${teamA.name} VENCEU!`);
    } else if (scoreB > scoreA) {
      const loser = queue.splice(0, 1)[0];
      queue.push(loser);
      toast.success(`${teamB.name} VENCEU!`);
    } else {
      const t1 = queue.shift();
      const t2 = queue.shift();
      queue.push(t1, t2);
      toast.error("EMPATE! Saem os dois.");
    }

    setAllTeams(queue);
    localStorage.setItem('temp_teams', JSON.stringify(queue));
    setTimer(600);
    setCurrentMatch({ teamA: queue[0], teamB: queue[1], scoreA: 0, scoreB: 0 });
  };

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const playersList = pendingGoalTeam === 'A' ? currentMatch?.teamA.players : currentMatch?.teamB.players;

  return (
    <div className="min-h-screen bg-black text-white p-5">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-between items-center text-[10px] font-black opacity-40 uppercase">
          <button onClick={() => navigate('/home')}>← SAIR</button>
          <span className="text-cyan-electric italic">
            {currentBaba?.id ? `LOGADO EM: ${currentBaba.name}` : 'MODO VISITANTE'}
          </span>
        </div>

        <div className="card-glass p-8 border border-white/10 text-center relative rounded-[2rem]">
          <div className="text-6xl font-black mb-4 font-mono tracking-tighter">{formatTime(timer)}</div>
          <div className="flex justify-between items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-black mb-2 text-cyan-electric uppercase truncate">{currentMatch?.teamA.name}</p>
              <button onClick={() => openGoalModal('A')} className="text-6xl font-black w-full py-6 bg-white/5 rounded-3xl border border-white/10 active:scale-95 transition-all">{currentMatch?.scoreA}</button>
            </div>
            <div className="text-xl font-black opacity-10 italic">VS</div>
            <div className="flex-1">
              <p className="text-[10px] font-black mb-2 text-yellow-500 uppercase truncate">{currentMatch?.teamB.name}</p>
              <button onClick={() => openGoalModal('B')} className="text-6xl font-black w-full py-6 bg-white/5 rounded-3xl border border-white/10 active:scale-95 transition-all">{currentMatch?.scoreB}</button>
            </div>
          </div>
          <button onClick={() => setIsActive(!isActive)} className={`mt-8 w-full py-4 rounded-2xl font-black text-xs tracking-[3px] transition-all ${isActive ? 'bg-red-500/20 text-red-500' : 'bg-cyan-electric text-black shadow-lg shadow-cyan-electric/20'}`}>
            {isActive ? 'PAUSAR JOGO' : 'INICIAR JOGO'}
          </button>
        </div>

        {/* MODAL DE REGISTRO */}
        {showGoalModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-[#111] w-full max-w-sm rounded-[2.5rem] border border-white/10 p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
              <h2 className="text-xl font-black italic uppercase mb-6 text-center text-cyan-electric">DETALHES DO GOL</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black opacity-30 uppercase ml-2">Artilheiro</label>
                  <select value={selectedScorer} onChange={(e) => setSelectedScorer(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl mt-1 text-sm font-bold text-white outline-none focus:border-cyan-electric">
                    <option value="">Selecione o jogador...</option>
                    {playersList?.map(p => <option key={p.id || p.name} value={p.id || p.name} className="bg-black">{p.name}</option>)}
                    <option value="GOL_CONTRA" className="bg-black text-red-500">⚽ GOL CONTRA</option>
                  </select>
                </div>
                {selectedScorer && selectedScorer !== 'GOL_CONTRA' && (
                  <div>
                    <label className="text-[10px] font-black opacity-30 uppercase ml-2">Assistência</label>
                    <select value={selectedAssister} onChange={(e) => setSelectedAssister(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl mt-1 text-sm font-bold text-white outline-none">
                      <option value="SEM_ASSISTENCIA">SEM ASSISTÊNCIA</option>
                      {playersList?.filter(p => (p.id || p.name) !== selectedScorer).map(p => (
                        <option key={p.id || p.name} value={p.id || p.name} className="bg-black">{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowGoalModal(false)} className="flex-1 py-4 font-black text-[10px] opacity-40 uppercase tracking-widest">CANCELAR</button>
                  <button onClick={confirmGoal} className="flex-2 bg-cyan-electric text-black px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">CONFIRMAR GOL</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchPage;
