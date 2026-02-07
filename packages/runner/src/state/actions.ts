import type { TournamentConfig, MatchScore, Tournament } from '@padel/common';

export type TournamentAction =
  | { type: 'CREATE_TOURNAMENT'; payload: { name: string; config: TournamentConfig } }
  | { type: 'LOAD_TOURNAMENT'; payload: Tournament }
  | { type: 'ADD_PLAYER'; payload: { name: string } }
  | { type: 'REMOVE_PLAYER'; payload: { playerId: string } }
  | { type: 'UPDATE_PLAYER'; payload: { playerId: string; name: string } }
  | { type: 'TOGGLE_PLAYER_AVAILABILITY'; payload: { playerId: string } }
  | { type: 'REPLACE_PLAYER'; payload: { oldPlayerId: string; newPlayerName: string } }
  | { type: 'ADD_PLAYER_LIVE'; payload: { name: string } }
  | { type: 'REGENERATE_FUTURE_ROUNDS' }
  | { type: 'UPDATE_COURT'; payload: { courtId: string; name: string } }
  | { type: 'UPDATE_NAME'; payload: { name: string } }
  | { type: 'UPDATE_CONFIG'; payload: Partial<TournamentConfig> }
  | { type: 'GENERATE_SCHEDULE' }
  | { type: 'ADD_ROUNDS'; payload: { count: number } }
  | { type: 'SET_MATCH_SCORE'; payload: { roundId: string; matchId: string; score: MatchScore } }
  | { type: 'CLEAR_MATCH_SCORE'; payload: { roundId: string; matchId: string } }
  | { type: 'COMPLETE_TOURNAMENT' }
  | { type: 'RESET_TOURNAMENT' };
