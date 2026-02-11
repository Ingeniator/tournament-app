import type { TournamentFormat, Court } from './tournament';

export interface PlannerTournament {
  id: string;
  name: string;
  format: TournamentFormat;
  pointsPerMatch: number;
  courts: Court[];
  maxRounds: number | null;
  organizerId: string;
  code: string;
  createdAt: number;
  date?: string;
  place?: string;
  extraSpots?: number;
  chatLink?: string;
  description?: string;
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
}

export interface PlannerRegistration {
  id: string;
  name: string;
  timestamp: number;
  confirmed?: boolean;
}
