export interface EventRankingRules {
  pointsPerWin: number;
  pointsPerDraw: number;
  pointsPerLoss: number;
  tiebreaker: 'pointDifference' | 'headToHead' | 'gamesWon';
}

export interface EventTournamentLink {
  tournamentId: string;
  weight: number;
}

export type PadelEventStatus = 'draft' | 'active' | 'completed';

export interface PadelEvent {
  id: string;
  name: string;
  date: string;
  tournaments: EventTournamentLink[];
  rankingRules: EventRankingRules;
  organizerId: string;
  createdAt: number;
  updatedAt: number;
}

export interface PadelEventSummary {
  id: string;
  name: string;
  date: string;
  tournamentCount: number;
  createdAt: number;
}

export interface EventStandingEntry {
  playerName: string;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  gamesWon: number;
  gamesLost: number;
  pointDifference: number;
  matchesPlayed: number;
  rank: number;
}
