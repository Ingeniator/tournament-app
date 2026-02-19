import type { TournamentStrategy, ScheduleResult } from './types';
import type { Player, TournamentConfig, Round, Match, Tournament } from '@padel/common';
import { generateId } from '@padel/common';
import { shuffle, partnerKey, commonValidateScore, calculateCompetitorStandings, seedFromRounds, selectSitOuts } from './shared';

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
  if (groupA.length !== groupB.length && unassigned.length === 0) {
    errors.push(`Groups must be equal size (Group A: ${groupA.length}, Group B: ${groupB.length})`);
  }

  const maxCourts = Math.floor(Math.min(groupA.length, groupB.length) / 2);
  if (availableCourts.length > maxCourts && groupA.length >= 2 && groupB.length >= 2) {
    errors.push(`Too many courts: need at most ${maxCourts} court(s) for ${groupA.length}+${groupB.length} players`);
  }

  return errors;
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

    let matches: Match[];

    if (existingRounds.length + r === 0) {
      // Round 1: random pairing
      const shuffledA = shuffle(activeA.map(p => p.id));
      const shuffledB = shuffle(activeB.map(p => p.id));

      matches = [];
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
    } else {
      // Subsequent rounds: standings-based pairing
      const allRoundsForStandings = [...existingRounds, ...rounds];
      const standings = mixicanoStrategy.calculateStandings({
        players: activePlayers,
        rounds: allRoundsForStandings,
      } as Tournament);

      const standingsMap = new Map(standings.map((s, i) => [s.playerId, i]));
      const rankedA = [...activeA].sort(
        (a, b) => (standingsMap.get(a.id) ?? 999) - (standingsMap.get(b.id) ?? 999)
      );
      const rankedB = [...activeB].sort(
        (a, b) => (standingsMap.get(a.id) ?? 999) - (standingsMap.get(b.id) ?? 999)
      );

      matches = [];
      for (let i = 0; i < numCourts; i++) {
        const a1 = rankedA[i * 2].id;     // higher ranked A
        const a2 = rankedA[i * 2 + 1].id; // lower ranked A
        const b1 = rankedB[i * 2].id;     // higher ranked B
        const b2 = rankedB[i * 2 + 1].id; // lower ranked B

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
