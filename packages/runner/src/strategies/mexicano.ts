import type { TournamentStrategy, ScheduleResult } from './types';
import type { Player, TournamentConfig, Round, Match, Tournament } from '@padel/common';
import { generateId } from '@padel/common';
import { shuffle, partnerKey, commonValidateSetup, commonValidateScore, calculateIndividualStandings, calculateCompetitorStandings, seedFromRounds, selectSitOuts, updateMatchStats, selectBestPairing } from './shared';

/** Detect cross-group mode from player data */
function isCrossGroup(players: Player[]): boolean {
  return players.some(p => p.group === 'A') && players.some(p => p.group === 'B');
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

/**
 * Generate cross-group random round 1: shuffle each group, pair A+B, pick best of 2 options
 */
function crossGroupRandomRound(
  activeA: Player[],
  activeB: Player[],
  numCourts: number,
  availableCourts: { id: string }[],
  partnerCounts: Map<string, number>,
): Match[] {
  const shuffledA = shuffle(activeA.map(p => p.id));
  const shuffledB = shuffle(activeB.map(p => p.id));
  const matches: Match[] = [];
  for (let i = 0; i < numCourts; i++) {
    const a1 = shuffledA[i * 2];
    const a2 = shuffledA[i * 2 + 1];
    const b1 = shuffledB[i * 2];
    const b2 = shuffledB[i * 2 + 1];

    const score1 =
      (partnerCounts.get(partnerKey(a1, b1)) ?? 0) +
      (partnerCounts.get(partnerKey(a2, b2)) ?? 0);
    const score2 =
      (partnerCounts.get(partnerKey(a1, b2)) ?? 0) +
      (partnerCounts.get(partnerKey(a2, b1)) ?? 0);

    let team1: [string, string];
    let team2: [string, string];
    if (score1 <= score2) {
      team1 = [a1, b1];
      team2 = [a2, b2];
    } else {
      team1 = [a1, b2];
      team2 = [a2, b1];
    }

    matches.push({
      id: generateId(),
      courtId: availableCourts[i].id,
      team1,
      team2,
      score: null,
    });
  }
  return matches;
}

/**
 * Generate cross-group standings round: rank within each group, pair by rank across groups
 */
function crossGroupStandingsRound(
  activeA: Player[],
  activeB: Player[],
  numCourts: number,
  availableCourts: { id: string }[],
  standings: ReturnType<typeof calculateIndividualStandings>,
): Match[] {
  const rankMap = new Map(standings.map(s => [s.playerId, s.rank]));
  const rankedA = shuffle([...activeA]).sort(
    (a, b) => (rankMap.get(a.id) ?? 999) - (rankMap.get(b.id) ?? 999)
  );
  const rankedB = shuffle([...activeB]).sort(
    (a, b) => (rankMap.get(a.id) ?? 999) - (rankMap.get(b.id) ?? 999)
  );

  const matches: Match[] = [];
  for (let i = 0; i < numCourts; i++) {
    const a1 = rankedA[i * 2].id;
    const a2 = rankedA[i * 2 + 1].id;
    const b1 = rankedB[i * 2].id;
    const b2 = rankedB[i * 2 + 1].id;

    // Mexicano-style: top A + top B vs bottom A + bottom B
    const team1: [string, string] = [a1, b1];
    const team2: [string, string] = [a2, b2];

    matches.push({
      id: generateId(),
      courtId: availableCourts[i].id,
      team1,
      team2,
      score: null,
    });
  }
  return matches;
}

/**
 * Generate rounds using Mexicano rules (with optional cross-group support):
 * - Round 1: random grouping
 * - Subsequent rounds: group by standings rank, 1st+4th vs 2nd+3rd within each group
 * Cross-group mode: partners always 1A+1B, group-balanced sit-outs
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

  const crossGroup = isCrossGroup(activePlayers);
  const groupAPlayers = crossGroup ? activePlayers.filter(p => p.group === 'A') : [];
  const groupBPlayers = crossGroup ? activePlayers.filter(p => p.group === 'B') : [];

  const n = activePlayers.length;
  const availableCourts = config.courts.filter(c => !c.unavailable);
  const numCourts = crossGroup
    ? Math.min(availableCourts.length, Math.floor(Math.min(groupAPlayers.length, groupBPlayers.length) / 2))
    : Math.min(availableCourts.length, Math.floor(n / 4));

  if (numCourts === 0) {
    return { rounds: [], warnings: [crossGroup ? 'Not enough players for a match (need at least 2 per group)' : 'Not enough players for a match (need at least 4)'] };
  }

  if (crossGroup) {
    const sitOutCountA = groupAPlayers.length - numCourts * 2;
    const sitOutCountB = groupBPlayers.length - numCourts * 2;
    if ((sitOutCountA > 0 || sitOutCountB > 0) && existingRounds.length === 0) {
      warnings.push(`${sitOutCountA + sitOutCountB} player(s) will sit out each round`);
    }
  } else {
    const playersPerRound = numCourts * 4;
    const sitOutCount = n - playersPerRound;
    if (sitOutCount > 0 && existingRounds.length === 0) {
      warnings.push(`${sitOutCount} player(s) will sit out each round`);
    }
  }

  const { gamesPlayed, partnerCounts, lastSitOutRound } = seedFromRounds(existingRounds, activePlayers);

  const rounds: Round[] = [];
  const startRoundNumber = existingRounds.length + 1;

  for (let r = 0; r < count; r++) {
    let sitOutIds: Set<string>;
    let roundPlayers: Player[];

    if (crossGroup) {
      // Group-balanced sit-outs
      const sitOutCountA = groupAPlayers.length - numCourts * 2;
      const sitOutCountB = groupBPlayers.length - numCourts * 2;
      const { sitOutIds: sitOutA } = selectSitOuts(groupAPlayers, sitOutCountA, gamesPlayed, lastSitOutRound);
      const { sitOutIds: sitOutB } = selectSitOuts(groupBPlayers, sitOutCountB, gamesPlayed, lastSitOutRound);
      sitOutIds = new Set([...sitOutA, ...sitOutB]);
      roundPlayers = activePlayers.filter(p => !sitOutIds.has(p.id));
    } else {
      const playersPerRound = numCourts * 4;
      const sitOutCount = n - playersPerRound;
      const result = selectSitOuts(activePlayers, sitOutCount, gamesPlayed);
      sitOutIds = result.sitOutIds;
      roundPlayers = activePlayers.filter(p => !sitOutIds.has(p.id));
    }

    let matches: Match[];

    if (existingRounds.length + r === 0) {
      // Round 1: random grouping
      if (crossGroup) {
        const activeA = roundPlayers.filter(p => p.group === 'A');
        const activeB = roundPlayers.filter(p => p.group === 'B');
        matches = crossGroupRandomRound(activeA, activeB, numCourts, availableCourts, partnerCounts);
      } else {
        const shuffled = shuffle(roundPlayers.map(p => p.id));
        const groups: string[][] = [];
        for (let i = 0; i < numCourts; i++) {
          groups.push(shuffled.slice(i * 4, i * 4 + 4));
        }
        matches = groups.map((group, idx) => {
          const [team1, team2] = selectBestPairing(group as [string, string, string, string], partnerCounts);
          return {
            id: generateId(),
            courtId: availableCourts[idx].id,
            team1,
            team2,
            score: null,
          };
        });
      }
    } else {
      // Subsequent rounds: standings-based
      const allRoundsForStandings = [...existingRounds, ...rounds];

      if (crossGroup) {
        const activeA = roundPlayers.filter(p => p.group === 'A');
        const activeB = roundPlayers.filter(p => p.group === 'B');
        const standings = calculateIndividualStandings({
          players: activePlayers,
          rounds: allRoundsForStandings,
        } as Parameters<typeof calculateIndividualStandings>[0]);
        matches = crossGroupStandingsRound(activeA, activeB, numCourts, availableCourts, standings);
      } else {
        const standings = calculateIndividualStandings({
          players: activePlayers,
          rounds: allRoundsForStandings,
        } as Parameters<typeof calculateIndividualStandings>[0]);

        const rankMap = new Map(standings.map(s => [s.playerId, s.rank]));
        const ranked = shuffle([...roundPlayers]).sort(
          (a, b) => (rankMap.get(a.id) ?? 999) - (rankMap.get(b.id) ?? 999)
        );

        const groups: string[][] = [];
        for (let i = 0; i < numCourts; i++) {
          groups.push(ranked.slice(i * 4, i * 4 + 4).map(p => p.id));
        }

        matches = groups.map((group, idx) => {
          const team1: [string, string] = [group[0], group[3]];
          const team2: [string, string] = [group[1], group[2]];
          return {
            id: generateId(),
            courtId: availableCourts[idx].id,
            team1,
            team2,
            score: null,
          };
        });
      }
    }

    // Update tracking
    updateMatchStats(matches, partnerCounts, gamesPlayed);

    // Update sit-out tracking for multi-round fairness
    const roundNum = startRoundNumber + r;
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

function buildMexicanoStrategy(crossGroupMode: boolean): TournamentStrategy {
  const strategy: TournamentStrategy = {
    isDynamic: true,
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
      return generateMexicanoRounds(players, config, [], 1);
    },

    generateAdditionalRounds(players: Player[], config: TournamentConfig, existingRounds: Round[], count: number, excludePlayerIds?: string[]): ScheduleResult {
      return generateMexicanoRounds(players, config, existingRounds, count, excludePlayerIds);
    },
  };
  return strategy;
}

export const mexicanoStrategy: TournamentStrategy = buildMexicanoStrategy(false);
export const mixicanoStrategy: TournamentStrategy = buildMexicanoStrategy(true);
