import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import toast from 'react-hot-toast';

const MatchPage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();
  const [timer, setTimer] = useState(600);
  const [isRunning, setIsRunning] = useState(false);
  const [scores, setScores] = useState({ a: 0, b: 0 });
  const [teams, setTeams] = useState({
    a: { name: 'TIME A', players: [] },
    b: { name: 'TIME B', players: [] }
  });

  useEffect(() => {
    // Busca os times sorteados salvos na memória temporária
    const savedTeams = localStorage.getItem('temp_teams');
    if (savedTeams) {
      setTeams(JSON.parse(savedTeams));
    }
  }, []);

  useEffect(() => {
    let interval;
    if (isRunning && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0) {
      setIsRunning(false);
      toast.error('FIM DE PAPO! Tempo esgotado.');
    }
    return () => clearInterval(interval);
  }, [isRunning, timer]);

  const addGoal = (team) => {
    setScores(prev => {
      const newScores = { ...prev, [team]: prev[team] + 1 };
      // REGRA: Quem fizer 2 gols primeiro vence (Morte Súbita)
      if (newScores[team] >= 2) {
        toast.success(`FIM DE JOGO! O ${team === 'a' ? 'TIME A' : 'TIME B'} fez 2 gols!`, { duration: 5000 });
        setIsRunning(false);
      }
      return newScores;
    });
  };

  const formatTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <div className="min-h-screen p-5 bg-black text-white">
       {/* UI do Placar e Cronômetro */}
       <div className="text-center">
          <h1 className="text-7xl font-mono text-cyan-electric mb-6">{formatTime(timer)}</h1>
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-gray-900 p-4 rounded-xl border border-cyan-electric">
                <h3>{teams.a.name}</h3>
                <h2 className="text-5xl my-2">{scores.a}</h2>
                <button onClick={() => addGoal('a')} className="bg-cyan-electric text-black w-full py-2 rounded">GOL</button>
             </div>
             <div className="bg-gray-900 p-4 rounded-xl border border-green-500">
                <h3>{teams.b.name}</h3>
                <h2 className="text-5xl my-2">{scores.b}</h2>
                <button onClick={() => addGoal('b')} className="bg-green-500 text-black w-full py-2 rounded">GOL</button>
             </div>
          </div>
          <button onClick={() => setIsRunning(!isRunning)} className="mt-8 p-4 border border-white rounded-full">
            {isRunning ? 'PAUSAR' : 'COMEÇAR'}
          </button>
       </div>
    </div>
  );
};
export default MatchPage;
