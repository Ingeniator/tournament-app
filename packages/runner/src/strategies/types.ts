import type { Player, TournamentConfig, Round, Tournament, StandingsEntry, MatchScore, Competitor } from '@padel/common';

export interface ScheduleResult {
  rounds: Round[];
  warnings: string[];
}

export interface TournamentStrategy {
  isDynamic: boolean;
  hasFixedPartners: boolean;
  getCompetitors(tournament: Tournament): Competitor[];
  generateSchedule(players: Player[], config: TournamentConfig, tournament?: Tournament): ScheduleResult;
  generateAdditionalRounds(players: Player[], config: TournamentConfig, existingRounds: Round[], count: number, excludePlayerIds?: string[], timeBudgetMs?: number, tournament?: Tournament): ScheduleResult;
  calculateStandings(tournament: Tournament): StandingsEntry[];
  validateSetup(players: Player[], config: TournamentConfig): string[];
  validateScore(score: MatchScore, config: TournamentConfig): string | null;
}
