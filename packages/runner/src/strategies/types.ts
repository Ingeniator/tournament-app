import type { Player, TournamentConfig, Round, Tournament, StandingsEntry, MatchScore } from '@padel/common';

export interface ScheduleResult {
  rounds: Round[];
  warnings: string[];
}

export interface TournamentStrategy {
  isDynamic: boolean;
  generateSchedule(players: Player[], config: TournamentConfig): ScheduleResult;
  generateAdditionalRounds(players: Player[], config: TournamentConfig, existingRounds: Round[], count: number, excludePlayerIds?: string[]): ScheduleResult;
  calculateStandings(tournament: Tournament): StandingsEntry[];
  validateSetup(players: Player[], config: TournamentConfig): string[];
  validateScore(score: MatchScore, config: TournamentConfig): string | null;
}
