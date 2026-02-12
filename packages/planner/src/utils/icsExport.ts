import type { PlannerTournament } from '@padel/common';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatDateToICS(date: Date): string {
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

export function generateICS(tournament: PlannerTournament): string {
  if (!tournament.date) return '';

  const start = new Date(tournament.date);
  // Default duration: 2 hours
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const now = new Date();

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Padel Tournament//EN',
    'BEGIN:VEVENT',
    `UID:${tournament.id}@padel-tournament`,
    `DTSTAMP:${formatDateToICS(now)}`,
    `DTSTART:${formatDateToICS(start)}`,
    `DTEND:${formatDateToICS(end)}`,
    `SUMMARY:${tournament.name}`,
    ...(tournament.place ? [`LOCATION:${tournament.place}`] : []),
    ...(tournament.description ? [`DESCRIPTION:${tournament.description.replace(/\n/g, '\\n')}`] : []),
    // 4-hour advance reminder
    'BEGIN:VALARM',
    'TRIGGER:-PT4H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${tournament.name} starts in 4 hours`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

export function downloadICS(tournament: PlannerTournament): void {
  const content = generateICS(tournament);
  if (!content) return;

  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
