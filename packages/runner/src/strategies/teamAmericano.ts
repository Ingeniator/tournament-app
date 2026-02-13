import type { TournamentStrategy, ScheduleResult } from './types';
import type { Player, TournamentConfig, Round, Match, Tournament, StandingsEntry, Team } from '@padel/common';
import { generateId } from '@padel/common';
import { shuffle, commonValidateScore } from './shared';

/**
 * Team Americano: fixed teams compete against each other.
 * Teams are formed before the tournament and never change.
 * Standings are per-team, not per-individual.
 */

function teamKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
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
    // Tiebreak: prefer those who haven't sat out recently
    return (lastSitOutRound.get(a.id) ?? -Infinity) - (lastSitOutRound.get(b.id) ?? -Infinity);
  });
  const sitOutTeams = new Set(sortedForSitOut.slice(0, sitOutCount).map(t => t.id));
  const activeTeams = teams.filter(t => !sitOutTeams.has(t.id));
  return { sitOutTeams, activeTeams };
}

/** Generate rounds for team americano */
function generateTeamRounds(
  teams: Team[],
  config: TournamentConfig,
  count: number,
  startRoundNumber: number,
  opponentCounts: Map<string, number>,
  gamesPlayed: Map<string, number>,
  lastSitOutRound: Map<string, number>,
): ScheduleResult {
  const warnings: string[] = [];
  const availableCourts = config.courts.filter(c => !c.unavailable);
  const numCourts = Math.min(availableCourts.length, Math.floor(teams.length / 2));

  if (numCourts === 0) {
    return { rounds: [], warnings: ['Not enough teams for a match (need at least 2)'] };
  }

  const teamsPerRound = numCourts * 2;
  const sitOutCount = teams.length - teamsPerRound;

  if (sitOutCount > 0 && startRoundNumber === 1) {
    warnings.push(`${sitOutCount} team(s) will sit out each round`);
  }

  const rounds: Round[] = [];

  for (let r = 0; r < count; r++) {
    const roundNum = startRoundNumber + r;
    const { sitOutTeams, activeTeams } = selectTeamSitOuts(teams, sitOutCount, gamesPlayed, lastSitOutRound);

    // Find best pairing of active teams into matches
    // Try many random pairings, pick one that minimizes opponent repeat imbalance
    let bestMatches: Match[] = [];
    let bestScore = Infinity;
    const attempts = activeTeams.length <= 8 ? 500 : 2000;

    for (let attempt = 0; attempt < attempts; attempt++) {
      const shuffled = shuffle([...activeTeams]);
      const matches: Match[] = [];
      let score = 0;

      for (let i = 0; i < numCourts; i++) {
        const t1 = shuffled[i * 2];
        const t2 = shuffled[i * 2 + 1];
        const ok = teamKey(t1.id, t2.id);
        const count = opponentCounts.get(ok) ?? 0;
        score += count * count;
        matches.push({
          id: generateId(),
          courtId: availableCourts[i].id,
          team1: [t1.player1Id, t1.player2Id],
          team2: [t2.player1Id, t2.player2Id],
          score: null,
        });
      }

      if (score < bestScore) {
        bestScore = score;
        bestMatches = matches;
        if (score === 0) break;
      }
    }

    // Update tracking
    for (const match of bestMatches) {
      const t1 = teams.find(t => t.player1Id === match.team1[0] && t.player2Id === match.team1[1])
        ?? teams.find(t => t.player1Id === match.team1[1] && t.player2Id === match.team1[0]);
      const t2 = teams.find(t => t.player1Id === match.team2[0] && t.player2Id === match.team2[1])
        ?? teams.find(t => t.player1Id === match.team2[1] && t.player2Id === match.team2[0]);
      if (t1 && t2) {
        const ok = teamKey(t1.id, t2.id);
        opponentCounts.set(ok, (opponentCounts.get(ok) ?? 0) + 1);
        gamesPlayed.set(t1.id, (gamesPlayed.get(t1.id) ?? 0) + 1);
        gamesPlayed.set(t2.id, (gamesPlayed.get(t2.id) ?? 0) + 1);
      }
    }

    // Track sit-outs — collect player IDs from sitting-out teams
    const sitOutPlayerIds: string[] = [];
    for (const team of teams) {
      if (sitOutTeams.has(team.id)) {
        sitOutPlayerIds.push(team.player1Id, team.player2Id);
        lastSitOutRound.set(team.id, roundNum);
      }
    }

    rounds.push({
      id: generateId(),
      roundNumber: roundNum,
      matches: bestMatches,
      sitOuts: sitOutPlayerIds,
    });
  }

  return { rounds, warnings };
}

/** Find a team that contains both players of a match side */
function findTeamByPair(teams: Team[], pair: [string, string]): Team | undefined {
  return teams.find(t =>
    (t.player1Id === pair[0] && t.player2Id === pair[1]) ||
    (t.player1Id === pair[1] && t.player2Id === pair[0])
  );
}

function calculateTeamStandings(tournament: Tournament): StandingsEntry[] {
  const teams = tournament.teams ?? [];
  if (teams.length === 0) return [];

  const nameOf = (id: string) => tournament.players.find(p => p.id === id)?.name ?? '?';

  const stats = new Map<string, {
    totalPoints: number;
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    matchesDraw: number;
    pointsFor: number;
    pointsAgainst: number;
  }>();

  for (const team of teams) {
    stats.set(team.id, {
      totalPoints: 0, matchesPlayed: 0, matchesWon: 0,
      matchesLost: 0, matchesDraw: 0, pointsFor: 0, pointsAgainst: 0,
    });
  }

  for (const round of tournament.rounds) {
    const scoredMatches = round.matches.filter(m => m.score !== null);
    let roundTotalPoints = 0;
    let roundTeamsScored = 0;

    for (const match of scoredMatches) {
      const score = match.score!;
      const t1 = findTeamByPair(teams, match.team1);
      const t2 = findTeamByPair(teams, match.team2);

      if (t1) {
        const s = stats.get(t1.id);
        if (s) {
          s.totalPoints += score.team1Points;
          s.pointsFor += score.team1Points;
          s.pointsAgainst += score.team2Points;
          s.matchesPlayed += 1;
          if (score.team1Points > score.team2Points) s.matchesWon += 1;
          else if (score.team1Points < score.team2Points) s.matchesLost += 1;
          else s.matchesDraw += 1;
        }
      }
      if (t2) {
        const s = stats.get(t2.id);
        if (s) {
          s.totalPoints += score.team2Points;
          s.pointsFor += score.team2Points;
          s.pointsAgainst += score.team1Points;
          s.matchesPlayed += 1;
          if (score.team2Points > score.team1Points) s.matchesWon += 1;
          else if (score.team2Points < score.team1Points) s.matchesLost += 1;
          else s.matchesDraw += 1;
        }
      }

      roundTotalPoints += score.team1Points + score.team2Points;
      roundTeamsScored += 2;
    }

    // Sit-out compensation for teams
    if (roundTeamsScored > 0 && round.sitOuts.length > 0) {
      const avgPoints = roundTotalPoints / roundTeamsScored;
      // Find teams that are sitting out (check if any of their players are in sitOuts)
      for (const team of teams) {
        if (round.sitOuts.includes(team.player1Id)) {
          const s = stats.get(team.id);
          if (s) {
            s.totalPoints += Math.round(avgPoints);
          }
        }
      }
    }
  }

  const entries: StandingsEntry[] = teams.map(team => {
    const s = stats.get(team.id)!;
    return {
      playerId: team.id,
      playerName: `${nameOf(team.player1Id)} & ${nameOf(team.player2Id)}`,
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

function teamAmericanoValidateSetup(players: Player[], config: TournamentConfig): string[] {
  const errors: string[] = [];
  if (players.length < 4) {
    errors.push('At least 4 players are required');
  }
  if (players.length % 2 !== 0) {
    errors.push('Team Americano requires an even number of players');
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

export const teamAmericanoStrategy: TournamentStrategy = {
  isDynamic: false,
  validateSetup: teamAmericanoValidateSetup,
  validateScore: commonValidateScore,
  calculateStandings: calculateTeamStandings,

  generateSchedule(_players: Player[], config: TournamentConfig, tournament?: Tournament): ScheduleResult {
    const teams = tournament?.teams ?? [];
    if (teams.length < 2) {
      return { rounds: [], warnings: ['No teams configured'] };
    }
    const numCourts = Math.min(
      config.courts.filter(c => !c.unavailable).length,
      Math.floor(teams.length / 2)
    );
    const teamsPerRound = numCourts * 2;
    const totalRounds = config.maxRounds ?? Math.max(1, Math.ceil((teams.length - 1) * teams.length / teamsPerRound));

    const gamesPlayed = new Map<string, number>();
    const lastSitOutRound = new Map<string, number>();
    teams.forEach(t => { gamesPlayed.set(t.id, 0); lastSitOutRound.set(t.id, -Infinity); });

    return generateTeamRounds(teams, config, totalRounds, 1, new Map(), gamesPlayed, lastSitOutRound);
  },

  generateAdditionalRounds(_players: Player[], config: TournamentConfig, existingRounds: Round[], count: number, _excludePlayerIds?: string[], _timeBudgetMs?: number, tournament?: Tournament): ScheduleResult {
    const teams = tournament?.teams ?? [];
    if (teams.length < 2) {
      return { rounds: [], warnings: ['No teams configured'] };
    }

    // Seed from existing rounds
    const opponentCounts = new Map<string, number>();
    const gamesPlayed = new Map<string, number>();
    const lastSitOutRound = new Map<string, number>();
    teams.forEach(t => { gamesPlayed.set(t.id, 0); lastSitOutRound.set(t.id, -Infinity); });

    for (const round of existingRounds) {
      for (const match of round.matches) {
        const t1 = findTeamByPair(teams, match.team1);
        const t2 = findTeamByPair(teams, match.team2);
        if (t1 && t2) {
          const ok = teamKey(t1.id, t2.id);
          opponentCounts.set(ok, (opponentCounts.get(ok) ?? 0) + 1);
          gamesPlayed.set(t1.id, (gamesPlayed.get(t1.id) ?? 0) + 1);
          gamesPlayed.set(t2.id, (gamesPlayed.get(t2.id) ?? 0) + 1);
        }
      }
      // Track sit-outs by team
      for (const team of teams) {
        if (round.sitOuts.includes(team.player1Id)) {
          lastSitOutRound.set(team.id, round.roundNumber);
        }
      }
    }

    const startRoundNumber = existingRounds.length + 1;
    return generateTeamRounds(teams, config, count, startRoundNumber, opponentCounts, gamesPlayed, lastSitOutRound);
  },
};
