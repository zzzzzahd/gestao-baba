// src/pages/dashboard/TabPostGame.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Aba "Pós-jogo" do Dashboard. Fase 3.
// Conteúdo: acesso a histórico, rankings, últimos MVPs/destaques.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Calendar, ChevronRight, Star, Target, Zap } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { MatchCardSkeleton } from '../../components/SkeletonLoader';

// ─── Últimas partidas compactas ───────────────────────────────────────────────

const RecentMatchCard = ({ match }) => {
  const date = match.match_date
    ? new Date(match.match_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : '—';
  const isFinished = match.status === 'finished';
  const scoreA     = match.team_a_score ?? '—';
  const scoreB     = match.team_b_score ?? '—';

  return (
    <div className="flex items-center gap-4 p-4 bg-surface-1 rounded-2xl border border-border-subtle">
      <div className="text-center shrink-0">
        <p className="text-[10px] font-black text-text-muted uppercase">{date}</p>
        {isFinished && (
          <span className="text-[8px] font-black text-green-500 uppercase">Finalizado</span>
        )}
      </div>
      <div className="flex-1 flex items-center justify-between">
        <p className="text-[11px] font-black uppercase truncate max-w-[80px]">
          {match.team_a_name || 'Time A'}
        </p>
        <div className="flex items-center gap-2 mx-2 shrink-0">
          <span className="text-lg font-black tabular-nums text-white">{scoreA}</span>
          <span className="text-text-muted font-black">×</span>
          <span className="text-lg font-black tabular-nums text-white">{scoreB}</span>
        </div>
        <p className="text-[11px] font-black uppercase truncate max-w-[80px] text-right">
          {match.team_b_name || 'Time B'}
        </p>
      </div>
    </div>
  );
};

// ─── Top jogadores compactos ──────────────────────────────────────────────────

const TopPlayerCard = ({ player, rank, label, icon }) => (
  <div className="flex items-center gap-3 p-3 bg-surface-1 rounded-2xl border border-border-subtle">
    <div className="w-7 h-7 rounded-xl bg-cyan-electric/10 border border-cyan-electric/20 flex items-center justify-center shrink-0">
      <span className="text-[10px] font-black text-cyan-electric tabular-nums">#{rank}</span>
    </div>
    <div className="w-8 h-8 rounded-full bg-surface-3 border border-border-mid flex items-center justify-center shrink-0 text-[11px] font-black overflow-hidden">
      {player.avatar_url
        ? <img src={player.avatar_url} className="w-full h-full object-cover" alt="" />
        : (player.display_name || '?').charAt(0).toUpperCase()}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-black uppercase truncate">{player.display_name || 'Jogador'}</p>
      <p className="text-[9px] text-text-muted font-bold uppercase">{label}</p>
    </div>
    <div className="flex items-center gap-1 shrink-0">
      {icon}
      <span className="text-sm font-black tabular-nums text-cyan-electric">{player.value}</span>
    </div>
  </div>
);

// ─── Componente principal ─────────────────────────────────────────────────────

const TabPostGame = ({ currentBaba, players }) => {
  const navigate = useNavigate();
  const [matches,    setMatches]    = useState([]);
  const [topScorers, setTopScorers] = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!currentBaba?.id) return;
    let cancelled = false;

    const load = async () => {
      try {
        // Últimas 3 partidas
        const { data: matchData } = await supabase
          .from('matches').select('*')
          .eq('baba_id', currentBaba.id)
          .eq('status', 'finished')
          .order('match_date', { ascending: false })
          .limit(3);

        // Top 3 artilheiros (acumulado)
        const { data: statsData } = await supabase
          .from('match_players')
          .select('player_id, goals, assists')
          .in('match_id',
            (await supabase.from('matches').select('id').eq('baba_id', currentBaba.id)).data?.map(m => m.id) || []
          );

        if (!cancelled) {
          setMatches(matchData || []);

          // Agregar por jogador
          const agg = {};
          (statsData || []).forEach(s => {
            if (!agg[s.player_id]) agg[s.player_id] = { goals: 0, assists: 0 };
            agg[s.player_id].goals   += s.goals   || 0;
            agg[s.player_id].assists += s.assists  || 0;
          });

          const scorers = Object.entries(agg)
            .map(([id, stats]) => {
              const p = players?.find(pl => pl.id === id);
              return p ? { ...p, value: stats.goals, assists: stats.assists } : null;
            })
            .filter(Boolean)
            .sort((a, b) => b.value - a.value)
            .slice(0, 3);

          setTopScorers(scorers);
        }
      } catch (err) {
        console.error('[TabPostGame]', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [currentBaba?.id, players]);

  return (
    <div className="space-y-6">

      {/* Últimas partidas */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Últimas partidas</p>
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-1 text-[9px] font-black text-cyan-electric uppercase hover:text-white transition-colors"
          >
            Ver tudo <ChevronRight size={10} />
          </button>
        </div>

        {loading ? (
          <MatchCardSkeleton count={2} />
        ) : matches.length > 0 ? (
          <div className="space-y-2">
            {matches.map(m => <RecentMatchCard key={m.id} match={m} />)}
          </div>
        ) : (
          <div
            onClick={() => navigate('/history')}
            className="p-8 rounded-3xl bg-surface-1 border border-dashed border-border-mid flex flex-col items-center gap-3 cursor-pointer hover:bg-surface-2 transition-all"
          >
            <Calendar size={28} className="text-text-muted" />
            <p className="text-[11px] font-black text-text-low uppercase tracking-widest">
              Nenhuma partida ainda
            </p>
            <p className="text-[9px] text-text-muted font-bold">Jogue e volte aqui para ver o histórico</p>
          </div>
        )}
      </section>

      {/* Rankings */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Top artilheiros</p>
          <button
            onClick={() => navigate('/rankings')}
            className="flex items-center gap-1 text-[9px] font-black text-cyan-electric uppercase hover:text-white transition-colors"
          >
            Rankings <ChevronRight size={10} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 rounded-2xl bg-surface-1 animate-pulse" />
            ))}
          </div>
        ) : topScorers.length > 0 ? (
          <div className="space-y-2">
            {topScorers.map((p, i) => (
              <TopPlayerCard
                key={p.id}
                player={p}
                rank={i + 1}
                label={`${p.value} gol${p.value !== 1 ? 's' : ''}`}
                icon={<Zap size={13} className="text-cyan-electric" />}
              />
            ))}
          </div>
        ) : (
          <div
            onClick={() => navigate('/rankings')}
            className="p-8 rounded-3xl bg-surface-1 border border-dashed border-border-mid flex flex-col items-center gap-3 cursor-pointer hover:bg-surface-2 transition-all"
          >
            <Trophy size={28} className="text-text-muted" />
            <p className="text-[11px] font-black text-text-low uppercase tracking-widest">Sem dados de ranking</p>
            <p className="text-[9px] text-text-muted font-bold">Registre gols nas partidas para gerar o ranking</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default TabPostGame;
