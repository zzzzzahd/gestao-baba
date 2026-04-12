import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { supabase } from '../services/supabase';
import { ArrowLeft, Trophy, Target, Award, Star, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const RankingsPage = () => {
  const navigate = useNavigate();
  const { currentBaba, getAllRatings } = useBaba();

  const [activeTab, setActiveTab] = useState('artilheiros');
  const [period, setPeriod] = useState('all');
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentBaba?.id) {
      loadRankings();
    }
  }, [currentBaba, activeTab, period]);

  const loadRankings = async () => {
    try {
      setLoading(true);

      // --- ABA DE NÍVEL (RATING) ---
      // Usa a nova função do contexto que lê a VIEW do banco
      if (activeTab === 'nivel') {
        const data = await getAllRatings();
        // Ordena pelo overall_rating da View
        setRankings(data.sort((a, b) => b.overall_rating - a.overall_rating));
        setLoading(false);
        return;
      }

      // --- LÓGICA ORIGINAL DE GOLS, ASSISTÊNCIAS E MVP ---
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

      // Agregação manual (Sua lógica original preservada)
      const playerStats = {};
      data.forEach(mp => {
        if (!mp.player) return;
        const pId = mp.player_id;
        
        if (!playerStats[pId]) {
          playerStats[pId] = {
            id: pId,
            name: mp.player.name,
            position: mp.player.position,
            goals: 0,
            assists: 0,
            matches: 0
          };
        }
        playerStats[pId].goals += (mp.goals || 0);
        playerStats[pId].assists += (mp.assists || 0);
        playerStats[pId].matches += 1;
      });

      let rankingsArray = Object.values(playerStats);

      if (activeTab === 'artilheiros') {
        rankingsArray = rankingsArray
          .filter(p => p.goals > 0)
          .sort((a, b) => b.goals - a.goals);
      } else if (activeTab === 'garcons') {
        rankingsArray = rankingsArray
          .filter(p => p.assists > 0)
          .sort((a, b) => b.assists - a.assists);
      } else if (activeTab === 'mvps') {
        rankingsArray = rankingsArray
          .map(p => ({ ...p, total: p.goals + p.assists }))
          .filter(p => p.total > 0)
          .sort((a, b) => b.total - a.total);
      }

      setRankings(rankingsArray.slice(0, 10));
    } catch (error) {
      console.error('Erro ao carregar rankings:', error);
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const getMedalColor = (pos) => {
    if (pos === 0) return 'text-yellow-500';
    if (pos === 1) return 'text-gray-300';
    if (pos === 2) return 'text-orange-600';
    return 'text-white/40';
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-black uppercase italic tracking-tighter">Rankings</h1>
          <div className="w-10" />
        </div>

        {/* Filtro de Período (Aparece apenas se não for a aba Nível, que é Vitalícia) */}
        {activeTab !== 'nivel' && (
          <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
            {[
              { id: 'all', label: 'Tudo' },
              { id: '7days', label: '7 Dias' },
              { id: '30days', label: '30 Dias' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${
                  period === p.id ? 'bg-cyan-electric text-black shadow-lg shadow-cyan-500/20' : 'text-white/40'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Tabs Principais */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'artilheiros', icon: Trophy, label: 'Gols', color: 'text-yellow-500' },
            { id: 'garcons', icon: Target, label: 'Assists', color: 'text-blue-500' },
            { id: 'mvps', icon: Award, label: 'MVP', color: 'text-cyan-electric' },
            { id: 'nivel', icon: Star, label: 'Nível', color: 'text-purple-500' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center ${
                activeTab === tab.id 
                  ? `border-${tab.id === 'nivel' ? 'purple-500' : 'cyan-electric'} bg-white/5` 
                  : 'border-white/10 bg-transparent'
              }`}
            >
              <tab.icon className={`mb-2 ${tab.color}`} size={24} fill={activeTab === tab.id ? "currentColor" : "none"} />
              <p className="text-[10px] font-black uppercase">{tab.label}</p>
            </button>
          ))}
        </div>

        {/* Lista de Jogadores */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-electric"></div>
            </div>
          ) : rankings.length > 0 ? (
            rankings.map((player, index) => (
              <div 
                key={player.id || player.player_id} 
                className="card-glass p-5 rounded-2xl border border-white/5 flex items-center gap-4 transition-all hover:border-white/20"
              >
                <div className="flex flex-col items-center min-w-[30px]">
                  <span className={`text-2xl font-black ${getMedalColor(index)}`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`}
                  </span>
                </div>

                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-tight">{player.name}</p>
                  <p className="text-[9px] text-white/40 font-bold uppercase">{player.position}</p>
                </div>

                <div className="text-right">
                  {activeTab === 'nivel' ? (
                    <div className="flex flex-col items-end">
                      <p className="text-3xl font-black text-purple-500">
                        {Number(player.overall_rating || 0).toFixed(1)}
                      </p>
                      <div className="flex gap-2 text-[8px] font-bold text-white/30 uppercase">
                        <span>F:{Number(player.avg_physical || 0).toFixed(1)}</span>
                        <span>T:{Number(player.avg_skill || 0).toFixed(1)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <p className="text-3xl font-black text-white">
                        {activeTab === 'artilheiros' ? player.goals : activeTab === 'garcons' ? player.assists : player.total}
                      </p>
                      <p className="text-[9px] text-white/40 font-bold uppercase">
                        {activeTab === 'mvps' ? 'G+A' : activeTab}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
              <p className="text-white/20 font-black uppercase text-sm">Nenhum dado encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RankingsPage;
