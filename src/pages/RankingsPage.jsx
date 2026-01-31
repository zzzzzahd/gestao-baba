import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { supabase, TABLES } from '../services/supabase';
import ShareableCardModal from '../components/ShareableCardModal';

const RankingsPage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();
  const [period, setPeriod] = useState('month'); // 'month' ou 'year'
  const [rankings, setRankings] = useState({
    goals: [],
    assists: []
  });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!currentBaba) {
      navigate('/home');
      return;
    }
    loadRankings();
  }, [currentBaba, period]);

  const loadRankings = async () => {
    try {
      setLoading(true);
      const goalField = period === 'month' ? 'total_goals_month' : 'total_goals_year';
      const assistField = period === 'month' ? 'total_assists_month' : 'total_assists_year';

      const { data: goalsData } = await supabase
        .from(TABLES.PLAYERS)
        .select('name, position, avatar_url, ' + goalField)
        .eq('baba_id', currentBaba.id)
        .order(goalField, { ascending: false })
        .limit(10);

      const { data: assistsData } = await supabase
        .from(TABLES.PLAYERS)
        .select('name, position, avatar_url, ' + assistField)
        .eq('baba_id', currentBaba.id)
        .order(assistField, { ascending: false })
        .limit(10);

      setRankings({
        goals: goalsData || [],
        assists: assistsData || []
      });
    } catch (error) {
      console.error('Erro ao carregar rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalColor = (position) => {
    switch(position) {
      case 0: return 'text-yellow-400';
      case 1: return 'text-gray-300';
      case 2: return 'text-orange-600';
      default: return 'text-cyan-electric opacity-30';
    }
  };

  const getMedalIcon = (position) => {
    if (position < 3) return 'fa-medal';
    return 'fa-circle';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <i className="fas fa-spinner fa-spin text-4xl text-cyan-electric"></i>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5 bg-black text-white pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/home')} className="text-cyan-electric hover:text-white transition-colors">
            <i className="fas fa-arrow-left text-xl mr-3"></i>
            <span className="font-black italic uppercase tracking-tighter">{currentBaba?.name}</span>
          </button>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-cyan-electric/10 text-cyan-electric p-3 rounded-2xl border border-cyan-electric/20 flex items-center gap-2 hover:bg-cyan-electric hover:text-black transition-all"
          >
            <i className="fas fa-share-alt"></i>
            <span className="text-[10px] font-black italic">DIVULGAR</span>
          </button>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-black text-center mb-8 text-cyan-electric italic italic">
          <i className="fas fa-trophy mr-3"></i>
          RANKINGS
        </h1>

        {/* Period Toggle */}
        <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-2xl border border-white/10">
          <button
            onClick={() => setPeriod('month')}
            className={`flex-1 py-3 rounded-xl font-black italic text-xs transition-all ${period === 'month' ? 'bg-cyan-electric text-black shadow-lg shadow-cyan-electric/20' : 'opacity-40'}`}
          >
            MENSAL
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`flex-1 py-3 rounded-xl font-black italic text-xs transition-all ${period === 'year' ? 'bg-cyan-electric text-black shadow-lg shadow-cyan-electric/20' : 'opacity-40'}`}
          >
            ANUAL
          </button>
        </div>

        {/* Goals Ranking */}
        <div className="card-glass p-6 mb-6 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden relative">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-cyan-electric italic">
              <i className="fas fa-futbol mr-2"></i>
              ARTILHARIA
            </h2>
            <span className="text-[9px] font-black opacity-40 uppercase tracking-widest">
              {period === 'month' ? 'Mensal' : 'Anual'}
            </span>
          </div>

          <div className="space-y-3">
            {rankings.goals.map((player, index) => (
              <div key={index} className="flex items-center justify-between bg-white/5 p-4 rounded-3xl border border-white/5 hover:border-cyan-electric/30 transition-all group">
                <div className="flex items-center gap-4">
                  <i className={`fas ${getMedalIcon(index)} ${getMedalColor(index)} text-xl w-6 text-center`}></i>
                  <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-gray-900">
                    <img src={player.avatar_url || `https://ui-avatars.com/api/?name=${player.name}`} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-black italic uppercase text-sm">{player.name}</p>
                    <p className="text-[8px] font-bold text-cyan-electric opacity-50 uppercase">{player.position}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black italic text-cyan-electric">{period === 'month' ? player.total_goals_month : player.total_goals_year}</p>
                  <p className="text-[7px] font-black opacity-30 uppercase tracking-tighter">GOLS</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assists Ranking */}
        <div className="card-glass p-6 mb-24 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden relative">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-green-neon italic">
              <i className="fas fa-hands-helping mr-2"></i>
              ASSISTÊNCIAS
            </h2>
          </div>

          <div className="space-y-3">
            {rankings.assists.map((player, index) => (
              <div key={index} className="flex items-center justify-between bg-white/5 p-4 rounded-3xl border border-white/5 hover:border-green-neon/30 transition-all group">
                <div className="flex items-center gap-4">
                  <i className={`fas ${getMedalIcon(index)} ${getMedalColor(index)} text-xl w-6 text-center`}></i>
                  <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-gray-900">
                    <img src={player.avatar_url || `https://ui-avatars.com/api/?name=${player.name}`} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-black italic uppercase text-sm">{player.name}</p>
                    <p className="text-[8px] font-bold text-green-neon opacity-50 uppercase">{player.position}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black italic text-green-neon">{period === 'month' ? player.total_assists_month : player.total_assists_year}</p>
                  <p className="text-[7px] font-black opacity-30 uppercase tracking-tighter">ASSISTS</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL DE COMPARTILHAMENTO */}
      <ShareableCardModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        rankingType="Top Jogadores"
        rankingData={rankings.goals} // Enviamos os artilheiros como padrão para o card
        babaName={currentBaba?.name || "MEU BABA"}
      />
    </div>
  );
};

export default RankingsPage;
