export interface LeagueRankingRules {
  pointsPerWin: number;
  pointsPerDraw: number;
  pointsPerLoss: number;
  tiebreaker: 'pointDifference' | 'headToHead' | 'gamesWon';
}

export interface League {
  id: string;
  name: string;
  date: string;
  tournamentIds: string[];
  rankingRules: LeagueRankingRules;
  status: 'draft' | 'active' | 'completed';
  organizerId: string;
  createdAt: number;
  updatedAt: number;
}

export interface LeagueSummary {
  id: string;
  name: string;
  date: string;
  status: 'draft' | 'active' | 'completed';
  tournamentCount: number;
  createdAt: number;
}

export interface LeagueStandingEntry {
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
