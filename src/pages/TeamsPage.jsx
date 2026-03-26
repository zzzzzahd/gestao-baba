import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/MockAuthContext';
import { supabase } from '../services/supabase';
import { Trophy, Users, ArrowLeft, Play, Crown } from 'lucide-react';
import toast from 'react-hot-toast';

const TeamsPage = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { currentBaba } = useBaba();

  const [drawResult, setDrawResult] = useState(null);
  const [loading, setLoading] = useState(true);

  // Carregar resultado do sorteio de hoje
  useEffect(() => {
    const loadDrawResult = async () => {
      if (!currentBaba) return;

      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        
        console.log(`🔍 Buscando draw_result para baba: ${currentBaba.id}, data: ${today}`);
        
        const { data, error } = await supabase
          .from('draw_results')
          .select('*')
          .eq('baba_id', currentBaba.id)
          .eq('draw_date', today)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('❌ Erro ao buscar draw_result:', error);
          throw error;
        }
        
        if (data) {
          console.log('✅ Draw result encontrado:', data);
          console.log(`   - ${data.teams?.length || 0} times`);
          console.log(`   - ${data.reserves?.length || 0} reservas`);
          setDrawResult(data);
        } else {
          console.log('⚠️ Nenhum sorteio encontrado para hoje');
          toast.error('Nenhum sorteio encontrado');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error loading draw result:', error);
        toast.error('Erro ao carregar times sorteados');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadDrawResult();
  }, [currentBaba, navigate]);

  if (loading || !drawResult) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
          Carregando Times...
        </p>
      </div>
    );
  }

  const teams = drawResult.teams || [];
  const reserves = drawResult.reserves || [];
  const isPresident = currentBaba?.president_id === profile?.id;
  const totalPlayers = teams.reduce((sum, t) => sum + (t.players?.length || 0), 0);

  // Cores para os times
  const colors = [
    { border: 'border-cyan-electric/30', text: 'text-cyan-electric', bg: 'bg-cyan-electric/10' },
    { border: 'border-yellow-500/30', text: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { border: 'border-green-500/30', text: 'text-green-500', bg: 'bg-green-500/10' },
    { border: 'border-purple-500/30', text: 'text-purple-500', bg: 'bg-purple-500/10' },
    { border: 'border-pink-500/30', text: 'text-pink-500', bg: 'bg-pink-500/10' },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-all"
          >
            <ArrowLeft size={20} />
            <span className="text-xs font-black uppercase">Voltar</span>
          </button>

          {isPresident && (
            <button
              onClick={() => navigate('/match')}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-cyan-electric to-blue-600 text-black rounded-xl font-black uppercase text-sm shadow-[0_10px_30px_rgba(0,242,255,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Play size={20} />
              IR PRA QUADRA
            </button>
          )}
        </div>

        {/* Título */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="text-cyan-electric" size={32} />
            <h1 className="text-3xl font-black uppercase italic">Times Sorteados</h1>
          </div>
          <p className="text-sm text-white/60 uppercase tracking-widest">
            {currentBaba?.name}
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-white/40">
            <span>{teams.length} Times</span>
            <span>•</span>
            <span>{totalPlayers} Jogadores</span>
            {reserves.length > 0 && (
              <>
                <span>•</span>
                <span>{reserves.length} Reservas</span>
              </>
            )}
          </div>
        </div>

        {/* Grid de Times */}
        <div className={`grid gap-6 ${
          teams.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 
          teams.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {teams.map((team, index) => {
            const color = colors[index % colors.length];
            const teamPlayers = team.players || [];

            return (
              <div key={index} className={`card-glass p-6 rounded-[2rem] border-2 ${color.border}`}>
                {/* Header do Time */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-2xl font-black uppercase italic ${color.text}`}>
                    {team.name}
                  </h2>
                  <div className={`flex items-center gap-2 ${color.bg} px-3 py-1 rounded-xl`}>
                    <Users size={16} className={color.text} />
                    <span className={`text-sm font-black ${color.text}`}>
                      {teamPlayers.length}
                    </span>
                  </div>
                </div>

                {/* Jogadores */}
                <div className="space-y-3">
                  {teamPlayers.map((player, idx) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5"
                    >
                      <span className="text-lg font-black text-white/40 w-6">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-bold uppercase">{player.name}</p>
                        <p className="text-[9px] text-white/40 uppercase">
                          {player.position}
                        </p>
                      </div>
                      {player.position === 'goleiro' && (
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Reservas */}
        {reserves.length > 0 && (
          <div className="card-glass p-6 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Users className="text-white/40" size={20} />
              <h3 className="text-sm font-black uppercase tracking-widest text-white/60">
                Jogadores Reservas ({reserves.length})
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {reserves.map((player, idx) => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5"
                >
                  <span className="text-xs font-black text-white/20">R{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{player.name}</p>
                    <p className="text-[8px] text-white/40 uppercase">{player.position}</p>
                  </div>
                  {player.position === 'goleiro' && (
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info adicional */}
        <div className="card-glass p-4 rounded-2xl text-center">
          <p className="text-xs text-white/60">
            Horário: <span className="text-white font-black">{currentBaba?.game_time || '--:--'}</span>
          </p>
          <p className="text-[9px] text-white/40 mt-1">
            Sorteio automático baseado nas confirmações de presença
          </p>
        </div>

        {/* Botão IR PRA QUADRA (mobile) */}
        {isPresident && (
          <button
            onClick={() => navigate('/match')}
            className="w-full md:hidden py-5 rounded-2xl bg-gradient-to-r from-cyan-electric to-blue-600 text-black font-black uppercase text-sm shadow-[0_10px_30px_rgba(0,242,255,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Play size={20} />
            IR PRA QUADRA
          </button>
        )}
      </div>
    </div>
  );
};

export default TeamsPage;
