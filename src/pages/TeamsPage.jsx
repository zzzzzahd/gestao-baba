import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Users, Play, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const TeamsPage = () => {
  const navigate = useNavigate();
  const { currentBaba, getOfficialTeams, saveOfficialTeams, getConfirmedPlayers } = useBaba();
  const { profile } = useAuth(); // Usado para checar permissão de admin
  
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSorted, setIsSorted] = useState(false);

  useEffect(() => {
    if (currentBaba) {
      loadTeamsAndCheckSort();
    } else {
      navigate('/home');
    }
  }, [currentBaba]);

  const loadTeamsAndCheckSort = async () => {
    try {
      setLoading(true);
      
      // 1. Verificar se já existe sorteio oficial para hoje via Contexto
      const existingSort = await getOfficialTeams(currentBaba.id);

      if (existingSort) {
        setTeams(existingSort.teams_data);
        setIsSorted(true);
      } else {
        // 2. Se não existe, verifica se já está na janela de sorteio (30 min antes)
        checkIfShouldSort();
      }
    } catch (error) {
      console.error("Erro ao carregar times:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfShouldSort = () => {
    const agora = new Date();
    const [horas, minutos] = currentBaba.match_time.split(':');
    const horaJogo = new Date();
    horaJogo.setHours(parseInt(horas), parseInt(minutos), 0);

    const diferencaMinutos = (horaJogo - agora) / (1000 * 60);

    // Se faltar 30 min ou menos (e não tiver passado de 3 horas do início)
    if (diferencaMinutos <= 30 && diferencaMinutos > -180) {
      generateAutoSort();
    }
  };

  const generateAutoSort = async () => {
    try {
      // 1. Buscar confirmados via Contexto
      const confirmedPlayers = await getConfirmedPlayers(currentBaba.id);

      if (!confirmedPlayers || confirmedPlayers.length < 4) {
        return; // Mínimo de 4 para um 2x2 básico
      }

      // 2. Lógica de Sorteio (Sua lógica original preservada)
      const shuffled = [...confirmedPlayers].sort(() => Math.random() - 0.5);
      const resultTeams = [];
      
      // Divide em times de 5 (ou conforme configurado no futuro)
      while (shuffled.length) {
        resultTeams.push({
          name: `Time ${String.fromCharCode(65 + resultTeams.length)}`,
          players: shuffled.splice(0, 5).map(p => ({
            id: p.player_id,
            name: p.profiles?.name || 'Jogador',
            avatar_url: p.profiles?.avatar_url
          }))
        });
      }

      // 3. Salva no banco via Contexto para que todos os membros vejam o mesmo sorteio
      await saveOfficialTeams(currentBaba.id, resultTeams);

      setTeams(resultTeams);
      setIsSorted(true);
      toast.success("Times sorteados automaticamente!");
    } catch (error) {
      console.error("Erro no sorteio:", error);
    }
  };

  const handleGoToMatch = () => {
    // Mantém sua integração com a MatchPageVisitor (modo offline/quadra)
    localStorage.setItem('temp_teams', JSON.stringify(teams));
    navigate('/match');
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-cyan-electric" size={40} />
      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Escalando Jogadores...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-32 font-sans">
      <div className="max-w-md mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter">Escalação</h1>
            <p className="text-[10px] text-cyan-electric font-bold uppercase tracking-[0.2em]">
              {isSorted ? "Sorteio Realizado" : "Aguardando horário limite"}
            </p>
          </div>
          <button 
            onClick={() => navigate('/home')} 
            className="p-2 px-4 bg-white/5 rounded-xl text-[10px] font-black hover:bg-white/10 transition-colors uppercase italic"
          >
            Sair
          </button>
        </header>

        {!isSorted ? (
          <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-white/5 border-dashed flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-cyan-electric/5 flex items-center justify-center mb-6">
              <Clock className="text-cyan-electric opacity-40" size={32} />
            </div>
            <p className="text-xs font-bold opacity-40 uppercase px-12 leading-relaxed">
              O sorteio será liberado <span className="text-cyan-electric">30 minutos</span> antes do início do baba.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {teams.map((team, idx) => (
              <div key={idx} className="card-glass border border-white/10 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
                {/* Indicador visual do time */}
                <div className="absolute top-0 right-0 p-4 opacity-5 font-black text-4xl italic">{idx + 1}</div>
                
                <h3 className="text-cyan-electric font-black italic uppercase text-sm mb-6 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-electric shadow-[0_0_8px_#00f2ff]"></div>
                  {team.name}
                </h3>

                <div className="space-y-4">
                  {team.players.map(p => (
                    <div key={p.id} className="flex items-center gap-4 group/player">
                      <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-white/5 flex-shrink-0">
                        <img 
                          src={p.avatar_url || `https://ui-avatars.com/api/?name=${p.name}&background=111&color=00f2ff&bold=true`} 
                          className="w-full h-full object-cover"
                          alt={p.name}
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black uppercase italic tracking-tight group-hover/player:text-cyan-electric transition-colors">{p.name}</span>
                        <span className="text-[8px] opacity-30 font-bold uppercase tracking-widest">Confirmado</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BOTÃO IR PRA QUADRA - VISÍVEL APENAS PARA ADMINS/PRESIDENTE */}
        {isSorted && (profile?.role === 'admin' || profile?.role === 'president' || profile?.role === 'owner') && (
          <div className="fixed bottom-8 left-0 right-0 px-6 z-50">
            <button 
              onClick={handleGoToMatch}
              className="w-full bg-cyan-electric text-black py-5 rounded-3xl font-black uppercase text-xs flex items-center justify-center gap-3 shadow-[0_15px_40px_rgba(0,242,255,0.4)] hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Play fill="black" size={18} /> IR PARA A QUADRA
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamsPage;
