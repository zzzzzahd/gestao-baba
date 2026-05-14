// src/pages/RankingsPage.jsx
// Sprint 12: botão de perfil público na lista de ranking + animação de badges

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBaba } from '../contexts/BabaContext';
import { supabase } from '../services/supabase';
import { ArrowLeft, Trophy, Target, Award, ChevronDown, Share2, ExternalLink, Users } from 'lucide-react';
import { PodiumSkeleton, RankingRowSkeleton } from '../components/SkeletonLoader';
import { toastErrorWithRetry } from '../utils/toastUtils.jsx';
import ShareableCardModal from '../components/ShareableCardModal';

// ─── Pódio ────────────────────────────────────────────────────────────────────

const PodiumStep = ({ player, position, statValue, statUnit, isMe, onPlayerClick }) => {
  const configs = {
    1: { height: 'h-24', label: '🥇', labelColor: 'text-yellow-400', ring: 'ring-yellow-400/60', fontSize: 'text-4xl' },
    2: { height: 'h-16', label: '🥈', labelColor: 'text-gray-300',   ring: 'ring-gray-300/40',   fontSize: 'text-3xl' },
    3: { height: 'h-10', label: '🥉', labelColor: 'text-orange-500', ring: 'ring-orange-500/40', fontSize: 'text-2xl' },
  };
  const c = configs[position];

  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <button
        onClick={() => onPlayerClick?.(player)}
        className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
      >
        <div className={`relative ${position === 1 ? 'w-16 h-16' : position === 2 ? 'w-14 h-14' : 'w-12 h-12'}`}>
          <div className={`w-full h-full rounded-full ring-2 ${c.ring} overflow-hidden bg-surface-3 flex items-center justify-center ${isMe ? 'ring-cyan-electric' : ''}`}>
            {player.avatar_url ? (
              <img src={player.avatar_url} className="w-full h-full object-cover" alt={player.name} />
            ) : (
              <span className={`font-black text-white ${position === 1 ? 'text-xl' : 'text-base'}`}>
                {(player.name || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span className="absolute -bottom-1 -right-1 text-sm leading-none">{c.label}</span>
        </div>
        <div className="text-center max-w-[80px]">
          <p className={`text-[10px] font-black uppercase truncate ${isMe ? 'text-cyan-electric' : 'text-white'}`}>
            {player.name}
          </p>
          {isMe && <p className="text-[8px] text-cyan-electric/60 font-black uppercase">Você</p>}
        </div>
        <p className={`font-black ${c.fontSize} ${c.labelColor} leading-none`}>{statValue}</p>
        <p className="text-[8px] text-text-low font-black uppercase">{statUnit}</p>
      </button>
      <div className={`w-full ${c.height} rounded-t-xl flex items-end justify-center pb-2 border-t border-border-mid ${
        position === 1 ? 'bg-yellow-400/10' : position === 2 ? 'bg-surface-2' : 'bg-surface-1'
      }`}>
        <span className={`text-xs font-black ${c.labelColor}`}>{position}º</span>
      </div>
    </div>
  );
};

const Podium = ({ top3, getStatValue, myPlayerId, onPlayerClick }) => {
  if (top3.length < 1) return null;
  const order = [
    top3[1] ? { player: top3[1], position: 2 } : null,
    top3[0] ? { player: top3[0], position: 1 } : null,
    top3[2] ? { player: top3[2], position: 3 } : null,
  ].filter(Boolean);

  return (
    <div className="flex items-end justify-center gap-3 pt-4 pb-2 px-2">
      {order.map(({ player, position }) => {
        const { value, unit } = getStatValue(player);
        return (
          <PodiumStep
            key={player.id}
            player={player}
            position={position}
            statValue={value}
            statUnit={unit}
            isMe={player.id === myPlayerId}
            onPlayerClick={onPlayerClick}
          />
        );
      })}
    </div>
  );
};

// ─── Footer fixo ──────────────────────────────────────────────────────────────

const MyPositionFooter = ({ position, total, statValue, statUnit }) => (
  <div className="fixed bottom-[96px] left-0 right-0 z-40 flex justify-center pointer-events-none">
    <div className="mx-5 w-full max-w-xl pointer-events-auto">
      <div className="flex items-center justify-between px-5 py-3 rounded-2xl bg-black/90 border border-cyan-electric/20 backdrop-blur-md shadow-lg shadow-cyan-electric/10">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-text-low uppercase tracking-widest">Sua posição</span>
          <span className="text-lg font-black text-cyan-electric">#{position}</span>
          <span className="text-[9px] text-text-muted font-black uppercase">de {total}</span>
        </div>
        <div className="text-right">
          <span className="text-lg font-black text-white">{statValue}</span>
          <span className="text-[9px] text-text-low font-black uppercase ml-1">{statUnit}</span>
        </div>
      </div>
    </div>
  </div>
);

// ─── Rankings Page ────────────────────────────────────────────────────────────

const RankingsPage = () => {
  const navigate = useNavigate();
  const { user }                                          = useAuth();
  const { currentBaba, players, myBabas, setCurrentBaba } = useBaba();

  const [activeTab,    setActiveTab]    = useState('artilheiros');
  const [period,       setPeriod]       = useState('all');
  const [rankings,     setRankings]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  // Sprint 12: share card
  const [showShare,    setShowShare]    = useState(false);

  const myPlayer = useMemo(
    () => (players || []).find(p => p.user_id === user?.id) || null,
    [players, user?.id]
  );

  const loadRankings = useCallback(async () => {
    if (!currentBaba?.id) return;
    try {
      setLoading(true);

      // ── Aba: Fair-play via RPC ──────────────────────────────────────────────
      if (activeTab === 'fairplay') {
        const { data, error } = await supabase.rpc('get_fairplay_ranking', {
          p_baba_id: currentBaba.id,
          p_limit:   10,
        });
        if (error) throw error;
        setRankings((data || []).map(p => ({
          id:           p.player_id,
          name:         p.player_name,
          avatar_url:   p.avatar_url,
          assists:      p.assists,
          yellow_cards: p.yellow_cards,
          red_cards:    p.red_cards,
          total:        p.fairplay_pts,
        })));
        return;
      }

      // ── Aba: Artilheiro do mês via RPC ─────────────────────────────────────
      if (activeTab === 'mes') {
        const now   = new Date();
        const { data, error } = await supabase.rpc('get_monthly_top_scorer', {
          p_baba_id: currentBaba.id,
          p_year:    now.getFullYear(),
          p_month:   now.getMonth() + 1,
        });
        if (error) throw error;
        setRankings((data || []).map(p => ({
          id:         p.player_id,
          name:       p.player_name,
          avatar_url: p.avatar_url,
          goals:      Number(p.goals),
          assists:    Number(p.assists),
          matches:    Number(p.matches),
          total:      Number(p.goals),
        })));
        return;
      }

      // ── Abas: Artilheiros / Garçons / MVPs ─────────────────────────────────
      let dateFilter = null;
      if (period === '7days') {
        const d = new Date(); d.setDate(d.getDate() - 7);
        dateFilter = d.toISOString().split('T')[0];
      } else if (period === '30days') {
        const d = new Date(); d.setDate(d.getDate() - 30);
        dateFilter = d.toISOString().split('T')[0];
      }

      let query = supabase
        .from('match_players')
        .select(`
          player_id,
          goals,
          assists,
          player:players!inner(name, position, user_id, profile:profiles(avatar_url)),
          match:matches!inner(match_date, baba_id)
        `)
        .eq('match.baba_id', currentBaba.id);

      if (dateFilter) query = query.gte('match.match_date', dateFilter);

      const { data, error } = await query;
      if (error) throw error;

      const statsMap = {};
      (data || []).forEach(mp => {
        const id = mp.player_id;
        if (!statsMap[id]) {
          statsMap[id] = {
            id,
            name:       mp.player.name                || 'Jogador',
            position:   mp.player.position            || 'linha',
            avatar_url: mp.player.profile?.avatar_url || null,
            user_id:    mp.player.user_id             || null,
            goals: 0, assists: 0, matches: 0,
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
        arr = arr.map(p => ({ ...p, total: p.goals + p.assists }))
          .filter(p => p.total > 0).sort((a, b) => b.total - a.total);
      }

      setRankings(arr.slice(0, 10));
    } catch (err) {
      console.error('[loadRankings]', err);
      toastErrorWithRetry('Erro ao carregar rankings', loadRankings);
    } finally {
      setLoading(false);
    }
  }, [currentBaba?.id, activeTab, period]);

  useEffect(() => { loadRankings(); }, [loadRankings]);

  const TABS = [
    { id: 'artilheiros', icon: Trophy, label: 'Gols'      },
    { id: 'garcons',     icon: Target, label: 'Assist'    },
    { id: 'mvps',        icon: Award,  label: 'MVP'       },
    { id: 'mes',         icon: Trophy, label: 'Mês'       },
    { id: 'fairplay',    icon: Award,  label: 'Fair-Play' },
  ];

  const getStatValue = useCallback((player) => {
    if (activeTab === 'artilheiros') return { value: player.goals,   unit: 'gols'   };
    if (activeTab === 'garcons')     return { value: player.assists, unit: 'assists' };
    if (activeTab === 'mes')         return { value: player.goals,   unit: 'gols/mês' };
    if (activeTab === 'fairplay')    return { value: player.total,   unit: 'pts'    };
    return                                  { value: player.total,   unit: 'G+A'    };
  }, [activeTab]);

  const getMedalColor = (i) => {
    if (i === 0) return 'text-yellow-400';
    if (i === 1) return 'text-gray-300';
    if (i === 2) return 'text-orange-500';
    return 'text-text-low';
  };

  // Sprint 12: navegar para perfil público do jogador
  const handlePlayerClick = (player) => {
    if (player?.user_id) navigate(`/player/${player.user_id}`);
  };

  const top3      = rankings.slice(0, 3);
  const listFrom4 = rankings.slice(3);

  const myRankIndex = myPlayer ? rankings.findIndex(p => p.id === myPlayer.id) : -1;
  const myRankData  = myRankIndex >= 0 ? rankings[myRankIndex] : null;
  const showFooter  = myRankData !== null && rankings.length > 0;

  // Dados para o ShareableCardModal
  const shareData = rankings.map(p => ({
    id:         p.id,
    name:       p.name,
    avatar_url: p.avatar_url,
    count: activeTab === 'artilheiros' ? p.goals
         : activeTab === 'garcons'     ? p.assists
         : p.total,
  }));

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-40">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-surface-3 rounded-full transition-colors" aria-label="Voltar">
            <ArrowLeft size={24} />
          </button>
          <div className="text-center flex-1">
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Rankings</h1>
            {myBabas?.length > 1 ? (
              <div className="relative inline-block mt-0.5">
                <button
                  onClick={() => setShowSelector(s => !s)}
                  className="flex items-center gap-1 text-[9px] text-cyan-electric/70 font-black uppercase tracking-widest hover:text-cyan-electric transition-colors"
                >
                  {currentBaba?.name}
                  <ChevronDown size={10} className={`transition-transform ${showSelector ? 'rotate-180' : ''}`} />
                </button>
                {showSelector && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-48 bg-[#0a0a0a] border border-border-mid rounded-2xl overflow-hidden shadow-2xl">
                    {myBabas.map(b => (
                      <button
                        key={b.id}
                        onClick={() => { setCurrentBaba(b); setShowSelector(false); setRankings([]); }}
                        className={`w-full px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide transition-colors ${
                          b.id === currentBaba?.id
                            ? 'text-cyan-electric bg-cyan-electric/10'
                            : 'text-text-mid hover:text-white hover:bg-surface-2'
                        }`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : currentBaba?.name ? (
              <p className="text-[9px] text-cyan-electric/60 font-black uppercase tracking-widest mt-0.5">
                {currentBaba.name}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            {/* Comparação 1v1 */}
            <button
              onClick={() => navigate('/comparison')}
              aria-label="Comparar jogadores 1v1"
              title="Comparar jogadores"
              className="p-2 hover:bg-surface-3 rounded-full transition-colors"
            >
              <Users size={20} className="text-text-low" />
            </button>
            {/* Sprint 12: botão compartilhar */}
            <button
              onClick={() => setShowShare(true)}
              disabled={!rankings.length}
              className="p-2 hover:bg-surface-3 rounded-full transition-colors disabled:opacity-30"
              aria-label="Compartilhar ranking"
            >
              <Share2 size={20} className="text-cyan-electric" />
            </button>
          </div>
        </div>

        {/* Filtro de período */}
        <div className="flex gap-2 p-1 bg-surface-2 rounded-xl border border-border-mid">
          {[
            { id: 'all',    label: 'Tudo'    },
            { id: '7days',  label: '7 Dias'  },
            { id: '30days', label: '30 Dias' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${
                period === p.id
                  ? 'bg-cyan-electric text-black shadow-lg shadow-cyan-500/20'
                  : 'text-text-low'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center ${
                activeTab === tab.id
                  ? 'border-cyan-electric/30 bg-cyan-electric/5'
                  : 'border-border-mid bg-transparent'
              }`}
            >
              <tab.icon
                className="mb-2 text-cyan-electric"
                size={22}
                fill={activeTab === tab.id ? 'currentColor' : 'none'}
              />
              <p className="text-[10px] font-black uppercase">{tab.label}</p>
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        {loading ? (
          <>
            <PodiumSkeleton />
            <RankingRowSkeleton count={4} />
          </>
        ) : rankings.length > 0 ? (
          <>
            <Podium
              top3={top3}
              getStatValue={getStatValue}
              myPlayerId={myPlayer?.id}
              onPlayerClick={handlePlayerClick}
            />

            {listFrom4.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="h-px bg-surface-2 mb-3" />
                {listFrom4.map((player, i) => {
                  const { value, unit } = getStatValue(player);
                  const absIndex        = i + 3;
                  const isMe            = player.id === myPlayer?.id;

                  return (
                    <div
                      key={player.id}
                      className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${
                        isMe
                          ? 'border-cyan-electric/30 bg-cyan-electric/5'
                          : 'border-border-subtle bg-surface-1 hover:border-border-mid'
                      }`}
                    >
                      <span className={`text-lg font-black min-w-[32px] text-center ${getMedalColor(absIndex)}`}>
                        {absIndex + 1}º
                      </span>

                      <div className="w-9 h-9 rounded-full bg-surface-3 overflow-hidden flex items-center justify-center shrink-0">
                        {player.avatar_url ? (
                          <img src={player.avatar_url} className="w-full h-full object-cover" alt={player.name} />
                        ) : (
                          <span className="text-[11px] font-black text-white">
                            {(player.name || '?').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-black uppercase tracking-tight truncate ${isMe ? 'text-cyan-electric' : ''}`}>
                          {player.name}{isMe && <span className="text-[9px] ml-1 opacity-60">• Você</span>}
                        </p>
                        <p className="text-[9px] text-text-low font-bold uppercase">{player.position}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className={`text-2xl font-black ${isMe ? 'text-cyan-electric' : 'text-white'}`}>
                            {value}
                          </p>
                          <p className="text-[9px] text-text-low font-bold uppercase">{unit}</p>
                        </div>
                        {/* Sprint 12: link perfil público */}
                        {player.user_id && (
                          <button
                            onClick={() => handlePlayerClick(player)}
                            className="p-2 bg-surface-2 rounded-xl text-text-muted hover:text-cyan-electric hover:bg-cyan-electric/10 transition-all"
                          >
                            <ExternalLink size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-14 border border-dashed border-border-mid rounded-3xl space-y-4 px-6">
            <div className="w-16 h-16 rounded-[1.5rem] bg-cyan-electric/10 border border-cyan-electric/20 flex items-center justify-center mx-auto">
              <Trophy size={28} className="text-cyan-electric/50" />
            </div>
            <p className="text-text-low font-black uppercase text-sm">Sem dados de ranking</p>
            <p className="text-text-muted text-[10px] mt-1 font-bold leading-relaxed">
              Joga o primeiro baba pra começar a contagem!
            </p>
          </div>
        )}
      </div>

      {showFooter && (() => {
        const { value, unit } = getStatValue(myRankData);
        return (
          <MyPositionFooter
            position={myRankIndex + 1}
            total={rankings.length}
            statValue={value}
            statUnit={unit}
          />
        );
      })()}

      {/* Sprint 12: ShareableCardModal */}
      <ShareableCardModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        rankingType={activeTab === 'artilheiros' ? 'gols' : activeTab === 'garcons' ? 'assistencias' : 'mvp'}
        rankingData={shareData}
        babaName={currentBaba?.name || 'Baba'}
        babaLogo={currentBaba?.logo_url}
      />
    </div>
  );
};

export default RankingsPage;
