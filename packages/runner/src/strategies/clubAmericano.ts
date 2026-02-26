import type { TournamentStrategy, ScheduleResult } from './types';
import type { Player, TournamentConfig, Round, Match, Tournament, Team, Club } from '@padel/common';
import { generateId } from '@padel/common';
import { shuffle, commonValidateScore, calculateCompetitorStandings, findTeamByPair } from './shared';

/**
 * Club Americano: clubs of 2-3 pairs compete in a round-robin.
 * Partners are always from the same club.
 * Club standings aggregate member pair points.
 */

function teamKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/** Generate a round-robin schedule of club fixtures */
function generateClubFixtures(clubIds: string[], totalRounds: number): [string, string][][] {
  // Standard round-robin: rotate all but first
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
    // Rotate: fix first, rotate rest
    const last = ids.pop()!;
    ids.splice(1, 0, last);
  }

  // If we need more rounds than n-1, repeat the cycle
  if (totalRounds > n - 1) {
    const cycleLength = rounds.length;
    for (let r = cycleLength; r < totalRounds; r++) {
      rounds.push(rounds[r % cycleLength]);
    }
  }

  return rounds;
}

/** Get teams belonging to a club */
function getClubTeams(teams: Team[], players: Player[], clubId: string): Team[] {
  const clubPlayerIds = new Set(players.filter(p => p.clubId === clubId).map(p => p.id));
  return teams.filter(t => clubPlayerIds.has(t.player1Id) && clubPlayerIds.has(t.player2Id));
}

/** Match pairs from two clubs based on matchMode */
function matchFixturePairs(
  teamsA: Team[],
  teamsB: Team[],
  matchMode: 'random' | 'standings' | 'slots',
  teamPoints: Map<string, number>,
): [Team, Team][] {
  const count = Math.min(teamsA.length, teamsB.length);
  let orderedA = [...teamsA];
  let orderedB = [...teamsB];

  if (matchMode === 'random') {
    orderedA = shuffle(orderedA);
    orderedB = shuffle(orderedB);
  } else if (matchMode === 'standings') {
    // Sort by points descending
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

function generateClubRound(
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
): Round {
  const availableCourts = config.courts.filter(c => !c.unavailable);
  const matchMode = config.matchMode ?? 'random';
  const matches: Match[] = [];
  const sitOutPlayerIds: string[] = [];

  // Clubs playing this round
  const playingClubIds = new Set(fixtures.flat());

  // Sit-out: clubs not in any fixture (odd number of clubs)
  for (const club of clubs) {
    if (!playingClubIds.has(club.id)) {
      const clubTeams = getClubTeams(teams, players, club.id);
      for (const t of clubTeams) {
        sitOutPlayerIds.push(t.player1Id, t.player2Id);
        lastSitOutRound.set(t.id, roundNumber);
      }
    }
  }

  // Generate matches from fixtures
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

    // Teams that didn't fit on courts sit out
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

function clubAmericanoValidateSetup(players: Player[], config: TournamentConfig): string[] {
  const errors: string[] = [];
  const availableCourts = config.courts.filter(c => !c.unavailable);

  if (availableCourts.length === 0) {
    errors.push('At least 1 court is required');
  }
  if (config.pointsPerMatch < 1) {
    errors.push('Points per match must be at least 1');
  }

  // Club validation requires checking player clubIds
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

function clubAmericanoValidateWarnings(players: Player[], _config: TournamentConfig): string[] {
  const warnings: string[] = [];
  const clubCounts = new Map<string, number>();
  for (const p of players) {
    if (p.clubId) {
      clubCounts.set(p.clubId, (clubCounts.get(p.clubId) ?? 0) + 1);
    }
  }
  const sizes = [...clubCounts.values()];
  if (sizes.length > 1 && new Set(sizes).size > 1) {
    warnings.push('Clubs have different sizes — some pairs may sit out more');
  }
  return warnings;
}

export const clubAmericanoStrategy: TournamentStrategy = {
  isDynamic: true,
  hasFixedPartners: true,

  validateSetup: clubAmericanoValidateSetup,
  validateWarnings: clubAmericanoValidateWarnings,
  validateScore: commonValidateScore,

  getCompetitors(tournament: Tournament) {
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
  },

  calculateStandings(tournament: Tournament) {
    const competitors = clubAmericanoStrategy.getCompetitors(tournament);
    const teams = tournament.teams ?? [];
    return calculateCompetitorStandings(tournament, competitors, (side) => {
      const team = findTeamByPair(teams, side);
      if (!team) return [];
      const c = competitors.find(comp => comp.id === team.id);
      return c ? [c] : [];
    });
  },

  generateSchedule(_players: Player[], config: TournamentConfig, tournament?: Tournament): ScheduleResult {
    const allTeams = tournament?.teams ?? [];
    const clubs = tournament?.clubs ?? [];
    const players = tournament?.players ?? [];

    if (clubs.length < 2 || allTeams.length < 2) {
      return { rounds: [], warnings: ['Not enough clubs or teams configured'] };
    }

    const unavailableIds = new Set(players.filter(p => p.unavailable).map(p => p.id));
    const activeTeams = allTeams.filter(t => !unavailableIds.has(t.player1Id) && !unavailableIds.has(t.player2Id));

    // Calculate total rounds based on round-robin of clubs
    const numClubs = clubs.length;
    const defaultRounds = numClubs % 2 === 0 ? numClubs - 1 : numClubs;
    const totalRounds = config.maxRounds ?? defaultRounds;

    const clubFixtures = generateClubFixtures(clubs.map(c => c.id), totalRounds);

    const gamesPlayed = new Map<string, number>();
    const lastSitOutRound = new Map<string, number>();
    const opponentCounts = new Map<string, number>();
    activeTeams.forEach(t => { gamesPlayed.set(t.id, 0); lastSitOutRound.set(t.id, -Infinity); });

    // Generate first round only (isDynamic)
    const round = generateClubRound(
      clubs, activeTeams, players, config,
      clubFixtures[0], 1,
      opponentCounts, gamesPlayed, lastSitOutRound,
      new Map(),
    );

    return { rounds: [round], warnings: [] };
  },

  generateAdditionalRounds(
    _players: Player[],
    config: TournamentConfig,
    existingRounds: Round[],
    count: number,
    excludePlayerIds?: string[],
    _timeBudgetMs?: number,
    tournament?: Tournament,
  ): ScheduleResult {
    const allTeams = tournament?.teams ?? [];
    const clubs = tournament?.clubs ?? [];
    const players = tournament?.players ?? [];

    const excludeSet = new Set(excludePlayerIds ?? []);
    const activeTeams = excludeSet.size > 0
      ? allTeams.filter(t => !excludeSet.has(t.player1Id) && !excludeSet.has(t.player2Id))
      : allTeams;

    if (activeTeams.length < 2 || clubs.length < 2) {
      return { rounds: [], warnings: ['Not enough active teams'] };
    }

    // Seed tracking from existing rounds
    const opponentCounts = new Map<string, number>();
    const gamesPlayed = new Map<string, number>();
    const lastSitOutRound = new Map<string, number>();
    activeTeams.forEach(t => { gamesPlayed.set(t.id, 0); lastSitOutRound.set(t.id, -Infinity); });

    // Build team points for standings-based matching
    const teamPoints = new Map<string, number>();
    activeTeams.forEach(t => teamPoints.set(t.id, 0));

    for (const round of existingRounds) {
      for (const match of round.matches) {
        const t1 = findTeamByPair(allTeams, match.team1);
        const t2 = findTeamByPair(allTeams, match.team2);
        if (t1 && t2) {
          const ok = teamKey(t1.id, t2.id);
          opponentCounts.set(ok, (opponentCounts.get(ok) ?? 0) + 1);
          if (gamesPlayed.has(t1.id)) gamesPlayed.set(t1.id, (gamesPlayed.get(t1.id) ?? 0) + 1);
          if (gamesPlayed.has(t2.id)) gamesPlayed.set(t2.id, (gamesPlayed.get(t2.id) ?? 0) + 1);
          if (match.score) {
            if (teamPoints.has(t1.id)) teamPoints.set(t1.id, (teamPoints.get(t1.id) ?? 0) + match.score.team1Points);
            if (teamPoints.has(t2.id)) teamPoints.set(t2.id, (teamPoints.get(t2.id) ?? 0) + match.score.team2Points);
          }
        }
      }
      for (const team of activeTeams) {
        if (round.sitOuts.includes(team.player1Id) || round.sitOuts.includes(team.player2Id)) {
          lastSitOutRound.set(team.id, round.roundNumber);
        }
      }
    }

    const numClubs = clubs.length;
    const defaultTotal = numClubs % 2 === 0 ? numClubs - 1 : numClubs;
    const totalRounds = config.maxRounds ?? defaultTotal;
    const clubFixtures = generateClubFixtures(clubs.map(c => c.id), totalRounds);

    const rounds: Round[] = [];
    const startRound = existingRounds.length + 1;

    for (let i = 0; i < count; i++) {
      const roundNum = startRound + i;
      const fixtureIdx = (roundNum - 1) % clubFixtures.length;
      const round = generateClubRound(
        clubs, activeTeams, players, config,
        clubFixtures[fixtureIdx], roundNum,
        opponentCounts, gamesPlayed, lastSitOutRound,
        teamPoints,
      );
      rounds.push(round);
    }

    return { rounds, warnings: [] };
  },
};
