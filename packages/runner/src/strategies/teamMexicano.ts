import type { TournamentStrategy, ScheduleResult } from './types';
import type { Player, TournamentConfig, Round, Match, Tournament, Team } from '@padel/common';
import { generateId } from '@padel/common';
import { shuffle, commonValidateScore, calculateCompetitorStandings } from './shared';

/**
 * Team Mexicano: fixed teams with standings-based matchups.
 * Teams are formed before the tournament and never change.
 * After round 1, matchups are based on team standings:
 * 1st vs 2nd, 3rd vs 4th, etc.
 */

/** Find a team that contains both players of a match side */
function findTeamByPair(teams: Team[], pair: [string, string]): Team | undefined {
  return teams.find(t =>
    (t.player1Id === pair[0] && t.player2Id === pair[1]) ||
    (t.player1Id === pair[1] && t.player2Id === pair[0])
  );
}

/** Select which teams sit out: those with most games, tiebreak by recency */
function selectTeamSitOuts(
  teams: Team[],
  sitOutCount: number,
  gamesPlayed: Map<string, number>,
  lastSitOutRound: Map<string, number>,
): { sitOutTeams: Set<string>; activeTeams: Team[] } {
  if (sitOutCount <= 0) {
    return { sitOutTeams: new Set(), activeTeams: [...teams] };
  }
  const sortedForSitOut = shuffle([...teams]).sort((a, b) => {
    const gamesDiff = (gamesPlayed.get(b.id) ?? 0) - (gamesPlayed.get(a.id) ?? 0);
    if (gamesDiff !== 0) return gamesDiff;
    return (lastSitOutRound.get(a.id) ?? -Infinity) - (lastSitOutRound.get(b.id) ?? -Infinity);
  });
  const sitOutTeams = new Set(sortedForSitOut.slice(0, sitOutCount).map(t => t.id));
  const activeTeams = teams.filter(t => !sitOutTeams.has(t.id));
  return { sitOutTeams, activeTeams };
}

function teamMexicanoValidateSetup(players: Player[], config: TournamentConfig): string[] {
  const errors: string[] = [];
  if (players.length < 4) {
    errors.push('At least 4 players are required');
  }
  if (players.length % 2 !== 0) {
    errors.push('Team Mexicano requires an even number of players');
  }
  const availableCourts = config.courts.filter(c => !c.unavailable);
  if (availableCourts.length === 0) {
    errors.push('At least 1 court is required');
  }
  if (config.pointsPerMatch < 1) {
    errors.push('Points per match must be at least 1');
  }
  const numTeams = Math.floor(players.length / 2);
  const maxCourts = Math.floor(numTeams / 2);
  if (availableCourts.length > maxCourts && numTeams >= 2) {
    errors.push(`Too many courts: ${numTeams} teams need at most ${maxCourts} court(s)`);
  }
  return errors;
}

/** Build team standings for matchup ordering */
function getTeamStandings(
  teams: Team[],
  existingRounds: Round[],
  allTeams: Team[],
  players: Player[],
): Map<string, number> {
  const competitors = teams.map(t => {
    const nameOf = (id: string) => players.find(p => p.id === id)?.name ?? '?';
    return {
      id: t.id,
      name: t.name ?? `${nameOf(t.player1Id)} & ${nameOf(t.player2Id)}`,
      playerIds: [t.player1Id, t.player2Id],
    };
  });

  const standings = calculateCompetitorStandings(
    { players, rounds: existingRounds } as Tournament,
    competitors,
    (side) => {
      const team = findTeamByPair(allTeams, side);
      if (!team) return [];
      const c = competitors.find(comp => comp.id === team.id);
      return c ? [c] : [];
    },
  );

  const rankMap = new Map<string, number>();
  standings.forEach((entry, i) => rankMap.set(entry.playerId, i));
  return rankMap;
}

/** Generate one round with standings-based matchups */
function generateStandingsRound(
  activeTeams: Team[],
  allTeams: Team[],
  existingRounds: Round[],
  players: Player[],
  availableCourts: { id: string; name: string }[],
  numCourts: number,
): Match[] {
  const rankMap = getTeamStandings(activeTeams, existingRounds, allTeams, players);
  const ranked = [...activeTeams].sort(
    (a, b) => (rankMap.get(a.id) ?? 999) - (rankMap.get(b.id) ?? 999)
  );

  // Pair 1st vs 2nd, 3rd vs 4th, etc.
  const matches: Match[] = [];
  for (let i = 0; i < numCourts; i++) {
    const t1 = ranked[i * 2];
    const t2 = ranked[i * 2 + 1];
    if (!t1 || !t2) break;
    matches.push({
      id: generateId(),
      courtId: availableCourts[i].id,
      team1: [t1.player1Id, t1.player2Id],
      team2: [t2.player1Id, t2.player2Id],
      score: null,
    });
  }
  return matches;
}

/** Generate one round with random matchups (for round 1) */
function generateRandomRound(
  activeTeams: Team[],
  availableCourts: { id: string; name: string }[],
  numCourts: number,
): Match[] {
  const shuffled = shuffle([...activeTeams]);
  const matches: Match[] = [];
  for (let i = 0; i < numCourts; i++) {
    const t1 = shuffled[i * 2];
    const t2 = shuffled[i * 2 + 1];
    if (!t1 || !t2) break;
    matches.push({
      id: generateId(),
      courtId: availableCourts[i].id,
      team1: [t1.player1Id, t1.player2Id],
      team2: [t2.player1Id, t2.player2Id],
      score: null,
    });
  }
  return matches;
}

export const teamMexicanoStrategy: TournamentStrategy = {
  isDynamic: true,
  hasFixedPartners: true,
  validateSetup: teamMexicanoValidateSetup,
  validateScore: commonValidateScore,

  calculateStandings(tournament: Tournament) {
    const competitors = teamMexicanoStrategy.getCompetitors(tournament);
    const teams = tournament.teams ?? [];
    return calculateCompetitorStandings(tournament, competitors, (side) => {
      const team = findTeamByPair(teams, side);
      if (!team) return [];
      const c = competitors.find(comp => comp.id === team.id);
      return c ? [c] : [];
    });
  },

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

  generateSchedule(_players: Player[], config: TournamentConfig, tournament?: Tournament): ScheduleResult {
    const allTeams = tournament?.teams ?? [];
    const unavailableIds = new Set(
      (tournament?.players ?? []).filter(p => p.unavailable).map(p => p.id)
    );
    const teams = allTeams.filter(t => !unavailableIds.has(t.player1Id) && !unavailableIds.has(t.player2Id));
    if (teams.length < 2) {
      return { rounds: [], warnings: ['No teams configured'] };
    }

    const availableCourts = config.courts.filter(c => !c.unavailable);
    const numCourts = Math.min(availableCourts.length, Math.floor(teams.length / 2));
    if (numCourts === 0) {
      return { rounds: [], warnings: ['Not enough teams for a match (need at least 2)'] };
    }

    const warnings: string[] = [];
    const sitOutCount = teams.length - numCourts * 2;
    if (sitOutCount > 0) {
      warnings.push(`${sitOutCount} team(s) will sit out each round`);
    }

    // Round 1: random matchups (only generate 1 round initially, like Mexicano)
    const gamesPlayed = new Map<string, number>();
    const lastSitOutRound = new Map<string, number>();
    teams.forEach(t => { gamesPlayed.set(t.id, 0); lastSitOutRound.set(t.id, -Infinity); });

    const { sitOutTeams, activeTeams } = selectTeamSitOuts(teams, sitOutCount, gamesPlayed, lastSitOutRound);
    const matches = generateRandomRound(activeTeams, availableCourts, numCourts);

    const sitOutPlayerIds: string[] = [];
    for (const team of teams) {
      if (sitOutTeams.has(team.id)) {
        sitOutPlayerIds.push(team.player1Id, team.player2Id);
      }
    }

    const rounds: Round[] = [{
      id: generateId(),
      roundNumber: 1,
      matches,
      sitOuts: sitOutPlayerIds,
    }];

    return { rounds, warnings };
  },

  generateAdditionalRounds(_players: Player[], config: TournamentConfig, existingRounds: Round[], count: number, excludePlayerIds?: string[], _timeBudgetMs?: number, tournament?: Tournament): ScheduleResult {
    const allTeams = tournament?.teams ?? [];
    const excludeSet = new Set(excludePlayerIds ?? []);
    const activeTeams = excludeSet.size > 0
      ? allTeams.filter(t => !excludeSet.has(t.player1Id) && !excludeSet.has(t.player2Id))
      : allTeams;

    if (activeTeams.length < 2) {
      return { rounds: [], warnings: ['Not enough active teams for a match (need at least 2)'] };
    }

    const availableCourts = config.courts.filter(c => !c.unavailable);
    const numCourts = Math.min(availableCourts.length, Math.floor(activeTeams.length / 2));
    if (numCourts === 0) {
      return { rounds: [], warnings: ['Not enough courts'] };
    }

    const sitOutCount = activeTeams.length - numCourts * 2;

    // Seed tracking from existing rounds
    const gamesPlayed = new Map<string, number>();
    const lastSitOutRound = new Map<string, number>();
    activeTeams.forEach(t => { gamesPlayed.set(t.id, 0); lastSitOutRound.set(t.id, -Infinity); });

    for (const round of existingRounds) {
      for (const match of round.matches) {
        const t1 = findTeamByPair(allTeams, match.team1);
        const t2 = findTeamByPair(allTeams, match.team2);
        if (t1 && gamesPlayed.has(t1.id)) gamesPlayed.set(t1.id, (gamesPlayed.get(t1.id) ?? 0) + 1);
        if (t2 && gamesPlayed.has(t2.id)) gamesPlayed.set(t2.id, (gamesPlayed.get(t2.id) ?? 0) + 1);
      }
      for (const team of activeTeams) {
        if (round.sitOuts.includes(team.player1Id) || round.sitOuts.includes(team.player2Id)) {
          lastSitOutRound.set(team.id, round.roundNumber);
        }
      }
    }

    const players = tournament?.players ?? [];
    const rounds: Round[] = [];
    const startRoundNumber = existingRounds.length + 1;

    for (let r = 0; r < count; r++) {
      const { sitOutTeams, activeTeams: roundActiveTeams } = selectTeamSitOuts(activeTeams, sitOutCount, gamesPlayed, lastSitOutRound);
      const roundNum = startRoundNumber + r;

      // Standings-based matchups
      const allRoundsForStandings = [...existingRounds, ...rounds];
      const matches = generateStandingsRound(
        roundActiveTeams, allTeams, allRoundsForStandings, players,
        availableCourts, numCourts,
      );

      // Update tracking
      for (const match of matches) {
        const t1 = findTeamByPair(allTeams, match.team1);
        const t2 = findTeamByPair(allTeams, match.team2);
        if (t1 && gamesPlayed.has(t1.id)) gamesPlayed.set(t1.id, (gamesPlayed.get(t1.id) ?? 0) + 1);
        if (t2 && gamesPlayed.has(t2.id)) gamesPlayed.set(t2.id, (gamesPlayed.get(t2.id) ?? 0) + 1);
      }

      const sitOutPlayerIds: string[] = [];
      for (const team of activeTeams) {
        if (sitOutTeams.has(team.id)) {
          sitOutPlayerIds.push(team.player1Id, team.player2Id);
          lastSitOutRound.set(team.id, roundNum);
        }
      }

      rounds.push({
        id: generateId(),
        roundNumber: roundNum,
        matches,
        sitOuts: sitOutPlayerIds,
      });
    }

    return { rounds, warnings: [] };
  },
};
