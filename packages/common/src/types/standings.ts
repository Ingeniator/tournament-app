export interface StandingsEntry {
  playerId: string;
  playerName: string;
  totalPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchesDraw: number;
  pointDiff: number;
  rank: number;
}

export interface ClubStandingsEntry {
  clubId: string;
  clubName: string;
  totalPoints: number;
  memberCount: number;
  rank: number;
}
