import type { TournamentStrategy, ScheduleResult } from './types';
import type { Player, TournamentConfig, Round, Match, Tournament } from '@padel/common';
import { generateId } from '@padel/common';
import { shuffle, partnerKey, commonValidateSetup, commonValidateScore, seedFromRounds, selectSitOuts } from './shared';

/**
 * Build promotion/relegation groups from the previous round's results.
 *
 * Court order matters: courts[0] = King Court (highest), courts[N-1] = lowest.
 * - Winners on court N promote to court N-1 (except King Court winners stay)
 * - Losers on court N relegate to court N+1 (except lowest court losers stay)
 * - Ties broken by overall standings rank
 */
function buildPromotionGroups(
  prevRound: Round,
  availableCourts: { id: string }[],
  standings: Map<string, number>,
  roundPlayerIds: Set<string>,
): string[][] {
  const numCourts = availableCourts.length;

  // Map courtId to its rank index (0 = King Court)
  const courtIndex = new Map<string, number>();
  for (let i = 0; i < numCourts; i++) {
    courtIndex.set(availableCourts[i].id, i);
  }

  // For each court in the previous round, determine winners and losers
  const courtResults = new Map<number, { winners: string[]; losers: string[] }>();

  for (const match of prevRound.matches) {
    const ci = courtIndex.get(match.courtId);
    if (ci === undefined) continue;

    const score = match.score;
    if (!score) {
      // Unscored match: treat all as "staying"
      courtResults.set(ci, {
        winners: [...match.team1],
        losers: [...match.team2],
      });
      continue;
    }

    let winners: string[];
    let losers: string[];

    if (score.team1Points > score.team2Points) {
      winners = [...match.team1];
      losers = [...match.team2];
    } else if (score.team2Points > score.team1Points) {
      winners = [...match.team2];
      losers = [...match.team1];
    } else {
      // Tie: break by standings rank
      const allPlayers = [...match.team1, ...match.team2];
      allPlayers.sort((a, b) => (standings.get(a) ?? 999) - (standings.get(b) ?? 999));
      winners = allPlayers.slice(0, 2);
      losers = allPlayers.slice(2);
    }

    courtResults.set(ci, { winners, losers });
  }

  // Build court groups via promotion/relegation
  const courtGroups: string[][] = Array.from({ length: numCourts }, () => []);

  for (let ci = 0; ci < numCourts; ci++) {
    const result = courtResults.get(ci);
    if (!result) continue;

    // Winners promote (move to ci - 1), unless they're on King Court (ci = 0)
    const promoteTarget = ci === 0 ? 0 : ci - 1;
    for (const pid of result.winners) {
      if (roundPlayerIds.has(pid)) {
        courtGroups[promoteTarget].push(pid);
      }
    }

    // Losers relegate (move to ci + 1), unless they're on lowest court
    const relegateTarget = ci === numCourts - 1 ? numCourts - 1 : ci + 1;
    for (const pid of result.losers) {
      if (roundPlayerIds.has(pid)) {
        courtGroups[relegateTarget].push(pid);
      }
    }
  }

  // Handle players returning from sit-out or otherwise unassigned — enter at lowest court
  const assigned = new Set(courtGroups.flat());
  const unassigned = [...roundPlayerIds].filter(pid => !assigned.has(pid));
  // Sort unassigned by standings (worst first, so they go to lowest court)
  unassigned.sort((a, b) => (standings.get(b) ?? 999) - (standings.get(a) ?? 999));
  for (const pid of unassigned) {
    // Find the lowest court that has room (< 4 players), or just push to lowest
    let placed = false;
    for (let ci = numCourts - 1; ci >= 0; ci--) {
      if (courtGroups[ci].length < 4) {
        courtGroups[ci].push(pid);
        placed = true;
        break;
      }
    }
    if (!placed) {
      courtGroups[numCourts - 1].push(pid);
    }
  }

  // Rebalance: each court should have exactly 4 players
  // If any court has too many or too few, redistribute by standings
  const allAssigned = courtGroups.flat();
  if (allAssigned.length !== numCourts * 4) {
    // Fallback: just group by standings
    allAssigned.sort((a, b) => (standings.get(a) ?? 999) - (standings.get(b) ?? 999));
    for (let ci = 0; ci < numCourts; ci++) {
      courtGroups[ci] = allAssigned.slice(ci * 4, ci * 4 + 4);
    }
  } else {
    // Check if all groups have exactly 4
    const needsRebalance = courtGroups.some(g => g.length !== 4);
    if (needsRebalance) {
      allAssigned.sort((a, b) => (standings.get(a) ?? 999) - (standings.get(b) ?? 999));
      for (let ci = 0; ci < numCourts; ci++) {
        courtGroups[ci] = allAssigned.slice(ci * 4, ci * 4 + 4);
      }
    }
  }

  return courtGroups;
}

/**
 * Generate rounds using King of the Court rules:
 * - Round 1: random grouping
 * - Subsequent rounds: promotion/relegation based on previous round results
 * - Within each court group: pair 1st+4th vs 2nd+3rd by standings
 */
function generateKOTCRounds(
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
    const roundPlayerIds = new Set(roundPlayers.map(p => p.id));

    let groups: string[][];

    if (existingRounds.length + r === 0) {
      // Round 1: random grouping with basic partner-repeat avoidance
      const shuffled = shuffle(roundPlayers.map(p => p.id));
      groups = [];
      for (let i = 0; i < numCourts; i++) {
        groups.push(shuffled.slice(i * 4, i * 4 + 4));
      }
    } else {
      // Subsequent rounds: promotion/relegation
      const allRoundsForStandings = [...existingRounds, ...rounds];

      // Calculate standings for ranking
      const standingsEntries = calculateKOTCStandingsInternal(
        activePlayers,
        allRoundsForStandings,
        config,
      );
      const standingsMap = new Map(standingsEntries.map((s, i) => [s.playerId, i]));

      // Get previous round
      const prevRound = allRoundsForStandings[allRoundsForStandings.length - 1];

      groups = buildPromotionGroups(
        prevRound,
        availableCourts.slice(0, numCourts),
        standingsMap,
        roundPlayerIds,
      );
    }

    // Create matches: within each group, 1st+4th vs 2nd+3rd by standings
    const matches: Match[] = groups.map((group, idx) => {
      let team1: [string, string];
      let team2: [string, string];

      if (existingRounds.length + r === 0) {
        // Round 1: pick pairing with fewest partner repeats
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
        // KOTC rule: within each court group, rank by standings, 1st+4th vs 2nd+3rd
        const allRoundsForStandings = [...existingRounds, ...rounds];
        const standingsEntries = calculateKOTCStandingsInternal(
          activePlayers,
          allRoundsForStandings,
          config,
        );
        const standingsMap = new Map(standingsEntries.map((s, i) => [s.playerId, i]));
        const sorted = [...group].sort(
          (a, b) => (standingsMap.get(a) ?? 999) - (standingsMap.get(b) ?? 999)
        );
        team1 = [sorted[0], sorted[3]];
        team2 = [sorted[1], sorted[2]];
      }

      return {
        id: generateId(),
        courtId: availableCourts[idx].id,
        team1,
        team2,
        score: null,
      };
    });

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
 * Internal standings calculation that includes court bonuses.
 * Used both for round generation and for the public calculateStandings.
 */
function calculateKOTCStandingsInternal(
  players: Player[],
  rounds: Round[],
  config: TournamentConfig,
) {
  // Build a court bonus map
  const courtBonusMap = new Map<string, number>();
  for (const court of config.courts) {
    if (court.bonus && court.bonus > 0) {
      courtBonusMap.set(court.id, court.bonus);
    }
  }

  // Base stats: points, matches, etc.
  const stats = new Map<string, {
    totalPoints: number;
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    matchesDraw: number;
    pointsFor: number;
    pointsAgainst: number;
  }>();

  players.forEach(p => stats.set(p.id, {
    totalPoints: 0, matchesPlayed: 0, matchesWon: 0,
    matchesLost: 0, matchesDraw: 0, pointsFor: 0, pointsAgainst: 0,
  }));

  for (const round of rounds) {
    const scoredMatches = round.matches.filter(m => m.score !== null);
    let roundTotalPoints = 0;
    let roundPlayersScored = 0;

    for (const match of scoredMatches) {
      const score = match.score!;
      const courtBonus = courtBonusMap.get(match.courtId) ?? 0;

      for (const pid of match.team1) {
        const s = stats.get(pid);
        if (!s) continue;
        s.totalPoints += score.team1Points + courtBonus;
        s.pointsFor += score.team1Points;
        s.pointsAgainst += score.team2Points;
        s.matchesPlayed += 1;
        if (score.team1Points > score.team2Points) s.matchesWon += 1;
        else if (score.team1Points < score.team2Points) s.matchesLost += 1;
        else s.matchesDraw += 1;
      }
      for (const pid of match.team2) {
        const s = stats.get(pid);
        if (!s) continue;
        s.totalPoints += score.team2Points + courtBonus;
        s.pointsFor += score.team2Points;
        s.pointsAgainst += score.team1Points;
        s.matchesPlayed += 1;
        if (score.team2Points > score.team1Points) s.matchesWon += 1;
        else if (score.team2Points < score.team1Points) s.matchesLost += 1;
        else s.matchesDraw += 1;
      }
      roundTotalPoints += score.team1Points + score.team2Points;
      roundPlayersScored += 4;
    }

    if (roundPlayersScored > 0 && round.sitOuts.length > 0) {
      const avgPoints = roundTotalPoints / roundPlayersScored;
      for (const pid of round.sitOuts) {
        const s = stats.get(pid);
        if (!s) continue;
        s.totalPoints += Math.round(avgPoints);
      }
    }
  }

  const nameMap = new Map(players.map(p => [p.id, p.name]));
  const entries = players.map(p => {
    const s = stats.get(p.id)!;
    return {
      playerId: p.id,
      playerName: nameMap.get(p.id) ?? '',
      totalPoints: s.totalPoints,
      matchesPlayed: s.matchesPlayed,
      matchesWon: s.matchesWon,
      matchesLost: s.matchesLost,
      matchesDraw: s.matchesDraw,
      pointDiff: s.pointsFor - s.pointsAgainst,
      rank: 0,
    };
  });

  entries.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
    return a.playerName.localeCompare(b.playerName);
  });

  entries.forEach((entry, i) => {
    if (i === 0) {
      entry.rank = 1;
    } else {
      const prev = entries[i - 1];
      if (
        entry.totalPoints === prev.totalPoints &&
        entry.pointDiff === prev.pointDiff &&
        entry.matchesWon === prev.matchesWon
      ) {
        entry.rank = prev.rank;
      } else {
        entry.rank = i + 1;
      }
    }
  });

  return entries;
}

export const kingOfTheCourtStrategy: TournamentStrategy = {
  isDynamic: true,
  hasFixedPartners: false,
  validateSetup: commonValidateSetup,
  validateScore: commonValidateScore,

  calculateStandings(tournament: Tournament) {
    const activePlayers = tournament.players.filter(p => !p.unavailable);
    return calculateKOTCStandingsInternal(activePlayers, tournament.rounds, tournament.config);
  },

  getCompetitors(tournament: Tournament) {
    return tournament.players
      .filter(p => !p.unavailable)
      .map(p => ({ id: p.id, name: p.name, playerIds: [p.id] }));
  },

  generateSchedule(players: Player[], config: TournamentConfig): ScheduleResult {
    return generateKOTCRounds(players, config, [], 1);
  },

  generateAdditionalRounds(players: Player[], config: TournamentConfig, existingRounds: Round[], count: number, excludePlayerIds?: string[]): ScheduleResult {
    return generateKOTCRounds(players, config, existingRounds, count, excludePlayerIds);
  },
};
