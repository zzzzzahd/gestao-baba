import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const MatchPageVisitor = () => {
  const navigate = useNavigate();
  
  const [allTeams, setAllTeams] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [timer, setTimer] = useState(600); // 10 minutos
  const [isActive, setIsActive] = useState(false);

  // 1. Carregar times do localStorage
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
          toast.error('Número insuficiente de times.');
          navigate('/visitor');
        }
      } catch (e) {
        console.error('Erro ao carregar times:', e);
        localStorage.removeItem('temp_teams');
        toast.error('Erro ao carregar times!');
        navigate('/visitor');
      }
    } else {
      toast.error('Nenhum time encontrado!');
      navigate('/visitor');
    }
  }, [navigate]);

  // 2. Lógica do Cronômetro
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
      // Time A fica, Time B vai pro final da fila
      const loser = queue.splice(1, 1)[0];
      queue.push(loser);
    } else if (winner === "B") {
      // Time B fica, Time A vai pro final da fila
      const loser = queue.splice(0, 1)[0];
      queue.push(loser);
    } else {
      // Empate: Ambos vão pro final da fila
      const team1 = queue.shift();
      const team2 = queue.shift();
      queue.push(team1, team2);
    }

    // Verificar se ainda tem times suficientes
    if (queue.length < 2) {
      toast.success('Fim das partidas!');
      localStorage.removeItem('temp_teams');
      setTimeout(() => navigate('/visitor'), 2000);
      return;
    }

    // Atualizar estado e storage
    setAllTeams(queue);
    localStorage.setItem('temp_teams', JSON.stringify(queue));
    
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
  if (!currentMatch) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white/20 uppercase font-black italic">
        Carregando Partida...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-5 font-sans pb-20">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center text-[10px] font-black opacity-40">
          <button 
            onClick={() => {
              const confirm = window.confirm('Deseja sair? O progresso será perdido.');
              if (confirm) {
                localStorage.removeItem('temp_teams');
                navigate('/visitor');
              }
            }}
            className="hover:text-cyan-electric transition-colors"
          >
            ← SAIR
          </button>
          <span className="text-yellow-500 italic tracking-widest">MODO VISITANTE (OFFLINE)</span>
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
                onClick={() => setCurrentMatch({...currentMatch, scoreA: currentMatch.scoreA + 1})}
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
                onClick={() => setCurrentMatch({...currentMatch, scoreB: currentMatch.scoreB + 1})}
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

        {/* --- NOVA SEÇÃO: LISTA DE TODOS OS TIMES --- */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <h3 className="text-[10px] font-black opacity-30 italic px-2 uppercase tracking-[0.2em]">
            Escalações de todos os times:
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {allTeams.map((team, idx) => (
              <div key={idx} className="card-glass p-5 rounded-[2rem] border border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-black uppercase text-white/80 italic">{team.name}</span>
                  <span className="text-[8px] font-bold opacity-30 tracking-widest uppercase">
                    {idx === 0 || idx === 1 ? 'Em Campo' : idx === 2 ? 'Próximo' : 'Na Fila'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {team.players.map((p, i) => (
                    <div key={i} className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                      <div className={`w-1 h-1 rounded-full ${p.position === 'goleiro' ? 'bg-green-500' : 'bg-white/20'}`}></div>
                      <span className="text-[9px] font-bold uppercase opacity-60 tracking-tighter">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regras */}
        <div className="text-center text-[9px] opacity-20 uppercase font-black tracking-wider pt-6 pb-10">
          <p>Regras: 2 Gols ou 10 Minutos</p>
          <p className="mt-1">Quem Ganha Fica • Empate Sai os Dois</p>
        </div>
      </div>
    </div>
  );
};

export default MatchPageVisitor;
