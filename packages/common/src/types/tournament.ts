import type { Player } from './player';
import type { Nomination } from './nomination';

export type TournamentFormat = 'americano' | 'mexicano' | 'mixicano' | 'team-americano' | 'team-mexicano' | 'round-robin' | 'king-of-the-court';

export type TournamentPhase = 'setup' | 'team-pairing' | 'in-progress' | 'completed';

export interface Team {
  id: string;
  player1Id: string;
  player2Id: string;
  name?: string;
}

export interface Competitor {
  id: string;
  name: string;
  playerIds: string[];
}

export interface Court {
  id: string;
  name: string;
  unavailable?: boolean;
  bonus?: number;
  rankLabel?: string;
}

export interface TournamentConfig {
  format: TournamentFormat;
  pointsPerMatch: number;
  courts: Court[];
  maxRounds: number | null;
  targetDuration?: number;
  groupLabels?: [string, string];
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
  teams?: Team[];
  plannerTournamentId?: string;
  nominations?: Nomination[];
  ceremonyCompleted?: boolean;
  createdAt: number;
  updatedAt: number;
}
