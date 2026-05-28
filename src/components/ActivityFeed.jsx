// src/components/ActivityFeed.jsx
// Feed de atividades do baba — gols, vitórias, novos membros.
// Integrado na TabOverview (visível para todos os membros).

import React, { useEffect, useState, useCallback } from 'react';
import { Zap, Trophy, UserPlus, Target, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';

const TYPE_CONFIG = {
  goal:    { icon: Zap,      color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', label: 'Gol'       },
  win:     { icon: Trophy,   color: 'text-cyan-electric', bg: 'bg-cyan-electric/10 border-cyan-electric/20', label: 'Vitória' },
  join:    { icon: UserPlus, color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/20',  label: 'Novo membro' },
  assist:  { icon: Target,   color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20', label: 'Assistência' },
};

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const min  = Math.floor(diff / 60000);
  const h    = Math.floor(min / 60);
  const d    = Math.floor(h / 24);
  if (d > 0)   return `${d}d atrás`;
  if (h > 0)   return `${h}h atrás`;
  if (min > 0) return `${min}min atrás`;
  return 'agora';
};

export default function ActivityFeed({ babaId, limit = 10 }) {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!babaId) return;
    setLoading(true);
    try {
      // Busca gols recentes com nome do jogador
      const { data: goals } = await supabase
        .from('match_players')
        .select(`
          goals, assists, created_at,
          player:players(name),
          match:matches!inner(baba_id, match_date, team_a_name, team_b_name, winner_team, status)
        `)
        .eq('match.baba_id', babaId)
        .eq('match.status', 'finished')
        .gt('goals', 0)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Busca novos membros recentes
      const { data: joins } = await supabase
        .from('players')
        .select('name, joined_at')
        .eq('baba_id', babaId)
        .order('joined_at', { ascending: false })
        .limit(5);

      const items = [];

      (goals || []).forEach(g => {
        if (g.goals > 0) {
          items.push({
            id:   `goal-${g.player?.name}-${g.created_at}`,
            type: 'goal',
            text: `${g.player?.name || 'Jogador'} marcou ${g.goals} gol${g.goals > 1 ? 's' : ''}`,
            date: g.match?.match_date || g.created_at,
          });
        }
        if (g.assists > 0) {
          items.push({
            id:   `assist-${g.player?.name}-${g.created_at}`,
            type: 'assist',
            text: `${g.player?.name || 'Jogador'} deu ${g.assists} assistência${g.assists > 1 ? 's' : ''}`,
            date: g.match?.match_date || g.created_at,
          });
        }
      });

      (joins || []).forEach(j => {
        items.push({
          id:   `join-${j.name}-${j.joined_at}`,
          type: 'join',
          text: `${j.name} entrou no baba`,
          date: j.joined_at,
        });
      });

      // Ordena por data desc e pega os mais recentes
      items.sort((a, b) => new Date(b.date) - new Date(a.date));
      setEvents(items.slice(0, limit));
    } catch (err) {
      console.error('[ActivityFeed]', err);
    } finally {
      setLoading(false);
    }
  }, [babaId, limit]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 rounded-2xl bg-surface-1 border border-border-subtle animate-pulse" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-6 text-text-muted text-[10px] font-black uppercase tracking-widest">
        Nenhuma atividade ainda
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map(ev => {
        const cfg  = TYPE_CONFIG[ev.type] || TYPE_CONFIG.goal;
        const Icon = cfg.icon;
        return (
          <div key={ev.id} className={`flex items-center gap-3 p-3 rounded-2xl border ${cfg.bg}`}>
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
              <Icon size={13} className={cfg.color} />
            </div>
            <p className="flex-1 text-[11px] font-black text-white">{ev.text}</p>
            <span className="text-[9px] font-black text-text-muted shrink-0">{timeAgo(ev.date)}</span>
          </div>
        );
      })}
    </div>
  );
}
