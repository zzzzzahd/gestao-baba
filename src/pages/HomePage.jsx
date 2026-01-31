import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const HomePage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [guestPlayerName, setGuestPlayerName] = useState('');
  const [guestList, setGuestList] = useState([]);
  const [playersPerTeam, setPlayersPerTeam] = useState(5); // Padrão 5 jogadores
  const [teams, setTeams] = useState([]);

  const handleSortear = () => {
    if (guestList.length < playersPerTeam) {
      toast.error(`Adicione pelo menos ${playersPerTeam} jogadores!`);
      return;
    }

    // 1. Embaralhar
    const shuffled = [...guestList].sort(() => Math.random() - 0.5);
    const totalPlayers = shuffled.length;
    
    // 2. Calcular quantos times completos podemos ter
    const numTeams = Math.floor(totalPlayers / playersPerTeam);
    const newTeams = [];

    // 3. Criar os times baseados no limite escolhido
    for (let i = 0; i < numTeams; i++) {
      newTeams.push({
        name: `TIME ${String.fromCharCode(65 + i)}`,
        players: shuffled.slice(i * playersPerTeam, (i + 1) * playersPerTeam).map(p => p.player.name),
        extras: []
      });
    }

    // 4. Distribuir quem sobrou (reservas) entre os times já criados
    const leftovers = shuffled.slice(numTeams * playersPerTeam);
    leftovers.forEach((player, index) => {
      const teamIndex = index % numTeams;
      newTeams[teamIndex].extras.push(player.player.name);
    });

    setTeams(newTeams);
    localStorage.setItem('temp_teams', JSON.stringify(newTeams));
    toast.success(`${newTeams.length} times gerados!`);
  };

  return (
    <div className="min-h-screen p-5 bg-black text-white font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-black text-cyan-electric tracking-tighter">BABA RÁPIDO</h1>
          <span className="bg-cyan-electric/20 text-cyan-electric text-[10px] px-2 py-1 rounded border border-cyan-electric/30 font-bold">VISITANTE</span>
        </div>

        {/* Configuração do Jogo */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card-glass p-4 border border-white/10">
            <label className="text-[10px] uppercase opacity-50 font-bold mb-2 block">Jogadores por Time</label>
            <select 
              value={playersPerTeam} 
              onChange={(e) => setPlayersPerTeam(Number(e.target.value))}
              className="w-full bg-transparent text-white font-bold outline-none cursor-pointer"
            >
              {[2,3,4,5,6,7,8,9,10,11].map(n => <option key={n} value={n} className="bg-gray-900">{n} Jogadores</option>)}
            </select>
          </div>
          <div className="card-glass p-4 border border-white/10 flex flex-col justify-center">
            <label className="text-[10px] uppercase opacity-50 font-bold mb-1 block">Total Inscritos</label>
            <span className="text-xl font-black text-white">{guestList.length}</span>
          </div>
        </div>

        {/* Input de Jogador */}
        <div className="card-glass p-4 mb-6 border border-white/10">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!guestPlayerName.trim()) return;
            setGuestList([{ id: Date.now(), player: { name: guestPlayerName.toUpperCase() } }, ...guestList]);
            setGuestPlayerName('');
            setTeams([]);
          }} className="flex gap-2">
            <input 
              type="text" value={guestPlayerName} 
              onChange={(e) => setGuestPlayerName(e.target.value)}
              placeholder="Nome do Craque..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-cyan-electric transition-all"
            />
            <button type="submit" className="bg-cyan-electric text-black w-12 h-12 rounded-xl font-black text-xl">+</button>
          </form>
        </div>

        {/* Resultado do Sorteio */}
        {teams.length > 0 && (
          <div className="space-y-4 mb-8 animate-in fade-in zoom-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((team, idx) => (
                <div key={idx} className="card-glass border border-cyan-electric/30 overflow-hidden">
                  <div className="bg-cyan-electric/10 p-2 border-b border-cyan-electric/20 text-center">
                    <span className="text-cyan-electric font-black text-xs">{team.name}</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {team.players.map((p, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="opacity-40 font-mono text-[10px]">{i+1}</span>
                        <span className="font-bold">{p}</span>
                      </div>
                    ))}
                    {team.extras.map((p, i) => (
                      <div key={i} className="flex justify-between text-sm text-yellow-500 italic">
                        <span className="text-[10px] font-black">RES</span>
                        <span className="font-bold">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => navigate('/match')}
              className="w-full bg-green-500 text-black py-4 rounded-2xl font-black shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:scale-[1.02] transition-transform"
            >
              INICIAR PARTIDAS <i className="fas fa-arrow-right ml-2"></i>
            </button>
          </div>
        )}

        {/* Lista de Espera */}
        <div className="card-glass p-5 border border-white/5">
          <div className="flex justify-between items-center mb-4 text-xs font-black opacity-40 italic">
            <span>LISTA DE JOGADORES</span>
            {guestList.length >= 2 && <button onClick={handleSortear} className="text-cyan-electric underline">SORTEAR AGORA</button>}
          </div>
          <div className="space-y-2">
            {guestList.map(p => (
              <div key={p.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-sm font-bold">{p.player.name}</span>
                <button onClick={() => {setGuestList(guestList.filter(i => i.id !== p.id)); setTeams([]);}} className="text-red-500/50 hover:text-red-500 p-2"><i className="fas fa-times"></i></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
