import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { Users, Play, ArrowLeft, Shuffle } from 'lucide-react';
import toast from 'react-hot-toast';

const VisitorMode = () => {
  const navigate = useNavigate();
  
  const [playersPerTeam, setPlayersPerTeam] = useState(5);
  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPosition, setNewPlayerPosition] = useState('linha');

  // Adicionar jogador
  const addPlayer = () => {
    if (!newPlayerName.trim()) {
      toast.error('Digite o nome do jogador!');
      return;
    }

    const player = {
      id: Date.now(),
      name: newPlayerName.trim().toUpperCase(),
      position: newPlayerPosition
    };

    setPlayers([...players, player]);
    setNewPlayerName('');
    toast.success(`${player.name} adicionado!`);
  };

  // Remover jogador
  const removePlayer = (id) => {
    setPlayers(players.filter(p => p.id !== id));
    toast.success('Jogador removido!');
  };

  // Sortear times
  const drawTeams = () => {
    if (players.length < playersPerTeam * 2) {
      toast.error(`Você precisa de pelo menos ${playersPerTeam * 2} jogadores!`);
      return;
    }

    // Separar goleiros e jogadores de linha
    let goalies = players.filter(p => p.position === 'goleiro').sort(() => Math.random() - 0.5);
    let outfield = players.filter(p => p.position === 'linha').sort(() => Math.random() - 0.5);

    const numTeams = Math.floor(players.length / playersPerTeam);
    const teams = Array.from({ length: numTeams }, (_, i) => ({
      id: Date.now() + i,
      name: `TIME ${String.fromCharCode(65 + i)}`,
      players: [],
      score: 0
    }));

    // Distribuir goleiros
    for (let i = 0; i < numTeams && goalies.length > 0; i++) {
      teams[i].players.push(goalies.shift());
    }

    // Distribuir jogadores de linha
    let remaining = [...outfield, ...goalies];
    while (remaining.length > 0) {
      for (let i = 0; i < numTeams && remaining.length > 0; i++) {
        if (teams[i].players.length < playersPerTeam) {
          teams[i].players.push(remaining.shift());
        }
      }
    }

    // AQUI ESTÁ A ÚNICA MUDANÇA: SALVAR E NAVEGAR IMEDIATAMENTE
    localStorage.setItem('temp_teams', JSON.stringify(teams));
    toast.success('Times sorteados com sucesso!');
    navigate('/visitor-match'); // Sem o setTimeout para não falhar
  };

  return (
    <div className="min-h-screen p-5 bg-black text-white font-sans selection:bg-cyan-electric selection:text-black">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate('/')}
            className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <Logo size="small" />
        </div>

        {/* Título */}
        <div className="card-glass p-6 rounded-[2.5rem] border border-white/10 mb-6 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Users size={80} strokeWidth={1} />
          </div>
          <h1 className="text-2xl font-black italic text-cyan-electric mb-1 uppercase tracking-tighter">MODO VISITANTE</h1>
          <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.3em]">Sorteio rápido offline</p>
        </div>

        {/* Configurações */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="card-glass p-4 rounded-3xl border border-white/5">
            <label className="text-[8px] font-black opacity-30 uppercase mb-2 block tracking-widest text-center">Jogadores/Time</label>
            <div className="flex items-center justify-around">
              {[5, 6].map(n => (
                <button
                  key={n}
                  onClick={() => setPlayersPerTeam(n)}
                  className={`px-4 py-2 rounded-xl font-black text-xs transition-all ${
                    playersPerTeam === n ? 'bg-cyan-electric text-black shadow-neon-cyan' : 'bg-white/5 opacity-40'
                  }`}
                >
                  {n}x{n}
                </button>
              ))}
            </div>
          </div>
          <div className="card-glass p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center">
            <label className="text-[8px] font-black opacity-30 uppercase mb-1 block tracking-widest">Times Possíveis</label>
            <span className="text-xl font-black italic text-white">
              {Math.floor(players.length / playersPerTeam)}
            </span>
          </div>
        </div>

        {/* Input */}
        <div className="space-y-4 mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
              placeholder="NOME DO ATLETA"
              className="flex-1 bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-cyan-electric transition-all font-bold text-xs placeholder:opacity-20"
            />
            <select
              value={newPlayerPosition}
              onChange={(e) => setNewPlayerPosition(e.target.value)}
              className="bg-black border border-white/10 p-4 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-cyan-electric transition-all"
            >
              <option value="linha">Linha</option>
              <option value="goleiro">Goleiro</option>
            </select>
          </div>
          <button
            onClick={addPlayer}
            className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-white/10 transition-all active:scale-[0.98]"
          >
            Adicionar à Lista
          </button>
        </div>

        {/* Lista */}
        {players.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Lista de Atletas</span>
              <span className="text-[10px] font-black text-cyan-electric italic uppercase">{players.length} Inscritos</span>
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="bg-white/5 p-4 rounded-2xl border border-white/5 flex justify-between items-center group animate-slide-in"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${player.position === 'goleiro' ? 'bg-green-500' : 'bg-white/20'}`}></span>
                    <span className="text-sm font-bold uppercase tracking-tight">{player.name}</span>
                  </div>
                  <button
                    onClick={() => removePlayer(player.id)}
                    className="text-red-500/40 hover:text-red-500 transition-colors p-2"
                  >
                    <i className="fas fa-times text-sm"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botão Sortear */}
        {players.length >= playersPerTeam * 2 ? (
          <button
            onClick={drawTeams}
            className="w-full py-5 rounded-2xl font-black text-black shadow-[0_10px_30px_rgba(0,242,255,0.25)] transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-sm tracking-widest"
            style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
          >
            <Shuffle size={20} />
            Sortear Times
          </button>
        ) : (
          <div className="w-full py-5 rounded-2xl font-black bg-white/5 border border-white/10 text-white/30 text-center uppercase text-xs tracking-widest">
            Adicione {playersPerTeam * 2 - players.length} jogadores para sortear
          </div>
        )}

        {/* Footer original */}
        <p className="text-[9px] font-bold opacity-20 uppercase tracking-[0.4em] text-center mt-10">
          Gerenciador de Baba • Modo Visitante
        </p>
      </div>
    </div>
  );
};

export default VisitorMode;
