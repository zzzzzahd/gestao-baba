import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { supabase } from '../services/supabase';
import { ArrowLeft, Trophy, Target, UserPlus, Award, Calendar, Star, Activity, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

const RankingsPage = () => {
  const navigate = useNavigate();
  const { currentBaba, getAllRatings } = useBaba();

  // ATUALIZADO: Adicionado 'nivel' como aba ativa
  const [activeTab, setActiveTab] = useState('artilheiros'); 
  const [period, setPeriod] = useState('all'); 
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

      // --- LÓGICA PARA A NOVA ABA DE NÍVEL (RATING) ---
      if (activeTab === 'nivel') {
        const ratingData = await getAllRatings();
        // O rating é histórico (total), ignore o filtro de período para nível por enquanto
        // ou aplique lógica similar se houver data na view.
        const sorted = ratingData
          .sort((a, b) => b.overall - a.overall)
          .slice(0, 10);
        setRankings(sorted);
        return;
      }

      // --- LÓGICA ORIGINAL (ARTILHEIROS, GARÇONS, MVPS) ---
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
          player:players(name, position, avatar_url),
          match:matches(match_date, baba_id)
        `)
        .eq('match.baba_id', currentBaba.id);

      if (dateFilter) {
        query = query.gte('match.match_date', dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const playerStats = {};
      data.forEach(mp => {
        if (!mp.player) return;
        if (!playerStats[mp.player_id]) {
          playerStats[mp.player_id] = {
            id: mp.player_id,
            name: mp.player.name,
            position: mp.player.position,
            avatar_url: mp.player.avatar_url,
            goals: 0,
            assists: 0,
            matches: 0
          };
        }
        playerStats[mp.player_id].goals += mp.goals || 0;
        playerStats[mp.player_id].assists += mp.assists || 0;
        playerStats[mp.player_id].matches += 1;
      });

      let rankingsArray = Object.values(playerStats);

      if (activeTab === 'artilheiros') {
        rankingsArray = rankingsArray.filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals);
      } else if (activeTab === 'garcons') {
        rankingsArray = rankingsArray.filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists);
      } else if (activeTab === 'mvps') {
        rankingsArray = rankingsArray.map(p => ({ ...p, total: p.goals + p.assists })).filter(p => p.total > 0).sort((a, b) => b.total - a.total);
      }

      setRankings(rankingsArray.slice(0, 10));
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const getMedalColor = (position) => {
    if (position === 0) return 'text-yellow-500';
    if (position === 1) return 'text-gray-300';
    if (position === 2) return 'text-orange-600';
    return 'text-white/40';
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header (Mantido Original) */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-white/60 hover:text-white transition-all">
            <ArrowLeft size={20} />
            <span className="text-xs font-black uppercase">Voltar</span>
          </button>

          {activeTab !== 'nivel' && (
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
              {['7days', '30days', 'all'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                    period === p ? 'bg-cyan-electric text-black' : 'text-white/40 hover:text-white'
                  }`}
                >
                  {p === '7days' ? 'Semana' : p === '30days' ? 'Mês' : 'Tudo'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Título */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="text-cyan-electric" size={32} />
            <h1 className="text-3xl font-black uppercase italic">Rankings</h1>
          </div>
          <p className="text-sm text-white/60 uppercase tracking-widest">{currentBaba?.name}</p>
        </div>

        {/* Tabs (Agora com 4 opções) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <TabBtn 
            active={activeTab === 'artilheiros'} 
            onClick={() => setActiveTab('artilheiros')} 
            label="Artilheiros" 
            icon={<Target size={20} />} 
            color="cyan"
          />
          <TabBtn 
            active={activeTab === 'garcons'} 
            onClick={() => setActiveTab('garcons')} 
            label="Garçons" 
            icon={<UserPlus size={20} />} 
            color="green"
          />
          <TabBtn 
            active={activeTab === 'mvps'} 
            onClick={() => setActiveTab('mvps')} 
            label="MVPs" 
            icon={<Award size={20} />} 
            color="yellow"
          />
          <TabBtn 
            active={activeTab === 'nivel'} 
            onClick={() => setActiveTab('nivel')} 
            label="Nível (Rating)" 
            icon={<Star size={20} />} 
            color="purple"
          />
        </div>

        {/* Lista de Rankings */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {rankings.map((player, index) => (
              <div
                key={player.id || player.player_id}
                className={`card-glass p-5 rounded-2xl border ${
                  index < 3 ? 'border-cyan-electric/30 bg-cyan-electric/5' : 'border-white/5'
                } flex items-center gap-4`}
              >
                <div className="text-2xl font-black min-w-[3rem] text-center">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`}
                </div>

                <div className="flex-1">
                  <p className="text-sm font-black uppercase">{player.display_name || player.name}</p>
                  <p className="text-[9px] text-white/40 uppercase tracking-widest">{player.position}</p>
                </div>

                <div className="text-right">
                  {activeTab === 'nivel' ? (
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1 text-cyan-electric">
                        <Star size={14} fill="currentColor" />
                        <span className="text-2xl font-black">{Number(player.overall).toFixed(1)}</span>
                      </div>
                      <div className="flex gap-2 text-[8px] font-bold uppercase text-white/40">
                        <span>Téc: {Number(player.skill).toFixed(1)}</span>
                        <span>Fís: {Number(player.physical).toFixed(1)}</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className={`text-3xl font-black ${
                        activeTab === 'artilheiros' ? 'text-cyan-electric' : 
                        activeTab === 'garcons' ? 'text-green-500' : 'text-yellow-500'
                      }`}>
                        {activeTab === 'mvps' ? player.total : activeTab === 'artilheiros' ? player.goals : player.assists}
                      </p>
                      <p className="text-[9px] text-white/40 uppercase font-black">
                        {activeTab === 'mvps' ? 'G+A' : activeTab}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Componente de apoio para as Tabs
const TabBtn = ({ active, onClick, label, icon, color }) => {
  const colors = {
    cyan: 'border-cyan-electric text-cyan-electric bg-cyan-electric/10',
    green: 'border-green-500 text-green-500 bg-green-500/10',
    yellow: 'border-yellow-500 text-yellow-500 bg-yellow-500/10',
    purple: 'border-purple-500 text-purple-500 bg-purple-500/10'
  };

  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center ${
        active ? colors[color] : 'border-white/10 bg-white/5 hover:bg-white/10 text-white/40'
      }`}
    >
      {icon}
      <p className="text-[10px] font-black uppercase mt-1">{label}</p>
    </button>
  );
};

export default RankingsPage;
