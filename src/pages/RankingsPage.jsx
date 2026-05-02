import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { supabase } from '../services/supabase';
import { ArrowLeft, Trophy, Target, Award } from 'lucide-react';
// Star removido — aba Nível migrada para ProfilePage (Sprint D/F)
import toast from 'react-hot-toast';

const RankingsPage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();

  const [activeTab, setActiveTab] = useState('artilheiros');
  const [period,    setPeriod]    = useState('all');
  const [rankings,  setRankings]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  const loadRankings = useCallback(async () => {
    if (!currentBaba?.id) return;
    try {
      setLoading(true);

      let dateFilter = null;
      if (period === '7days') {
        const d = new Date(); d.setDate(d.getDate() - 7);
        dateFilter = d.toISOString().split('T')[0];
      } else if (period === '30days') {
        const d = new Date(); d.setDate(d.getDate() - 30);
        dateFilter = d.toISOString().split('T')[0];
      }

      // BUG-005 FIX: usar !inner para garantir que o filtro de baba_id funcione
      let query = supabase
        .from('match_players')
        .select(`
          player_id,
          goals,
          assists,
          player:players!inner(name, position),
          match:matches!inner(match_date, baba_id)
        `)
        .eq('match.baba_id', currentBaba.id);

      if (dateFilter) {
        query = query.gte('match.match_date', dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Agrega por jogador
      const statsMap = {};
      (data || []).forEach(mp => {
        const id = mp.player_id;
        if (!statsMap[id]) {
          statsMap[id] = {
            id,
            name:     mp.player.name     || 'Jogador',
            position: mp.player.position || 'linha',
            goals:   0,
            assists: 0,
            matches: 0,
          };
        }
        statsMap[id].goals   += mp.goals   || 0;
        statsMap[id].assists += mp.assists || 0;
        statsMap[id].matches += 1;
      });

      let arr = Object.values(statsMap);

      if (activeTab === 'artilheiros') {
        arr = arr.filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals);
      } else if (activeTab === 'garcons') {
        arr = arr.filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists);
      } else if (activeTab === 'mvps') {
        arr = arr
          .map(p => ({ ...p, total: p.goals + p.assists }))
          .filter(p => p.total > 0)
          .sort((a, b) => b.total - a.total);
      }

      setRankings(arr.slice(0, 10));
    } catch (err) {
      console.error('[loadRankings]', err);
      toast.error('Erro ao carregar rankings');
    } finally {
      setLoading(false);
    }
  }, [currentBaba?.id, activeTab, period]);
  // getAllRatings removido da dependência — aba Nível migrada para Perfil

  useEffect(() => { loadRankings(); }, [loadRankings]);

  const getMedalLabel = (i) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return `${i + 1}º`;
  };

  const getMedalColor = (i) => {
    if (i === 0) return 'text-yellow-500';
    if (i === 1) return 'text-gray-300';
    if (i === 2) return 'text-orange-600';
    return 'text-white/40';
  };

  // Aba "Nível" removida — era dado pessoal, vai para ProfilePage (Sprint D/F)
  // Todos os ícones agora em text-cyan-electric (consistência Sprint B)
  const TABS = [
    { id: 'artilheiros', icon: Trophy, label: 'Gols'   },
    { id: 'garcons',     icon: Target, label: 'Assist' },
    { id: 'mvps',        icon: Award,  label: 'MVP'    },
  ];

  const getStatValue = (player) => {
    if (activeTab === 'artilheiros') return { value: player.goals,   unit: 'gols'   };
    if (activeTab === 'garcons')     return { value: player.assists, unit: 'assists' };
    return                                  { value: player.total,   unit: 'G+A'    };
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-black uppercase italic tracking-tighter">Rankings</h1>
          <div className="w-10" />
        </div>

        {/* Filtro de período — chips menores e menos dominantes */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
          {[
            { id: 'all',    label: 'Tudo'   },
            { id: '7days',  label: '7 Dias' },
            { id: '30days', label: '30 Dias'},
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${
                period === p.id
                  ? 'bg-cyan-electric text-black shadow-lg shadow-cyan-500/20'
                  : 'text-white/40'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Tabs — todos os ícones em cyan-electric */}
        <div className="grid grid-cols-3 gap-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center ${
                activeTab === tab.id
                  ? 'border-cyan-electric/30 bg-cyan-electric/5'
                  : 'border-white/10 bg-transparent'
              }`}
            >
              <tab.icon
                className="mb-2 text-cyan-electric"
                size={24}
                fill={activeTab === tab.id ? 'currentColor' : 'none'}
              />
              <p className="text-[10px] font-black uppercase">{tab.label}</p>
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-electric" />
            </div>
          ) : rankings.length > 0 ? (
            rankings.map((player, index) => {
              const { value, unit } = getStatValue(player);
              return (
                <div
                  key={player.id || player.player_id}
                  className="p-5 rounded-2xl border border-white/5 bg-white/[0.03] flex items-center gap-4 hover:border-white/20 transition-all"
                >
                  <span className={`text-2xl font-black min-w-[32px] text-center ${getMedalColor(index)}`}>
                    {getMedalLabel(index)}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black uppercase tracking-tight truncate">{player.name}</p>
                    <p className="text-[9px] text-white/40 font-bold uppercase">{player.position}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-3xl font-black text-white">{value}</p>
                    <p className="text-[9px] text-white/40 font-bold uppercase">{unit}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
              <p className="text-white/20 font-black uppercase text-sm">Nenhum dado ainda</p>
              <p className="text-white/10 text-[10px] mt-2 uppercase">
                Joga o primeiro baba pra começar a contagem!
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default RankingsPage;
