import type { TournamentStrategy } from './types';
import type { Player, TournamentConfig, Round, Match, Tournament, Team, Club } from '@padel/common';
import { generateId } from '@padel/common';
import { shuffle, partnerKey, commonValidateScore, calculateCompetitorStandings, findTeamByPair, teamKey } from './shared';

/**
 * Shared infrastructure for all club formats.
 * Club formats pit clubs against each other in a round-robin.
 * Partners are always from the same club; opponents are always from different clubs.
 */

export type MatchMode = 'random' | 'standings' | 'slots';

/**
 * Score a candidate pairing within a court of 4.
 * Lower is better: penalize partner repeats heavily, opponent repeats quadratically.
 */
export function scorePairing(
  p1: [string, string],
  p2: [string, string],
  partnerCounts: Map<string, number>,
  opponentCounts: Map<string, number>,
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

export interface CourtAssignment {
  clubA: [string, string];
  clubB: [string, string];
}

/**
 * Given players from two clubs, create court assignments.
 * Each court has 2 players from club A and 2 from club B.
 */
export function assignCourtsRandom(
  clubAPlayers: string[],
  clubBPlayers: string[],
  numCourts: number,
  partnerCounts: Map<string, number>,
  opponentCounts: Map<string, number>,
  gamesPlayed: Map<string, number>,
): { courts: CourtAssignment[]; sitOutA: string[]; sitOutB: string[] } {
  const playersPerClub = numCourts * 2;

  // Sort by games played (desc) so those who've played most sit out first
  const sortByGames = (ids: string[]) =>
    [...ids].sort((a, b) => (gamesPlayed.get(b) ?? 0) - (gamesPlayed.get(a) ?? 0));
  const sortedA = sortByGames(clubAPlayers);
  const sortedB = sortByGames(clubBPlayers);
  const sitOutA = sortedA.slice(0, sortedA.length - playersPerClub);
  const sitOutB = sortedB.slice(0, sortedB.length - playersPerClub);
  const activeA = sortedA.slice(sortedA.length - playersPerClub);
  const activeB = sortedB.slice(sortedB.length - playersPerClub);

  // Try multiple random arrangements and pick the best
  const maxAttempts = numCourts <= 2 ? 100 : 200;
  let bestCourts: CourtAssignment[] = [];
  let bestScore = Infinity;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shuffledA = shuffle(activeA);
    const shuffledB = shuffle(activeB);
    const courts: CourtAssignment[] = [];
    let totalScore = 0;

    for (let i = 0; i < numCourts; i++) {
      const a: [string, string] = [shuffledA[i * 2], shuffledA[i * 2 + 1]];
      const b: [string, string] = [shuffledB[i * 2], shuffledB[i * 2 + 1]];
      courts.push({ clubA: a, clubB: b });

      // Score: partner repeats (same-club pairs) + opponent balance
      totalScore += scorePairing(a, b, partnerCounts, opponentCounts);
    }

    if (totalScore < bestScore) {
      bestScore = totalScore;
      bestCourts = courts;
      if (totalScore === 0) break;
    }
  }

  return { courts: bestCourts, sitOutA, sitOutB };
}

/** Generate a round-robin schedule of club fixtures */
export function generateClubFixtures(clubIds: string[], totalRounds: number): [string, string][][] {
  const ids = [...clubIds];
  const isOdd = ids.length % 2 !== 0;
  if (isOdd) ids.push('__BYE__');
  const n = ids.length;
  const rounds: [string, string][][] = [];

  for (let r = 0; r < Math.min(totalRounds, n - 1); r++) {
    const fixtures: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const home = ids[i];
      const away = ids[n - 1 - i];
      if (home !== '__BYE__' && away !== '__BYE__') {
        fixtures.push([home, away]);
      }
    }
    rounds.push(fixtures);
    const last = ids.pop()!;
    ids.splice(1, 0, last);
  }

  if (totalRounds > n - 1) {
    const cycleLength = rounds.length;
    for (let r = cycleLength; r < totalRounds; r++) {
      rounds.push(rounds[r % cycleLength]);
    }
  }

  return rounds;
}

/** Get teams belonging to a club */
export function getClubTeams(teams: Team[], players: Player[], clubId: string): Team[] {
  const clubPlayerIds = new Set(players.filter(p => p.clubId === clubId).map(p => p.id));
  return teams.filter(t => clubPlayerIds.has(t.player1Id) && clubPlayerIds.has(t.player2Id));
}

/** Get the rank slot for a team from its players */
function teamRankSlot(team: Team, players: Player[]): number | undefined {
  const p1 = players.find(p => p.id === team.player1Id);
  if (p1?.rankSlot != null) return p1.rankSlot;
  const p2 = players.find(p => p.id === team.player2Id);
  return p2?.rankSlot;
}

/** Match pairs from two clubs based on matchMode */
export function matchFixturePairs(
  teamsA: Team[],
  teamsB: Team[],
  matchMode: MatchMode,
  teamPoints: Map<string, number>,
  players?: Player[],
): [Team, Team][] {
  if (matchMode === 'slots' && players) {
    // Match teams by rank: rank 0 vs rank 0, rank 1 vs rank 1, etc.
    const byRankA = new Map<number, Team[]>();
    const byRankB = new Map<number, Team[]>();
    for (const t of teamsA) {
      const r = teamRankSlot(t, players) ?? 999;
      if (!byRankA.has(r)) byRankA.set(r, []);
      byRankA.get(r)!.push(t);
    }
    for (const t of teamsB) {
      const r = teamRankSlot(t, players) ?? 999;
      if (!byRankB.has(r)) byRankB.set(r, []);
      byRankB.get(r)!.push(t);
    }
    const allRanks = [...new Set([...byRankA.keys(), ...byRankB.keys()])].sort((a, b) => a - b);
    const pairs: [Team, Team][] = [];
    for (const rank of allRanks) {
      const ra = byRankA.get(rank) ?? [];
      const rb = byRankB.get(rank) ?? [];
      const count = Math.min(ra.length, rb.length);
      for (let i = 0; i < count; i++) {
        pairs.push([ra[i], rb[i]]);
      }
    }
    return pairs;
  }

  const count = Math.min(teamsA.length, teamsB.length);
  let orderedA = [...teamsA];
  let orderedB = [...teamsB];

  if (matchMode === 'random') {
    orderedA = shuffle(orderedA);
    orderedB = shuffle(orderedB);
  } else if (matchMode === 'standings') {
    orderedA.sort((a, b) => (teamPoints.get(b.id) ?? 0) - (teamPoints.get(a.id) ?? 0));
    orderedB.sort((a, b) => (teamPoints.get(b.id) ?? 0) - (teamPoints.get(a.id) ?? 0));
  }

  const pairs: [Team, Team][] = [];
  for (let i = 0; i < count; i++) {
    pairs.push([orderedA[i], orderedB[i]]);
  }
  return pairs;
}

export function generateClubRound(
  clubs: Club[],
  teams: Team[],
  players: Player[],
  config: TournamentConfig,
  fixtures: [string, string][],
  roundNumber: number,
  opponentCounts: Map<string, number>,
  gamesPlayed: Map<string, number>,
  lastSitOutRound: Map<string, number>,
  teamPoints: Map<string, number>,
  matchMode: MatchMode,
): Round {
  const availableCourts = config.courts.filter(c => !c.unavailable);
  const matches: Match[] = [];
  const sitOutPlayerIds: string[] = [];

  const playingClubIds = new Set(fixtures.flat());

  for (const club of clubs) {
    if (!playingClubIds.has(club.id)) {
      const clubTeams = getClubTeams(teams, players, club.id);
      for (const t of clubTeams) {
        sitOutPlayerIds.push(t.player1Id, t.player2Id);
        lastSitOutRound.set(t.id, roundNumber);
      }
    }
  }

  let courtIdx = 0;
  for (const [clubAId, clubBId] of fixtures) {
    const teamsA = getClubTeams(teams, players, clubAId);
    const teamsB = getClubTeams(teams, players, clubBId);
    const paired = matchFixturePairs(teamsA, teamsB, matchMode, teamPoints, players);

    for (const [t1, t2] of paired) {
      if (courtIdx >= availableCourts.length) break;
      const ok = teamKey(t1.id, t2.id);
      opponentCounts.set(ok, (opponentCounts.get(ok) ?? 0) + 1);
      gamesPlayed.set(t1.id, (gamesPlayed.get(t1.id) ?? 0) + 1);
      gamesPlayed.set(t2.id, (gamesPlayed.get(t2.id) ?? 0) + 1);

      matches.push({
        id: generateId(),
        courtId: availableCourts[courtIdx].id,
        team1: [t1.player1Id, t1.player2Id],
        team2: [t2.player1Id, t2.player2Id],
        score: null,
      });
      courtIdx++;
    }

    const pairedTeamIds = new Set(paired.flatMap(([a, b]) => [a.id, b.id]));
    for (const t of [...teamsA, ...teamsB]) {
      if (!pairedTeamIds.has(t.id)) {
        sitOutPlayerIds.push(t.player1Id, t.player2Id);
        lastSitOutRound.set(t.id, roundNumber);
      }
    }
  }

  return {
    id: generateId(),
    roundNumber,
    matches,
    sitOuts: sitOutPlayerIds,
  };
}

/** For individual club formats (Club Americano, Club Mexicano) — 2 per club minimum */
export function clubIndividualValidateSetup(players: Player[], config: TournamentConfig): string[] {
  const errors: string[] = [];
  const availableCourts = config.courts.filter(c => !c.unavailable);

  if (availableCourts.length === 0) {
    errors.push('At least 1 court is required');
  }
  if (config.pointsPerMatch < 1) {
    errors.push('Points per match must be at least 1');
  }

  const clubCounts = new Map<string, number>();
  let unassigned = 0;
  for (const p of players) {
    if (p.clubId) {
      clubCounts.set(p.clubId, (clubCounts.get(p.clubId) ?? 0) + 1);
    } else {
      unassigned++;
    }
  }

  if (clubCounts.size < 2) {
    errors.push('At least 2 clubs are required');
  }

  if (unassigned > 0) {
    errors.push(`${unassigned} player(s) not assigned to a club`);
  }

  for (const [, count] of clubCounts) {
    if (count < 2) {
      errors.push('Each club needs at least 2 players');
      break;
    }
  }

  for (const [, count] of clubCounts) {
    if (count % 2 !== 0) {
      errors.push('Each club needs an even number of players');
      break;
    }
  }

  return errors;
}

/** For team club formats (Club Team Americano, etc.) — 4 per club minimum (2 pairs) */
export function clubValidateSetup(players: Player[], config: TournamentConfig): string[] {
  const errors: string[] = [];
  const availableCourts = config.courts.filter(c => !c.unavailable);

  if (availableCourts.length === 0) {
    errors.push('At least 1 court is required');
  }
  if (config.pointsPerMatch < 1) {
    errors.push('Points per match must be at least 1');
  }

  const clubCounts = new Map<string, number>();
  let unassigned = 0;
  for (const p of players) {
    if (p.clubId) {
      clubCounts.set(p.clubId, (clubCounts.get(p.clubId) ?? 0) + 1);
    } else {
      unassigned++;
    }
  }

  if (clubCounts.size < 2) {
    errors.push('At least 2 clubs are required');
  }

  if (unassigned > 0) {
    errors.push(`${unassigned} player(s) not assigned to a club`);
  }

  for (const [, count] of clubCounts) {
    if (count < 4) {
      errors.push('Each club needs at least 4 players (2 pairs)');
      break;
    }
  }

  for (const [, count] of clubCounts) {
    if (count % 2 !== 0) {
      errors.push('Each club needs an even number of players');
      break;
    }
  }

  return errors;
}

export function clubValidateWarnings(players: Player[], _config: TournamentConfig): string[] {
  const warnings: string[] = [];
  const clubCounts = new Map<string, number>();
  for (const p of players) {
    if (p.clubId) {
      clubCounts.set(p.clubId, (clubCounts.get(p.clubId) ?? 0) + 1);
    }
  }
  const sizes = [...clubCounts.values()];
  if (sizes.length > 1 && new Set(sizes).size > 1) {
    const pairSizes = sizes.map(s => s / 2);
    warnings.push(`Clubs have different sizes (${pairSizes.join(' vs ')} pairs) — the larger club gets extra sit-out compensation points, which may affect club standings`);
  }
  return warnings;
}

export function clubGetCompetitors(tournament: Tournament) {
  const teams = tournament.teams ?? [];
  const unavailableIds = new Set(
    tournament.players.filter(p => p.unavailable).map(p => p.id)
  );
  const nameOf = (id: string) => tournament.players.find(p => p.id === id)?.name ?? '?';
  return teams
    .filter(t => !unavailableIds.has(t.player1Id) && !unavailableIds.has(t.player2Id))
    .map(t => ({
      id: t.id,
      name: t.name ?? `${nameOf(t.player1Id)} & ${nameOf(t.player2Id)}`,
      playerIds: [t.player1Id, t.player2Id],
    }));
}

export function clubCalculateStandings(strategy: TournamentStrategy, tournament: Tournament) {
  const competitors = strategy.getCompetitors(tournament);
  const teams = tournament.teams ?? [];
  return calculateCompetitorStandings(tournament, competitors, (side) => {
    const team = findTeamByPair(teams, side);
    if (!team) return [];
    const c = competitors.find(comp => comp.id === team.id);
    return c ? [c] : [];
  });
}

export { commonValidateScore };
