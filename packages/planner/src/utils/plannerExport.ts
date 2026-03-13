import { ref, get } from 'firebase/database';
import type { PlannerTournament, PlannerRegistration, PadelEvent } from '@padel/common';
import { db } from '../firebase';

const EXPORT_FORMAT = 'padel-tournament-v1';
const EVENT_EXPORT_FORMAT = 'padel-event-v1';

export interface ExportedPlayer {
  name: string;
  confirmed?: boolean;
  alias?: string;
  group?: 'A' | 'B';
  clubId?: string;
  rankSlot?: number;
  partnerName?: string;
  telegramUsername?: string;
}

interface TournamentFields {
  name: string;
  format: PlannerTournament['format'];
  courts: PlannerTournament['courts'];
  duration?: number;
  date?: string;
  place?: string;
  description?: string;
  chatLink?: string;
  pointsPerMatch?: number;
  maxRounds?: number | null;
  extraSpots?: number;
  clubs?: PlannerTournament['clubs'];
  groupLabels?: PlannerTournament['groupLabels'];
  rankLabels?: string[];
  rankColors?: number[];
  scoringMode?: PlannerTournament['scoringMode'];
  minutesPerRound?: number;
  maldiciones?: PlannerTournament['maldiciones'];
  captainMode?: boolean;
}

interface ExportedTournament extends TournamentFields {
  _format: typeof EXPORT_FORMAT;
  players: ExportedPlayer[];
}

function buildTournamentExport(
  tournament: PlannerTournament,
  registrations: PlannerRegistration[],
): ExportedTournament {
  const players: ExportedPlayer[] = registrations.map(r => {
    const p: ExportedPlayer = { name: r.name };
    if (r.confirmed !== undefined) p.confirmed = r.confirmed;
    if (r.alias) p.alias = r.alias;
    if (r.group) p.group = r.group;
    if (r.clubId) p.clubId = r.clubId;
    if (r.rankSlot != null) p.rankSlot = r.rankSlot;
    if (r.partnerName) p.partnerName = r.partnerName;
    if (r.telegramUsername) p.telegramUsername = r.telegramUsername;
    return p;
  });

  const exported: ExportedTournament = {
    _format: EXPORT_FORMAT,
    name: tournament.name,
    format: tournament.format,
    courts: tournament.courts,
    players,
  };

  if (tournament.duration) exported.duration = tournament.duration;
  if (tournament.date) exported.date = tournament.date;
  if (tournament.place) exported.place = tournament.place;
  if (tournament.description) exported.description = tournament.description;
  if (tournament.chatLink) exported.chatLink = tournament.chatLink;
  if (tournament.pointsPerMatch) exported.pointsPerMatch = tournament.pointsPerMatch;
  if (tournament.maxRounds != null) exported.maxRounds = tournament.maxRounds;
  if (tournament.extraSpots) exported.extraSpots = tournament.extraSpots;
  if (tournament.clubs) exported.clubs = tournament.clubs;
  if (tournament.groupLabels) exported.groupLabels = tournament.groupLabels;
  if (tournament.rankLabels) exported.rankLabels = tournament.rankLabels;
  if (tournament.rankColors) exported.rankColors = tournament.rankColors;
  if (tournament.scoringMode) exported.scoringMode = tournament.scoringMode;
  if (tournament.minutesPerRound) exported.minutesPerRound = tournament.minutesPerRound;
  if (tournament.maldiciones) exported.maldiciones = tournament.maldiciones;
  if (tournament.captainMode) exported.captainMode = tournament.captainMode;

  return exported;
}

// --- Tournament export/import ---

export function exportPlannerTournament(
  tournament: PlannerTournament,
  registrations: PlannerRegistration[],
): string {
  return JSON.stringify(buildTournamentExport(tournament, registrations), null, 2);
}

export interface ParsedImport {
  tournament: Omit<ExportedTournament, '_format' | 'players'>;
  players: ExportedPlayer[];
}

export function parsePlannerExport(text: string): ParsedImport {
  const raw = JSON.parse(text) as Record<string, unknown>;
  if (raw._format !== EXPORT_FORMAT && raw._format !== 'planner-tournament-v1') {
    throw new Error('Invalid format');
  }

  // Runner envelope format: { _format, tournament: { config: { format, courts, ... }, players, ... } }
  const nested = raw.tournament as Record<string, unknown> | undefined;
  if (nested && typeof nested === 'object' && nested.config) {
    const config = nested.config as Record<string, unknown>;
    const players = (Array.isArray(nested.players) ? nested.players : []) as Array<Record<string, unknown>>;
    const tournament: Omit<ExportedTournament, '_format' | 'players'> = {
      name: nested.name as string,
      format: config.format as PlannerTournament['format'],
      courts: config.courts as PlannerTournament['courts'],
      ...(config.targetDuration != null ? { duration: config.targetDuration as number } : {}),
      ...(config.pointsPerMatch != null ? { pointsPerMatch: config.pointsPerMatch as number } : {}),
      ...(config.maxRounds != null ? { maxRounds: config.maxRounds as number } : {}),
      ...(config.scoringMode ? { scoringMode: config.scoringMode as PlannerTournament['scoringMode'] } : {}),
      ...(config.minutesPerRound != null ? { minutesPerRound: config.minutesPerRound as number } : {}),
      ...(config.maldiciones ? { maldiciones: config.maldiciones as PlannerTournament['maldiciones'] } : {}),
      ...(config.groupLabels ? { groupLabels: config.groupLabels as PlannerTournament['groupLabels'] } : {}),
      ...(config.rankLabels ? { rankLabels: config.rankLabels as string[] } : {}),
      ...(config.rankColors ? { rankColors: config.rankColors as number[] } : {}),
      ...(nested.clubs ? { clubs: nested.clubs as PlannerTournament['clubs'] } : {}),
    };
    if (!tournament.name || !tournament.format || !tournament.courts) {
      throw new Error('Missing required fields');
    }
    const exportedPlayers: ExportedPlayer[] = players.map(p => ({
      name: p.name as string,
      ...(p.group ? { group: p.group as 'A' | 'B' } : {}),
      ...(p.clubId ? { clubId: p.clubId as string } : {}),
      ...(p.rankSlot != null ? { rankSlot: p.rankSlot as number } : {}),
    }));
    return { tournament, players: exportedPlayers };
  }

  // Planner flat format: { _format, name, format, courts, players, ... }
  const data = raw as unknown as ExportedTournament;
  if (!data.name || !data.format || !data.courts) {
    throw new Error('Missing required fields');
  }
  const { _format: _, players, ...tournament } = data;
  return { tournament, players: players ?? [] };
}

// --- Event export/import ---

interface ExportedEventTournament extends TournamentFields {
  weight: number;
  players: ExportedPlayer[];
}

interface ExportedEvent {
  _format: typeof EVENT_EXPORT_FORMAT;
  name: string;
  date: string;
  description?: string;
  tournaments: ExportedEventTournament[];
}

export async function exportPlannerEvent(event: PadelEvent): Promise<string> {
  if (!db) throw new Error('Firebase not configured');

  const tournaments: ExportedEventTournament[] = [];
  for (const link of event.tournaments) {
    const snap = await get(ref(db, `tournaments/${link.tournamentId}`));
    if (!snap.exists()) continue;
    const data = snap.val() as Record<string, unknown>;

    // Build a minimal PlannerTournament from raw Firebase data
    const t: PlannerTournament = {
      id: link.tournamentId,
      name: (data.name as string) ?? '',
      format: (data.format as PlannerTournament['format']) ?? 'americano',
      courts: Array.isArray(data.courts) ? data.courts : [{ id: '1', name: 'Court 1' }],
      organizerId: '',
      code: '',
      createdAt: 0,
      duration: data.duration as number | undefined,
      date: data.date as string | undefined,
      place: data.place as string | undefined,
      description: data.description as string | undefined,
      chatLink: data.chatLink as string | undefined,
      pointsPerMatch: data.pointsPerMatch as number | undefined,
      maxRounds: data.maxRounds as number | null | undefined,
      extraSpots: data.extraSpots as number | undefined,
      clubs: Array.isArray(data.clubs) ? data.clubs : undefined,
      groupLabels: data.groupLabels as [string, string] | undefined,
      rankLabels: Array.isArray(data.rankLabels) ? data.rankLabels : undefined,
      rankColors: Array.isArray(data.rankColors) ? data.rankColors : undefined,
      scoringMode: data.scoringMode as PlannerTournament['scoringMode'],
      minutesPerRound: data.minutesPerRound as number | undefined,
      maldiciones: data.maldiciones as PlannerTournament['maldiciones'],
      captainMode: data.captainMode as boolean | undefined,
    };

    // Extract players
    const playersData = data.players as Record<string, Record<string, unknown>> | undefined;
    const regs: PlannerRegistration[] = playersData
      ? Object.entries(playersData).map(([id, p]) => ({
          id,
          name: (p.name as string) ?? '',
          timestamp: (p.timestamp as number) ?? 0,
          confirmed: p.confirmed as boolean | undefined,
          alias: p.alias as string | undefined,
          group: p.group as 'A' | 'B' | undefined,
          clubId: p.clubId as string | undefined,
          rankSlot: p.rankSlot as number | undefined,
          partnerName: p.partnerName as string | undefined,
          telegramUsername: p.telegramUsername as string | undefined,
        }))
      : [];

    const { _format: _, players, ...fields } = buildTournamentExport(t, regs);
    tournaments.push({ ...fields, weight: link.weight, players });
  }

  const exported: ExportedEvent = {
    _format: EVENT_EXPORT_FORMAT,
    name: event.name,
    date: event.date,
    tournaments,
  };
  if (event.description) exported.description = event.description;

  return JSON.stringify(exported, null, 2);
}

export interface ParsedEventImport {
  name: string;
  date: string;
  description?: string;
  tournaments: Array<{
    tournament: TournamentFields;
    players: ExportedPlayer[];
    weight: number;
  }>;
}

export function parsePlannerEventExport(text: string): ParsedEventImport {
  const data = JSON.parse(text) as ExportedEvent;
  if (data._format !== EVENT_EXPORT_FORMAT && data._format !== 'planner-event-v1') {
    throw new Error('Invalid format');
  }
  if (!data.name || !data.date || !Array.isArray(data.tournaments)) {
    throw new Error('Missing required fields');
  }
  return {
    name: data.name,
    date: data.date,
    description: data.description,
    tournaments: data.tournaments.map(t => {
      const { players, weight, ...tournament } = t;
      return { tournament, players: players ?? [], weight: weight ?? 1 };
    }),
  };
}
