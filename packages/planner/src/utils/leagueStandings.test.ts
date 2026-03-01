import { describe, it, expect } from 'vitest';
import { computeEventStandings } from './leagueStandings';
import type { Tournament, EventRankingRules, EventTournamentLink } from '@padel/common';

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
      { id: 'p4', name: 'Diana' },
    ],
    rounds: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

const defaultRules: EventRankingRules = {
  pointsPerWin: 3,
  pointsPerDraw: 1,
  pointsPerLoss: 0,
  tiebreaker: 'pointDifference',
};

function makeLinks(...ids: string[]): EventTournamentLink[] {
  return ids.map(id => ({ tournamentId: id, weight: 1 }));
}

function makeDataMap(...tournaments: Tournament[]): Map<string, Tournament> {
  const map = new Map<string, Tournament>();
  for (const t of tournaments) map.set(t.id, t);
  return map;
}

describe('computeEventStandings', () => {
  it('returns empty array for no tournaments', () => {
    expect(computeEventStandings([], new Map(), defaultRules)).toEqual([]);
  });

  it('returns empty array for tournaments with no scored matches', () => {
    const t = makeTournament({
      rounds: [{ id: 'r1', roundNumber: 1, matches: [
        { id: 'm1', courtId: 'c1', team1: ['p1', 'p2'], team2: ['p3', 'p4'], score: null },
      ], sitOuts: [] }],
    });
    expect(computeEventStandings(makeLinks('t1'), makeDataMap(t), defaultRules)).toEqual([]);
  });

  it('computes standings for a single tournament with one match', () => {
    const t = makeTournament({
      rounds: [{
        id: 'r1',
        roundNumber: 1,
        matches: [{
          id: 'm1',
          courtId: 'c1',
          team1: ['p1', 'p2'],
          team2: ['p3', 'p4'],
          score: { team1Points: 16, team2Points: 8 },
        }],
        sitOuts: [],
      }],
    });

    const standings = computeEventStandings(makeLinks('t1'), makeDataMap(t), defaultRules);

    expect(standings).toHaveLength(4);

    // Winners (Alice & Bob) should have 3 pts each
    const alice = standings.find(s => s.playerName === 'Alice')!;
    expect(alice.wins).toBe(1);
    expect(alice.losses).toBe(0);
    expect(alice.points).toBe(3);
    expect(alice.gamesWon).toBe(16);
    expect(alice.gamesLost).toBe(8);
    expect(alice.pointDifference).toBe(8);
    expect(alice.rank).toBe(1);

    // Losers (Charlie & Diana) should have 0 pts each
    const charlie = standings.find(s => s.playerName === 'Charlie')!;
    expect(charlie.wins).toBe(0);
    expect(charlie.losses).toBe(1);
    expect(charlie.points).toBe(0);
    expect(charlie.gamesWon).toBe(8);
    expect(charlie.gamesLost).toBe(16);
    expect(charlie.pointDifference).toBe(-8);
  });

  it('handles draws correctly', () => {
    const t = makeTournament({
      rounds: [{
        id: 'r1',
        roundNumber: 1,
        matches: [{
          id: 'm1',
          courtId: 'c1',
          team1: ['p1', 'p2'],
          team2: ['p3', 'p4'],
          score: { team1Points: 12, team2Points: 12 },
        }],
        sitOuts: [],
      }],
    });

    const standings = computeEventStandings(makeLinks('t1'), makeDataMap(t), defaultRules);
    for (const s of standings) {
      expect(s.draws).toBe(1);
      expect(s.wins).toBe(0);
      expect(s.losses).toBe(0);
      expect(s.points).toBe(1);
      expect(s.pointDifference).toBe(0);
    }
  });

  it('aggregates across multiple tournaments', () => {
    const t1 = makeTournament({
      id: 't1',
      rounds: [{
        id: 'r1',
        roundNumber: 1,
        matches: [{
          id: 'm1',
          courtId: 'c1',
          team1: ['p1', 'p2'],
          team2: ['p3', 'p4'],
          score: { team1Points: 16, team2Points: 8 },
        }],
        sitOuts: [],
      }],
    });

    const t2 = makeTournament({
      id: 't2',
      rounds: [{
        id: 'r1',
        roundNumber: 1,
        matches: [{
          id: 'm1',
          courtId: 'c1',
          team1: ['p3', 'p4'],
          team2: ['p1', 'p2'],
          score: { team1Points: 20, team2Points: 4 },
        }],
        sitOuts: [],
      }],
    });

    const standings = computeEventStandings(
      makeLinks('t1', 't2'),
      makeDataMap(t1, t2),
      defaultRules,
    );

    // Charlie won 1, lost 1 = 3 pts, diff = (8-16) + (20-4) = 8
    const charlie = standings.find(s => s.playerName === 'Charlie')!;
    expect(charlie.wins).toBe(1);
    expect(charlie.losses).toBe(1);
    expect(charlie.points).toBe(3);
    expect(charlie.matchesPlayed).toBe(2);
    expect(charlie.gamesWon).toBe(28);
    expect(charlie.gamesLost).toBe(20);
    expect(charlie.pointDifference).toBe(8);

    // Alice won 1, lost 1 = 3 pts, diff = (16-8) + (4-20) = -8
    const alice = standings.find(s => s.playerName === 'Alice')!;
    expect(alice.points).toBe(3);
    expect(alice.pointDifference).toBe(-8);

    // Charlie should be ranked higher due to better point difference
    expect(charlie.rank).toBeLessThan(alice.rank);
  });

  it('applies custom ranking rules', () => {
    const rules: EventRankingRules = {
      pointsPerWin: 2,
      pointsPerDraw: 1,
      pointsPerLoss: 0,
      tiebreaker: 'gamesWon',
    };

    const t = makeTournament({
      rounds: [{
        id: 'r1',
        roundNumber: 1,
        matches: [{
          id: 'm1',
          courtId: 'c1',
          team1: ['p1', 'p2'],
          team2: ['p3', 'p4'],
          score: { team1Points: 16, team2Points: 8 },
        }],
        sitOuts: [],
      }],
    });

    const standings = computeEventStandings(makeLinks('t1'), makeDataMap(t), rules);
    const alice = standings.find(s => s.playerName === 'Alice')!;
    expect(alice.points).toBe(2); // 2 per win instead of 3
  });

  it('handles multiple rounds within a tournament', () => {
    const t = makeTournament({
      rounds: [
        {
          id: 'r1',
          roundNumber: 1,
          matches: [{
            id: 'm1',
            courtId: 'c1',
            team1: ['p1', 'p2'],
            team2: ['p3', 'p4'],
            score: { team1Points: 16, team2Points: 8 },
          }],
          sitOuts: [],
        },
        {
          id: 'r2',
          roundNumber: 2,
          matches: [{
            id: 'm2',
            courtId: 'c1',
            team1: ['p1', 'p3'],
            team2: ['p2', 'p4'],
            score: { team1Points: 14, team2Points: 10 },
          }],
          sitOuts: [],
        },
      ],
    });

    const standings = computeEventStandings(makeLinks('t1'), makeDataMap(t), defaultRules);

    // Alice: won 2 matches = 6 pts
    const alice = standings.find(s => s.playerName === 'Alice')!;
    expect(alice.wins).toBe(2);
    expect(alice.points).toBe(6);
    expect(alice.matchesPlayed).toBe(2);
    expect(alice.rank).toBe(1);
  });

  it('assigns same rank to tied players', () => {
    const t = makeTournament({
      rounds: [{
        id: 'r1',
        roundNumber: 1,
        matches: [{
          id: 'm1',
          courtId: 'c1',
          team1: ['p1', 'p2'],
          team2: ['p3', 'p4'],
          score: { team1Points: 16, team2Points: 8 },
        }],
        sitOuts: [],
      }],
    });

    const standings = computeEventStandings(makeLinks('t1'), makeDataMap(t), defaultRules);
    const alice = standings.find(s => s.playerName === 'Alice')!;
    const bob = standings.find(s => s.playerName === 'Bob')!;
    // Alice and Bob have identical stats — same rank
    expect(alice.rank).toBe(bob.rank);
    expect(alice.rank).toBe(1);

    const charlie = standings.find(s => s.playerName === 'Charlie')!;
    const diana = standings.find(s => s.playerName === 'Diana')!;
    expect(charlie.rank).toBe(diana.rank);
    expect(charlie.rank).toBe(3); // rank 3 since two players share rank 1
  });

  it('matches players by name across tournaments', () => {
    // Same player name in different tournaments with different IDs
    const t1 = makeTournament({
      id: 't1',
      players: [
        { id: 'x1', name: 'Alice' },
        { id: 'x2', name: 'Bob' },
        { id: 'x3', name: 'Charlie' },
        { id: 'x4', name: 'Diana' },
      ],
      rounds: [{
        id: 'r1',
        roundNumber: 1,
        matches: [{
          id: 'm1',
          courtId: 'c1',
          team1: ['x1', 'x2'],
          team2: ['x3', 'x4'],
          score: { team1Points: 16, team2Points: 8 },
        }],
        sitOuts: [],
      }],
    });

    const t2 = makeTournament({
      id: 't2',
      players: [
        { id: 'y1', name: 'Alice' },
        { id: 'y2', name: 'Bob' },
        { id: 'y3', name: 'Charlie' },
        { id: 'y4', name: 'Diana' },
      ],
      rounds: [{
        id: 'r1',
        roundNumber: 1,
        matches: [{
          id: 'm1',
          courtId: 'c1',
          team1: ['y1', 'y2'],
          team2: ['y3', 'y4'],
          score: { team1Points: 20, team2Points: 4 },
        }],
        sitOuts: [],
      }],
    });

    const standings = computeEventStandings(
      makeLinks('t1', 't2'),
      makeDataMap(t1, t2),
      defaultRules,
    );

    // Alice should appear once with aggregated stats
    const alices = standings.filter(s => s.playerName === 'Alice');
    expect(alices).toHaveLength(1);
    expect(alices[0].wins).toBe(2);
    expect(alices[0].matchesPlayed).toBe(2);
    expect(alices[0].gamesWon).toBe(36);
  });

  it('applies tournament weight to points', () => {
    const t1 = makeTournament({
      id: 't1',
      rounds: [{
        id: 'r1',
        roundNumber: 1,
        matches: [{
          id: 'm1',
          courtId: 'c1',
          team1: ['p1', 'p2'],
          team2: ['p3', 'p4'],
          score: { team1Points: 16, team2Points: 8 },
        }],
        sitOuts: [],
      }],
    });

    const t2 = makeTournament({
      id: 't2',
      rounds: [{
        id: 'r1',
        roundNumber: 1,
        matches: [{
          id: 'm1',
          courtId: 'c1',
          team1: ['p1', 'p2'],
          team2: ['p3', 'p4'],
          score: { team1Points: 16, team2Points: 8 },
        }],
        sitOuts: [],
      }],
    });

    // t1 has weight 1.0, t2 has weight 1.5 (knockout)
    const links: EventTournamentLink[] = [
      { tournamentId: 't1', weight: 1 },
      { tournamentId: 't2', weight: 1.5 },
    ];

    const standings = computeEventStandings(links, makeDataMap(t1, t2), defaultRules);

    const alice = standings.find(s => s.playerName === 'Alice')!;
    // t1 win: 3 * 1.0 = 3, t2 win: 3 * 1.5 = 4.5, total = 7.5
    expect(alice.points).toBe(7.5);
    expect(alice.wins).toBe(2);

    const charlie = standings.find(s => s.playerName === 'Charlie')!;
    // t1 loss: 0 * 1.0 = 0, t2 loss: 0 * 1.5 = 0, total = 0
    expect(charlie.points).toBe(0);
  });

  it('applies weight to loss points when pointsPerLoss > 0', () => {
    const rules: EventRankingRules = {
      pointsPerWin: 3,
      pointsPerDraw: 1,
      pointsPerLoss: 1,
      tiebreaker: 'pointDifference',
    };

    const t = makeTournament({
      rounds: [{
        id: 'r1',
        roundNumber: 1,
        matches: [{
          id: 'm1',
          courtId: 'c1',
          team1: ['p1', 'p2'],
          team2: ['p3', 'p4'],
          score: { team1Points: 16, team2Points: 8 },
        }],
        sitOuts: [],
      }],
    });

    const links: EventTournamentLink[] = [
      { tournamentId: 't1', weight: 2 },
    ];

    const standings = computeEventStandings(links, makeDataMap(t), rules);

    const alice = standings.find(s => s.playerName === 'Alice')!;
    expect(alice.points).toBe(6); // 3 * 2 = 6

    const charlie = standings.find(s => s.playerName === 'Charlie')!;
    expect(charlie.points).toBe(2); // 1 * 2 = 2
  });
});
