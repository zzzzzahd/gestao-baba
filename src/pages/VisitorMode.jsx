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
      name: newPlayerName.trim(),
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
    let goalies = players.filter(p => p.position === 'goleiro');
    let outfield = players.filter(p => p.position === 'linha');

    // Embaralhar
    goalies = goalies.sort(() => Math.random() - 0.5);
    outfield = outfield.sort(() => Math.random() - 0.5);

    // Calcular número de times
    const numTeams = Math.floor(players.length / playersPerTeam);
    
    if (numTeams < 2) {
      toast.error('Jogadores insuficientes para formar 2 times!');
      return;
    }

    // Criar times vazios
    const teams = Array.from({ length: numTeams }, (_, i) => ({
      id: Date.now() + i,
      name: `TIME ${String.fromCharCode(65 + i)}`, // A, B, C, D...
      players: []
    }));

    // Distribuir goleiros primeiro (1 por time)
    for (let i = 0; i < numTeams && goalies.length > 0; i++) {
      teams[i].players.push(goalies.shift());
    }

    // Distribuir jogadores de linha (ciclicamente)
    let remaining = [...outfield, ...goalies]; // Sobras de goleiros viram linha
    let teamIndex = 0;
    
    while (remaining.length > 0) {
      // Preencher até completar playersPerTeam
      for (let i = 0; i < numTeams && remaining.length > 0; i++) {
        if (teams[i].players.length < playersPerTeam) {
          teams[i].players.push(remaining.shift());
        }
      }
    }

    // Salvar no localStorage
    localStorage.setItem('temp_teams', JSON.stringify(teams));
    
    toast.success(`${numTeams} times sorteados!`);
    
    // Ir para a partida
    setTimeout(() => {
      navigate('/visitor-match');
    }, 500);
  };

  return (
    <div className="min-h-screen p-6 flex flex-col bg-black text-white font-sans">
      <div className="max-w-md w-full mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <Logo size="small" />
          <button
            onClick={() => navigate('/')}
            className="text-[10px] font-black opacity-40 hover:opacity-100 transition-all uppercase tracking-[0.2em] flex items-center gap-2"
          >
            <ArrowLeft size={12} /> Voltar
          </button>
        </div>

        {/* Título */}
        <div className="text-center">
          <h2 className="text-2xl font-black mb-2 uppercase italic tracking-tighter text-cyan-electric">
            Modo Ferramenta Rápida
          </h2>
          <p className="text-xs font-medium opacity-50 uppercase tracking-wide">
            Sorteie times sem precisar de conta!
          </p>
        </div>

        {/* Configuração: Jogadores por Time */}
        <div className="card-glass p-6 border border-cyan-electric/30 rounded-[2rem]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="text-cyan-electric" size={20} />
              <span className="text-xs font-black uppercase opacity-60">Jogadores por Time</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPlayersPerTeam(Math.max(2, playersPerTeam - 1))}
                className="w-10 h-10 bg-white/5 rounded-xl border border-white/10 font-black text-lg active:scale-90 transition-transform"
              >
                -
              </button>
              <span className="text-3xl font-black w-12 text-center">{playersPerTeam}</span>
              <button
                onClick={() => setPlayersPerTeam(Math.min(11, playersPerTeam + 1))}
                className="w-10 h-10 bg-white/5 rounded-xl border border-white/10 font-black text-lg active:scale-90 transition-transform"
              >
                +
              </button>
            </div>
          </div>
          <p className="text-[9px] opacity-40 text-center uppercase tracking-wider">
            Mínimo de {playersPerTeam * 2} jogadores necessários
          </p>
        </div>

        {/* Adicionar Jogador */}
        <div className="card-glass p-4 border border-white/10 rounded-[2rem]">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
              placeholder="Nome do jogador..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-cyan-electric transition-colors"
            />
            <select
              value={newPlayerPosition}
              onChange={(e) => setNewPlayerPosition(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-black outline-none cursor-pointer"
            >
              <option value="linha">⚽ LINHA</option>
              <option value="goleiro">🧤 GOLEIRO</option>
            </select>
          </div>
          <button
            onClick={addPlayer}
            className="w-full py-3 bg-cyan-electric/10 border border-cyan-electric/30 rounded-xl font-black text-xs uppercase tracking-[3px] text-cyan-electric active:scale-95 transition-transform"
          >
            + Adicionar
          </button>
        </div>

        {/* Lista de Jogadores */}
        {players.length > 0 && (
          <div className="card-glass p-4 border border-white/10 rounded-[2rem] max-h-[300px] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase opacity-60">
                Jogadores Cadastrados ({players.length})
              </span>
              <button
                onClick={() => {
                  setPlayers([]);
                  toast.success('Lista limpa!');
                }}
                className="text-[9px] font-black text-red-500/60 hover:text-red-500 uppercase tracking-wider"
              >
                Limpar Todos
              </button>
            </div>
            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black ${player.position === 'goleiro' ? 'text-green-400' : 'text-cyan-electric'}`}>
                      {player.position === 'goleiro' ? '🧤' : '⚽'}
                    </span>
                    <span className="text-sm font-bold">{player.name}</span>
                  </div>
                  <button
                    onClick={() => removePlayer(player.id)}
                    className="text-red-500/60 hover:text-red-500 transition-colors"
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

        {/* Footer */}
        <p className="text-[9px] font-bold opacity-20 uppercase tracking-[0.4em] text-center">
          Powered by Draft Baba v3.0
        </p>
      </div>
    </div>
  );
};

export default VisitorMode;
