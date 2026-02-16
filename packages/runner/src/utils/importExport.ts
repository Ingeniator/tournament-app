import type { Tournament } from '@padel/common';

export const EXPORT_FORMAT = 'padel-tournament-v1';

export function exportTournament(tournament: Tournament): string {
  const data = { _format: EXPORT_FORMAT, tournament };
  return JSON.stringify(data, null, 2);
}

export function exportTournamentToFile(tournament: Tournament): void {
  const json = exportTournament(tournament);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tournament.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function validateImport(text: string): { tournament: Tournament; error: null } | { tournament: null; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { tournament: null, error: 'Invalid JSON — make sure you pasted the full export text' };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { tournament: null, error: 'Invalid format — expected an object' };
  }

  const obj = parsed as Record<string, unknown>;

  if (obj._format !== EXPORT_FORMAT) {
    return { tournament: null, error: `Unknown format "${String(obj._format ?? 'missing')}" — expected "${EXPORT_FORMAT}"` };
  }

  const t = obj.tournament as Record<string, unknown> | undefined;
  if (!t || typeof t !== 'object') {
    return { tournament: null, error: 'Missing tournament data' };
  }

  const requiredStrings = ['id', 'name', 'phase'] as const;
  for (const field of requiredStrings) {
    if (typeof t[field] !== 'string') {
      return { tournament: null, error: `Missing or invalid field: ${field}` };
    }
  }

  if (!Array.isArray(t.players) || !Array.isArray(t.rounds)) {
    return { tournament: null, error: 'Missing players or rounds arrays' };
  }

  const config = t.config as Record<string, unknown> | undefined;
  if (!config || typeof config !== 'object' || !Array.isArray(config.courts)) {
    return { tournament: null, error: 'Missing or invalid config' };
  }

  return { tournament: t as unknown as Tournament, error: null };
}
