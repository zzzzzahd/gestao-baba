// src/utils/icsExport.js
// Exporta eventos do baba para .ics (Google Calendar, Apple Calendar, Outlook).
// Padrão RFC 5545 — sem dependência externa.

const pad = (n) => String(n).padStart(2, '0');

/** Formata Date para iCal DTSTART/DTEND: 20260115T190000 */
const toIcal = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    'T',
    pad(d.getHours()),
    pad(d.getMinutes()),
    '00',
  ].join('');
};

/** Escapa texto para iCal (vírgulas, ponto-e-vírgulas, quebras de linha) */
const escIcal = (str = '') =>
  String(str).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/**
 * Gera string .ics com um ou mais VEVENTs.
 * @param {Array<{
 *   uid: string,
 *   summary: string,
 *   description?: string,
 *   location?: string,
 *   start: Date|string,
 *   durationMinutes?: number,
 *   url?: string,
 * }>} events
 * @param {string} calName - nome do calendário
 */
export function generateICS(events, calName = 'Draft Play - Baba') {
  const now   = toIcal(new Date()) + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Draft Play//Gestão de Baba//PT',
    `X-WR-CALNAME:${escIcal(calName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const ev of events) {
    const start    = new Date(ev.start);
    const end      = new Date(start.getTime() + (ev.durationMinutes ?? 90) * 60_000);
    const startStr = toIcal(start);
    const endStr   = toIcal(end);
    const tzId     = 'America/Bahia';

    lines.push(
      'BEGIN:VEVENT',
      `UID:${escIcal(ev.uid)}@gestao-baba.app`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=${tzId}:${startStr}`,
      `DTEND;TZID=${tzId}:${endStr}`,
      `SUMMARY:${escIcal(ev.summary)}`,
    );
    if (ev.description) lines.push(`DESCRIPTION:${escIcal(ev.description)}`);
    if (ev.location)    lines.push(`LOCATION:${escIcal(ev.location)}`);
    if (ev.url)         lines.push(`URL:${escIcal(ev.url)}`);
    lines.push(
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Faz download do .ics no browser.
 * @param {string} icsContent
 * @param {string} filename
 */
export function downloadICS(icsContent, filename = 'baba.ics') {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Gera link para adicionar ao Google Calendar.
 */
export function googleCalendarUrl({ summary, start, durationMinutes = 90, location = '', description = '' }) {
  const s   = new Date(start);
  const e   = new Date(s.getTime() + durationMinutes * 60_000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return (
    'https://www.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(summary)}` +
    `&dates=${fmt(s)}/${fmt(e)}` +
    `&details=${encodeURIComponent(description)}` +
    `&location=${encodeURIComponent(location)}` +
    '&sf=true&output=xml'
  );
}
