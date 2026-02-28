import type { TournamentStrategy, ScheduleResult } from './types';
import type { Player, TournamentConfig, Round, Match, Tournament } from '@padel/common';
import { generateId } from '@padel/common';
import { shuffle, partnerKey, commonValidateSetup, commonValidateScore, calculateCompetitorStandings, calculateIndividualStandings, seedFromRounds, selectSitOuts, scoreSchedule } from './shared';

type Pairing = [[string, string], [string, string]];

/** Detect cross-group mode from player data */
function isCrossGroup(players: Player[]): boolean {
  return players.some(p => p.group === 'A') && players.some(p => p.group === 'B');
}

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
  courtMates?: Set<string>,
  rankMap?: Map<string, number>
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

    // Standings proximity: prefer groups where players have similar rankings.
    // Weight 0.5 per spread point — acts as a tiebreaker, never overrides
    // partner repeats (×100) or significant opponent imbalance.
    if (rankMap) {
      const ranks = group.map(id => rankMap.get(id) ?? 0);
      const spread = Math.max(...ranks) - Math.min(...ranks);
      total += spread * 0.5;
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

/**
 * Enumerate all unique ways to partition groupA and groupB players into courts
 * of 2A+2B each. Each court gets exactly 2 players from group A and 2 from group B.
 */
function allCrossGroupPartitions(groupA: string[], groupB: string[]): string[][][] {
  const numCourts = Math.min(Math.floor(groupA.length / 2), Math.floor(groupB.length / 2));
  if (numCourts === 0) return [];

  // Enumerate ways to partition A into pairs, then B into pairs, combine
  const aPairings = partitionIntoPairs(groupA.slice(0, numCourts * 2));
  const bPairings = partitionIntoPairs(groupB.slice(0, numCourts * 2));

  const results: string[][][] = [];
  for (const aPairs of aPairings) {
    for (const bPairs of bPairings) {
      const groups: string[][] = [];
      for (let i = 0; i < numCourts; i++) {
        groups.push([...aPairs[i], ...bPairs[i]]);
      }
      results.push(groups);
    }
  }
  return results;
}

/** Partition items into groups of 2, fixing first element to avoid duplicates */
function partitionIntoPairs(items: string[]): string[][][] {
  if (items.length === 2) return [[[items[0], items[1]]]];
  if (items.length < 2) return [];
  const results: string[][][] = [];
  const first = items[0];
  const rest = items.slice(1);
  for (let i = 0; i < rest.length; i++) {
    const pair = [first, rest[i]];
    const remaining = rest.filter((_, j) => j !== i);
    for (const sub of partitionIntoPairs(remaining)) {
      results.push([pair, ...sub]);
    }
  }
  return results;
}

/**
 * For cross-group: within a group of [a1, a2, b1, b2], only 2 valid pairings
 * (each team must be 1A+1B): (a1+b1 vs a2+b2) or (a1+b2 vs a2+b1)
 */
function getCrossGroupPairings(group: string[], players: Player[]): Pairing[] {
  const groupOf = new Map(players.map(p => [p.id, p.group]));
  const aPlayers = group.filter(id => groupOf.get(id) === 'A');
  const bPlayers = group.filter(id => groupOf.get(id) === 'B');
  if (aPlayers.length !== 2 || bPlayers.length !== 2) return getPairingsForGroup(group);
  const [a1, a2] = aPlayers;
  const [b1, b2] = bPlayers;
  return [
    [[a1, b1], [a2, b2]],
    [[a1, b2], [a2, b1]],
  ];
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
  lastSitOutRound: Map<string, number>,
  rankMap?: Map<string, number>
): { rounds: Round[]; warnings: string[] } {
  const warnings: string[] = [];
  const crossGroup = isCrossGroup(players);
  const groupAPlayers = crossGroup ? players.filter(p => p.group === 'A') : [];
  const groupBPlayers = crossGroup ? players.filter(p => p.group === 'B') : [];

  const n = players.length;
  const availableCourts = config.courts.filter(c => !c.unavailable);
  const numCourts = crossGroup
    ? Math.min(availableCourts.length, Math.floor(Math.min(groupAPlayers.length, groupBPlayers.length) / 2))
    : Math.min(availableCourts.length, Math.floor(n / 4));

  if (numCourts === 0) {
    return { rounds: [], warnings: [crossGroup ? 'Not enough players for a match (need at least 2 per group)' : 'Not enough players for a match (need at least 4)'] };
  }

  const playersPerRound = numCourts * 4;
  const sitOutCount = crossGroup ? 0 : n - playersPerRound; // cross-group uses per-group sit-outs
  const sitOutCountA = crossGroup ? groupAPlayers.length - numCourts * 2 : 0;
  const sitOutCountB = crossGroup ? groupBPlayers.length - numCourts * 2 : 0;
  const useEnumeration = numCourts <= 3;
  const maxAttempts = numCourts <= 4 ? 6000 : 20000;

  if (crossGroup) {
    if ((sitOutCountA > 0 || sitOutCountB > 0) && startRoundNumber === 1) {
      warnings.push(`${sitOutCountA + sitOutCountB} player(s) will sit out each round`);
    }
  } else if (sitOutCount > 0 && startRoundNumber === 1) {
    warnings.push(`${sitOutCount} player(s) will sit out each round`);
  }

  const rounds: Round[] = [];

  for (let r = 0; r < count; r++) {
    const roundNum = startRoundNumber + r;

    let sitOutIds: Set<string>;
    let activeIds: string[];

    if (crossGroup) {
      // Group-balanced sit-outs
      const { sitOutIds: sitOutA } = selectSitOuts(groupAPlayers, sitOutCountA, gamesPlayed, lastSitOutRound);
      const { sitOutIds: sitOutB } = selectSitOuts(groupBPlayers, sitOutCountB, gamesPlayed, lastSitOutRound);
      sitOutIds = new Set([...sitOutA, ...sitOutB]);
      const activeA = groupAPlayers.filter(p => !sitOutIds.has(p.id)).map(p => p.id);
      const activeB = groupBPlayers.filter(p => !sitOutIds.has(p.id)).map(p => p.id);
      activeIds = [...activeA, ...activeB];
    } else {
      const result = selectSitOuts(players, sitOutCount, gamesPlayed, lastSitOutRound);
      sitOutIds = result.sitOutIds;
      activeIds = result.activeIds;
    }

    let bestGroups: string[][] = [];
    let bestScore = Infinity;

    const courtIds = availableCourts.slice(0, numCourts).map(c => c.id);

    // Choose the right partition function and pairing function based on cross-group mode
    const getPartitions = crossGroup
      ? () => {
          const activeA = groupAPlayers.filter(p => !sitOutIds.has(p.id)).map(p => p.id);
          const activeB = groupBPlayers.filter(p => !sitOutIds.has(p.id)).map(p => p.id);
          return allCrossGroupPartitions(activeA, activeB);
        }
      : () => allGroupPartitions(activeIds);

    const getPairings = crossGroup
      ? (group: string[]) => getCrossGroupPairings(group, players)
      : (group: string[]) => getPairingsForGroup(group);

    // Override scoreGrouping to use cross-group pairings
    const scoreGroupingWithPairings = (
      groups: string[][],
      pc: Map<string, number>,
      oc: Map<string, number>,
      cm?: Set<string>,
      rm?: Map<string, number>,
    ): number => {
      let total = 0;
      for (const group of groups) {
        const pairings = getPairings(group);
        total += Math.min(...pairings.map(([p1, p2]) => scorePairing(p1, p2, pc, oc)));
        if (cm) {
          for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
              if (cm.has(partnerKey(group[i], group[j]))) {
                total += 0.01;
              }
            }
          }
        }
        if (rm) {
          const ranks = group.map(id => rm.get(id) ?? 0);
          const spread = Math.max(...ranks) - Math.min(...ranks);
          total += spread * 0.5;
        }
      }
      return total;
    };

    if (useEnumeration) {
      // Exhaustive: evaluate every unique partition, then tiebreak by court balance + coverage
      let tied: string[][][] = [];
      for (const groups of getPartitions()) {
        const score = scoreGroupingWithPairings(groups, partnerCounts, opponentCounts, undefined, rankMap);
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
      if (crossGroup) {
        const activeA = groupAPlayers.filter(p => !sitOutIds.has(p.id)).map(p => p.id);
        const activeB = groupBPlayers.filter(p => !sitOutIds.has(p.id)).map(p => p.id);
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const shuffledA = shuffle([...activeA]);
          const shuffledB = shuffle([...activeB]);
          const groups: string[][] = [];
          for (let i = 0; i < numCourts; i++) {
            groups.push([shuffledA[i * 2], shuffledA[i * 2 + 1], shuffledB[i * 2], shuffledB[i * 2 + 1]]);
          }
          const score = scoreGroupingWithPairings(groups, partnerCounts, opponentCounts, courtMates, rankMap);
          if (score < bestScore) {
            bestScore = score;
            bestGroups = groups;
            if (score === 0) break;
          }
        }
      } else {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const shuffled = shuffle([...activeIds]);
          const groups: string[][] = [];
          for (let i = 0; i < numCourts; i++) {
            groups.push(shuffled.slice(i * 4, i * 4 + 4));
          }
          const score = scoreGroupingWithPairings(groups, partnerCounts, opponentCounts, courtMates, rankMap);
          if (score < bestScore) {
            bestScore = score;
            bestGroups = groups;
            if (score === 0) break;
          }
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
      const pairings = getPairings(group);
      let best = pairings[0];
      let bestPairScore = Infinity;
      for (const pairing of pairings) {
        const s = scorePairing(pairing[0], pairing[1], partnerCounts, opponentCounts);
        if (s < bestPairScore) {
          bestPairScore = s;
          best = pairing;
        }
      }
      const [team1, team2] = best;
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
  rankMap?: Map<string, number>,
): ScheduleResult {
  let bestResult: ScheduleResult | null = null;
  let bestScore: [number, number, number, number] = [Infinity, Infinity, Infinity, Infinity];
  const deadline = performance.now() + timeBudgetMs;

  do {
    const result = generateRounds(
      players, config, count, startRoundNumber,
      new Map(seedPartnerCounts), new Map(seedOpponentCounts), new Map(seedGamesPlayed), new Map(seedCourtCounts), new Set(seedCourtMates), new Map(seedLastSitOutRound),
      rankMap,
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

function validateCrossGroupSetup(players: Player[], config: TournamentConfig): string[] {
  const errors = commonValidateSetup(players, config);
  const availableCourts = config.courts.filter(c => !c.unavailable);
  const groupA = players.filter(p => p.group === 'A');
  const groupB = players.filter(p => p.group === 'B');
  const unassigned = players.filter(p => !p.group);

  if (unassigned.length > 0) {
    errors.push(`${unassigned.length} player(s) have no group assigned`);
  }
  if (groupA.length < 2) {
    errors.push('Group A needs at least 2 players');
  }
  if (groupB.length < 2) {
    errors.push('Group B needs at least 2 players');
  }
  const maxCourts = Math.floor(Math.min(groupA.length, groupB.length) / 2);
  if (availableCourts.length > maxCourts && groupA.length >= 2 && groupB.length >= 2) {
    errors.push(`Too many courts: need at most ${maxCourts} court(s) for ${groupA.length}+${groupB.length} players`);
  }
  return errors;
}

function crossGroupWarnings(players: Player[]): string[] {
  const warnings: string[] = [];
  const groupA = players.filter(p => p.group === 'A');
  const groupB = players.filter(p => p.group === 'B');
  if (groupA.length >= 2 && groupB.length >= 2 && groupA.length !== groupB.length) {
    warnings.push(`Groups are unequal (${groupA.length} vs ${groupB.length}) — less variety in matchups`);
  }
  return warnings;
}

function buildAmericanoStrategy(crossGroupMode: boolean): TournamentStrategy {
  const strategy: TournamentStrategy = {
    isDynamic: false,
    hasFixedPartners: false,
    validateSetup: crossGroupMode ? validateCrossGroupSetup : commonValidateSetup,
    ...(crossGroupMode ? { validateWarnings: (_p: Player[]) => crossGroupWarnings(_p) } : {}),
    validateScore: commonValidateScore,
    calculateStandings(tournament: Tournament) {
      const competitors = strategy.getCompetitors(tournament);
      return calculateCompetitorStandings(tournament, competitors, (side) =>
        side.map(pid => competitors.find(c => c.id === pid)!).filter(Boolean)
      );
    },

    getCompetitors(tournament: Tournament) {
      return tournament.players
        .filter(p => !p.unavailable)
        .map(p => ({ id: p.id, name: p.name, playerIds: [p.id] }));
    },

    generateSchedule(players: Player[], config: TournamentConfig): ScheduleResult {
      const playersPerRound = Math.min(config.courts.length * 4, players.length);
      const totalRounds = config.maxRounds ?? Math.max(1, Math.ceil((players.length - 1) * players.length / playersPerRound));
      const gamesPlayed = new Map<string, number>();
      const lastSitOutRound = new Map<string, number>();
      players.forEach(p => { gamesPlayed.set(p.id, 0); lastSitOutRound.set(p.id, -Infinity); });
      return generateRoundsWithRetry(players, config, totalRounds, 1, new Map(), new Map(), gamesPlayed, new Map(), new Set(), lastSitOutRound, 500);
    },

    generateAdditionalRounds(players: Player[], config: TournamentConfig, existingRounds: Round[], count: number, excludePlayerIds?: string[], timeBudgetMs?: number, tournament?: Tournament): ScheduleResult {
      const activePlayers = excludePlayerIds?.length
        ? players.filter(p => !excludePlayerIds.includes(p.id))
        : players;
      const { partnerCounts, opponentCounts, gamesPlayed, courtCounts, courtMates, lastSitOutRound } = seedFromRounds(existingRounds, activePlayers);
      const startRoundNumber = existingRounds.length + 1;
      const budget = timeBudgetMs ?? (count > 1 ? 500 : 0);

      let rankMap: Map<string, number> | undefined;
      if (tournament) {
        const standings = calculateIndividualStandings(tournament);
        rankMap = new Map(standings.map((s, i) => [s.playerId, i]));
      }

      return generateRoundsWithRetry(activePlayers, config, count, startRoundNumber, partnerCounts, opponentCounts, gamesPlayed, courtCounts, courtMates, lastSitOutRound, budget, rankMap);
    },
  };
  return strategy;
}

export const americanoStrategy: TournamentStrategy = buildAmericanoStrategy(false);
export const mixedAmericanoStrategy: TournamentStrategy = buildAmericanoStrategy(true);
