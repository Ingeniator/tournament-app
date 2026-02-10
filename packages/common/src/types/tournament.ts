import type { Player } from './player';

export type TournamentFormat = 'americano' | 'mexicano' | 'team-americano' | 'round-robin';

export type TournamentPhase = 'setup' | 'in-progress' | 'completed';

export interface Court {
  id: string;
  name: string;
  unavailable?: boolean;
}

export interface TournamentConfig {
  format: TournamentFormat;
  pointsPerMatch: number;
  courts: Court[];
  maxRounds: number | null;
}

export interface MatchScore {
  team1Points: number;
  team2Points: number;
}

export interface Match {
  id: string;
  courtId: string;
  team1: [string, string];
  team2: [string, string];
  score: MatchScore | null;
}

export interface Round {
  id: string;
  roundNumber: number;
  matches: Match[];
  sitOuts: string[];
}

export interface Tournament {
  id: string;
  name: string;
  config: TournamentConfig;
  phase: TournamentPhase;
  players: Player[];
  rounds: Round[];
  createdAt: number;
  updatedAt: number;
}
