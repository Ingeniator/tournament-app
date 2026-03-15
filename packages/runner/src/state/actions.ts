import type { TournamentConfig, MatchScore, Tournament, Round, Nomination } from '@padel/common';

export type TournamentAction =
  | { type: 'CREATE_TOURNAMENT'; payload: { name: string; config: TournamentConfig } }
  | { type: 'LOAD_TOURNAMENT'; payload: Tournament }
  | { type: 'UPDATE_PLAYER'; payload: { playerId: string; name: string } }
  | { type: 'TOGGLE_PLAYER_AVAILABILITY'; payload: { playerId: string } }
  | { type: 'REPLACE_PLAYER'; payload: { oldPlayerId: string; newPlayerName: string } }
  | { type: 'SET_PLAYER_GROUP'; payload: { playerId: string; group: 'A' | 'B' | null } }
  | { type: 'ADD_PLAYER_LIVE'; payload: { name: string; group?: 'A' | 'B' } }
  | { type: 'REGENERATE_FUTURE_ROUNDS'; payload?: { timeBudgetMs?: number } }
  | { type: 'SET_FUTURE_ROUNDS'; payload: { rounds: Round[] } }
  | { type: 'UPDATE_COURT'; payload: { courtId: string; name: string } }
  | { type: 'ADD_COURT_LIVE' }
  | { type: 'TOGGLE_COURT_AVAILABILITY'; payload: { courtId: string } }
  | { type: 'REPLACE_COURT'; payload: { oldCourtId: string; newCourtName: string } }
  | { type: 'UPDATE_NAME'; payload: { name: string } }
  | { type: 'GENERATE_SCHEDULE' }
  | { type: 'ADD_ROUNDS'; payload: { count: number } }
  | { type: 'SET_MATCH_SCORE'; payload: { roundId: string; matchId: string; score: MatchScore } }
  | { type: 'CLEAR_MATCH_SCORE'; payload: { roundId: string; matchId: string } }
  | { type: 'UPDATE_POINTS'; payload: { pointsPerMatch: number; minutesPerRound?: number } }
  | { type: 'SET_ROUND_COUNT'; payload: { count: number } }
  | { type: 'COMPLETE_TOURNAMENT' }
  | { type: 'COMPLETE_CEREMONY'; payload: { nominations: Nomination[] } }
  | { type: 'RESET_TOURNAMENT' }
  | { type: 'CAST_MALDICION'; payload: { roundId: string; matchId: string; castBy: 'team1' | 'team2'; cardId: string; targetPlayerId: string } }
  | { type: 'USE_ESCUDO'; payload: { roundId: string; matchId: string } }
  | { type: 'VETO_MALDICION'; payload: { roundId: string; matchId: string } };
