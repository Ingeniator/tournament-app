import type { TournamentStrategy, ScheduleResult } from './types';
import type { Player, TournamentConfig, Round, Match, Tournament } from '@padel/common';
import { generateId } from '@padel/common';
import { shuffle, partnerKey, commonValidateSetup, commonValidateScore, calculateIndividualStandings, calculateCompetitorStandings, seedFromRounds, selectSitOuts } from './shared';

/** Check whether all active players have a group assigned (mixicano mode). */
function hasMixicanoGroups(players: Player[]): boolean {
  if (players.length === 0) return false;
  const groups = new Set(players.map(p => p.group).filter(Boolean));
  return groups.size >= 2 && players.every(p => !!p.group);
}

/**
 * Select sit-outs per group so each group contributes exactly `perCourt` players per court.
 * Returns combined sit-out set.
 */
function selectGroupSitOuts(
  groupA: Player[],
  groupB: Player[],
  numCourts: number,
  gamesPlayed: Map<string, number>,
): { sitOutIds: Set<string> } {
  const neededA = numCourts * 2;
  const neededB = numCourts * 2;
  const sitOutA = selectSitOuts(groupA, groupA.length - neededA, gamesPlayed);
  const sitOutB = selectSitOuts(groupB, groupB.length - neededB, gamesPlayed);
  const sitOutIds = new Set([...sitOutA.sitOutIds, ...sitOutB.sitOutIds]);
  return { sitOutIds };
}

/**
 * Generate rounds using Mexicano rules:
 * - Round 1: random grouping
 * - Subsequent rounds: group by standings rank, 1st+4th vs 2nd+3rd within each group
 *
 * When all players have a group (mixicano mode):
 * - Teams are always mixed: one player from each group per team
 * - Sit-outs are balanced per group
 */
function generateMexicanoRounds(
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

  const mixicano = hasMixicanoGroups(activePlayers);

  if (mixicano) {
    return generateMixicanoRounds(activePlayers, config, existingRounds, count, warnings);
  }

  return generateStandardMexicanoRounds(activePlayers, config, existingRounds, count, warnings);
}

/** Standard Mexicano: no group constraint. */
function generateStandardMexicanoRounds(
  activePlayers: Player[],
  config: TournamentConfig,
  existingRounds: Round[],
  count: number,
  warnings: string[],
): ScheduleResult {
  const n = activePlayers.length;
  const availableCourts = config.courts.filter(c => !c.unavailable);
  const numCourts = Math.min(availableCourts.length, Math.floor(n / 4));

  if (numCourts === 0) {
    return { rounds: [], warnings: ['Not enough players for a match (need at least 4)'] };
  }

  const playersPerRound = numCourts * 4;
  const sitOutCount = n - playersPerRound;
  const { gamesPlayed, partnerCounts } = seedFromRounds(existingRounds, activePlayers);

  if (sitOutCount > 0 && existingRounds.length === 0) {
    warnings.push(`${sitOutCount} player(s) will sit out each round`);
  }

  const rounds: Round[] = [];
  const startRoundNumber = existingRounds.length + 1;

  for (let r = 0; r < count; r++) {
    const { sitOutIds } = selectSitOuts(activePlayers, sitOutCount, gamesPlayed);
    const roundPlayers = activePlayers.filter(p => !sitOutIds.has(p.id));

    let groups: string[][];

    if (existingRounds.length + r === 0) {
      const shuffled = shuffle(roundPlayers.map(p => p.id));
      groups = [];
      for (let i = 0; i < numCourts; i++) {
        groups.push(shuffled.slice(i * 4, i * 4 + 4));
      }
    } else {
      const allRoundsForStandings = [...existingRounds, ...rounds];
      const standings = calculateIndividualStandings({
        players: activePlayers,
        rounds: allRoundsForStandings,
      } as Parameters<typeof calculateIndividualStandings>[0]);

      const standingsMap = new Map(standings.map((s, i) => [s.playerId, i]));
      const ranked = [...roundPlayers].sort(
        (a, b) => (standingsMap.get(a.id) ?? 999) - (standingsMap.get(b.id) ?? 999)
      );

      groups = [];
      for (let i = 0; i < numCourts; i++) {
        groups.push(ranked.slice(i * 4, i * 4 + 4).map(p => p.id));
      }
    }

    const matches: Match[] = groups.map((group, idx) => {
      let team1: [string, string];
      let team2: [string, string];

      if (existingRounds.length + r === 0) {
        const pairings: [[string, string], [string, string]][] = [
          [[group[0], group[3]], [group[1], group[2]]],
          [[group[0], group[2]], [group[1], group[3]]],
          [[group[0], group[1]], [group[2], group[3]]],
        ];
        let bestPairing = pairings[0];
        let bestScore = Infinity;
        for (const p of pairings) {
          const score =
            (partnerCounts.get(partnerKey(p[0][0], p[0][1])) ?? 0) +
            (partnerCounts.get(partnerKey(p[1][0], p[1][1])) ?? 0);
          if (score < bestScore) {
            bestScore = score;
            bestPairing = p;
          }
        }
        [team1, team2] = bestPairing;
      } else {
        team1 = [group[0], group[3]];
        team2 = [group[1], group[2]];
      }

      return {
        id: generateId(),
        courtId: availableCourts[idx].id,
        team1,
        team2,
        score: null,
      };
    });

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
 * Mixicano mode: all players have a group (A/B).
 * Teams are always cross-group: [groupA, groupB] vs [groupA, groupB].
 */
function generateMixicanoRounds(
  activePlayers: Player[],
  config: TournamentConfig,
  existingRounds: Round[],
  count: number,
  warnings: string[],
): ScheduleResult {
  const groupNames = [...new Set(activePlayers.map(p => p.group!))].sort();
  const groupA = activePlayers.filter(p => p.group === groupNames[0]);
  const groupB = activePlayers.filter(p => p.group === groupNames[1]);

  const availableCourts = config.courts.filter(c => !c.unavailable);
  // Each court needs 2 from each group
  const numCourts = Math.min(
    availableCourts.length,
    Math.floor(groupA.length / 2),
    Math.floor(groupB.length / 2),
  );

  if (numCourts === 0) {
    return { rounds: [], warnings: ['Not enough players in each group for a match (need at least 2 per group)'] };
  }

  const { gamesPlayed, partnerCounts } = seedFromRounds(existingRounds, activePlayers);

  const totalSitOuts = activePlayers.length - numCourts * 4;
  if (totalSitOuts > 0 && existingRounds.length === 0) {
    warnings.push(`${totalSitOuts} player(s) will sit out each round`);
  }

  const rounds: Round[] = [];
  const startRoundNumber = existingRounds.length + 1;

  for (let r = 0; r < count; r++) {
    const { sitOutIds } = selectGroupSitOuts(groupA, groupB, numCourts, gamesPlayed);

    const roundA = groupA.filter(p => !sitOutIds.has(p.id));
    const roundB = groupB.filter(p => !sitOutIds.has(p.id));

    let orderedA: Player[];
    let orderedB: Player[];

    if (existingRounds.length + r === 0) {
      // Round 1: random order
      orderedA = shuffle(roundA);
      orderedB = shuffle(roundB);
    } else {
      // Subsequent rounds: rank by standings within each group
      const allRoundsForStandings = [...existingRounds, ...rounds];
      const standings = calculateIndividualStandings({
        players: activePlayers,
        rounds: allRoundsForStandings,
      } as Parameters<typeof calculateIndividualStandings>[0]);

      const standingsMap = new Map(standings.map((s, i) => [s.playerId, i]));
      orderedA = [...roundA].sort(
        (a, b) => (standingsMap.get(a.id) ?? 999) - (standingsMap.get(b.id) ?? 999)
      );
      orderedB = [...roundB].sort(
        (a, b) => (standingsMap.get(a.id) ?? 999) - (standingsMap.get(b.id) ?? 999)
      );
    }

    // Build matches: for each court, take 2 from A and 2 from B
    // Mixicano pairing: [A_1st + B_2nd] vs [A_2nd + B_1st] (cross-rank)
    const matches: Match[] = [];
    for (let c = 0; c < numCourts; c++) {
      const a1 = orderedA[c * 2];
      const a2 = orderedA[c * 2 + 1];
      const b1 = orderedB[c * 2];
      const b2 = orderedB[c * 2 + 1];

      let team1: [string, string];
      let team2: [string, string];

      if (existingRounds.length + r === 0) {
        // Round 1: pick best cross-group pairing to minimize partner repeats
        const pairings: [[string, string], [string, string]][] = [
          [[a1.id, b1.id], [a2.id, b2.id]],
          [[a1.id, b2.id], [a2.id, b1.id]],
        ];
        let bestPairing = pairings[0];
        let bestScore = Infinity;
        for (const p of pairings) {
          const score =
            (partnerCounts.get(partnerKey(p[0][0], p[0][1])) ?? 0) +
            (partnerCounts.get(partnerKey(p[1][0], p[1][1])) ?? 0);
          if (score < bestScore) {
            bestScore = score;
            bestPairing = p;
          }
        }
        [team1, team2] = bestPairing;
      } else {
        // Mixicano rule: 1st-ranked A + 2nd-ranked B vs 2nd-ranked A + 1st-ranked B
        team1 = [a1.id, b2.id];
        team2 = [a2.id, b1.id];
      }

      matches.push({
        id: generateId(),
        courtId: availableCourts[c].id,
        team1,
        team2,
        score: null,
      });
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

/** Validate mexicano setup — includes group warnings (non-blocking). */
function validateMexicanoSetup(players: Player[], config: TournamentConfig): string[] {
  const errors = commonValidateSetup(players, config);

  // Check player groups: if any player has a group, validate group config
  const playersWithGroup = players.filter(p => p.group);
  if (playersWithGroup.length > 0) {
    const groups = new Set(playersWithGroup.map(p => p.group));
    if (groups.size < 2) {
      // Only one group assigned — need at least 2
      // This is a warning handled in UI, not a blocking error
    }
  }

  return errors;
}

export const mexicanoStrategy: TournamentStrategy = {
  isDynamic: true,
  hasFixedPartners: false,
  validateSetup: validateMexicanoSetup,
  validateScore: commonValidateScore,
  calculateStandings(tournament: Tournament) {
    const competitors = mexicanoStrategy.getCompetitors(tournament);
    const groupMap = new Map(tournament.players.map(p => [p.id, p.group]));
    const entries = calculateCompetitorStandings(tournament, competitors, (side) =>
      side.map(pid => competitors.find(c => c.id === pid)!).filter(Boolean)
    );
    // Attach group info to standings entries
    for (const entry of entries) {
      entry.group = groupMap.get(entry.playerId);
    }
    return entries;
  },

  getCompetitors(tournament: Tournament) {
    return tournament.players
      .filter(p => !p.unavailable)
      .map(p => ({ id: p.id, name: p.name, playerIds: [p.id] }));
  },

  generateSchedule(players: Player[], config: TournamentConfig): ScheduleResult {
    // Mexicano: only generate 1 round initially (random)
    return generateMexicanoRounds(players, config, [], 1);
  },

  generateAdditionalRounds(players: Player[], config: TournamentConfig, existingRounds: Round[], count: number, excludePlayerIds?: string[]): ScheduleResult {
    return generateMexicanoRounds(players, config, existingRounds, count, excludePlayerIds);
  },
};
