import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { supabase, TABLES } from '../services/supabase';

const RankingsPage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();
  const [period, setPeriod] = useState('month'); // 'month' ou 'year'
  const [rankings, setRankings] = useState({
    goals: [],
    assists: []
  });
  const [loading, setLoading] = useState(true);

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

      // Ranking de gols
      const { data: goalsData } = await supabase
        .from(TABLES.PLAYERS)
        .select('name, position, ' + goalField)
        .eq('baba_id', currentBaba.id)
        .order(goalField, { ascending: false })
        .limit(10);

      // Ranking de assistências
      const { data: assistsData } = await supabase
        .from(TABLES.PLAYERS)
        .select('name, position, ' + assistField)
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
      default: return 'text-cyan-electric';
    }
  };

  const getMedalIcon = (position) => {
    if (position < 3) return 'fa-medal';
    return 'fa-circle';
  };

  const exportPDF = () => {
    // Aqui você implementaria a exportação para PDF
    // Pode usar bibliotecas como jsPDF ou html2pdf
    alert('Função de exportação em desenvolvimento!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-4xl text-cyan-electric"></i>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/home')}
            className="text-cyan-electric hover:text-white transition-colors"
          >
            <i className="fas fa-arrow-left text-xl mr-3"></i>
            {currentBaba?.name}
          </button>
          
          <button
            onClick={exportPDF}
            className="text-green-neon hover:text-white transition-colors"
          >
            <i className="fas fa-file-pdf text-xl"></i>
          </button>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-center mb-8 text-cyan-electric">
          <i className="fas fa-trophy mr-3"></i>
          RANKINGS
        </h1>

        {/* Period Toggle */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setPeriod('month')}
            className={period === 'month' ? 'btn-primary flex-1' : 'btn-visitor flex-1'}
          >
            MENSAL
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={period === 'year' ? 'btn-primary flex-1' : 'btn-visitor flex-1'}
          >
            ANUAL
          </button>
        </div>

        {/* Goals Ranking */}
        <div className="card-glass p-6 mb-6 animate-slide-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-cyan-electric">
              <i className="fas fa-futbol mr-2"></i>
              ARTILHARIA
            </h2>
            <span className="text-xs opacity-40 uppercase">
              {period === 'month' ? 'Este mês' : 'Este ano'}
            </span>
          </div>

          {rankings.goals.length > 0 ? (
            <div className="space-y-2">
              {rankings.goals.map((player, index) => {
                const goals = period === 'month' ? player.total_goals_month : player.total_goals_year;
                
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <i 
                        className={`fas ${getMedalIcon(index)} ${getMedalColor(index)} text-xl`}
                      ></i>
                      <div>
                        <p className="font-bold">{player.name}</p>
                        <p className="text-xs opacity-60">
                          {player.position === 'goleiro' ? 'Goleiro' : 'Linha'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-3xl font-bold text-cyan-electric">
                        {goals}
                      </p>
                      <p className="text-xs opacity-40">gols</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center opacity-40 py-8">
              Nenhum gol registrado ainda
            </p>
          )}
        </div>

        {/* Assists Ranking */}
        <div className="card-glass p-6 animate-slide-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-green-neon">
              <i className="fas fa-hands-helping mr-2"></i>
              ASSISTÊNCIAS
            </h2>
            <span className="text-xs opacity-40 uppercase">
              {period === 'month' ? 'Este mês' : 'Este ano'}
            </span>
          </div>

          {rankings.assists.length > 0 ? (
            <div className="space-y-2">
              {rankings.assists.map((player, index) => {
                const assists = period === 'month' ? player.total_assists_month : player.total_assists_year;
                
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <i 
                        className={`fas ${getMedalIcon(index)} ${getMedalColor(index)} text-xl`}
                      ></i>
                      <div>
                        <p className="font-bold">{player.name}</p>
                        <p className="text-xs opacity-60">
                          {player.position === 'goleiro' ? 'Goleiro' : 'Linha'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-3xl font-bold text-green-neon">
                        {assists}
                      </p>
                      <p className="text-xs opacity-40">assists</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center opacity-40 py-8">
              Nenhuma assistência registrada ainda
            </p>
          )}
        </div>

        {/* Info */}
        <div className="mt-8 text-center text-xs opacity-40">
          <p>
            {period === 'month' 
              ? 'Rankings resetam automaticamente todo dia 1º do mês'
              : 'Rankings resetam automaticamente todo dia 1º de janeiro'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RankingsPage;
