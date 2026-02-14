import type { TournamentConfig } from '@padel/common';

const MINUTES_PER_POINT = 0.5;
const CHANGEOVER_MINUTES = 3;
const DEFAULT_DURATION_MINUTES = 120;
const PREFERRED_POINTS = 24;
const MIN_POINTS_PER_MATCH = 16;

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

export interface SitOutInfo {
  /** Whether every player sits out the same number of times */
  isEqual: boolean;
  /** How many players sit out each round (0 = no sit-outs) */
  sitOutsPerRound: number;
  /** Nearest round count <= current that gives equal sit-outs (null if none >=1) */
  nearestFairBelow: number | null;
  /** Nearest round count >= current that gives equal sit-outs */
  nearestFairAbove: number | null;
}

/** Compute whether a round count distributes sit-outs equally across all players. */
export function computeSitOutInfo(playerCount: number, courtCount: number, rounds: number): SitOutInfo {
  const playersPerRound = Math.min(courtCount * 4, playerCount);
  const sitOutsPerRound = playerCount - playersPerRound;

  if (sitOutsPerRound <= 0 || playerCount <= 0) {
    return { isEqual: true, sitOutsPerRound: 0, nearestFairBelow: null, nearestFairAbove: null };
  }

  const isEqual = (rounds * sitOutsPerRound) % playerCount === 0;

  // Fair step: the smallest positive R where (R * sitOutsPerRound) % playerCount === 0
  const fairStep = playerCount / gcd(sitOutsPerRound, playerCount);

  const nearestFairBelow = fairStep > 0
    ? Math.floor(rounds / fairStep) * fairStep || null
    : null;
  const nearestFairAbove = fairStep > 0
    ? Math.ceil(rounds / fairStep) * fairStep || fairStep
    : null;

  return { isEqual, sitOutsPerRound, nearestFairBelow, nearestFairAbove };
}

export function resolveConfigDefaults(config: TournamentConfig, playerCount: number): TournamentConfig {
  const durationMinutes = config.targetDuration ?? DEFAULT_DURATION_MINUTES;
  const playersPerRound = Math.min(config.courts.length * 4, playerCount);

  const baseRounds = playersPerRound > 0
    ? Math.max(1, Math.ceil((playerCount - 1) * playerCount / playersPerRound))
    : 1;

  const hasExplicitPoints = config.pointsPerMatch > 0;
  const assumedRoundDur = hasExplicitPoints
    ? Math.round(config.pointsPerMatch * MINUTES_PER_POINT + CHANGEOVER_MINUTES)
    : Math.round(MIN_POINTS_PER_MATCH * MINUTES_PER_POINT + CHANGEOVER_MINUTES);
  const maxRoundsForDuration = Math.floor(durationMinutes / assumedRoundDur);
  const rawDefault = Math.min(baseRounds, maxRoundsForDuration);

  // Try to nudge the default towards a fair round count (equal sit-outs)
  const defaultRounds = nudgeToFairRounds(rawDefault, playerCount, config.courts.length, maxRoundsForDuration);

  const effectiveRounds = config.maxRounds ?? defaultRounds;

  const maxPtsForRounds = effectiveRounds > 0
    ? Math.floor((durationMinutes / effectiveRounds - CHANGEOVER_MINUTES) / MINUTES_PER_POINT)
    : PREFERRED_POINTS;
  const defaultPoints = Math.min(PREFERRED_POINTS, Math.max(MIN_POINTS_PER_MATCH, maxPtsForRounds));
  const effectivePoints = hasExplicitPoints ? config.pointsPerMatch : defaultPoints;

  return {
    ...config,
    pointsPerMatch: effectivePoints,
    maxRounds: effectiveRounds,
  };
}

/** Nudge a round count towards the nearest value with equal sit-outs, staying within duration limits. */
function nudgeToFairRounds(rawRounds: number, playerCount: number, courtCount: number, maxRounds: number): number {
  const info = computeSitOutInfo(playerCount, courtCount, rawRounds);
  if (info.isEqual || info.sitOutsPerRound === 0) return rawRounds;

  const below = info.nearestFairBelow;
  const above = info.nearestFairAbove;

  // Prefer the closest fair value that stays within the duration limit and is at least 1
  const candidates: number[] = [];
  if (below !== null && below >= 1) candidates.push(below);
  if (above !== null && above >= 1 && above <= maxRounds) candidates.push(above);

  if (candidates.length === 0) return rawRounds;

  // Pick the one closest to rawRounds; on tie prefer the higher count (more games)
  candidates.sort((a, b) => {
    const da = Math.abs(a - rawRounds);
    const db = Math.abs(b - rawRounds);
    return da !== db ? da - db : b - a;
  });

  return candidates[0];
}
