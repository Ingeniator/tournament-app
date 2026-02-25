import { describe, it, expect } from 'vitest';
import type { Tournament, Competitor } from '@padel/common';
import { buildMatchData, buildCompetitorMatchData } from './matchData';
import type { ScoredMatch } from './types';

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 't1',
    name: 'Test',
    config: {
      format: 'americano',
      pointsPerMatch: 24,
      courts: [{ id: 'c1', name: 'Court 1' }],
      maxRounds: null,
    },
    phase: 'completed',
    players: [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Charlie' },
      { id: 'p4', name: 'Dave' },
    ],
    rounds: [],
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

describe('buildMatchData', () => {
  it('returns empty maps for tournament with no rounds', () => {
    const t = makeTournament();
    const { playerMatches, allScored } = buildMatchData(t);
    expect(allScored).toHaveLength(0);
    expect(playerMatches.get('p1')).toEqual([]);
    expect(playerMatches.get('p2')).toEqual([]);
  });

  it('skips unscored matches', () => {
    const t = makeTournament({
      rounds: [{
        id: 'r1',
        roundNumber: 1,
        matches: [{
          id: 'm1', courtId: 'c1',
          team1: ['p1', 'p2'], team2: ['p3', 'p4'],
          score: null,
        }],
        sitOuts: [],
      }],
    });
    const { allScored } = buildMatchData(t);
    expect(allScored).toHaveLength(0);
  });

  it('correctly builds player match info for scored matches', () => {
    const t = makeTournament({
      rounds: [{
        id: 'r1',
        roundNumber: 1,
        matches: [{
          id: 'm1', courtId: 'c1',
          team1: ['p1', 'p2'], team2: ['p3', 'p4'],
          score: { team1Points: 14, team2Points: 10 },
        }],
        sitOuts: [],
      }],
    });
    const { playerMatches, allScored } = buildMatchData(t);

    expect(allScored).toHaveLength(1);
    expect(allScored[0].t1).toBe(14);
    expect(allScored[0].t2).toBe(10);
    expect(allScored[0].margin).toBe(4);
    expect(allScored[0].totalPoints).toBe(24);

    // Team1 players (won)
    const p1 = playerMatches.get('p1')!;
    expect(p1).toHaveLength(1);
    expect(p1[0].pointsScored).toBe(14);
    expect(p1[0].pointsConceded).toBe(10);
    expect(p1[0].won).toBe(true);
    expect(p1[0].lost).toBe(false);
    expect(p1[0].margin).toBe(4);

    // Team2 players (lost)
    const p3 = playerMatches.get('p3')!;
    expect(p3).toHaveLength(1);
    expect(p3[0].pointsScored).toBe(10);
    expect(p3[0].pointsConceded).toBe(14);
    expect(p3[0].won).toBe(false);
    expect(p3[0].lost).toBe(true);
    expect(p3[0].margin).toBe(-4);
  });

  it('handles draws (no winner or loser)', () => {
    const t = makeTournament({
      rounds: [{
        id: 'r1',
        roundNumber: 1,
        matches: [{
          id: 'm1', courtId: 'c1',
          team1: ['p1', 'p2'], team2: ['p3', 'p4'],
          score: { team1Points: 12, team2Points: 12 },
        }],
        sitOuts: [],
      }],
    });
    const { playerMatches } = buildMatchData(t);
    const p1 = playerMatches.get('p1')![0];
    expect(p1.won).toBe(false);
    expect(p1.lost).toBe(false);
    expect(p1.margin).toBe(0);
  });

  it('accumulates matches across multiple rounds', () => {
    const t = makeTournament({
      rounds: [
        {
          id: 'r1',
          roundNumber: 1,
          matches: [{ id: 'm1', courtId: 'c1', team1: ['p1', 'p2'], team2: ['p3', 'p4'], score: { team1Points: 14, team2Points: 10 } }],
          sitOuts: [],
        },
        {
          id: 'r2',
          roundNumber: 2,
          matches: [{ id: 'm2', courtId: 'c1', team1: ['p1', 'p3'], team2: ['p2', 'p4'], score: { team1Points: 8, team2Points: 16 } }],
          sitOuts: [],
        },
      ],
    });
    const { playerMatches, allScored } = buildMatchData(t);
    expect(allScored).toHaveLength(2);
    expect(playerMatches.get('p1')).toHaveLength(2);
    expect(playerMatches.get('p1')![0].won).toBe(true);
    expect(playerMatches.get('p1')![1].won).toBe(false);
  });
});

describe('buildCompetitorMatchData', () => {
  it('maps player matches to competitor matches', () => {
    const competitors: Competitor[] = [
      { id: 'p1', playerIds: ['p1'], name: 'Alice' },
      { id: 'p2', playerIds: ['p2'], name: 'Bob' },
      { id: 'p3', playerIds: ['p3'], name: 'Charlie' },
      { id: 'p4', playerIds: ['p4'], name: 'Dave' },
    ];
    const playerToCompetitor = new Map<string, Competitor>();
    competitors.forEach(c => c.playerIds.forEach(pid => playerToCompetitor.set(pid, c)));

    const allScored: ScoredMatch[] = [{
      roundNumber: 1,
      team1: ['p1', 'p2'] as [string, string],
      team2: ['p3', 'p4'] as [string, string],
      t1: 14, t2: 10, margin: 4, totalPoints: 24,
    }];

    const result = buildCompetitorMatchData(competitors, allScored, playerToCompetitor);
    expect(result.get('p1')!).toHaveLength(1);
    expect(result.get('p1')![0].won).toBe(true);
    expect(result.get('p3')![0].won).toBe(false);
  });

  it('handles team competitors (multiple playerIds)', () => {
    const competitors: Competitor[] = [
      { id: 'team1', playerIds: ['p1', 'p2'], name: 'Team A' },
      { id: 'team2', playerIds: ['p3', 'p4'], name: 'Team B' },
    ];
    const playerToCompetitor = new Map<string, Competitor>();
    competitors.forEach(c => c.playerIds.forEach(pid => playerToCompetitor.set(pid, c)));

    const allScored: ScoredMatch[] = [{
      roundNumber: 1,
      team1: ['p1', 'p2'] as [string, string],
      team2: ['p3', 'p4'] as [string, string],
      t1: 14, t2: 10, margin: 4, totalPoints: 24,
    }];

    const result = buildCompetitorMatchData(competitors, allScored, playerToCompetitor);
    // team1 should have 1 match (deduplicated even though both p1 and p2 map to it)
    expect(result.get('team1')!).toHaveLength(1);
    expect(result.get('team1')![0].pointsScored).toBe(14);
    expect(result.get('team2')!).toHaveLength(1);
    expect(result.get('team2')![0].pointsScored).toBe(10);
  });
});
