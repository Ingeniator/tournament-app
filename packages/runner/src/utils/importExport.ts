import type { Tournament, Player } from '@padel/common';
import { generateId } from '@padel/common';
import { getRegisteredFormats } from '../strategies';

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

  let t = obj.tournament as Record<string, unknown> | undefined;

  // Detect planner flat format: { _format, name, format, courts, players }
  // Convert to runner tournament structure on the fly.
  if ((!t || typeof t !== 'object') && typeof obj.name === 'string' && typeof obj.format === 'string' && Array.isArray(obj.courts)) {
    const flatPlayers = (Array.isArray(obj.players) ? obj.players : []) as Array<Record<string, unknown>>;
    const players: Player[] = flatPlayers.map(p => ({
      id: generateId(),
      name: p.name as string,
      ...(p.group ? { group: p.group as 'A' | 'B' } : {}),
      ...(p.clubId ? { clubId: p.clubId as string } : {}),
      ...(p.rankSlot != null ? { rankSlot: p.rankSlot as number } : {}),
    }));
    t = {
      id: generateId(),
      name: obj.name,
      phase: 'setup',
      players,
      rounds: [],
      config: {
        format: obj.format,
        pointsPerMatch: (obj.pointsPerMatch as number) ?? 0,
        courts: obj.courts,
        maxRounds: (obj.maxRounds as number | null) ?? null,
        ...(obj.duration != null ? { targetDuration: obj.duration as number } : {}),
        ...(obj.scoringMode ? { scoringMode: obj.scoringMode } : {}),
        ...(obj.minutesPerRound != null ? { minutesPerRound: obj.minutesPerRound } : {}),
        ...(obj.maldiciones ? { maldiciones: obj.maldiciones } : {}),
        ...(obj.groupLabels ? { groupLabels: obj.groupLabels } : {}),
        ...(obj.rankLabels ? { rankLabels: obj.rankLabels } : {}),
      },
      ...(obj.clubs ? { clubs: obj.clubs } : {}),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

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

  if (typeof config.format !== 'string' || !getRegisteredFormats().includes(config.format as Tournament['config']['format'])) {
    return { tournament: null, error: { key: 'import.invalidConfig' } };
  }

  return { tournament: t as unknown as Tournament, error: null };
}
