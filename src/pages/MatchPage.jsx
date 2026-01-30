import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import toast from 'react-hot-toast';

const MatchPage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();
  
  const [timer, setTimer] = useState(600); // 10 minutos padrão
  const [isRunning, setIsRunning] = useState(false);
  const [scores, setScores] = useState({ a: 0, b: 0 });
  const [teams, setTeams] = useState({
    a: { name: 'TIME A', players: [] },
    b: { name: 'TIME B', players: [] }
  });
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    if (!currentBaba) {
      navigate('/home');
      return;
    }
    
    // Aqui você carregaria os times sorteados e a fila do Supabase
    // Por enquanto, vamos usar dados mockados
  }, [currentBaba]);

  useEffect(() => {
    let interval;
    if (isRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsRunning(false);
      toast('Tempo esgotado!', {
        icon: '⏰',
      });
    }
    return () => clearInterval(interval);
  }, [isRunning, timer]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setTimer(currentBaba?.match_duration * 60 || 600);
    setIsRunning(false);
  };

  const addGoal = (team) => {
    setScores((prev) => ({
      ...prev,
      [team]: prev[team] + 1
    }));

    // Verifica morte súbita (diferença de 2 gols)
    const newScores = {
      ...scores,
      [team]: scores[team] + 1
    };
    
    const diff = Math.abs(newScores.a - newScores.b);
    if (diff >= 2) {
      toast.success('MORTE SÚBITA! Diferença de 2 gols!');
      setIsRunning(false);
    }
  };

  const finishMatch = () => {
    const winner = scores.a > scores.b ? 'a' : scores.b > scores.a ? 'b' : null;
    
    if (!winner) {
      // Empate - decidir no par ou ímpar
      const decision = window.confirm(
        `EMPATE ${scores.a} x ${scores.b}!\n\nO ${teams.a.name} venceu no par ou ímpar?`
      );
      
      if (decision) {
        toast.success(`${teams.a.name} venceu e fica! ${teams.b.name} vai para o fim da fila.`);
      } else {
        toast.success(`${teams.b.name} venceu e fica! ${teams.a.name} vai para o fim da fila.`);
      }
    } else {
      const winningTeam = winner === 'a' ? teams.a.name : teams.b.name;
      const losingTeam = winner === 'a' ? teams.b.name : teams.a.name;
      toast.success(`${winningTeam} venceu e fica! ${losingTeam} vai para o fim da fila.`);
    }

    // Aqui você atualizaria o Supabase e reorganizaria a fila
    setTimeout(() => {
      navigate('/home');
    }, 2000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen p-5">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/home')}
            className="text-cyan-electric hover:text-white transition-colors"
          >
            <i className="fas fa-arrow-left text-xl mr-3"></i>
            Voltar
          </button>
          
          <h1 className="text-xl font-bold">{currentBaba?.name}</h1>
        </div>

        {/* Timer */}
        <div className="text-center mb-8 animate-slide-in">
          <h1 
            className="text-7xl font-display font-extralight mb-6"
            style={{
              color: timer < 60 ? '#ff4444' : 'var(--cyan-electric)',
              textShadow: timer < 60 ? '0 0 20px #ff4444' : '0 0 20px var(--cyan-electric)'
            }}
          >
            {formatTime(timer)}
          </h1>
          
          <div className="flex justify-center gap-4">
            <button
              onClick={toggleTimer}
              className="w-14 h-14 rounded-full line flex items-center justify-center text-xl"
            >
              <i className={`fas ${isRunning ? 'fa-pause' : 'fa-play'}`}></i>
            </button>
            
            <button
              onClick={resetTimer}
              className="w-14 h-14 rounded-full line flex items-center justify-center text-xl opacity-50 hover:opacity-100"
            >
              <i className="fas fa-undo"></i>
            </button>
          </div>
        </div>

        {/* Scoreboard */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Team A */}
          <div className="card-glass p-6 text-center animate-slide-in">
            <p className="text-cyan-electric font-bold text-sm mb-2">
              {teams.a.name}
            </p>
            <h2 className="text-6xl font-display font-bold mb-4">
              {scores.a}
            </h2>
            <button
              onClick={() => addGoal('a')}
              className="goalie w-full"
            >
              <i className="fas fa-futbol mr-2"></i>
              GOL
            </button>
          </div>

          {/* Team B */}
          <div className="card-glass p-6 text-center animate-slide-in">
            <p className="text-green-neon font-bold text-sm mb-2">
              {teams.b.name}
            </p>
            <h2 className="text-6xl font-display font-bold mb-4">
              {scores.b}
            </h2>
            <button
              onClick={() => addGoal('b')}
              className="goalie w-full"
            >
              <i className="fas fa-futbol mr-2"></i>
              GOL
            </button>
          </div>
        </div>

        {/* Playing Now */}
        <div className="card-glass p-6 mb-4 animate-slide-in">
          <p className="text-xs text-cyan-electric font-bold mb-4 uppercase">
            JOGANDO AGORA:
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-bold mb-2">{teams.a.name}</p>
              <div className="text-xs opacity-60">
                {teams.a.players.length > 0 
                  ? teams.a.players.join(', ')
                  : 'Aguardando jogadores...'}
              </div>
            </div>
            
            <div>
              <p className="font-bold mb-2">{teams.b.name}</p>
              <div className="text-xs opacity-60">
                {teams.b.players.length > 0 
                  ? teams.b.players.join(', ')
                  : 'Aguardando jogadores...'}
              </div>
            </div>
          </div>
        </div>

        {/* Queue */}
        {queue.length > 0 && (
          <div className="card-glass p-6 mb-6 animate-slide-in">
            <p className="text-xs text-cyan-electric font-bold mb-4 uppercase">
              FILA DE ESPERA:
            </p>
            
            <div className="space-y-2">
              {queue.map((team, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-white/5 p-3 rounded-lg"
                >
                  <span className="font-bold">
                    {index + 1}º {team.name}
                  </span>
                  <span className="text-xs opacity-40">
                    Aguardando
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Finish Button */}
        <button
          onClick={finishMatch}
          className="btn-danger"
          style={{ background: 'rgba(255, 68, 68, 0.2)' }}
        >
          <i className="fas fa-flag-checkered mr-2"></i>
          FINALIZAR PARTIDA
        </button>
      </div>
    </div>
  );
};

export default MatchPage;
