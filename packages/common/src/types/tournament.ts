import type { Player } from './player';
import type { Nomination } from './nomination';
import type { ChaosLevel, MatchCurse, MaldicionesHands } from './maldiciones';

export type TournamentFormat = 'americano' | 'mexicano' | 'mixicano' | 'mixed-americano' | 'team-americano' | 'team-mexicano' | 'mixed-team-americano' | 'mixed-team-mexicano' | 'round-robin' | 'king-of-the-court' | 'mixed-king-of-the-court' | 'club-americano' | 'club-mexicano' | 'club-ranked' | 'club-team-americano' | 'club-team-mexicano';

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
}

export interface Club {
  id: string;
  name: string;
  color?: string;
}

export interface TournamentConfig {
  format: TournamentFormat;
  pointsPerMatch: number;
  courts: Court[];
  maxRounds: number | null;
  targetDuration?: number;
  scoringMode?: 'points' | 'games';
  groupLabels?: [string, string];
  pairMode?: 'fixed' | 'rotating';
  maldiciones?: { enabled: boolean; chaosLevel: ChaosLevel };
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
  curse?: MatchCurse;
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
  clubs?: Club[];
  plannerTournamentId?: string;
  maldicionesHands?: MaldicionesHands;
  nominations?: Nomination[];
  ceremonyCompleted?: boolean;
  createdAt: number;
  updatedAt: number;
}
