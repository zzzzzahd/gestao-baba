import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const MatchPageVisitor = () => {
  const navigate = useNavigate();
  
  const [allTeams, setAllTeams] = useState([]); 
  const [currentMatch, setCurrentMatch] = useState(null);
  const [timer, setTimer] = useState(600); 
  const [isActive, setIsActive] = useState(false);

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

  useEffect(() => {
    let interval = null;
    if (isActive && timer > 0) {
      interval = setInterval(() => setTimer(timer - 1), 1000);
    } else if (timer === 0) {
      setIsActive(false);
      handleMatchEnd();
    }
    return () => clearInterval(interval);
  }, [isActive, timer]);

  useEffect(() => {
    if (currentMatch && (currentMatch.scoreA >= 2 || currentMatch.scoreB >= 2)) {
      setIsActive(false);
      handleMatchEnd();
    }
  }, [currentMatch]);

  const handleMatchEnd = () => {
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

  if (!currentMatch) return <div className="min-h-screen bg-black" />;

  return (
    <div className="min-h-screen bg-black text-white p-5">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-between items-center text-[10px] font-black opacity-40">
          <button onClick={() => navigate('/home')}>← SAIR</button>
          <span className="text-yellow-500 italic">MODO VISITANTE (OFFLINE)</span>
        </div>

        <div className="card-glass p-8 border border-white/10 text-center relative overflow-hidden rounded-[2rem]">
          <div className="text-6xl font-black mb-4 font-mono">{formatTime(timer)}</div>
          
          <div className="flex justify-between items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-black mb-1 text-cyan-electric uppercase truncate">{currentMatch.teamA.name}</p>
              <button 
                onClick={() => setCurrentMatch({...currentMatch, scoreA: currentMatch.scoreA + 1})}
                className="text-6xl font-black w-full py-4 bg-white/5 rounded-2xl border border-white/10"
              >
                {currentMatch.scoreA}
              </button>
            </div>
            
            <div className="text-xl font-black opacity-20 italic">VS</div>

            <div className="flex-1">
              <p className="text-[10px] font-black mb-1 text-yellow-500 uppercase truncate">{currentMatch.teamB.name}</p>
              <button 
                onClick={() => setCurrentMatch({...currentMatch, scoreB: currentMatch.scoreB + 1})}
                className="text-6xl font-black w-full py-4 bg-white/5 rounded-2xl border border-white/10"
              >
                {currentMatch.scoreB}
              </button>
            </div>
          </div>

          <button 
            onClick={() => setIsActive(!isActive)}
            className={`mt-8 w-full py-3 rounded-xl font-black text-xs uppercase tracking-[3px] ${isActive ? 'bg-red-500/20 text-red-500' : 'bg-cyan-electric text-black'}`}
          >
            {isActive ? 'PAUSAR JOGO' : 'CRONÔMETRO'}
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-[10px] font-black opacity-30 italic px-2 uppercase tracking-widest">Fila de espera:</h3>
          {allTeams.length > 2 ? (
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
              <span className="font-black text-sm text-cyan-electric">{allTeams[2].name}</span>
              <span className="text-[9px] opacity-30 font-black uppercase tracking-tighter italic">Próximo da lista</span>
            </div>
          ) : (
            <p className="text-[10px] opacity-20 text-center uppercase font-black">Lista vazia</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchPageVisitor;
