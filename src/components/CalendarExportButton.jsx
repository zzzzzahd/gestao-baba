// src/components/CalendarExportButton.jsx
// Exporta próximos jogos do baba para Google Calendar ou .ics.

import React, { useState } from 'react';
import { Calendar, ExternalLink, Download, ChevronDown } from 'lucide-react';
import { generateICS, downloadICS, googleCalendarUrl } from '../utils/icsExport';
import toast from 'react-hot-toast';

/**
 * @param {Object} props
 * @param {Object} props.baba        - { id, name, location, game_days_config }
 * @param {Array}  props.nextDates   - próximas datas [ { date: Date, time: string, location?: string } ]
 * @param {string} [props.className]
 */
export default function CalendarExportButton({ baba, nextDates = [], className = '' }) {
  const [open, setOpen] = useState(false);

  if (!baba || !nextDates.length) return null;

  const buildEvents = () =>
    nextDates.map((d) => {
      const [h, m]  = (d.time ?? '18:00').split(':').map(Number);
      const start   = new Date(d.date);
      start.setHours(h, m, 0, 0);
      return {
        uid:             `${baba.id}-${start.toISOString().split('T')[0]}`,
        summary:         `⚽ ${baba.name}`,
        description:     `Baba pelo Draft Play.\nhttps://gestao-baba.vercel.app/dashboard`,
        location:        d.location ?? baba.location ?? '',
        start,
        durationMinutes: 90,
        url:             'https://gestao-baba.vercel.app/dashboard',
      };
    });

  const handleDownloadICS = () => {
    const events = buildEvents();
    const ics    = generateICS(events, `Baba - ${baba.name}`);
    downloadICS(ics, `baba-${baba.name.toLowerCase().replace(/\s+/g, '-')}.ics`);
    toast.success('Arquivo .ics baixado!');
    setOpen(false);
  };

  const handleGoogleCal = () => {
    const events = buildEvents();
    if (!events.length) return;
    // Abre o próximo jogo no Google Calendar
    const url = googleCalendarUrl(events[0]);
    window.open(url, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Exportar para calendário"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-surface-2 border border-border-mid text-text-low hover:text-white hover:border-border-strong transition-all text-[10px] font-black uppercase tracking-widest"
      >
        <Calendar size={13} aria-hidden="true" />
        Agenda
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full mt-2 z-40 w-48 bg-surface-1 border border-border-mid rounded-2xl overflow-hidden shadow-glass">
            <button
              onClick={handleGoogleCal}
              className="flex items-center gap-2.5 w-full px-4 py-3 text-[11px] font-bold text-text-mid hover:bg-surface-2 hover:text-white transition-colors text-left"
            >
              <ExternalLink size={13} aria-hidden="true" />
              Google Calendar
            </button>
            <div className="border-t border-border-subtle" />
            <button
              onClick={handleDownloadICS}
              className="flex items-center gap-2.5 w-full px-4 py-3 text-[11px] font-bold text-text-mid hover:bg-surface-2 hover:text-white transition-colors text-left"
            >
              <Download size={13} aria-hidden="true" />
              Apple / Outlook (.ics)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
