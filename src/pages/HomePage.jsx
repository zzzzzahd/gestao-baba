import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Users, Clock, ShieldAlert, Plus, mdiMitten, SoccerBall } from 'lucide-react';
import toast from 'react-hot-toast';

const HomePage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();
  const { user } = useAuth();
  
  const [guestPlayerName, setGuestPlayerName] = useState('');
  const [isGoalkeeper, setIsGoalkeeper] = useState(false);
  const [guestList, setGuestList] = useState([]);
  const [playersPerTeam, setPlayersPerTeam] = useState(currentBaba?.modality === 'society' ? 8 : 5);
  const [teams, setTeams] = useState([]);

  // Lógica de Sorteio (Mantida do seu original)
  const handleSortear = () => {
    const goalkeepers = guestList.filter(p => p.isGoalkeeper);
    const outfieldPlayers = guestList.filter(p => !p.isGoalkeeper);
    if (guestList.length < playersPerTeam) return toast.error(`Mínimo de ${playersPerTeam} jogadores!`);

    const shufGKs = [...goalkeepers].sort(() => Math.random() - 0.5);
    const shufOutfield = [...outfieldPlayers].sort(() => Math.random() - 0.5);
    const numTeams = Math.floor(guestList.length / playersPerTeam);
    const newTeams = [];

    for (let i = 0; i < numTeams; i++) {
      const teamPlayers = [];
      if (shufGKs.length > 0) teamPlayers.push({ name: shufGKs.shift().player.name, role: 'goleiro' });
      while (teamPlayers.length < playersPerTeam && shufOutfield.length > 0) {
        teamPlayers.push({ name: shufOutfield.shift().player.name, role: 'linha' });
      }
      newTeams.push({ id: i + 1, name: `TIME ${String.fromCharCode(65 + i)}`, players: teamPlayers, extras: [], score: 0 });
    }

    const leftovers = [...shufGKs, ...shufOutfield];
    leftovers.forEach((p, index) => {
      newTeams[index % numTeams].extras.push({ name: p.player.name, role: p.isGoalkeeper ? 'goleiro' : 'linha' });
    });

    setTeams(newTeams);
    localStorage.setItem('temp_teams', JSON.stringify(newTeams));
    toast.success("Times sorteados!");
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER DINÂMICO */}
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-cyan-electric italic uppercase tracking-tighter">
              {currentBaba ? currentBaba.name : "BABA RÁPIDO"}
            </h1>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">
              {currentBaba ? `${currentBaba.game_day || 'Hoje'} • ${currentBaba.game_time}` : "MODO VISITANTE"}
            </p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="p-2 bg-white/5 rounded-lg border border-white/10">
            <Users size={20} className="text-cyan-electric" />
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* BLOCO 1: CHECK-IN / ADICIONAR (Inspirado na imagem) */}
          <div className="card-glass p-5 border border-white/10 rounded-3xl">
            <h2 className="text-[10px] font-black opacity-40 uppercase mb-4 tracking-widest flex items-center gap-2">
              <Clock size={12}/> Próximo Jogo
            </h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!guestPlayerName.trim()) return;
              setGuestList([{ id: Date.now(), isGoalkeeper, player: { name: guestPlayerName.toUpperCase() } }, ...guestList]);
              setGuestPlayerName('');
            }} className="space-y-3">
              <input 
                type="text" value={guestPlayerName} onChange={(e) => setGuestPlayerName(e.target.value)}
                placeholder="Nome do Atleta..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-cyan-electric"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsGoalkeeper(false)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${!isGoalkeeper ? 'bg-cyan-electric text-black' : 'bg-white/5 opacity-40'}`}>LINHA</button>
                <button type="button" onClick={() => setIsGoalkeeper(true)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${isGoalkeeper ? 'bg-yellow-500 text-black' : 'bg-white/5 opacity-40'}`}>GOLEIRO</button>
              </div>
              <button type="submit" className="w-full bg-green-neon text-black py-4 rounded-2xl font-black text-xs shadow-[0_0_15px_rgba(57,255,20,0.3)]">
                CONFIRMAR PRESENÇA ✓
              </button>
            </form>
          </div>

          {/* BLOCO 2: TIMES SORTEADOS (Layout da sua imagem) */}
          <div className="card-glass p-5 border border-white/10 rounded-3xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[10px] font-black opacity-40 uppercase tracking-widest flex items-center gap-2">
                <Users size={12}/> Escalação Atual
              </h2>
              {guestList.length >= 2 && <button onClick={handleSortear} className="text-[10px] text-cyan-electric font-black underline">SORTEAR</button>}
            </div>
            
            {teams.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {teams.slice(0, 2).map(team => (
                  <div key={team.id} className="bg-white/5 p-3 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-black text-cyan-electric mb-2">{team.name}</p>
                    {team.players.map((p, i) => (
                      <p key={i} className={`text-[10px] font-bold ${p.role === 'goleiro' ? 'text-yellow-500' : 'opacity-80'}`}>
                        {p.role === 'goleiro' ? '🧤 ' : '• '}{p.name}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center border-2 border-dashed border-white/5 rounded-2xl">
                <p className="text-[10px] opacity-20 font-black italic">AGUARDANDO SORTEIO</p>
              </div>
            )}
            {teams.length >= 2 && (
              <button onClick={() => navigate('/match')} className="w-full mt-3 bg-white text-black py-2 rounded-xl font-black text-[10px]">INICIAR PARTIDA</button>
            )}
          </div>

          {/* BLOCO 3: RANKING (Layout da sua imagem) */}
          <div className="card-glass p-5 border border-white/10 rounded-3xl">
            <h2 className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Trophy size={12} className="text-yellow-500"/> Ranking Mensal
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black border-b border-white/5 pb-1 opacity-30">
                <span>ATLETA</span>
                <div className="flex gap-4"><span>GOLS</span><span>AST</span></div>
              </div>
              {/* Exemplo estático (Item 9 do Prompt) */}
              <div className="flex justify-between text-xs font-bold">
                <span className="text-cyan-electric italic">CARLOS</span>
                <div className="flex gap-6"><span>8</span><span>4</span></div>
              </div>
            </div>
          </div>

          {/* BLOCO 4: PAINEL ADMIN (Layout da sua imagem) */}
          <div className="card-glass p-5 border border-white/10 rounded-3xl">
            <h2 className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShieldAlert size={12} className="text-red-500"/> Painel do Admin
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <button className="bg-white/5 p-3 rounded-xl text-[9px] font-black border border-white/5 hover:bg-white/10 transition-all">REGISTRAR GOLS</button>
              <button className="bg-white/5 p-3 rounded-xl text-[9px] font-black border border-white/5 hover:bg-white/10 transition-all">REGISTRAR AST.</button>
              <button className="bg-white/5 p-3 rounded-xl text-[9px] font-black border border-white/5 hover:bg-white/10 transition-all">APLICAR CARTÃO</button>
              <button className="bg-cyan-electric/20 text-cyan-electric p-3 rounded-xl text-[9px] font-black border border-cyan-electric/30">TIME VENCEDOR 📸</button>
            </div>
          </div>

        </div>

        {/* LISTA DE INSCRITOS (RESERVAS/GERAL) */}
        <div className="mt-6">
          <p className="text-[10px] font-black opacity-40 mb-3 ml-2 uppercase">Inscritos na Lista ({guestList.length})</p>
          <div className="flex flex-wrap gap-2">
            {guestList.map(p => (
              <div key={p.id} className="bg-white/5 px-3 py-2 rounded-full border border-white/10 flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${p.isGoalkeeper ? 'bg-yellow-500' : 'bg-cyan-electric'}`}></span>
                <span className="text-[10px] font-bold">{p.player.name}</span>
                <button onClick={() => setGuestList(guestList.filter(i => i.id !== p.id))} className="text-red-500 opacity-50 ml-1">×</button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* FOOTER NAV (Item 12 do Prompt) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-white/10 p-4 flex justify-around items-center z-50">
        <button className="text-cyan-electric flex flex-col items-center gap-1 opacity-100"><Clock size={18}/><span className="text-[8px] font-black">HOME</span></button>
        <button className="opacity-40 flex flex-col items-center gap-1"><Trophy size={18}/><span className="text-[8px] font-black">RANKING</span></button>
        <button onClick={() => navigate('/dashboard')} className="opacity-40 flex flex-col items-center gap-1"><Users size={18}/><span className="text-[8px] font-black">BABAS</span></button>
      </nav>
    </div>
  );
};

export default HomePage;
