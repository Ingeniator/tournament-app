export interface EventTournamentLink {
  tournamentId: string;
  weight: number;
}

export type PadelEventStatus = 'draft' | 'active' | 'completed';

export interface PadelEvent {
  id: string;
  name: string;
  date: string;
  code: string;
  tournaments: EventTournamentLink[];
  organizerId: string;
  createdAt: number;
  updatedAt: number;
}

export interface PadelEventSummary {
  id: string;
  name: string;
  date: string;
  code: string;
  tournamentCount: number;
  createdAt: number;
}

export interface EventStandingEntry {
  playerName: string;
  totalPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchesDraw: number;
  pointDiff: number;
  rank: number;
}

export interface EventClubStandingEntry {
  clubName: string;
  totalPoints: number;
  memberCount: number;
  rank: number;
}
