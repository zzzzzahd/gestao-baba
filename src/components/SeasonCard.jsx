// src/components/SeasonCard.jsx
// Sprint 4 — Exibe temporada ativa do baba com ranking e dias restantes.

import React, { useEffect, useState } from 'react';
import { Calendar, Trophy, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';

const SeasonCard = ({ babaId }) => {
  const [season,  setSeason]  = useState(null);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!babaId) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data: s } = await supabase
          .from('seasons')
          .select('*')
          .eq('baba_id', babaId)
          .eq('status', 'active')
          .maybeSingle();
        setSeason(s);

        if (s) {
          const { data: r } = await supabase
            .from('season_rankings')
            .select('position, points, player:players(name)')
            .eq('season_id', s.id)
            .order('position')
            .limit(3);
          setLeaders(r || []);
        }
      } catch (err) {
        console.error('[SeasonCard]', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [babaId]);

  if (loading) return (
    <div className="h-24 rounded-3xl bg-surface-1 border border-border-subtle animate-pulse" />
  );

  if (!season) return null;

  const daysLeft = Math.max(0, Math.ceil(
    (new Date(season.ends_at) - Date.now()) / 86400000
  ));
  const medal = ['🥇', '🥈', '🥉'];

  return (
    <div className="p-5 rounded-3xl bg-gradient-to-br from-cyan-electric/10 to-purple-500/5 border border-cyan-electric/20 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-yellow-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-text-low">
            {season.name ?? 'Temporada'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[9px] font-black text-cyan-electric uppercase">
          <Calendar size={10} />
          {daysLeft}d restantes
        </div>
      </div>

      {leaders.length > 0 && (
        <div className="space-y-1.5">
          {leaders.map((l, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface-1 border border-border-subtle">
              <span className="text-sm">{medal[i]}</span>
              <span className="flex-1 text-[11px] font-black uppercase truncate">
                {l.player?.name ?? 'Jogador'}
              </span>
              <span className="text-[10px] font-black text-cyan-electric">{l.points ?? 0}pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SeasonCard;
