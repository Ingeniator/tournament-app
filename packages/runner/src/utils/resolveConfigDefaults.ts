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
    // Points set — calculate rounds to fill duration
    const roundDur = Math.round(config.pointsPerMatch * MINUTES_PER_POINT + CHANGEOVER_MINUTES);
    const maxRounds = Math.max(1, Math.floor(durationMinutes / roundDur));
    const raw = Math.min(baseRounds, maxRounds);
    effectiveRounds = Math.max(1, nudgeToFairRounds(raw, playerCount, courtCount, maxRounds));
    effectivePoints = config.pointsPerMatch;
  } else if (hasExplicitRounds) {
    // Rounds set — calculate points to fill duration
    effectiveRounds = config.maxRounds!;
    const rawPts = effectiveRounds > 0
      ? Math.floor((durationMinutes / effectiveRounds - CHANGEOVER_MINUTES) / MINUTES_PER_POINT)
      : PREFERRED_POINTS;
    effectivePoints = Math.min(PREFERRED_POINTS, Math.max(MIN_POINTS_PER_MATCH, rawPts));
  } else {
    // Neither set — find best (rounds, points) combo to fill target duration
    const result = findBestConfig(durationMinutes, playerCount, courtCount, baseRounds);
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
): { rounds: number; points: number } {
  const maxRoundDur = Math.round(PREFERRED_POINTS * MINUTES_PER_POINT + CHANGEOVER_MINUTES);
  const minRoundDur = Math.round(MIN_POINTS_PER_MATCH * MINUTES_PER_POINT + CHANGEOVER_MINUTES);

  const minRounds = Math.max(1, Math.ceil(durationMinutes / maxRoundDur));
  const maxRounds = Math.floor(durationMinutes / minRoundDur);

  if (maxRounds < 1) {
    return { rounds: 1, points: MIN_POINTS_PER_MATCH };
  }

  let bestRounds = minRounds;
  let bestPoints = PREFERRED_POINTS;
  let bestScore = Infinity;

  for (let r = minRounds; r <= maxRounds; r++) {
    const rawPts = Math.floor((durationMinutes / r - CHANGEOVER_MINUTES) / MINUTES_PER_POINT);
    const pts = Math.min(PREFERRED_POINTS, Math.max(MIN_POINTS_PER_MATCH, rawPts));
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

/** Nudge a round count towards the nearest fair value that does NOT exceed the duration limit.
 *  Courts are booked for a fixed time, so going over is not acceptable.
 *  Only fall back to a value above maxRounds if no fair value exists at or below. */
function nudgeToFairRounds(rawRounds: number, playerCount: number, courtCount: number, maxRounds: number): number {
  const info = computeSitOutInfo(playerCount, courtCount, rawRounds);
  if (info.isEqual || info.sitOutsPerRound === 0) return rawRounds;

  const below = info.nearestFairBelow;
  const above = info.nearestFairAbove;

  // Strongly prefer fair values that stay within the duration limit
  if (below !== null && below >= 1 && below <= maxRounds) return below;
  // Only go above if nothing fair fits within the limit
  if (above !== null && above >= 1 && above <= maxRounds) return above;

  // No fair value within limit — stay with the raw value (capped to limit)
  return Math.min(rawRounds, maxRounds);
}
