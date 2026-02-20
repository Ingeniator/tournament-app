import type { Tournament } from '@padel/common';

export const EXPORT_FORMAT = 'padel-tournament-v1';

/** Error keys returned by validateImport — translate via i18n in the UI layer */
export type ImportErrorKey =
  | 'import.invalidJson'
  | 'import.invalidFormat'
  | 'import.unknownFormat'
  | 'import.missingTournament'
  | 'import.missingField'
  | 'import.missingArrays'
  | 'import.invalidConfig';

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

export interface ImportError {
  key: ImportErrorKey;
  params?: Record<string, string>;
}

export function validateImport(text: string): { tournament: Tournament; error: null } | { tournament: null; error: ImportError } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { tournament: null, error: { key: 'import.invalidJson' } };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { tournament: null, error: { key: 'import.invalidFormat' } };
  }

  const obj = parsed as Record<string, unknown>;

  if (obj._format !== EXPORT_FORMAT) {
    return { tournament: null, error: { key: 'import.unknownFormat', params: { found: String(obj._format ?? ''), expected: EXPORT_FORMAT } } };
  }

  const t = obj.tournament as Record<string, unknown> | undefined;
  if (!t || typeof t !== 'object') {
    return { tournament: null, error: { key: 'import.missingTournament' } };
  }

  const requiredStrings = ['id', 'name', 'phase'] as const;
  for (const field of requiredStrings) {
    if (typeof t[field] !== 'string') {
      return { tournament: null, error: { key: 'import.missingField', params: { field } } };
    }
  }

  if (!Array.isArray(t.players) || !Array.isArray(t.rounds)) {
    return { tournament: null, error: { key: 'import.missingArrays' } };
  }

  const config = t.config as Record<string, unknown> | undefined;
  if (!config || typeof config !== 'object' || !Array.isArray(config.courts)) {
    return { tournament: null, error: { key: 'import.invalidConfig' } };
  }

  return { tournament: t as unknown as Tournament, error: null };
}
