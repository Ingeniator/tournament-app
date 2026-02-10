import type { TournamentStrategy, ScheduleResult } from './types';
import type { Player, TournamentConfig, Round, Match } from '@padel/common';
import { generateId } from '@padel/common';
import { shuffle, partnerKey, commonValidateSetup, commonValidateScore, calculateIndividualStandings } from './shared';

type Pairing = [[string, string], [string, string]];

function getPairingsForGroup(group: string[]): Pairing[] {
  const [a, b, c, d] = group;
  return [
    [[a, b], [c, d]],
    [[a, c], [b, d]],
    [[a, d], [b, c]],
  ];
}

/**
 * Score a pairing. Uses sum-of-squares for opponent counts to penalize imbalance:
 * e.g. [2,0,0,0]→4 vs [1,1,0,0]→2, so the balanced option wins.
 * Partner repeats heavily penalized (×100) to keep them dominant.
 */
function scorePairing(
  p1: [string, string],
  p2: [string, string],
  partnerCounts: Map<string, number>,
  opponentCounts: Map<string, number>
): number {
  const partnerScore =
    (partnerCounts.get(partnerKey(p1[0], p1[1])) ?? 0) +
    (partnerCounts.get(partnerKey(p2[0], p2[1])) ?? 0);
  const o1 = opponentCounts.get(partnerKey(p1[0], p2[0])) ?? 0;
  const o2 = opponentCounts.get(partnerKey(p1[0], p2[1])) ?? 0;
  const o3 = opponentCounts.get(partnerKey(p1[1], p2[0])) ?? 0;
  const o4 = opponentCounts.get(partnerKey(p1[1], p2[1])) ?? 0;
  return partnerScore * 100 + o1 * o1 + o2 * o2 + o3 * o3 + o4 * o4;
}

function scoreGrouping(
  groups: string[][],
  partnerCounts: Map<string, number>,
  opponentCounts: Map<string, number>,
  courtMates?: Set<string>
): number {
  let total = 0;
  for (const group of groups) {
    const pairings = getPairingsForGroup(group);
    total += Math.min(...pairings.map(([p1, p2]) => scorePairing(p1, p2, partnerCounts, opponentCounts)));

    // Tiebreaker: prefer groupings that cover new pairs.
    // Fractional weight (0.01) so it only matters when partner/opponent
    // scores are equal — never overrides those integer-valued priorities.
    if (courtMates) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          if (courtMates.has(partnerKey(group[i], group[j]))) {
            total += 0.01;
          }
        }
      }
    }
  }
  return total;
}

function bestPairingForGroup(
  group: string[],
  partnerCounts: Map<string, number>,
  opponentCounts: Map<string, number>
): Pairing {
  const pairings = getPairingsForGroup(group);
  let best = pairings[0];
  let bestScore = Infinity;
  for (const pairing of pairings) {
    const score = scorePairing(pairing[0], pairing[1], partnerCounts, opponentCounts);
    if (score < bestScore) {
      bestScore = score;
      best = pairing;
    }
  }
  return best;
}

/** Returns all permutations of indices [0..n-1] */
function indexPermutations(n: number): number[][] {
  if (n <= 1) return [[0]];
  const result: number[][] = [];
  function permute(arr: number[], start: number) {
    if (start === arr.length) { result.push([...arr]); return; }
    for (let i = start; i < arr.length; i++) {
      [arr[start], arr[i]] = [arr[i], arr[start]];
      permute(arr, start + 1);
      [arr[start], arr[i]] = [arr[i], arr[start]];
    }
  }
  permute(Array.from({ length: n }, (_, i) => i), 0);
  return result;
}

/** Seed partner counts, opponent counts, games played, court counts, court mates, and last sit-out round from existing rounds */
function seedFromRounds(
  existingRounds: Round[],
  players: Player[]
): { partnerCounts: Map<string, number>; opponentCounts: Map<string, number>; gamesPlayed: Map<string, number>; courtCounts: Map<string, number>; courtMates: Set<string>; lastSitOutRound: Map<string, number> } {
  const partnerCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();
  const gamesPlayed = new Map<string, number>();
  const courtCounts = new Map<string, number>();
  const courtMates = new Set<string>();
  const lastSitOutRound = new Map<string, number>();
  players.forEach(p => { gamesPlayed.set(p.id, 0); lastSitOutRound.set(p.id, -Infinity); });

  for (const round of existingRounds) {
    for (const id of round.sitOuts) {
      lastSitOutRound.set(id, round.roundNumber);
    }
    for (const match of round.matches) {
      const k1 = partnerKey(match.team1[0], match.team1[1]);
      const k2 = partnerKey(match.team2[0], match.team2[1]);
      partnerCounts.set(k1, (partnerCounts.get(k1) ?? 0) + 1);
      partnerCounts.set(k2, (partnerCounts.get(k2) ?? 0) + 1);
      courtMates.add(k1);
      courtMates.add(k2);
      for (const a of match.team1) {
        for (const b of match.team2) {
          const ok = partnerKey(a, b);
          opponentCounts.set(ok, (opponentCounts.get(ok) ?? 0) + 1);
          courtMates.add(ok);
        }
      }
      for (const pid of [...match.team1, ...match.team2]) {
        gamesPlayed.set(pid, (gamesPlayed.get(pid) ?? 0) + 1);
        const ck = `${pid}:${match.courtId}`;
        courtCounts.set(ck, (courtCounts.get(ck) ?? 0) + 1);
      }
    }
  }

  return { partnerCounts, opponentCounts, gamesPlayed, courtCounts, courtMates, lastSitOutRound };
}

/**
 * Enumerate all unique ways to partition `items` into groups of 4.
 * Fixes first element of each sub-problem to avoid duplicate permutations.
 * - 8 items (2 courts): 35 partitions
 * - 12 items (3 courts): 5,775 partitions
 */
function allGroupPartitions(items: string[]): string[][][] {
  if (items.length === 4) return [[items]];
  const results: string[][][] = [];
  const first = items[0];
  const rest = items.slice(1);

  // Pick 3 from rest to join first, recurse on remainder
  function pickCombo(arr: string[], k: number, start: number, current: string[]) {
    if (k === 0) {
      const group = [first, ...current];
      const remaining = rest.filter(x => !current.includes(x));
      for (const sub of allGroupPartitions(remaining)) {
        results.push([group, ...sub]);
      }
      return;
    }
    for (let i = start; i <= arr.length - k; i++) {
      current.push(arr[i]);
      pickCombo(arr, k - 1, i + 1, current);
      current.pop();
    }
  }

  pickCombo(rest, 3, 0, []);
  return results;
}

/** Generate `count` rounds starting from `startRoundNumber`, using existing history for balance */
function generateRounds(
  players: Player[],
  config: TournamentConfig,
  count: number,
  startRoundNumber: number,
  partnerCounts: Map<string, number>,
  opponentCounts: Map<string, number>,
  gamesPlayed: Map<string, number>,
  courtCounts: Map<string, number>,
  courtMates: Set<string>,
  lastSitOutRound: Map<string, number>
): { rounds: Round[]; warnings: string[] } {
  const warnings: string[] = [];
  const n = players.length;
  const availableCourts = config.courts.filter(c => !c.unavailable);
  const numCourts = Math.min(availableCourts.length, Math.floor(n / 4));
  const playersPerRound = numCourts * 4;
  const sitOutCount = n - playersPerRound;
  const useEnumeration = numCourts <= 3;
  const maxAttempts = numCourts <= 4 ? 6000 : 20000;

  if (sitOutCount > 0 && startRoundNumber === 1) {
    warnings.push(`${sitOutCount} player(s) will sit out each round`);
  }

  const rounds: Round[] = [];

  for (let r = 0; r < count; r++) {
    // Select sit-outs: most games first, tiebreak by longest since last sit-out (most "due")
    const roundNum = startRoundNumber + r;
    const sorted = shuffle([...players]).sort((a, b) => {
      const gamesDiff = (gamesPlayed.get(b.id) ?? 0) - (gamesPlayed.get(a.id) ?? 0);
      if (gamesDiff !== 0) return gamesDiff;
      // Among tied players, prefer the one who sat out longest ago (lowest lastSitOutRound)
      return (lastSitOutRound.get(a.id) ?? -Infinity) - (lastSitOutRound.get(b.id) ?? -Infinity);
    });
    const sitOutPlayers = sorted.slice(0, sitOutCount);
    const sitOutIds = new Set(sitOutPlayers.map(p => p.id));
    const activeIds = players.filter(p => !sitOutIds.has(p.id)).map(p => p.id);

    let bestGroups: string[][] = [];
    let bestScore = Infinity;

    const courtIds = availableCourts.slice(0, numCourts).map(c => c.id);

    if (useEnumeration) {
      // Exhaustive: evaluate every unique partition, then tiebreak by court balance + coverage
      let tied: string[][][] = [];
      for (const groups of allGroupPartitions(activeIds)) {
        const score = scoreGrouping(groups, partnerCounts, opponentCounts);
        if (score < bestScore) {
          bestScore = score;
          tied = [groups];
        } else if (score === bestScore) {
          tied.push(groups);
        }
      }
      // Among ties, prefer groupings with better court balance, then better coverage
      let narrowed = tied;
      if (narrowed.length > 1 && numCourts > 1) {
        const perms = indexPermutations(numCourts);
        let bestCourt = Infinity;
        const candidates: string[][][] = [];
        for (const groups of narrowed) {
          let groupBest = Infinity;
          for (const perm of perms) {
            let s = 0;
            for (let gi = 0; gi < groups.length; gi++) {
              for (const pid of groups[gi]) {
                const c = (courtCounts.get(`${pid}:${courtIds[perm[gi]]}`) ?? 0) + 1;
                s += c * c;
              }
            }
            if (s < groupBest) groupBest = s;
          }
          if (groupBest < bestCourt) {
            bestCourt = groupBest;
            candidates.length = 0;
            candidates.push(groups);
          } else if (groupBest === bestCourt) {
            candidates.push(groups);
          }
        }
        narrowed = candidates;
      }
      // Coverage tiebreaker: prefer groupings that cover more new pairs
      if (narrowed.length > 1 && courtMates.size > 0) {
        let bestNewPairs = -1;
        const coverageBest: string[][][] = [];
        for (const groups of narrowed) {
          let newPairs = 0;
          for (const group of groups) {
            for (let i = 0; i < group.length; i++) {
              for (let j = i + 1; j < group.length; j++) {
                if (!courtMates.has(partnerKey(group[i], group[j]))) {
                  newPairs++;
                }
              }
            }
          }
          if (newPairs > bestNewPairs) {
            bestNewPairs = newPairs;
            coverageBest.length = 0;
            coverageBest.push(groups);
          } else if (newPairs === bestNewPairs) {
            coverageBest.push(groups);
          }
        }
        narrowed = coverageBest;
      }
      bestGroups = narrowed[Math.floor(Math.random() * narrowed.length)];
    } else {
      // Random sampling for 4+ courts
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const shuffled = shuffle([...activeIds]);
        const groups: string[][] = [];
        for (let i = 0; i < numCourts; i++) {
          groups.push(shuffled.slice(i * 4, i * 4 + 4));
        }
        const score = scoreGrouping(groups, partnerCounts, opponentCounts, courtMates);
        if (score < bestScore) {
          bestScore = score;
          bestGroups = groups;
          if (score === 0) break;
        }
      }
    }

    // Optimize court assignment: enumerate all court permutations, pick lowest sum-of-squares
    let bestCourtPerm = Array.from({ length: numCourts }, (_, i) => i);
    if (numCourts > 1 && numCourts <= 4) {
      const perms = indexPermutations(numCourts);
      let bestCourtScore = Infinity;
      for (const perm of perms) {
        let score = 0;
        for (let gi = 0; gi < bestGroups.length; gi++) {
          const cId = courtIds[perm[gi]];
          for (const pid of bestGroups[gi]) {
            const c = (courtCounts.get(`${pid}:${cId}`) ?? 0) + 1;
            score += c * c;
          }
        }
        if (score < bestCourtScore) {
          bestCourtScore = score;
          bestCourtPerm = perm;
        }
      }
    }

    // Create matches from best groups with optimized court assignment
    const matches: Match[] = bestGroups.map((group, idx) => {
      const pairing = bestPairingForGroup(group, partnerCounts, opponentCounts);
      const [team1, team2] = pairing;
      return {
        id: generateId(),
        courtId: courtIds[bestCourtPerm[idx]],
        team1: team1 as [string, string],
        team2: team2 as [string, string],
        score: null,
      };
    });

    // Update partner counts, opponent counts, games played, court counts, and court mates
    for (const match of matches) {
      const k1 = partnerKey(match.team1[0], match.team1[1]);
      const k2 = partnerKey(match.team2[0], match.team2[1]);
      partnerCounts.set(k1, (partnerCounts.get(k1) ?? 0) + 1);
      partnerCounts.set(k2, (partnerCounts.get(k2) ?? 0) + 1);
      courtMates.add(k1);
      courtMates.add(k2);
      for (const a of match.team1) {
        for (const b of match.team2) {
          const ok = partnerKey(a, b);
          opponentCounts.set(ok, (opponentCounts.get(ok) ?? 0) + 1);
          courtMates.add(ok);
        }
      }
      for (const pid of [...match.team1, ...match.team2]) {
        gamesPlayed.set(pid, (gamesPlayed.get(pid) ?? 0) + 1);
        const ck = `${pid}:${match.courtId}`;
        courtCounts.set(ck, (courtCounts.get(ck) ?? 0) + 1);
      }
    }

    // Track sit-out timing
    for (const id of sitOutIds) {
      lastSitOutRound.set(id, roundNum);
    }

    rounds.push({
      id: generateId(),
      roundNumber: roundNum,
      matches,
      sitOuts: [...sitOutIds],
    });
  }

  return { rounds, warnings };
}

/** Score a schedule: [partnerRepeats, opponentSpread, neverPlayed, courtSpread]. Lower is better. */
export function scoreSchedule(rounds: Round[], seedPartnerCounts?: Map<string, number>): [number, number, number, number] {
  const pc = new Map<string, number>(seedPartnerCounts);
  const oc = new Map<string, number>();
  // Track per-court per-player counts: key = "playerId:courtId"
  const cc = new Map<string, number>();
  const courtIds = new Set<string>();
  const playerIds = new Set<string>();
  for (const round of rounds) {
    for (const match of round.matches) {
      const k1 = partnerKey(match.team1[0], match.team1[1]);
      const k2 = partnerKey(match.team2[0], match.team2[1]);
      pc.set(k1, (pc.get(k1) ?? 0) + 1);
      pc.set(k2, (pc.get(k2) ?? 0) + 1);
      for (const a of match.team1) {
        for (const b of match.team2) {
          const ok = partnerKey(a, b);
          oc.set(ok, (oc.get(ok) ?? 0) + 1);
        }
      }
      courtIds.add(match.courtId);
      for (const pid of [...match.team1, ...match.team2]) {
        playerIds.add(pid);
        const ck = `${pid}:${match.courtId}`;
        cc.set(ck, (cc.get(ck) ?? 0) + 1);
      }
    }
    for (const pid of round.sitOuts) playerIds.add(pid);
  }
  let repeats = 0;
  for (const c of pc.values()) if (c > 1) repeats += c - 1;

  let min = Infinity;
  let max = -Infinity;
  for (const c of oc.values()) {
    if (c < min) min = c;
    if (c > max) max = c;
  }
  const spread = max === -Infinity ? 0 : max - min;

  // Never played: pairs who never shared a court (as partner or opponent)
  const courtMates = new Set<string>([...pc.keys(), ...oc.keys()]);
  const totalPairs = playerIds.size * (playerIds.size - 1) / 2;
  const neverPlayed = totalPairs - courtMates.size;

  // Court spread: max spread across all courts
  let courtSpread = 0;
  if (courtIds.size > 1) {
    for (const courtId of courtIds) {
      let cMin = Infinity, cMax = -Infinity;
      for (const pid of playerIds) {
        const cnt = cc.get(`${pid}:${courtId}`) ?? 0;
        if (cnt < cMin) cMin = cnt;
        if (cnt > cMax) cMax = cnt;
      }
      if (cMax - cMin > courtSpread) courtSpread = cMax - cMin;
    }
  }

  return [repeats, spread, neverPlayed, courtSpread];
}

/** Compare 4-tuple scores lexicographically. Returns true if a is strictly better (lower) than b. */
function isBetterScore(a: [number, number, number, number], b: [number, number, number, number]): boolean {
  for (let i = 0; i < 4; i++) {
    if (a[i] < b[i]) return true;
    if (a[i] > b[i]) return false;
  }
  return false;
}

/** Try generating rounds within a time budget, keep the best schedule by [repeats, oppSpread, neverPlayed, courtSpread] */
function generateRoundsWithRetry(
  players: Player[],
  config: TournamentConfig,
  count: number,
  startRoundNumber: number,
  seedPartnerCounts: Map<string, number>,
  seedOpponentCounts: Map<string, number>,
  seedGamesPlayed: Map<string, number>,
  seedCourtCounts: Map<string, number>,
  seedCourtMates: Set<string>,
  seedLastSitOutRound: Map<string, number>,
  timeBudgetMs: number,
): ScheduleResult {
  let bestResult: ScheduleResult | null = null;
  let bestScore: [number, number, number, number] = [Infinity, Infinity, Infinity, Infinity];
  const deadline = performance.now() + timeBudgetMs;

  do {
    const result = generateRounds(
      players, config, count, startRoundNumber,
      new Map(seedPartnerCounts), new Map(seedOpponentCounts), new Map(seedGamesPlayed), new Map(seedCourtCounts), new Set(seedCourtMates), new Map(seedLastSitOutRound),
    );
    const score = scoreSchedule(result.rounds, seedPartnerCounts);
    if (isBetterScore(score, bestScore)) {
      bestScore = score;
      bestResult = result;
    }
    if (bestScore[0] === 0 && bestScore[1] <= 1 && bestScore[2] === 0 && bestScore[3] <= 1) break;
  } while (performance.now() < deadline);

  return bestResult!;
}

export const americanoStrategy: TournamentStrategy = {
  isDynamic: false,
  validateSetup: commonValidateSetup,
  validateScore: commonValidateScore,
  calculateStandings: calculateIndividualStandings,

  generateSchedule(players: Player[], config: TournamentConfig): ScheduleResult {
    const totalRounds = config.maxRounds ?? players.length - 1;
    const gamesPlayed = new Map<string, number>();
    const lastSitOutRound = new Map<string, number>();
    players.forEach(p => { gamesPlayed.set(p.id, 0); lastSitOutRound.set(p.id, -Infinity); });
    return generateRoundsWithRetry(players, config, totalRounds, 1, new Map(), new Map(), gamesPlayed, new Map(), new Set(), lastSitOutRound, 500);
  },

  generateAdditionalRounds(players: Player[], config: TournamentConfig, existingRounds: Round[], count: number, excludePlayerIds?: string[], timeBudgetMs?: number): ScheduleResult {
    const activePlayers = excludePlayerIds?.length
      ? players.filter(p => !excludePlayerIds.includes(p.id))
      : players;
    const { partnerCounts, opponentCounts, gamesPlayed, courtCounts, courtMates, lastSitOutRound } = seedFromRounds(existingRounds, activePlayers);
    const startRoundNumber = existingRounds.length + 1;
    const budget = timeBudgetMs ?? (count > 1 ? 500 : 0);
    return generateRoundsWithRetry(activePlayers, config, count, startRoundNumber, partnerCounts, opponentCounts, gamesPlayed, courtCounts, courtMates, lastSitOutRound, budget);
  },
};
