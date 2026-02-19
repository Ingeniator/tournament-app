import type { TournamentStrategy, ScheduleResult } from './types';
import type { Player, TournamentConfig, Round, Match, Tournament } from '@padel/common';
import { generateId } from '@padel/common';
import { shuffle, partnerKey, commonValidateScore, calculateIndividualStandings, calculateCompetitorStandings, seedFromRounds, selectSitOuts } from './shared';

/**
 * Mixicano strategy: like Mexicano but teams are always formed by pairing
 * one player from each group (e.g. male+female, Group A+Group B).
 *
 * - Round 1: random mixed-group pairings
 * - Subsequent rounds: group by standings rank, pair across groups
 * - Within each court of 4, two from group A and two from group B
 */

function splitByGroup(players: Player[]): { groupA: Player[]; groupB: Player[] } {
  const groups = new Set(players.map(p => p.group).filter(Boolean));
  const sortedGroups = [...groups].sort();
  const groupAName = sortedGroups[0] ?? 'A';
  const groupA = players.filter(p => p.group === groupAName);
  const groupB = players.filter(p => p.group !== groupAName);
  return { groupA, groupB };
}

function generateMixicanoRounds(
  players: Player[],
  config: TournamentConfig,
  existingRounds: Round[],
  count: number,
  excludePlayerIds?: string[]
): ScheduleResult {
  const warnings: string[] = [];
  const activePlayers = excludePlayerIds?.length
    ? players.filter(p => !excludePlayerIds.includes(p.id))
    : players;

  const n = activePlayers.length;
  const availableCourts = config.courts.filter(c => !c.unavailable);
  const numCourts = Math.min(availableCourts.length, Math.floor(n / 4));

  if (numCourts === 0) {
    return { rounds: [], warnings: ['Not enough players for a match (need at least 4)'] };
  }

  const { groupA, groupB } = splitByGroup(activePlayers);

  if (groupA.length === 0 || groupB.length === 0) {
    return { rounds: [], warnings: ['Mixicano requires players in at least 2 groups'] };
  }

  const playersPerRound = numCourts * 4;
  const sitOutCount = n - playersPerRound;
  const { gamesPlayed, partnerCounts } = seedFromRounds(existingRounds, activePlayers);

  if (sitOutCount > 0 && existingRounds.length === 0) {
    warnings.push(`${sitOutCount} player(s) will sit out each round`);
  }

  // Warn about unequal groups but don't block
  if (groupA.length !== groupB.length) {
    const minGroup = Math.min(groupA.length, groupB.length);
    const maxMixed = minGroup * 2;
    if (maxMixed < playersPerRound) {
      warnings.push(
        `Groups have unequal sizes (${groupA.length} vs ${groupB.length}). Some courts may have same-group pairings.`
      );
    }
  }

  const rounds: Round[] = [];
  const startRoundNumber = existingRounds.length + 1;

  for (let r = 0; r < count; r++) {
    // Select sit-outs fairly across all players
    const { sitOutIds } = selectSitOuts(activePlayers, sitOutCount, gamesPlayed);
    const roundPlayers = activePlayers.filter(p => !sitOutIds.has(p.id));

    const roundGroupA = roundPlayers.filter(p => groupA.some(ga => ga.id === p.id));
    const roundGroupB = roundPlayers.filter(p => groupB.some(gb => gb.id === p.id));

    let matches: Match[];

    if (existingRounds.length + r === 0) {
      // Round 1: random mixed-group pairings
      matches = buildMixedMatches(
        shuffle(roundGroupA),
        shuffle(roundGroupB),
        roundPlayers,
        availableCourts,
        numCourts,
        partnerCounts
      );
    } else {
      // Subsequent rounds: rank players within each group by standings
      const allRoundsForStandings = [...existingRounds, ...rounds];
      const standings = calculateIndividualStandings({
        players: activePlayers,
        rounds: allRoundsForStandings,
      } as Parameters<typeof calculateIndividualStandings>[0]);

      const standingsMap = new Map(standings.map((s, i) => [s.playerId, i]));

      const rankedA = [...roundGroupA].sort(
        (a, b) => (standingsMap.get(a.id) ?? 999) - (standingsMap.get(b.id) ?? 999)
      );
      const rankedB = [...roundGroupB].sort(
        (a, b) => (standingsMap.get(a.id) ?? 999) - (standingsMap.get(b.id) ?? 999)
      );

      matches = buildMixedMatches(
        rankedA,
        rankedB,
        roundPlayers,
        availableCourts,
        numCourts,
        partnerCounts
      );
    }

    // Update tracking
    for (const match of matches) {
      const k1 = partnerKey(match.team1[0], match.team1[1]);
      const k2 = partnerKey(match.team2[0], match.team2[1]);
      partnerCounts.set(k1, (partnerCounts.get(k1) ?? 0) + 1);
      partnerCounts.set(k2, (partnerCounts.get(k2) ?? 0) + 1);
      for (const pid of [...match.team1, ...match.team2]) {
        gamesPlayed.set(pid, (gamesPlayed.get(pid) ?? 0) + 1);
      }
    }

    rounds.push({
      id: generateId(),
      roundNumber: startRoundNumber + r,
      matches,
      sitOuts: [...sitOutIds],
    });
  }

  return { rounds, warnings };
}

/**
 * Build matches ensuring teams are mixed (one from each group) when possible.
 * Falls back to same-group pairing when groups are unequal.
 */
function buildMixedMatches(
  sortedA: Player[],
  sortedB: Player[],
  allRoundPlayers: Player[],
  availableCourts: { id: string }[],
  numCourts: number,
  partnerCounts: Map<string, number>
): Match[] {
  const matches: Match[] = [];

  // We need 2 from each group per court ideally
  // Pair them by rank: A[0]+B[0] vs A[1]+B[1], etc.
  const minLen = Math.min(sortedA.length, sortedB.length);
  const pairedA = sortedA.slice(0, minLen);
  const pairedB = sortedB.slice(0, minLen);
  const leftoverA = sortedA.slice(minLen);
  const leftoverB = sortedB.slice(minLen);
  const leftovers = [...leftoverA, ...leftoverB];

  // Build courts of 4: 2 from A + 2 from B (paired by rank)
  let courtIdx = 0;
  for (let i = 0; i + 1 < minLen && courtIdx < numCourts; i += 2) {
    // Mixicano pairing: A[i]+B[i] vs A[i+1]+B[i+1] (like mexicano 1st+4th but across groups)
    const team1: [string, string] = [pairedA[i].id, pairedB[i].id];
    const team2: [string, string] = [pairedA[i + 1].id, pairedB[i + 1].id];

    // Try alternative pairing to minimize partner repeats
    const altTeam1: [string, string] = [pairedA[i].id, pairedB[i + 1].id];
    const altTeam2: [string, string] = [pairedA[i + 1].id, pairedB[i].id];

    const score1 = (partnerCounts.get(partnerKey(team1[0], team1[1])) ?? 0) +
                   (partnerCounts.get(partnerKey(team2[0], team2[1])) ?? 0);
    const score2 = (partnerCounts.get(partnerKey(altTeam1[0], altTeam1[1])) ?? 0) +
                   (partnerCounts.get(partnerKey(altTeam2[0], altTeam2[1])) ?? 0);

    const [finalTeam1, finalTeam2] = score2 < score1 ? [altTeam1, altTeam2] : [team1, team2];

    matches.push({
      id: generateId(),
      courtId: availableCourts[courtIdx].id,
      team1: finalTeam1,
      team2: finalTeam2,
      score: null,
    });
    courtIdx++;
  }

  // Handle leftover players (from unequal groups) - fill remaining courts
  // If we have an odd number of paired players and leftovers, combine them
  let remainingPaired: Player[] = [];
  if (minLen % 2 === 1) {
    remainingPaired = [pairedA[minLen - 1], pairedB[minLen - 1]];
  }
  const remaining = [...remainingPaired, ...leftovers];

  // Fill remaining courts with leftover players (may be same-group)
  for (let i = 0; i + 3 < remaining.length && courtIdx < numCourts; i += 4) {
    const group = remaining.slice(i, i + 4);
    // Try to form mixed teams from available players
    const bestPairing = findBestMixedPairing(group, partnerCounts);
    matches.push({
      id: generateId(),
      courtId: availableCourts[courtIdx].id,
      team1: bestPairing[0],
      team2: bestPairing[1],
      score: null,
    });
    courtIdx++;
  }

  return matches;
}

function findBestMixedPairing(
  group: Player[],
  partnerCounts: Map<string, number>
): [[string, string], [string, string]] {
  const ids = group.map(p => p.id);
  const groups = group.map(p => p.group);

  // All possible pairings of 4 players into 2 teams of 2
  const pairings: [[string, string], [string, string]][] = [
    [[ids[0], ids[1]], [ids[2], ids[3]]],
    [[ids[0], ids[2]], [ids[1], ids[3]]],
    [[ids[0], ids[3]], [ids[1], ids[2]]],
  ];

  // Score: prefer mixed groups, then minimize partner repeats
  let bestPairing = pairings[0];
  let bestScore = Infinity;

  for (const p of pairings) {
    // Penalty for same-group teams (each same-group team gets +100)
    const g1Same = groups[ids.indexOf(p[0][0])] === groups[ids.indexOf(p[0][1])] ? 100 : 0;
    const g2Same = groups[ids.indexOf(p[1][0])] === groups[ids.indexOf(p[1][1])] ? 100 : 0;

    const repeats = (partnerCounts.get(partnerKey(p[0][0], p[0][1])) ?? 0) +
                    (partnerCounts.get(partnerKey(p[1][0], p[1][1])) ?? 0);

    const score = g1Same + g2Same + repeats;
    if (score < bestScore) {
      bestScore = score;
      bestPairing = p;
    }
  }

  return bestPairing;
}

function validateMixicanoSetup(players: Player[], config: TournamentConfig): string[] {
  const errors: string[] = [];
  if (players.length < 4) {
    errors.push('At least 4 players are required');
  }
  const availableCourts = config.courts.filter(c => !c.unavailable);
  if (availableCourts.length === 0) {
    errors.push('At least 1 court is required');
  }
  if (config.pointsPerMatch < 1) {
    errors.push('Points per match must be at least 1');
  }
  const maxCourts = Math.floor(players.length / 4);
  if (availableCourts.length > maxCourts && players.length >= 4) {
    errors.push(`Too many courts: ${players.length} players need at most ${maxCourts} court(s)`);
  }

  // Check that at least 2 groups exist
  const groups = new Set(players.map(p => p.group).filter(Boolean));
  if (groups.size < 2) {
    errors.push('Mixicano requires players assigned to at least 2 groups');
  }

  // Check that each group has at least 1 player (already implied, but be explicit)
  const { groupA, groupB } = splitByGroup(players);
  if (groupA.length === 0 || groupB.length === 0) {
    errors.push('Each group must have at least 1 player');
  }

  return errors;
}

export const mixicanoStrategy: TournamentStrategy = {
  isDynamic: true,
  hasFixedPartners: false,
  validateSetup: validateMixicanoSetup,
  validateScore: commonValidateScore,

  calculateStandings(tournament: Tournament) {
    const competitors = mixicanoStrategy.getCompetitors(tournament);
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
    return generateMixicanoRounds(players, config, [], 1);
  },

  generateAdditionalRounds(players: Player[], config: TournamentConfig, existingRounds: Round[], count: number, excludePlayerIds?: string[]): ScheduleResult {
    return generateMixicanoRounds(players, config, existingRounds, count, excludePlayerIds);
  },
};
