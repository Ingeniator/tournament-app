import type { TournamentStrategy, ScheduleResult } from './types';
import type { Player, TournamentConfig, Round, Match, Tournament } from '@padel/common';
import { generateId } from '@padel/common';
import { shuffle, partnerKey, commonValidateSetup, commonValidateScore, calculateCompetitorStandings, seedFromRounds, selectSitOuts, updateMatchStats } from './shared';

function validateMixedAmericanoSetup(players: Player[], config: TournamentConfig): string[] {
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

/**
 * Generate rounds using Mixed Americano rules:
 * Cross-group pairing (like Mixicano) but random opponent matching (like Americano).
 * Partners are always one from each group, opponents are random for ALL rounds.
 */
function generateMixedAmericanoRounds(
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

  const groupAPlayers = activePlayers.filter(p => p.group === 'A');
  const groupBPlayers = activePlayers.filter(p => p.group === 'B');

  const availableCourts = config.courts.filter(c => !c.unavailable);
  const numCourts = Math.min(
    availableCourts.length,
    Math.floor(Math.min(groupAPlayers.length, groupBPlayers.length) / 2)
  );

  if (numCourts === 0) {
    return { rounds: [], warnings: ['Not enough players for a match (need at least 2 per group)'] };
  }

  const playersPerGroupPerRound = numCourts * 2;
  const sitOutCountA = groupAPlayers.length - playersPerGroupPerRound;
  const sitOutCountB = groupBPlayers.length - playersPerGroupPerRound;
  const { gamesPlayed, partnerCounts, lastSitOutRound } = seedFromRounds(existingRounds, activePlayers);

  if ((sitOutCountA > 0 || sitOutCountB > 0) && existingRounds.length === 0) {
    warnings.push(`${sitOutCountA + sitOutCountB} player(s) will sit out each round`);
  }

  const rounds: Round[] = [];
  const startRoundNumber = existingRounds.length + 1;

  for (let r = 0; r < count; r++) {
    // Group-balanced sit-outs
    const { sitOutIds: sitOutA } = selectSitOuts(groupAPlayers, sitOutCountA, gamesPlayed, lastSitOutRound);
    const { sitOutIds: sitOutB } = selectSitOuts(groupBPlayers, sitOutCountB, gamesPlayed, lastSitOutRound);
    const sitOutIds = new Set([...sitOutA, ...sitOutB]);

    const activeA = groupAPlayers.filter(p => !sitOutIds.has(p.id));
    const activeB = groupBPlayers.filter(p => !sitOutIds.has(p.id));

    // Random cross-group pairing for ALL rounds (key difference from mixicano)
    const shuffledA = shuffle(activeA.map(p => p.id));
    const shuffledB = shuffle(activeB.map(p => p.id));

    const matches: Match[] = [];
    for (let i = 0; i < numCourts; i++) {
      const a1 = shuffledA[i * 2];
      const a2 = shuffledA[i * 2 + 1];
      const b1 = shuffledB[i * 2];
      const b2 = shuffledB[i * 2 + 1];

      // Pick pairing that minimizes partner repeats
      // Options: (a1+b1 vs a2+b2) or (a1+b2 vs a2+b1)
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

export const mixedAmericanoStrategy: TournamentStrategy = {
  isDynamic: true,
  hasFixedPartners: false,
  validateSetup: validateMixedAmericanoSetup,
  validateWarnings(players: Player[], _config: TournamentConfig): string[] {
    const warnings: string[] = [];
    const groupA = players.filter(p => p.group === 'A');
    const groupB = players.filter(p => p.group === 'B');
    if (groupA.length >= 2 && groupB.length >= 2 && groupA.length !== groupB.length) {
      warnings.push(`Groups are unequal (${groupA.length} vs ${groupB.length}) — less variety in matchups`);
    }
    return warnings;
  },
  validateScore: commonValidateScore,

  calculateStandings(tournament: Tournament) {
    const competitors = mixedAmericanoStrategy.getCompetitors(tournament);
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
    return generateMixedAmericanoRounds(players, config, [], 1);
  },

  generateAdditionalRounds(players: Player[], config: TournamentConfig, existingRounds: Round[], count: number, excludePlayerIds?: string[]): ScheduleResult {
    return generateMixedAmericanoRounds(players, config, existingRounds, count, excludePlayerIds);
  },
};
