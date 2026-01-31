import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const MatchPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentBaba } = useBaba();
  
  const [teams, setTeams] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [timer, setTimer] = useState(600); // 10 minutos padrão
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // 1. Tentar carregar times do Sorteio (Modo Visitante)
    const savedTeams = localStorage.getItem('temp_teams');
    
    if (savedTeams) {
      const parsedTeams = JSON.parse(savedTeams);
      setTeams(parsedTeams);
      // Define os dois primeiros times para a partida atual
      if (parsedTeams.length >= 2) {
        setCurrentMatch({
          teamA: parsedTeams[0],
          teamB: parsedTeams[1],
          scoreA: 0,
          scoreB: 0
        });
      }
    } else if (!user) {
      // Se não tem time salvo e não tá logado, volta pro início
      toast.error("Nenhum time sorteado!");
      navigate('/visitor');
    }
  }, [user, navigate]);

  // Cronômetro simples
  useEffect(() => {
    let interval = null;
    if (isActive && timer > 0) {
      interval = setInterval(() => setTimer(timer - 1), 1000);
    } else if (timer === 0) {
      setIsActive(false);
      toast.success("Fim de partida!");
    }
    return () => clearInterval(interval);
  }, [isActive, timer]);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!currentMatch) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-cyan-electric animate-pulse font-black">PREPARANDO QUADRA...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-5 font-sans">
      {/* Placar Principal */}
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-between items-center text-[10px] font-black opacity-50 italic">
          <button onClick={() => navigate('/home')} className="text-white">← VOLTAR</button>
          <span>MODO PARTIDA RÁPIDA</span>
          <div className="w-10"></div>
        </div>

        {/* Cronômetro */}
        <div className="card-glass p-6 border border-white/10 text-center">
          <div className={`text-6xl font-black mb-2 ${timer < 60 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {formatTime(timer)}
          </div>
          <button 
            onClick={() => setIsActive(!isActive)}
            className={`px-8 py-2 rounded-full font-black text-xs uppercase tracking-widest ${isActive ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-cyan-electric text-black'}`}
          >
            {isActive ? 'Pausar' : 'Começar'}
          </button>
        </div>

        {/* Times e Gols */}
        <div className="grid grid-cols-2 gap-4">
          {/* Time A */}
          <div className="card-glass border border-white/10 overflow-hidden">
            <div className="bg-white/5 p-2 text-center text-[10px] font-black uppercase">{currentMatch.teamA.name}</div>
            <div className="p-6 text-center">
              <div className="text-5xl font-black mb-4">{currentMatch.scoreA}</div>
              <div className="flex gap-2">
                <button onClick={() => setCurrentMatch({...currentMatch, scoreA: Math.max(0, currentMatch.scoreA - 1)})} className="flex-1 bg-white/5 py-2 rounded-lg text-xs">-</button>
                <button onClick={() => setCurrentMatch({...currentMatch, scoreA: currentMatch.scoreA + 1})} className="flex-1 bg-white/10 py-2 rounded-lg text-lg font-black">+</button>
              </div>
            </div>
          </div>

          {/* Time B */}
          <div className="card-glass border border-white/10 overflow-hidden">
            <div className="bg-white/5 p-2 text-center text-[10px] font-black uppercase">{currentMatch.teamB.name}</div>
            <div className="p-6 text-center">
              <div className="text-5xl font-black mb-4">{currentMatch.scoreB}</div>
              <div className="flex gap-2">
                <button onClick={() => setCurrentMatch({...currentMatch, scoreB: Math.max(0, currentMatch.scoreB - 1)})} className="flex-1 bg-white/5 py-2 rounded-lg text-xs">-</button>
                <button onClick={() => setCurrentMatch({...currentMatch, scoreB: currentMatch.scoreB + 1})} className="flex-1 bg-white/10 py-2 rounded-lg text-lg font-black">+</button>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Próximos Times */}
        {teams.length > 2 && (
          <div className="card-glass p-4 border border-white/5">
            <h3 className="text-[10px] font-black opacity-30 mb-3 uppercase italic">Próximos da Fila</h3>
            <div className="space-y-2">
              {teams.slice(2).map((team, i) => (
                <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                  <span className="text-xs font-bold">{team.name}</span>
                  <span className="text-[10px] opacity-40">{team.players.length} Jogadores</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button 
          onClick={() => {
            if(window.confirm("Deseja encerrar e sortear novamente?")) {
              localStorage.removeItem('temp_teams');
              navigate('/home');
            }
          }}
          className="w-full py-4 text-[10px] font-black opacity-30 uppercase tracking-widest"
        >
          Encerrar Sessão
        </button>
      </div>
    </div>
  );
};

export default MatchPage;
