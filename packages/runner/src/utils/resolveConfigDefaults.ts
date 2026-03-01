import type { TournamentConfig } from '@padel/common';

export const MINUTES_PER_POINT = 0.5;
export const MINUTES_PER_GAME = 4;
export const CHANGEOVER_MINUTES = 3;
const DEFAULT_DURATION_MINUTES = 120;
const PREFERRED_POINTS = 32;
const PREFERRED_GAMES = 16;
const MIN_POINTS_PER_MATCH = 16;
const MIN_GAMES = 6;
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

function getTimeConstant(mode: 'points' | 'games'): number {
  return mode === 'games' ? MINUTES_PER_GAME : MINUTES_PER_POINT;
}

function getPreferred(mode: 'points' | 'games'): number {
  return mode === 'games' ? PREFERRED_GAMES : PREFERRED_POINTS;
}

function getMin(mode: 'points' | 'games', format: string): number {
  if (mode === 'games') return MIN_GAMES;
  return format === 'king-of-the-court' ? 12 : MIN_POINTS_PER_MATCH;
}

export function resolveConfigDefaults(config: TournamentConfig, playerCount: number, clubCount?: number): TournamentConfig {
  const durationMinutes = config.targetDuration ?? DEFAULT_DURATION_MINUTES;
  const courtCount = config.courts.length;
  const playersPerRound = Math.min(courtCount * 4, playerCount);

  // Club formats have a fixed round count based on club count (round-robin fixtures)
  const clubFixedRounds = clubCount && clubCount >= 2
    ? (clubCount % 2 === 0 ? clubCount - 1 : clubCount)
    : null;

  const baseRounds = playersPerRound > 0
    ? Math.max(1, Math.ceil((playerCount - 1) * playerCount / playersPerRound))
    : 1;

  const hasExplicitRounds = config.maxRounds != null;
  const hasExplicitPoints = config.pointsPerMatch > 0;

  // Determine scoring mode — may auto-switch to games
  let scoringMode = config.scoringMode ?? 'points';

  // Auto-switch detection: if scoringMode is not explicitly set, check if points would exceed cap
  const shouldAutoDetect = config.scoringMode === undefined;

  let effectiveRounds: number;
  let effectivePoints: number;

  if (clubFixedRounds && !hasExplicitRounds) {
    // Club format: rounds are determined by club count, only adjust points for duration
    effectiveRounds = clubFixedRounds;
    if (hasExplicitPoints) {
      effectivePoints = config.pointsPerMatch;
    } else {
      // First try with points mode
      const rawPts = effectiveRounds > 0
        ? Math.floor((durationMinutes / effectiveRounds - CHANGEOVER_MINUTES) / MINUTES_PER_POINT)
        : PREFERRED_POINTS;

      if (shouldAutoDetect && rawPts > PREFERRED_POINTS) {
        // Points would exceed cap — switch to games mode
        scoringMode = 'games';
        const rawGames = effectiveRounds > 0
          ? Math.floor((durationMinutes / effectiveRounds - CHANGEOVER_MINUTES) / MINUTES_PER_GAME)
          : PREFERRED_GAMES;
        effectivePoints = Math.min(PREFERRED_GAMES, Math.max(MIN_GAMES, rawGames));
      } else {
        const preferred = getPreferred(scoringMode);
        const min = getMin(scoringMode, config.format);
        const tc = getTimeConstant(scoringMode);
        const raw = effectiveRounds > 0
          ? Math.floor((durationMinutes / effectiveRounds - CHANGEOVER_MINUTES) / tc)
          : preferred;
        effectivePoints = Math.min(preferred, Math.max(min, raw));
      }
    }
  } else if (hasExplicitRounds && hasExplicitPoints) {
    // Both set by user — use as-is
    effectiveRounds = config.maxRounds!;
    effectivePoints = config.pointsPerMatch;
  } else if (hasExplicitPoints) {
    // Points set — find best round count to fill duration
    const tc = getTimeConstant(scoringMode);
    effectiveRounds = findBestRoundsForPoints(durationMinutes, config.pointsPerMatch, playerCount, courtCount, baseRounds, tc);
    effectivePoints = config.pointsPerMatch;
  } else if (hasExplicitRounds) {
    // Rounds set — calculate points to fill duration
    effectiveRounds = config.maxRounds!;
    const preferred = getPreferred(scoringMode);
    const min = getMin(scoringMode, config.format);
    const tc = getTimeConstant(scoringMode);
    const rawPts = effectiveRounds > 0
      ? Math.floor((durationMinutes / effectiveRounds - CHANGEOVER_MINUTES) / tc)
      : preferred;

    if (shouldAutoDetect && scoringMode === 'points' && rawPts > PREFERRED_POINTS) {
      scoringMode = 'games';
      const rawGames = effectiveRounds > 0
        ? Math.floor((durationMinutes / effectiveRounds - CHANGEOVER_MINUTES) / MINUTES_PER_GAME)
        : PREFERRED_GAMES;
      effectivePoints = Math.min(PREFERRED_GAMES, Math.max(MIN_GAMES, rawGames));
    } else {
      effectivePoints = Math.min(preferred, Math.max(min, rawPts));
    }
  } else {
    // Neither set — find best (rounds, points) combo to fill target duration
    const min = getMin(scoringMode, config.format);
    const tc = getTimeConstant(scoringMode);
    const preferred = getPreferred(scoringMode);
    const result = findBestConfig(durationMinutes, playerCount, courtCount, baseRounds, min, tc, preferred);
    effectiveRounds = result.rounds;
    effectivePoints = result.points;

    if (shouldAutoDetect && scoringMode === 'points' && effectivePoints >= PREFERRED_POINTS) {
      // Check if with these rounds, points exceed the cap — but findBestConfig already caps,
      // so this scenario only triggers when we're at exactly PREFERRED_POINTS with few rounds
      // No auto-switch needed here since findBestConfig already found a valid combo
    }
  }

  return {
    ...config,
    pointsPerMatch: effectivePoints,
    maxRounds: effectiveRounds,
    scoringMode,
  };
}

/** Search all feasible round counts and pick the (rounds, points) combo
 *  that best fills the target duration, preferring fair sit-out distribution. */
function findBestConfig(
  durationMinutes: number,
  playerCount: number,
  courtCount: number,
  baseRounds: number,
  minPointsPerMatch: number,
  minutesPer: number,
  preferred: number,
): { rounds: number; points: number } {
  const maxRoundDur = Math.round(preferred * minutesPer + CHANGEOVER_MINUTES);
  const minRoundDur = Math.round(minPointsPerMatch * minutesPer + CHANGEOVER_MINUTES);

  const minRounds = Math.max(1, Math.ceil(durationMinutes / maxRoundDur));
  const maxRounds = Math.floor(durationMinutes / minRoundDur);

  if (maxRounds < 1) {
    return { rounds: 1, points: minPointsPerMatch };
  }

  let bestRounds = minRounds;
  let bestPoints = preferred;
  let bestScore = Infinity;

  for (let r = minRounds; r <= maxRounds; r++) {
    const rawPts = Math.floor((durationMinutes / r - CHANGEOVER_MINUTES) / minutesPer);
    const pts = Math.min(preferred, Math.max(minPointsPerMatch, rawPts));
    const roundDur = Math.round(pts * minutesPer + CHANGEOVER_MINUTES);
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
  minutesPer: number,
): number {
  const roundDur = Math.round(pointsPerMatch * minutesPer + CHANGEOVER_MINUTES);
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
