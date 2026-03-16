import type { Tournament } from '@padel/common';
import { getStrategy } from '../strategies';

export function usePlayProgress(tournament: Tournament | null) {
  const strategy = tournament ? getStrategy(tournament.config.format) : null;
  const totalMatches = tournament?.rounds.reduce((n, r) => n + r.matches.length, 0) ?? 0;
  const scoredMatches = tournament?.rounds.reduce(
    (n, r) => n + r.matches.filter(m => m.score).length, 0
  ) ?? 0;
  const scoredRounds = tournament?.rounds.filter(r => r.matches.every(m => m.score)).length ?? 0;
  const plannedRounds = tournament
    ? (strategy?.isDynamic
        ? (tournament.config.maxRounds ?? tournament.players.length - 1)
        : tournament.rounds.length)
    : 0;

  const activeRoundIndex = tournament?.rounds.findIndex(r => r.matches.some(m => !m.score)) ?? -1;
  const activeRound = tournament && activeRoundIndex >= 0 ? tournament.rounds[activeRoundIndex] : null;
  const prevRound = tournament && activeRoundIndex > 0 ? tournament.rounds[activeRoundIndex - 1] : null;
  const nextRound = tournament && activeRoundIndex >= 0 && activeRoundIndex + 1 < tournament.rounds.length
    ? tournament.rounds[activeRoundIndex + 1]
    : null;

  return { totalMatches, scoredMatches, scoredRounds, plannedRounds, activeRound, prevRound, nextRound };
}
