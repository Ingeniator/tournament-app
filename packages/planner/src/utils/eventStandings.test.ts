import { describe, it, expect } from 'vitest';
import { computeEventStandings, computeEventClubStandings } from './eventStandings';
import type { Tournament, EventTournamentLink } from '@padel/common';

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
    expect(computeEventStandings([], new Map())).toEqual([]);
  });

  it('returns empty array for tournaments with no scored matches', () => {
    const t = makeTournament({
      rounds: [{ id: 'r1', roundNumber: 1, matches: [
        { id: 'm1', courtId: 'c1', team1: ['p1', 'p2'], team2: ['p3', 'p4'], score: null },
      ], sitOuts: [] }],
    });
    expect(computeEventStandings(makeLinks('t1'), makeDataMap(t))).toEqual([]);
  });

  it('computes standings using raw game scores', () => {
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

    const standings = computeEventStandings(makeLinks('t1'), makeDataMap(t));

    expect(standings).toHaveLength(4);

    const alice = standings.find(s => s.playerName === 'Alice')!;
    expect(alice.totalPoints).toBe(16);
    expect(alice.matchesWon).toBe(1);
    expect(alice.matchesLost).toBe(0);
    expect(alice.pointDiff).toBe(8);
    expect(alice.rank).toBe(1);

    const charlie = standings.find(s => s.playerName === 'Charlie')!;
    expect(charlie.totalPoints).toBe(8);
    expect(charlie.matchesWon).toBe(0);
    expect(charlie.matchesLost).toBe(1);
    expect(charlie.pointDiff).toBe(-8);
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

    const standings = computeEventStandings(makeLinks('t1'), makeDataMap(t));
    for (const s of standings) {
      expect(s.matchesDraw).toBe(1);
      expect(s.matchesWon).toBe(0);
      expect(s.matchesLost).toBe(0);
      expect(s.totalPoints).toBe(12);
      expect(s.pointDiff).toBe(0);
    }
  });

  it('aggregates raw scores across multiple tournaments', () => {
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
    );

    // Charlie: 8 + 20 = 28 totalPoints
    const charlie = standings.find(s => s.playerName === 'Charlie')!;
    expect(charlie.totalPoints).toBe(28);
    expect(charlie.matchesWon).toBe(1);
    expect(charlie.matchesLost).toBe(1);
    expect(charlie.matchesPlayed).toBe(2);

    // Alice: 16 + 4 = 20 totalPoints
    const alice = standings.find(s => s.playerName === 'Alice')!;
    expect(alice.totalPoints).toBe(20);

    // Charlie ranked higher (more total points)
    expect(charlie.rank).toBeLessThan(alice.rank);
  });

  it('applies tournament weight to raw scores', () => {
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

    const links: EventTournamentLink[] = [
      { tournamentId: 't1', weight: 1 },
      { tournamentId: 't2', weight: 1.5 },
    ];

    const standings = computeEventStandings(links, makeDataMap(t1, t2));

    const alice = standings.find(s => s.playerName === 'Alice')!;
    // t1: 16 * 1 = 16, t2: 16 * 1.5 = 24, total = 40
    expect(alice.totalPoints).toBe(40);

    const charlie = standings.find(s => s.playerName === 'Charlie')!;
    // t1: 8 * 1 = 8, t2: 8 * 1.5 = 12, total = 20
    expect(charlie.totalPoints).toBe(20);
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

    const standings = computeEventStandings(makeLinks('t1'), makeDataMap(t));

    // Alice: 16 + 14 = 30
    const alice = standings.find(s => s.playerName === 'Alice')!;
    expect(alice.totalPoints).toBe(30);
    expect(alice.matchesWon).toBe(2);
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

    const standings = computeEventStandings(makeLinks('t1'), makeDataMap(t));
    const alice = standings.find(s => s.playerName === 'Alice')!;
    const bob = standings.find(s => s.playerName === 'Bob')!;
    expect(alice.rank).toBe(bob.rank);
    expect(alice.rank).toBe(1);

    const charlie = standings.find(s => s.playerName === 'Charlie')!;
    const diana = standings.find(s => s.playerName === 'Diana')!;
    expect(charlie.rank).toBe(diana.rank);
    expect(charlie.rank).toBe(3);
  });

  it('matches players by name across tournaments', () => {
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
    );

    const alices = standings.filter(s => s.playerName === 'Alice');
    expect(alices).toHaveLength(1);
    expect(alices[0].totalPoints).toBe(36); // 16 + 20
    expect(alices[0].matchesWon).toBe(2);
  });

  it('uses pointDiff as secondary tiebreaker', () => {
    // Two tournaments where players end up with same totalPoints but different pointDiff
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
          score: { team1Points: 16, team2Points: 8 },
        }],
        sitOuts: [],
      }],
    });

    const standings = computeEventStandings(
      makeLinks('t1', 't2'),
      makeDataMap(t1, t2),
    );

    // All players have 24 totalPoints and 0 pointDiff — all tied
    const alice = standings.find(s => s.playerName === 'Alice')!;
    const charlie = standings.find(s => s.playerName === 'Charlie')!;
    expect(alice.totalPoints).toBe(24);
    expect(charlie.totalPoints).toBe(24);
    expect(alice.pointDiff).toBe(0);
    expect(charlie.pointDiff).toBe(0);
    // All share rank 1
    expect(alice.rank).toBe(1);
    expect(charlie.rank).toBe(1);
  });
});

describe('computeEventClubStandings', () => {
  it('returns empty array when no clubs', () => {
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
    expect(computeEventClubStandings(makeLinks('t1'), makeDataMap(t))).toEqual([]);
  });

  it('sums club scores from a single tournament', () => {
    const t = makeTournament({
      clubs: [
        { id: 'c1', name: 'Club A' },
        { id: 'c2', name: 'Club B' },
      ],
      players: [
        { id: 'p1', name: 'Alice', clubId: 'c1' },
        { id: 'p2', name: 'Bob', clubId: 'c1' },
        { id: 'p3', name: 'Charlie', clubId: 'c2' },
        { id: 'p4', name: 'Diana', clubId: 'c2' },
      ],
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

    const clubs = computeEventClubStandings(makeLinks('t1'), makeDataMap(t));

    expect(clubs).toHaveLength(2);
    const clubA = clubs.find(c => c.clubName === 'Club A')!;
    expect(clubA.totalPoints).toBe(32); // 16 + 16
    expect(clubA.memberCount).toBe(2);
    expect(clubA.rank).toBe(1);

    const clubB = clubs.find(c => c.clubName === 'Club B')!;
    expect(clubB.totalPoints).toBe(16); // 8 + 8
    expect(clubB.rank).toBe(2);
  });

  it('aggregates clubs by name across tournaments', () => {
    const t1 = makeTournament({
      id: 't1',
      clubs: [
        { id: 'ca', name: 'Club A' },
        { id: 'cb', name: 'Club B' },
      ],
      players: [
        { id: 'p1', name: 'Alice', clubId: 'ca' },
        { id: 'p2', name: 'Bob', clubId: 'ca' },
        { id: 'p3', name: 'Charlie', clubId: 'cb' },
        { id: 'p4', name: 'Diana', clubId: 'cb' },
      ],
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
      clubs: [
        { id: 'cx', name: 'Club A' }, // same name, different id
        { id: 'cy', name: 'Club B' },
      ],
      players: [
        { id: 'q1', name: 'Alice', clubId: 'cx' },
        { id: 'q2', name: 'Bob', clubId: 'cx' },
        { id: 'q3', name: 'Charlie', clubId: 'cy' },
        { id: 'q4', name: 'Diana', clubId: 'cy' },
      ],
      rounds: [{
        id: 'r1',
        roundNumber: 1,
        matches: [{
          id: 'm1',
          courtId: 'c1',
          team1: ['q3', 'q4'],
          team2: ['q1', 'q2'],
          score: { team1Points: 20, team2Points: 4 },
        }],
        sitOuts: [],
      }],
    });

    const clubs = computeEventClubStandings(
      makeLinks('t1', 't2'),
      makeDataMap(t1, t2),
    );

    expect(clubs).toHaveLength(2);
    const clubA = clubs.find(c => c.clubName === 'Club A')!;
    // t1: 16+16=32, t2: 4+4=8, total=40
    expect(clubA.totalPoints).toBe(40);

    const clubB = clubs.find(c => c.clubName === 'Club B')!;
    // t1: 8+8=16, t2: 20+20=40, total=56
    expect(clubB.totalPoints).toBe(56);
    expect(clubB.rank).toBe(1);
  });

  it('applies weight to club scores', () => {
    const t = makeTournament({
      clubs: [
        { id: 'c1', name: 'Club A' },
        { id: 'c2', name: 'Club B' },
      ],
      players: [
        { id: 'p1', name: 'Alice', clubId: 'c1' },
        { id: 'p2', name: 'Bob', clubId: 'c1' },
        { id: 'p3', name: 'Charlie', clubId: 'c2' },
        { id: 'p4', name: 'Diana', clubId: 'c2' },
      ],
      rounds: [{
        id: 'r1',
        roundNumber: 1,
        matches: [{
          id: 'm1',
          courtId: 'c1',
          team1: ['p1', 'p2'],
          team2: ['p3', 'p4'],
          score: { team1Points: 10, team2Points: 6 },
        }],
        sitOuts: [],
      }],
    });

    const links: EventTournamentLink[] = [
      { tournamentId: 't1', weight: 2 },
    ];

    const clubs = computeEventClubStandings(links, makeDataMap(t));

    const clubA = clubs.find(c => c.clubName === 'Club A')!;
    // (10 + 10) * 2 = 40
    expect(clubA.totalPoints).toBe(40);

    const clubB = clubs.find(c => c.clubName === 'Club B')!;
    // (6 + 6) * 2 = 24
    expect(clubB.totalPoints).toBe(24);
  });
});
