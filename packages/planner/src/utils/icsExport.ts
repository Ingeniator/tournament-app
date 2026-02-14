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
  const durationMs = (tournament.duration ?? 120) * 60 * 1000;
  const end = new Date(start.getTime() + durationMs);
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

function formatGCalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function buildGoogleCalendarUrl(tournament: PlannerTournament): string {
  const start = new Date(tournament.date!);
  const durationMs = (tournament.duration ?? 120) * 60 * 1000;
  const end = new Date(start.getTime() + durationMs);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: tournament.name,
    dates: `${formatGCalDate(start)}/${formatGCalDate(end)}`,
  });
  if (tournament.place) params.set('location', tournament.place);
  if (tournament.description) params.set('details', tournament.description);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export async function downloadICS(tournament: PlannerTournament): Promise<void> {
  const content = generateICS(tournament);
  if (!content) return;

  const tg = window.Telegram?.WebApp;
  if (tg) {
    // Telegram WebApp blocks blob downloads and programmatic <a>.click().
    // Try the Web Share API first (opens native share sheet on mobile).
    const fileName = `${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    const file = new File([content], fileName, { type: 'text/calendar' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: tournament.name });
        return;
      } catch {
        // User cancelled or share failed — fall through to Google Calendar
      }
    }
    // Fallback: open Google Calendar event URL in external browser.
    tg.openLink?.(buildGoogleCalendarUrl(tournament));
    return;
  }

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
