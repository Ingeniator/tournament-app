import type { Player, Tournament, TournamentConfig, Round, Match, MatchScore, StandingsEntry } from '@padel/common';
import { getStrategy } from '../../strategies';

export function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
}

export function makePlayersWithNames(names: string[]): Player[] {
  return names.map((name, i) => ({ id: `p${i + 1}`, name }));
}

export function makeConfig(numCourts = 1, maxRounds: number | null = null): TournamentConfig {
  return {
    format: 'americano',
    pointsPerMatch: 24,
    courts: Array.from({ length: numCourts }, (_, i) => ({ id: `c${i + 1}`, name: `Court ${i + 1}` })),
    maxRounds,
  };
}

export function makeSetupTournament(playerCount = 4, numCourts = 1): Tournament {
  return {
    id: 't1',
    name: 'Test Tournament',
    config: makeConfig(numCourts),
    phase: 'setup',
    players: makePlayers(playerCount),
    rounds: [],
    createdAt: 1000,
    updatedAt: 1000,
  };
}

export function makeInProgressTournament(playerCount = 8, numCourts = 2): Tournament {
  const config = makeConfig(numCourts);
  const resolved = { ...config, maxRounds: 3, pointsPerMatch: 24 };
  const setup: Tournament = {
    id: 't1',
    name: 'Test Tournament',
    config: resolved,
    phase: 'setup',
    players: makePlayers(playerCount),
    rounds: [],
    createdAt: 1000,
    updatedAt: 1000,
  };
  const strategy = getStrategy('americano');
  const { rounds } = strategy.generateSchedule(setup.players, setup.config);
  return { ...setup, phase: 'in-progress', rounds };
}

export function scoreAllMatches(tournament: Tournament, score: MatchScore = { team1Points: 15, team2Points: 9 }): Tournament {
  return {
    ...tournament,
    rounds: tournament.rounds.map(r => ({
      ...r,
      matches: r.matches.map(m => ({ ...m, score: m.score ?? score })),
    })),
  };
}

export function makeCompletedTournament(playerCount = 8, numCourts = 2): Tournament {
  const t = makeInProgressTournament(playerCount, numCourts);
  const scored = scoreAllMatches(t);
  return { ...scored, phase: 'completed' };
}

export function makeStandings(tournament: Tournament): StandingsEntry[] {
  const strategy = getStrategy(tournament.config.format);
  return strategy.calculateStandings(tournament);
}
