import type { TournamentConfig } from '@padel/common';

const MINUTES_PER_POINT = 0.5;
const CHANGEOVER_MINUTES = 3;
const DEFAULT_DURATION_MINUTES = 120;
const PREFERRED_POINTS = 30;
const MIN_POINTS_PER_MATCH = 16;
const UNFAIR_PENALTY = 10;

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
  const minPoints = config.format === 'king-of-the-court' ? 24 : MIN_POINTS_PER_MATCH;
  const durationMinutes = config.targetDuration ?? DEFAULT_DURATION_MINUTES;
  const courtCount = config.courts.length;
  const playersPerRound = Math.min(courtCount * 4, playerCount);

  const baseRounds = playersPerRound > 0
    ? Math.max(1, Math.ceil((playerCount - 1) * playerCount / playersPerRound))
    : 1;

  const hasExplicitRounds = config.maxRounds != null;
  const hasExplicitPoints = config.pointsPerMatch > 0;

  let effectiveRounds: number;
  let effectivePoints: number;

  if (hasExplicitRounds && hasExplicitPoints) {
    // Both set by user — use as-is
    effectiveRounds = config.maxRounds!;
    effectivePoints = config.pointsPerMatch;
  } else if (hasExplicitPoints) {
    // Points set — find best round count to fill duration
    effectiveRounds = findBestRoundsForPoints(durationMinutes, config.pointsPerMatch, playerCount, courtCount, baseRounds);
    effectivePoints = config.pointsPerMatch;
  } else if (hasExplicitRounds) {
    // Rounds set — calculate points to fill duration
    effectiveRounds = config.maxRounds!;
    const rawPts = effectiveRounds > 0
      ? Math.floor((durationMinutes / effectiveRounds - CHANGEOVER_MINUTES) / MINUTES_PER_POINT)
      : PREFERRED_POINTS;
    effectivePoints = Math.min(PREFERRED_POINTS, Math.max(minPoints, rawPts));
  } else {
    // Neither set — find best (rounds, points) combo to fill target duration
    const result = findBestConfig(durationMinutes, playerCount, courtCount, baseRounds, minPoints);
    effectiveRounds = result.rounds;
    effectivePoints = result.points;
  }

  return {
    ...config,
    pointsPerMatch: effectivePoints,
    maxRounds: effectiveRounds,
  };
}

/** Search all feasible round counts and pick the (rounds, points) combo
 *  that best fills the target duration, preferring fair sit-out distribution. */
function findBestConfig(
  durationMinutes: number,
  playerCount: number,
  courtCount: number,
  baseRounds: number,
  minPointsPerMatch: number = MIN_POINTS_PER_MATCH,
): { rounds: number; points: number } {
  const maxRoundDur = Math.round(PREFERRED_POINTS * MINUTES_PER_POINT + CHANGEOVER_MINUTES);
  const minRoundDur = Math.round(minPointsPerMatch * MINUTES_PER_POINT + CHANGEOVER_MINUTES);

  const minRounds = Math.max(1, Math.ceil(durationMinutes / maxRoundDur));
  const maxRounds = Math.floor(durationMinutes / minRoundDur);

  if (maxRounds < 1) {
    return { rounds: 1, points: minPointsPerMatch };
  }

  let bestRounds = minRounds;
  let bestPoints = PREFERRED_POINTS;
  let bestScore = Infinity;

  for (let r = minRounds; r <= maxRounds; r++) {
    const rawPts = Math.floor((durationMinutes / r - CHANGEOVER_MINUTES) / MINUTES_PER_POINT);
    const pts = Math.min(PREFERRED_POINTS, Math.max(minPointsPerMatch, rawPts));
    const roundDur = Math.round(pts * MINUTES_PER_POINT + CHANGEOVER_MINUTES);
    const estimate = r * roundDur;
    const diff = durationMinutes - estimate;

    // Penalize going over target more heavily (courts are booked for fixed time)
    const timeCost = diff >= 0 ? diff : -diff * 3;

    const sitOut = computeSitOutInfo(playerCount, courtCount, r);
    const isFair = sitOut.isEqual || sitOut.sitOutsPerRound === 0;
    const fairCost = isFair ? 0 : UNFAIR_PENALTY;

    // Slight preference for more rounds (more player variety) as tiebreaker
    const varietyBonus = Math.min(r, baseRounds) * 0.1;

    const score = timeCost + fairCost - varietyBonus;

    if (score < bestScore || (score === bestScore && r > bestRounds)) {
      bestScore = score;
      bestRounds = r;
      bestPoints = pts;
    }
  }

  return { rounds: bestRounds, points: bestPoints };
}

/** Find best round count for user-specified points, using same scoring as findBestConfig. */
function findBestRoundsForPoints(
  durationMinutes: number,
  pointsPerMatch: number,
  playerCount: number,
  courtCount: number,
  baseRounds: number,
): number {
  const roundDur = Math.round(pointsPerMatch * MINUTES_PER_POINT + CHANGEOVER_MINUTES);
  const maxRounds = Math.max(1, Math.floor(durationMinutes / roundDur));

  let bestRounds = 1;
  let bestScore = Infinity;

  for (let r = 1; r <= maxRounds; r++) {
    const estimate = r * roundDur;
    const diff = durationMinutes - estimate;
    const timeCost = diff >= 0 ? diff : -diff * 3;

    const sitOut = computeSitOutInfo(playerCount, courtCount, r);
    const isFair = sitOut.isEqual || sitOut.sitOutsPerRound === 0;
    const fairCost = isFair ? 0 : UNFAIR_PENALTY;

    const varietyBonus = Math.min(r, baseRounds) * 0.1;
    const score = timeCost + fairCost - varietyBonus;

    if (score < bestScore || (score === bestScore && r > bestRounds)) {
      bestScore = score;
      bestRounds = r;
    }
  }

  return bestRounds;
}
