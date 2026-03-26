import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { supabase } from '../services/supabase';
import { ArrowLeft, Trophy, Target, UserPlus, Award, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const RankingsPage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();

  const [activeTab, setActiveTab] = useState('artilheiros'); // artilheiros, garcons, mvps
  const [period, setPeriod] = useState('all'); // 7days, 30days, all
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentBaba) {
      loadRankings();
    }
  }, [currentBaba, activeTab, period]);

  const loadRankings = async () => {
    if (!currentBaba) return;

    try {
      setLoading(true);

      // Calcular data de início baseado no período
      let dateFilter = null;
      if (period === '7days') {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        dateFilter = date.toISOString().split('T')[0];
      } else if (period === '30days') {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        dateFilter = date.toISOString().split('T')[0];
      }

      let query = supabase
        .from('match_players')
        .select(`
          player_id,
          goals,
          assists,
          player:players(name, position),
          match:matches(match_date, baba_id)
        `)
        .eq('match.baba_id', currentBaba.id);

      if (dateFilter) {
        query = query.gte('match.match_date', dateFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Agregar stats por jogador
      const playerStats = {};
      
      data.forEach(mp => {
        if (!mp.player) return;
        
        if (!playerStats[mp.player_id]) {
          playerStats[mp.player_id] = {
            id: mp.player_id,
            name: mp.player.name,
            position: mp.player.position,
            goals: 0,
            assists: 0,
            matches: 0
          };
        }
        
        playerStats[mp.player_id].goals += mp.goals || 0;
        playerStats[mp.player_id].assists += mp.assists || 0;
        playerStats[mp.player_id].matches += 1;
      });

      // Converter para array e ordenar
      let rankingsArray = Object.values(playerStats);

      if (activeTab === 'artilheiros') {
        rankingsArray = rankingsArray
          .filter(p => p.goals > 0)
          .sort((a, b) => b.goals - a.goals)
          .slice(0, 10);
      } else if (activeTab === 'garcons') {
        rankingsArray = rankingsArray
          .filter(p => p.assists > 0)
          .sort((a, b) => b.assists - a.assists)
          .slice(0, 10);
      } else if (activeTab === 'mvps') {
        rankingsArray = rankingsArray
          .map(p => ({
            ...p,
            total: p.goals + p.assists
          }))
          .filter(p => p.total > 0)
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);
      }

      setRankings(rankingsArray);
    } catch (error) {
      console.error('Erro ao carregar rankings:', error);
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = () => {
    if (period === '7days') return 'Últimos 7 dias';
    if (period === '30days') return 'Últimos 30 dias';
    return 'Todo o período';
  };

  const getMedalColor = (position) => {
    if (position === 0) return 'text-yellow-500'; // Ouro
    if (position === 1) return 'text-gray-300'; // Prata
    if (position === 2) return 'text-orange-600'; // Bronze
    return 'text-white/40';
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-all"
          >
            <ArrowLeft size={20} />
            <span className="text-xs font-black uppercase">Voltar</span>
          </button>

          {/* Filtro de Período */}
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setPeriod('7days')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                period === '7days' 
                  ? 'bg-cyan-electric text-black' 
                  : 'text-white/40 hover:text-white'
              }`}
            >
              7d
            </button>
            <button
              onClick={() => setPeriod('30days')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                period === '30days' 
                  ? 'bg-cyan-electric text-black' 
                  : 'text-white/40 hover:text-white'
              }`}
            >
              30d
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                period === 'all' 
                  ? 'bg-cyan-electric text-black' 
                  : 'text-white/40 hover:text-white'
              }`}
            >
              Tudo
            </button>
          </div>
        </div>

        {/* Título */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="text-cyan-electric" size={32} />
            <h1 className="text-3xl font-black uppercase italic">Rankings</h1>
          </div>
          <p className="text-sm text-white/60 uppercase tracking-widest">
            {currentBaba?.name}
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-white/40">
            <Calendar size={14} />
            <span>{getPeriodLabel()}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setActiveTab('artilheiros')}
            className={`p-4 rounded-2xl border-2 transition-all ${
              activeTab === 'artilheiros'
                ? 'border-cyan-electric bg-cyan-electric/10'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            <Target className={`mx-auto mb-2 ${activeTab === 'artilheiros' ? 'text-cyan-electric' : 'text-white/40'}`} size={24} />
            <p className={`text-xs font-black uppercase ${activeTab === 'artilheiros' ? 'text-cyan-electric' : 'text-white/60'}`}>
              Artilheiros
            </p>
          </button>

          <button
            onClick={() => setActiveTab('garcons')}
            className={`p-4 rounded-2xl border-2 transition-all ${
              activeTab === 'garcons'
                ? 'border-green-500 bg-green-500/10'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            <UserPlus className={`mx-auto mb-2 ${activeTab === 'garcons' ? 'text-green-500' : 'text-white/40'}`} size={24} />
            <p className={`text-xs font-black uppercase ${activeTab === 'garcons' ? 'text-green-500' : 'text-white/60'}`}>
              Garçons
            </p>
          </button>

          <button
            onClick={() => setActiveTab('mvps')}
            className={`p-4 rounded-2xl border-2 transition-all ${
              activeTab === 'mvps'
                ? 'border-yellow-500 bg-yellow-500/10'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            <Award className={`mx-auto mb-2 ${activeTab === 'mvps' ? 'text-yellow-500' : 'text-white/40'}`} size={24} />
            <p className={`text-xs font-black uppercase ${activeTab === 'mvps' ? 'text-yellow-500' : 'text-white/60'}`}>
              MVPs
            </p>
          </button>
        </div>

        {/* Lista de Rankings */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Carregando...</p>
          </div>
        ) : rankings.length === 0 ? (
          <div className="card-glass p-12 rounded-3xl border border-white/10 text-center">
            <Trophy className="text-white/20 mx-auto mb-4" size={48} />
            <p className="text-sm font-black uppercase text-white/40">
              Nenhuma estatística encontrada
            </p>
            <p className="text-xs text-white/20 mt-2">
              Comece a registrar gols nas partidas!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rankings.map((player, index) => (
              <div
                key={player.id}
                className={`card-glass p-5 rounded-2xl border ${
                  index < 3 
                    ? 'border-cyan-electric/30 bg-cyan-electric/5' 
                    : 'border-white/5'
                } flex items-center gap-4`}
              >
                {/* Posição */}
                <div className="flex flex-col items-center min-w-[3rem]">
                  <span className={`text-2xl font-black ${getMedalColor(index)}`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`}
                  </span>
                </div>

                {/* Info do Jogador */}
                <div className="flex-1">
                  <p className="text-sm font-black uppercase">{player.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded ${
                      player.position === 'goleiro' 
                        ? 'bg-green-500/20 text-green-500' 
                        : 'bg-white/10 text-white/60'
                    }`}>
                      {player.position}
                    </span>
                    <span className="text-[9px] text-white/40">
                      {player.matches} {player.matches === 1 ? 'jogo' : 'jogos'}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right">
                  {activeTab === 'artilheiros' && (
                    <div>
                      <p className="text-3xl font-black text-cyan-electric">{player.goals}</p>
                      <p className="text-[9px] text-white/40 uppercase tracking-wider">gols</p>
                    </div>
                  )}
                  {activeTab === 'garcons' && (
                    <div>
                      <p className="text-3xl font-black text-green-500">{player.assists}</p>
                      <p className="text-[9px] text-white/40 uppercase tracking-wider">assists</p>
                    </div>
                  )}
                  {activeTab === 'mvps' && (
                    <div>
                      <p className="text-3xl font-black text-yellow-500">{player.total}</p>
                      <p className="text-[9px] text-white/40 uppercase tracking-wider">
                        {player.goals}G + {player.assists}A
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="text-center text-[10px] text-white/20 uppercase tracking-wider">
          <p>Estatísticas atualizadas em tempo real</p>
        </div>
      </div>
    </div>
  );
};

export default RankingsPage;
