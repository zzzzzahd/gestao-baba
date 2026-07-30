// src/components/NextGameCard.jsx
// Card de countdown do próximo baba — extraído do TabOverview para ficar
// visível no topo da Dashboard, independente da aba selecionada.

import React from 'react';
import { MapPin, Calendar } from 'lucide-react';
import { DAY_FULL } from '../utils/constants';
import CalendarExportButton from './CalendarExportButton';

const formatCountdown = (cd) => {
  if (!cd?.active) return null;
  const hh = String(cd.h).padStart(2, '0');
  const mm = String(cd.m).padStart(2, '0');
  const ss = String(cd.s).padStart(2, '0');
  return cd.d > 0 ? `${cd.d}d ${hh}h ${mm}m` : `${hh}:${mm}:${ss}`;
};

const formatGameDays = (baba) => {
  if (!Array.isArray(baba?.game_days) || baba.game_days.length === 0) return null;
  const time = baba.game_time ? String(baba.game_time).substring(0, 5) : '';
  return [...new Set(baba.game_days.map(Number))]
    .filter(d => d >= 0 && d <= 6)
    .sort((a, b) => a - b)
    .map(d => `${['DOM','SEG','TER','QUA','QUI','SEX','SÁB'][d]}${time ? ' ' + time : ''}`)
    .join(' · ');
};

const NextGameCard = ({ nextGameDay, countdown, currentBaba }) => {
  if (!nextGameDay) return null;

  const cdStr           = formatCountdown(countdown);
  const gameDaysDisplay = formatGameDays(currentBaba);

  return (
    <div className="bg-gradient-to-r from-cyan-electric/20 to-transparent p-[1px] rounded-[2rem] border border-cyan-electric/30">
      <div className="bg-black/40 backdrop-blur-md rounded-[2rem] p-6">
        <div className="flex justify-between items-center mb-4 text-[10px] font-black uppercase tracking-widest text-text-low">
          <span>Próximo Baba em</span>
          <span className="text-cyan-electric">
            {nextGameDay.daysAhead === 0 ? 'Hoje'
              : nextGameDay.daysAhead === 1 ? 'Amanhã'
              : DAY_FULL[nextGameDay.day]}
          </span>
        </div>
        <div className="flex justify-between items-end">
          <div>
            <div className="text-4xl font-black font-mono tabular-nums leading-none tracking-tighter text-white">
              {cdStr
                ? <span>{cdStr}</span>
                : <span className="text-2xl uppercase text-cyan-electric animate-pulse">Em breve...</span>
              }
            </div>
            <div className="flex items-center gap-2 mt-2 text-[10px] font-black text-text-low uppercase truncate max-w-[200px]">
              <MapPin size={12} className="text-cyan-electric flex-shrink-0" />
              <span className="truncate">
                {nextGameDay.location || currentBaba?.location || 'Arena Principal'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-cyan-electric italic uppercase">PARTIDA</span>
            <p className="text-[10px] font-black text-text-low uppercase tracking-widest mt-1">
              {nextGameDay.time?.substring(0, 5)}
            </p>
          </div>
        </div>
        {gameDaysDisplay && (
          <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[10px] font-black text-text-low uppercase">
              <Calendar size={12} className="text-text-muted" />
              <span>{gameDaysDisplay}</span>
            </div>
            <CalendarExportButton
              baba={currentBaba}
              nextDates={nextGameDay ? [{
                date:     new Date(nextGameDay.fullDate ?? Date.now()),
                time:     nextGameDay.time?.substring(0, 5) ?? '18:00',
                location: nextGameDay.location || currentBaba?.location,
              }] : []}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default NextGameCard;
