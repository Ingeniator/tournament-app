import type { TournamentFormat, Court, Club } from './tournament';

export interface PlannerTournament {
  id: string;
  name: string;
  format: TournamentFormat;
  pointsPerMatch?: number;
  courts: Court[];
  maxRounds?: number | null;
  organizerId: string;
  code: string;
  createdAt: number;
  duration?: number;
  date?: string;
  place?: string;
  extraSpots?: number;
  chatLink?: string;
  description?: string;
  locale?: string;
  clubs?: Club[];
  groupLabels?: [string, string];
  rankLabels?: string[];
}

export interface TournamentSummary {
  id: string;
  name: string;
  date?: string;
  place?: string;
  organizerId: string;
  organizerName?: string;
  code: string;
  createdAt: number;
  completedAt?: number | null;
}

export interface PlannerRegistration {
  id: string;
  name: string;
  timestamp: number;
  confirmed?: boolean;
  telegramUsername?: string;
  group?: 'A' | 'B';
  clubId?: string;
}

export interface TournamentStartInfo {
  uid: string;
  name: string;
  timestamp: number;
}
