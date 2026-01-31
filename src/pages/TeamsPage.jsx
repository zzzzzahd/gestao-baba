import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Users, Play, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const TeamsPage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();
  const { user, profile } = useAuth(); // profile para ver se é admin
  
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSorted, setIsSorted] = useState(false);

  useEffect(() => {
    if (currentBaba) {
      loadTeamsAndCheckSort();
    }
  }, [currentBaba]);

  const loadTeamsAndCheckSort = async () => {
    try {
      setLoading(true);
      
      // 1. Verificar se já existe sorteio para hoje no banco
      const { data: existingSort } = await supabase
        .from('official_teams')
        .select('*')
        .eq('baba_id', currentBaba.id)
        .eq('created_at', new Date().toISOString().split('T')[0])
        .single();

      if (existingSort) {
        setTeams(existingSort.teams_data);
        setIsSorted(true);
      } else {
        // 2. Se não existe, verificar se já está no horário (30 min antes)
        checkIfShouldSort();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfShouldSort = async () => {
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
    // 1. Buscar quem confirmou presença
    const { data: confirmedPlayers } = await supabase
      .from('presences')
      .select('player_id, profiles(name, avatar_url)')
      .eq('baba_id', currentBaba.id);

    if (!confirmedPlayers || confirmedPlayers.length < 4) {
      return; // Não tem gente suficiente para o sorteio automático ainda
    }

    // 2. Lógica de Sorteio (Embaralhar e dividir em times de 5 - ajuste conforme sua regra)
    const shuffled = [...confirmedPlayers].sort(() => Math.random() - 0.5);
    const resultTeams = [];
    while (shuffled.length) {
      resultTeams.push({
        name: `Time ${String.fromCharCode(65 + resultTeams.length)}`,
        players: shuffled.splice(0, 5).map(p => ({
          id: p.player_id,
          name: p.profiles.name,
          avatar_url: p.profiles.avatar_url
        }))
      });
    }

    // 3. Salvar sorteio oficial no banco para todos verem
    await supabase.from('official_teams').insert({
      baba_id: currentBaba.id,
      teams_data: resultTeams
    });

    setTeams(resultTeams);
    setIsSorted(true);
    toast.success("Times sorteados automaticamente!");
  };

  const handleGoToMatch = () => {
    // Salva no localStorage para a MatchPage ler a fila
    localStorage.setItem('temp_teams', JSON.stringify(teams));
    navigate('/match');
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-cyan-electric">Carregando times...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter">Escalação</h1>
            <p className="text-[10px] text-cyan-electric font-bold uppercase tracking-[0.2em]">
              {isSorted ? "Sorteio Realizado" : "Aguardando horário limite"}
            </p>
          </div>
          <button onClick={() => navigate('/home')} className="opacity-50 text-xs font-bold">VOLTAR</button>
        </header>

        {!isSorted ? (
          <div className="text-center py-20 bg-white/5 rounded-[2rem] border border-white/5 border-dashed">
            <Clock className="mx-auto mb-4 opacity-20" size={48} />
            <p className="text-sm font-bold opacity-40 uppercase px-10">
              O sorteio será liberado 30 minutos antes do início do baba.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mb-24">
            {teams.map((team, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                <h3 className="text-cyan-electric font-black italic uppercase text-sm mb-4 flex items-center gap-2">
                  <Users size={16} /> {team.name}
                </h3>
                <div className="space-y-3">
                  {team.players.map(p => (
                    <div key={p.id} className="flex items-center gap-3">
                      <img 
                        src={p.avatar_url || `https://ui-avatars.com/api/?name=${p.name}&background=111&color=fff`} 
                        className="w-8 h-8 rounded-full border border-white/10" 
                      />
                      <span className="text-xs font-bold uppercase">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BOTÃO IR PRA QUADRA - SÓ PARA ADMIN/PRESIDENTE */}
        {isSorted && (profile?.role === 'admin' || profile?.role === 'president') && (
          <div className="fixed bottom-6 left-0 right-0 px-6">
            <button 
              onClick={handleGoToMatch}
              className="w-full bg-cyan-electric text-black py-5 rounded-[2rem] font-black uppercase text-sm flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(0,242,255,0.3)] animate-bounce"
            >
              <Play fill="black" size={20} /> IR PARA A QUADRA
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamsPage;
