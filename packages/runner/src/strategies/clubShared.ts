import type { TournamentStrategy } from './types';
import type { Player, TournamentConfig, Round, Match, Tournament, Team, Club } from '@padel/common';
import { generateId } from '@padel/common';
import { shuffle, commonValidateScore, calculateCompetitorStandings, findTeamByPair, teamKey } from './shared';

/**
 * Shared infrastructure for all club formats.
 * Club formats pit clubs against each other in a round-robin.
 * Partners are always from the same club; opponents are always from different clubs.
 */

export type MatchMode = 'random' | 'standings' | 'slots';

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

/** Match pairs from two clubs based on matchMode */
export function matchFixturePairs(
  teamsA: Team[],
  teamsB: Team[],
  matchMode: MatchMode,
  teamPoints: Map<string, number>,
): [Team, Team][] {
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
  // 'slots': use original order

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
    const paired = matchFixturePairs(teamsA, teamsB, matchMode, teamPoints);

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
