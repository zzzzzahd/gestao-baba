// src/components/ActivityFeed.jsx
// Sprint 7 — Feed de atividade do baba: gols, vitórias, conquistas.

import React, { useEffect, useState } from 'react';
import { Trophy, Star, Zap, Users, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';

const ICONS = {
  goal:    { icon: Zap,    color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20'    },
  win:     { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20'     },
  badge:   { icon: Star,   color: 'text-cyan-electric', bg: 'bg-cyan-electric/10 border-cyan-electric/20' },
  join:    { icon: Users,  color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/20'       },
  default: { icon: Zap,    color: 'text-text-low',   bg: 'bg-surface-1 border-border-subtle'          },
};

const formatRelativeTime = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return 'agora';
  if (m < 60) return `${m}min`;
  if (h < 24) return `${h}h`;
  return `${d}d`;
};

const ActivityFeed = ({ babaId, limit = 10 }) => {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!babaId) return;
    setLoading(true);
    try {
      // Busca os últimos gols
      const { data: goals } = await supabase
        .from('match_players')
        .select('goals, assists, player:players(name), match:matches(match_date, baba_id)')
        .eq('match.baba_id', babaId)
        .gt('goals', 0)
        .order('match.match_date', { ascending: false })
        .limit(limit);

      const feed = (goals || [])
        .filter(g => g.match && g.player)
        .map(g => ({
          id:    `goal-${Math.random()}`,
          type:  'goal',
          text:  `${g.player.name} marcou ${g.goals} gol${g.goals > 1 ? 's' : ''}`,
          time:  g.match.match_date,
        }))
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, limit);

      setItems(feed);
    } catch (err) {
      console.error('[ActivityFeed]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [babaId]);

  if (loading) return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-12 rounded-2xl bg-surface-1 border border-border-subtle animate-pulse" />
      ))}
    </div>
  );

  if (items.length === 0) return (
    <div className="py-8 text-center">
      <p className="text-[10px] font-black uppercase text-text-muted tracking-widest">
        Nenhuma atividade ainda
      </p>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 mb-3">
        <span className="text-[10px] font-black uppercase text-text-low tracking-widest">Atividade recente</span>
        <button onClick={load} className="text-[9px] font-black text-text-muted hover:text-white uppercase flex items-center gap-1">
          <RefreshCw size={10} /> Atualizar
        </button>
      </div>
      {items.map(item => {
        const cfg  = ICONS[item.type] ?? ICONS.default;
        const Icon = cfg.icon;
        return (
          <div
            key={item.id}
            className={`flex items-center gap-3 p-3 rounded-2xl border ${cfg.bg}`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
              <Icon size={14} className={cfg.color} />
            </div>
            <p className="flex-1 text-[11px] font-black text-text-mid">{item.text}</p>
            <span className="text-[9px] font-black text-text-muted shrink-0">
              {formatRelativeTime(item.time)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityFeed;
