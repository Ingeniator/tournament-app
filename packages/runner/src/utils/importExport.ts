import type { Tournament } from '@padel/common';

export const EXPORT_FORMAT = 'padel-tournament-v1';

export function exportTournament(tournament: Tournament): string {
  const data = { _format: EXPORT_FORMAT, tournament };
  return JSON.stringify(data, null, 2);
}

function validateTournamentFields(t: Record<string, unknown>): string | null {
  const requiredStrings = ['id', 'name', 'phase'] as const;
  for (const field of requiredStrings) {
    if (typeof t[field] !== 'string') {
      return `Missing or invalid field: ${field}`;
    }
  }

  if (!Array.isArray(t.players) || !Array.isArray(t.rounds)) {
    return 'Missing players or rounds arrays';
  }

  const config = t.config as Record<string, unknown> | undefined;
  if (!config || typeof config !== 'object' || !Array.isArray(config.courts)) {
    return 'Missing or invalid config';
  }

  return null;
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

  // Wrapped format: { _format: "padel-tournament-v1", tournament: {...} }
  if (obj._format === EXPORT_FORMAT) {
    const t = obj.tournament as Record<string, unknown> | undefined;
    if (!t || typeof t !== 'object') {
      return { tournament: null, error: 'Missing tournament data' };
    }
    const fieldError = validateTournamentFields(t);
    if (fieldError) {
      return { tournament: null, error: fieldError };
    }
    return { tournament: t as unknown as Tournament, error: null };
  }

  // Bare tournament object (e.g. copied from planner "Copy for device")
  if (typeof obj.id === 'string' && typeof obj.name === 'string') {
    const fieldError = validateTournamentFields(obj);
    if (fieldError) {
      return { tournament: null, error: fieldError };
    }
    return { tournament: obj as unknown as Tournament, error: null };
  }

  if (obj._format && obj._format !== EXPORT_FORMAT) {
    return { tournament: null, error: `Unknown format "${String(obj._format)}" — expected "${EXPORT_FORMAT}"` };
  }

  return { tournament: null, error: 'Invalid JSON — make sure you pasted the full export text' };
}
