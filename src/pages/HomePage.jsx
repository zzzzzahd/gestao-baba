import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const HomePage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();
  const { user } = useAuth();
  
  const [guestPlayerName, setGuestPlayerName] = useState('');
  const [isGoalkeeper, setIsGoalkeeper] = useState(false);
  const [guestList, setGuestList] = useState([]);
  const [playersPerTeam, setPlayersPerTeam] = useState(5);
  const [teams, setTeams] = useState([]);

  const handleSortear = () => {
    const goalkeepers = guestList.filter(p => p.isGoalkeeper);
    const outfieldPlayers = guestList.filter(p => !p.isGoalkeeper);

    if (guestList.length < playersPerTeam) {
      toast.error(`Mínimo de ${playersPerTeam} jogadores!`);
      return;
    }

    // Embaralhar listas separadas
    const shufGKs = [...goalkeepers].sort(() => Math.random() - 0.5);
    const shufOutfield = [...outfieldPlayers].sort(() => Math.random() - 0.5);

    const numTeams = Math.floor(guestList.length / playersPerTeam);
    const newTeams = [];

    // Criar os times
    for (let i = 0; i < numTeams; i++) {
      const teamPlayers = [];
      
      // Adicionar 1 goleiro se disponível
      if (shufGKs.length > 0) {
        teamPlayers.push({ name: shufGKs.shift().player.name, role: 'goleiro' });
      }

      // Completar com jogadores de linha até atingir o limite do time
      while (teamPlayers.length < playersPerTeam && shufOutfield.length > 0) {
        teamPlayers.push({ name: shufOutfield.shift().player.name, role: 'linha' });
      }

      newTeams.push({
        id: i + 1,
        name: `TIME ${String.fromCharCode(65 + i)}`,
        players: teamPlayers,
        extras: [],
        score: 0
      });
    }

    // Distribuir quem sobrou (reservas)
    const leftovers = [...shufGKs, ...shufOutfield];
    leftovers.forEach((p, index) => {
      const teamIndex = index % numTeams;
      newTeams[teamIndex].extras.push({ name: p.player.name, role: p.isGoalkeeper ? 'goleiro' : 'linha' });
    });

    setTeams(newTeams);
    // Salva no formato que a MatchPage espera
    localStorage.setItem('temp_teams', JSON.stringify(newTeams));
    toast.success("Times sorteados com sucesso!");
  };

  const iniciarPartida = () => {
    if (teams.length < 2) {
      toast.error("Precisa de pelo menos 2 times para jogar!");
      return;
    }
    navigate('/match');
  };

  return (
    <div className="min-h-screen p-5 bg-black text-white font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-black text-cyan-electric tracking-tighter uppercase">Baba Rápido</h1>
          <span className="bg-cyan-electric/20 text-cyan-electric text-[10px] px-2 py-1 rounded border border-cyan-electric/30 font-bold">MODO VISITANTE</span>
        </div>

        {/* Seletor de Tamanho do Time */}
        <div className="card-glass p-4 mb-6 border border-white/10 flex justify-between items-center">
          <label className="text-xs font-bold opacity-50">JOGADORES POR TIME:</label>
          <select 
            value={playersPerTeam} 
            onChange={(e) => setPlayersPerTeam(Number(e.target.value))}
            className="bg-transparent text-cyan-electric font-black outline-none"
          >
            {[2,3,4,5,6,7,8,9,10,11].map(n => <option key={n} value={n} className="bg-gray-900">{n}</option>)}
          </select>
        </div>

        {/* Input de Jogador com Opção de Goleiro */}
        <div className="card-glass p-4 mb-6 border border-white/10">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!guestPlayerName.trim()) return;
            setGuestList([{ id: Date.now(), isGoalkeeper, player: { name: guestPlayerName.toUpperCase() } }, ...guestList]);
            setGuestPlayerName('');
            setIsGoalkeeper(false);
            setTeams([]);
          }} className="space-y-4">
            <div className="flex gap-2">
              <input 
                type="text" value={guestPlayerName} 
                onChange={(e) => setGuestPlayerName(e.target.value)}
                placeholder="Nome do Jogador..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-cyan-electric"
              />
              <button type="submit" className="bg-cyan-electric text-black w-12 h-12 rounded-xl font-black text-xl">+</button>
            </div>
            
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setIsGoalkeeper(false)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${!isGoalkeeper ? 'bg-white/20 border-white/40 border' : 'bg-white/5 opacity-40'}`}
              >
                JOGADOR DE LINHA
              </button>
              <button 
                type="button"
                onClick={() => setIsGoalkeeper(true)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${isGoalkeeper ? 'bg-yellow-500/20 border-yellow-500 border text-yellow-500' : 'bg-white/5 opacity-40'}`}
              >
                GOLEIRO <i className="fas fa-hands-clapping ml-1"></i>
              </button>
            </div>
          </form>
        </div>

        {/* Resultado do Sorteio */}
        {teams.length > 0 && (
          <div className="space-y-4 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((team) => (
                <div key={team.id} className="card-glass border border-white/10">
                  <div className="bg-white/5 p-2 text-center text-[10px] font-black">{team.name}</div>
                  <div className="p-4 space-y-2">
                    {team.players.map((p, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="font-bold">{p.name}</span>
                        {p.role === 'goleiro' && <span className="text-[9px] bg-yellow-500 text-black px-1 rounded font-black">GK</span>}
                      </div>
                    ))}
                    {team.extras.map((p, i) => (
                      <div key={i} className="flex justify-between text-sm text-gray-500 italic">
                        <span>{p.name}</span>
                        <span className="text-[9px]">RES</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={iniciarPartida} className="w-full bg-green-500 text-black py-4 rounded-2xl font-black uppercase tracking-widest">
              Iniciar Partida
            </button>
          </div>
        )}

        {/* Lista de Inscritos */}
        <div className="card-glass p-4 border border-white/5">
          <div className="flex justify-between items-center mb-4 text-[10px] font-bold opacity-40">
            <span>LISTA DE INSCRITOS ({guestList.length})</span>
            {guestList.length >= 2 && <button onClick={handleSortear} className="text-cyan-electric underline">SORTEAR TIMES</button>}
          </div>
          <div className="space-y-2">
            {guestList.map(p => (
              <div key={p.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${p.isGoalkeeper ? 'bg-yellow-500' : 'bg-cyan-electric'}`}></span>
                  <span className="text-sm font-bold uppercase">{p.player.name}</span>
                </div>
                <button onClick={() => setGuestList(guestList.filter(i => i.id !== p.id))} className="text-red-500 opacity-30"><i className="fas fa-trash text-xs"></i></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
