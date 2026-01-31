import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const MatchPageVisitor = () => {
  const navigate = useNavigate();
  
  const [allTeams, setAllTeams] = useState([]); 
  const [currentMatch, setCurrentMatch] = useState(null);
  const [timer, setTimer] = useState(600); 
  const [isActive, setIsActive] = useState(false);

  // Inicialização segura
  useEffect(() => {
    const saved = localStorage.getItem('temp_teams');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAllTeams(parsed);
        if (parsed.length >= 2) {
          setCurrentMatch({
            teamA: parsed[0],
            teamB: parsed[1],
            scoreA: 0,
            scoreB: 0
          });
        } else {
          toast.error("Número insuficiente de times.");
          navigate('/home');
        }
      } catch (e) {
        localStorage.removeItem('temp_teams');
        navigate('/home');
      }
    } else {
      navigate('/home');
    }
  }, [navigate]);

  // Cronômetro com lógica de 'prev' para precisão
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

  // Regra de 2 gols (Morte Súbita)
  useEffect(() => {
    if (currentMatch && (currentMatch.scoreA >= 2 || currentMatch.scoreB >= 2)) {
      setIsActive(false);
      handleMatchEnd();
    }
  }, [currentMatch?.scoreA, currentMatch?.scoreB]);

  const handleMatchEnd = () => {
    if (!currentMatch) return;

    const { scoreA, scoreB, teamA, teamB } = currentMatch;
    let winner = null;
    let queue = [...allTeams];

    if (scoreA > scoreB) {
      winner = "A";
      toast.success(`${teamA.name} VENCEU!`);
    } else if (scoreB > scoreA) {
      winner = "B";
      toast.success(`${teamB.name} VENCEU!`);
    } else {
      toast.error("EMPATE! Saem os dois.");
    }

    // Gerenciamento da Fila (A mesma lógica que você criou)
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

    setAllTeams(queue);
    localStorage.setItem('temp_teams', JSON.stringify(queue));
    setTimer(600);
    setCurrentMatch({
      teamA: queue[0],
      teamB: queue[1],
      scoreA: 0,
      scoreB: 0
    });
  };

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!currentMatch) return <div className="min-h-screen bg-black flex items-center justify-center text-white/20 uppercase font-black italic">Carregando Partida...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-5 font-sans">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-between items-center text-[10px] font-black opacity-40">
          <button onClick={() => navigate('/home')} className="hover:text-cyan-electric transition-colors">← SAIR</button>
          <span className="text-yellow-500 italic tracking-widest">MODO VISITANTE (OFFLINE)</span>
        </div>

        <div className="card-glass p-8 border border-white/10 text-center relative overflow-hidden rounded-[2.5rem]">
          <div className="text-7xl font-black mb-6 font-mono tracking-tighter text-white">{formatTime(timer)}</div>
          
          <div className="flex justify-between items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-black mb-2 text-cyan-electric uppercase truncate tracking-tighter">{currentMatch.teamA.name}</p>
              <button 
                onClick={() => setCurrentMatch({...currentMatch, scoreA: currentMatch.scoreA + 1})}
                className="text-6xl font-black w-full py-6 bg-white/5 rounded-3xl border border-white/10 active:scale-90 transition-transform shadow-inner"
              >
                {currentMatch.scoreA}
              </button>
            </div>
            
            <div className="text-xl font-black opacity-10 italic mt-6">VS</div>

            <div className="flex-1">
              <p className="text-[10px] font-black mb-2 text-yellow-500 uppercase truncate tracking-tighter">{currentMatch.teamB.name}</p>
              <button 
                onClick={() => setCurrentMatch({...currentMatch, scoreB: currentMatch.scoreB + 1})}
                className="text-6xl font-black w-full py-6 bg-white/5 rounded-3xl border border-white/10 active:scale-90 transition-transform shadow-inner"
              >
                {currentMatch.scoreB}
              </button>
            </div>
          </div>

          <button 
            onClick={() => setIsActive(!isActive)}
            className={`mt-10 w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[4px] transition-all ${isActive ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-cyan-electric text-black shadow-[0_0_20px_rgba(0,242,255,0.2)]'}`}
          >
            {isActive ? 'PAUSAR JOGO' : 'CRONÔMETRO'}
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] font-black opacity-30 italic px-2 uppercase tracking-[0.2em]">Próximo na Fila:</h3>
          {allTeams.length > 2 ? (
            <div className="bg-white/5 p-5 rounded-[1.5rem] border border-white/5 flex justify-between items-center">
              <span className="font-black text-sm text-cyan-electric italic uppercase">{allTeams[2].name}</span>
              <span className="text-[8px] opacity-40 font-black uppercase tracking-tighter bg-white/10 px-2 py-1 rounded">Aguardando</span>
            </div>
          ) : (
            <p className="text-[10px] opacity-20 text-center uppercase font-black py-4 border border-dashed border-white/10 rounded-2xl">Apenas dois times em campo</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchPageVisitor;
