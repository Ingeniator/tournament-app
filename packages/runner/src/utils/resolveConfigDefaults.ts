import type { TournamentConfig } from '@padel/common';

const MINUTES_PER_POINT = 0.5;
const CHANGEOVER_MINUTES = 3;
const MAX_DURATION_MINUTES = 120;
const PREFERRED_POINTS = 24;
const MIN_POINTS_PER_MATCH = 16;

export function resolveConfigDefaults(config: TournamentConfig, playerCount: number): TournamentConfig {
  const playersPerRound = Math.min(config.courts.length * 4, playerCount);

  const baseRounds = playersPerRound > 0
    ? Math.max(1, Math.ceil((playerCount - 1) * playerCount / playersPerRound))
    : 1;

  const hasExplicitPoints = config.pointsPerMatch > 0;
  const assumedRoundDur = hasExplicitPoints
    ? Math.round(config.pointsPerMatch * MINUTES_PER_POINT + CHANGEOVER_MINUTES)
    : Math.round(MIN_POINTS_PER_MATCH * MINUTES_PER_POINT + CHANGEOVER_MINUTES);
  const maxRoundsFor2h = Math.floor(MAX_DURATION_MINUTES / assumedRoundDur);
  const defaultRounds = Math.min(baseRounds, maxRoundsFor2h);
  const effectiveRounds = config.maxRounds ?? defaultRounds;

  const maxPtsForRounds = effectiveRounds > 0
    ? Math.floor((MAX_DURATION_MINUTES / effectiveRounds - CHANGEOVER_MINUTES) / MINUTES_PER_POINT)
    : PREFERRED_POINTS;
  const defaultPoints = Math.min(PREFERRED_POINTS, Math.max(MIN_POINTS_PER_MATCH, maxPtsForRounds));
  const effectivePoints = hasExplicitPoints ? config.pointsPerMatch : defaultPoints;

  return {
    ...config,
    pointsPerMatch: effectivePoints,
    maxRounds: effectiveRounds,
  };
}
