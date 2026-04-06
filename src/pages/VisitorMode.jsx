import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { Users, ArrowLeft, Shuffle, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';

const StarRating = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-base leading-none transition-transform active:scale-90 ${
            star <= value ? 'opacity-100' : 'opacity-20'
          }`}
          style={{ color: star <= value ? '#FFD700' : '#ffffff' }}
        >
          ★
        </button>
      ))}
    </div>
  );
};

// Algoritmo de equilíbrio: distribui jogadores por estrelas de forma balanceada
const balanceTeams = (players, numTeams, playersPerTeam, leftoverStrategy) => {
  // Separar goleiros e linha
  let goalies = [...players.filter(p => p.position === 'goleiro')].sort(() => Math.random() - 0.5);
  let outfield = [...players.filter(p => p.position === 'linha')];

  // Criar times vazios com soma de estrelas
  const teams = Array.from({ length: numTeams }, (_, i) => ({
    id: Date.now() + i,
    name: `TIME ${String.fromCharCode(65 + i)}`,
    players: [],
    starSum: 0,
  }));

  // Distribuir goleiros primeiro (1 por time, priorizando equilíbrio)
  goalies.sort((a, b) => b.stars - a.stars);
  for (let i = 0; i < numTeams && goalies.length > 0; i++) {
    const g = goalies.shift();
    teams[i].players.push(g);
    teams[i].starSum += g.stars;
  }
  // Goleiros excedentes viram linha
  outfield = [...outfield, ...goalies];

  // Ordenar jogadores de linha por estrelas (desc) para snake draft
  outfield.sort((a, b) => b.stars - a.stars);

  // Snake draft: distribui em zigue-zague para equilibrar estrelas
  let direction = 1;
  let teamIndex = 0;
  const reserves = [];

  while (outfield.length > 0) {
    // Checa se todos os times atingiram o limite
    const allFull = teams.every(t => t.players.length >= playersPerTeam);
    if (leftoverStrategy === 'reserve' && allFull) {
      // O resto vira reserva
      reserves.push(...outfield);
      break;
    }

    const player = outfield.shift();

    if (teams[teamIndex].players.length < playersPerTeam) {
      teams[teamIndex].players.push(player);
      teams[teamIndex].starSum += player.stars;
    } else {
      // Time cheio no snake draft — coloca no menos cheio
      const targetTeam = teams.reduce((min, t) =>
        t.players.length < min.players.length ? t : min
      );
      if (targetTeam.players.length < playersPerTeam) {
        targetTeam.players.push(player);
        targetTeam.starSum += player.stars;
      } else {
        reserves.push(player);
        continue;
      }
    }

    // Avança no zigue-zague
    teamIndex += direction;
    if (teamIndex >= numTeams) {
      direction = -1;
      teamIndex = numTeams - 1;
    } else if (teamIndex < 0) {
      direction = 1;
      teamIndex = 0;
    }
  }

  return { teams, reserves };
};

const VisitorMode = () => {
  const navigate = useNavigate();

  const [playersPerTeam, setPlayersPerTeam] = useState(5);
  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPosition, setNewPlayerPosition] = useState('linha');
  const [newPlayerStars, setNewPlayerStars] = useState(2); // padrão: 2 estrelas
  const [leftoverStrategy, setLeftoverStrategy] = useState('reserve');

  const addPlayer = () => {
    if (!newPlayerName.trim()) {
      toast.error('Digite o nome do jogador!');
      return;
    }

    const player = {
      id: Date.now(),
      name: newPlayerName.trim(),
      position: newPlayerPosition,
      stars: newPlayerStars,
    };

    setPlayers([...players, player]);
    setNewPlayerName('');
    setNewPlayerStars(2);
    toast.success(`${player.name} adicionado!`);
  };

  const removePlayer = (id) => {
    setPlayers(players.filter(p => p.id !== id));
    toast.success('Jogador removido!');
  };

  const drawTeams = () => {
    if (players.length < playersPerTeam * 2) {
      toast.error(`Você precisa de pelo menos ${playersPerTeam * 2} jogadores!`);
      return;
    }

    let numTeams;
    if (leftoverStrategy === 'reserve') {
      numTeams = Math.floor(players.length / playersPerTeam);
    } else {
      numTeams = Math.ceil(players.length / playersPerTeam);
    }

    if (numTeams < 2) {
      toast.error('Jogadores insuficientes para formar 2 times!');
      return;
    }

    const { teams, reserves } = balanceTeams(players, numTeams, playersPerTeam, leftoverStrategy);

    localStorage.setItem('temp_teams', JSON.stringify(teams));
    if (reserves.length > 0) {
      localStorage.setItem('temp_reserves', JSON.stringify(reserves));
    } else {
      localStorage.removeItem('temp_reserves');
    }

    toast.success(`${numTeams} times sorteados com equilíbrio!`);
    navigate('/visitor-match');
  };

  const starLabel = { 1: 'Abaixo da média', 2: 'Na média', 3: 'Acima da média' };

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

          {/* Estratégia de Divisão */}
          <div className="pt-4 border-t border-white/5 space-y-3">
            <div className="flex items-center gap-2">
              <Settings2 size={14} className="text-cyan-electric opacity-50" />
              <span className="text-[10px] font-black uppercase opacity-40 tracking-wider">Se a conta não for exata:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setLeftoverStrategy('reserve')}
                className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all border ${
                  leftoverStrategy === 'reserve'
                    ? 'bg-cyan-electric text-black border-cyan-electric'
                    : 'bg-white/5 text-white/40 border-white/10'
                }`}
              >
                Ficar na Reserva
              </button>
              <button
                onClick={() => setLeftoverStrategy('substitute')}
                className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all border ${
                  leftoverStrategy === 'substitute'
                    ? 'bg-cyan-electric text-black border-cyan-electric'
                    : 'bg-white/5 text-white/40 border-white/10'
                }`}
              >
                Time com Suplente
              </button>
            </div>
          </div>

          <p className="text-[9px] opacity-40 text-center uppercase tracking-wider mt-4">
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

          {/* NOVO: Seletor de Estrelas */}
          <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 mb-3 border border-white/5">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase opacity-40 tracking-widest mb-1">Nível do Jogador</span>
              <span className="text-[10px] font-bold opacity-60">{starLabel[newPlayerStars]}</span>
            </div>
            <StarRating value={newPlayerStars} onChange={setNewPlayerStars} />
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
                  <div className="flex items-center gap-3">
                    {/* Estrelas do jogador na lista */}
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map(s => (
                        <span
                          key={s}
                          className="text-xs leading-none"
                          style={{ color: s <= player.stars ? '#FFD700' : 'rgba(255,255,255,0.15)' }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => removePlayer(player.id)}
                      className="text-red-500/60 hover:text-red-500 transition-colors"
                    >
                      <i className="fas fa-times text-sm"></i>
                    </button>
                  </div>
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
            Sortear Times Equilibrados
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
