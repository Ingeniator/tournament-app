import type { TournamentConfig, MatchScore, Tournament, Round, Nomination } from '@padel/common';

export type TournamentAction =
  | { type: 'CREATE_TOURNAMENT'; payload: { name: string; config: TournamentConfig } }
  | { type: 'LOAD_TOURNAMENT'; payload: Tournament }
  | { type: 'ADD_PLAYER'; payload: { name: string } }
  | { type: 'ADD_PLAYERS_BULK'; payload: { names: string[] } }
  | { type: 'REMOVE_PLAYER'; payload: { playerId: string } }
  | { type: 'UPDATE_PLAYER'; payload: { playerId: string; name: string } }
  | { type: 'UPDATE_PLAYER_GROUP'; payload: { playerId: string; group: string } }
  | { type: 'TOGGLE_PLAYER_AVAILABILITY'; payload: { playerId: string } }
  | { type: 'REPLACE_PLAYER'; payload: { oldPlayerId: string; newPlayerName: string } }
  | { type: 'ADD_PLAYER_LIVE'; payload: { name: string } }
  | { type: 'REGENERATE_FUTURE_ROUNDS'; payload?: { timeBudgetMs?: number } }
  | { type: 'SET_FUTURE_ROUNDS'; payload: { rounds: Round[] } }
  | { type: 'UPDATE_COURT'; payload: { courtId: string; name: string } }
  | { type: 'ADD_COURT_LIVE' }
  | { type: 'TOGGLE_COURT_AVAILABILITY'; payload: { courtId: string } }
  | { type: 'REPLACE_COURT'; payload: { oldCourtId: string; newCourtName: string } }
  | { type: 'UPDATE_NAME'; payload: { name: string } }
  | { type: 'UPDATE_CONFIG'; payload: Partial<TournamentConfig> }
  | { type: 'GENERATE_SCHEDULE' }
  | { type: 'ADD_ROUNDS'; payload: { count: number } }
  | { type: 'SET_MATCH_SCORE'; payload: { roundId: string; matchId: string; score: MatchScore } }
  | { type: 'CLEAR_MATCH_SCORE'; payload: { roundId: string; matchId: string } }
  | { type: 'UPDATE_POINTS'; payload: { pointsPerMatch: number } }
  | { type: 'SET_ROUND_COUNT'; payload: { count: number } }
  | { type: 'SET_TEAMS' }
  | { type: 'SHUFFLE_TEAMS' }
  | { type: 'SWAP_PLAYERS'; payload: { playerA: string; playerB: string } }
  | { type: 'RENAME_TEAM'; payload: { teamId: string; name: string } }
  | { type: 'SET_TEAMS_BACK' }
  | { type: 'COMPLETE_TOURNAMENT' }
  | { type: 'COMPLETE_CEREMONY'; payload: { nominations: Nomination[] } }
  | { type: 'RESET_TOURNAMENT' };
