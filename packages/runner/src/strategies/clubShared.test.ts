import { describe, it, expect } from 'vitest';
import {
  generateClubFixtures,
  getClubTeams,
  matchFixturePairs,
  generateClubRound,
  clubValidateSetup,
  clubIndividualValidateSetup,
  clubValidateWarnings,
} from './clubShared';
import type { Player, Team, TournamentConfig, Club } from '@padel/common';

// ── Helpers ─────────────────────────────────────────────────────────────

function makePlayer(id: string, clubId?: string, rankSlot?: number): Player {
  return { id, name: `Player ${id}`, clubId, rankSlot };
}

function makeTeam(id: string, p1Id: string, p2Id: string): Team {
  return { id, player1Id: p1Id, player2Id: p2Id };
}

function makeConfig(numCourts: number): TournamentConfig {
  return {
    format: 'club-ranked',
    pointsPerMatch: 21,
    courts: Array.from({ length: numCourts }, (_, i) => ({ id: `c${i + 1}`, name: `Court ${i + 1}` })),
    maxRounds: null,
  };
}

// ── generateClubFixtures ────────────────────────────────────────────────

describe('generateClubFixtures', () => {
  it('generates round-robin for 2 clubs in 1 round', () => {
    const fixtures = generateClubFixtures(['A', 'B'], 1);
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0]).toEqual([['A', 'B']]);
  });

  it('generates round-robin for 3 clubs (odd — includes bye handling)', () => {
    const fixtures = generateClubFixtures(['A', 'B', 'C'], 3);
    // With 3 clubs, 2 rounds of unique fixtures, then wraps
    expect(fixtures).toHaveLength(3);
    // Each round should have exactly 1 fixture (one club gets bye)
    for (const round of fixtures) {
      expect(round).toHaveLength(1);
    }
    // All pairings should appear
    const allPairs = fixtures.map(r => r[0].sort().join(':'));
    const unique = new Set(allPairs);
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  it('generates round-robin for 4 clubs', () => {
    const fixtures = generateClubFixtures(['A', 'B', 'C', 'D'], 3);
    expect(fixtures).toHaveLength(3);
    // Each round has 2 fixtures (4 clubs / 2)
    for (const round of fixtures) {
      expect(round).toHaveLength(2);
    }
  });

  it('wraps around when totalRounds exceeds cycle length', () => {
    const fixtures = generateClubFixtures(['A', 'B'], 3);
    expect(fixtures).toHaveLength(3);
    // Only 1 unique fixture for 2 clubs, so rounds repeat
    expect(fixtures[0]).toEqual(fixtures[1]);
    expect(fixtures[0]).toEqual(fixtures[2]);
  });

  it('every club plays every other club at least once in a full cycle', () => {
    const clubs = ['A', 'B', 'C', 'D'];
    const fixtures = generateClubFixtures(clubs, 3); // n-1 rounds for full round-robin
    const pairs = new Set<string>();
    for (const round of fixtures) {
      for (const [a, b] of round) {
        pairs.add([a, b].sort().join(':'));
      }
    }
    // C(4,2) = 6 unique pairs
    expect(pairs.size).toBe(6);
  });
});

// ── getClubTeams ────────────────────────────────────────────────────────

describe('getClubTeams', () => {
  it('returns teams whose players belong to the given club', () => {
    const players = [
      makePlayer('p1', 'clubA'),
      makePlayer('p2', 'clubA'),
      makePlayer('p3', 'clubB'),
      makePlayer('p4', 'clubB'),
    ];
    const teams = [
      makeTeam('t1', 'p1', 'p2'),
      makeTeam('t2', 'p3', 'p4'),
    ];
    expect(getClubTeams(teams, players, 'clubA')).toEqual([teams[0]]);
    expect(getClubTeams(teams, players, 'clubB')).toEqual([teams[1]]);
  });

  it('returns empty array for unknown club', () => {
    const players = [makePlayer('p1', 'clubA'), makePlayer('p2', 'clubA')];
    const teams = [makeTeam('t1', 'p1', 'p2')];
    expect(getClubTeams(teams, players, 'unknown')).toEqual([]);
  });

  it('excludes mixed-club teams', () => {
    const players = [
      makePlayer('p1', 'clubA'),
      makePlayer('p2', 'clubB'),
    ];
    const teams = [makeTeam('t1', 'p1', 'p2')];
    expect(getClubTeams(teams, players, 'clubA')).toEqual([]);
    expect(getClubTeams(teams, players, 'clubB')).toEqual([]);
  });
});

// ── matchFixturePairs ───────────────────────────────────────────────────

describe('matchFixturePairs', () => {
  const emptyPoints = new Map<string, number>();

  describe('random mode', () => {
    it('pairs teams from two clubs', () => {
      const teamsA = [makeTeam('tA1', 'p1', 'p2'), makeTeam('tA2', 'p3', 'p4')];
      const teamsB = [makeTeam('tB1', 'p5', 'p6'), makeTeam('tB2', 'p7', 'p8')];
      const pairs = matchFixturePairs(teamsA, teamsB, 'random', emptyPoints);
      expect(pairs).toHaveLength(2);
      // Each pair has one from A and one from B
      const aIds = new Set(teamsA.map(t => t.id));
      const bIds = new Set(teamsB.map(t => t.id));
      for (const [a, b] of pairs) {
        expect(aIds.has(a.id) || bIds.has(a.id)).toBe(true);
        expect(aIds.has(b.id) || bIds.has(b.id)).toBe(true);
      }
    });

    it('handles unequal team counts (takes min)', () => {
      const teamsA = [makeTeam('tA1', 'p1', 'p2'), makeTeam('tA2', 'p3', 'p4')];
      const teamsB = [makeTeam('tB1', 'p5', 'p6')];
      const pairs = matchFixturePairs(teamsA, teamsB, 'random', emptyPoints);
      expect(pairs).toHaveLength(1);
    });
  });

  describe('standings mode', () => {
    it('matches teams by standings rank (best vs best)', () => {
      const teamsA = [makeTeam('tA1', 'p1', 'p2'), makeTeam('tA2', 'p3', 'p4')];
      const teamsB = [makeTeam('tB1', 'p5', 'p6'), makeTeam('tB2', 'p7', 'p8')];
      const points = new Map([['tA1', 10], ['tA2', 20], ['tB1', 5], ['tB2', 15]]);
      const pairs = matchFixturePairs(teamsA, teamsB, 'standings', points);
      // tA2 (20pts) should face tB2 (15pts) — both rank 1 in their club
      // tA1 (10pts) should face tB1 (5pts) — both rank 2
      expect(pairs[0][0].id).toBe('tA2');
      expect(pairs[0][1].id).toBe('tB2');
      expect(pairs[1][0].id).toBe('tA1');
      expect(pairs[1][1].id).toBe('tB1');
    });

    it('handles zero points (all equal)', () => {
      const teamsA = [makeTeam('tA1', 'p1', 'p2')];
      const teamsB = [makeTeam('tB1', 'p3', 'p4')];
      const pairs = matchFixturePairs(teamsA, teamsB, 'standings', emptyPoints);
      expect(pairs).toHaveLength(1);
      expect(pairs[0][0].id).toBe('tA1');
      expect(pairs[0][1].id).toBe('tB1');
    });
  });

  describe('slots mode', () => {
    it('matches teams by rankSlot (rank 0 vs rank 0, rank 1 vs rank 1)', () => {
      const players = [
        makePlayer('p1', 'clubA', 0), makePlayer('p2', 'clubA', 0),
        makePlayer('p3', 'clubA', 1), makePlayer('p4', 'clubA', 1),
        makePlayer('p5', 'clubB', 0), makePlayer('p6', 'clubB', 0),
        makePlayer('p7', 'clubB', 1), makePlayer('p8', 'clubB', 1),
      ];
      const teamsA = [makeTeam('tA0', 'p1', 'p2'), makeTeam('tA1', 'p3', 'p4')];
      const teamsB = [makeTeam('tB0', 'p5', 'p6'), makeTeam('tB1', 'p7', 'p8')];

      const pairs = matchFixturePairs(teamsA, teamsB, 'slots', emptyPoints, players);
      expect(pairs).toHaveLength(2);
      // Rank 0: tA0 vs tB0
      expect(pairs[0]).toEqual([teamsA[0], teamsB[0]]);
      // Rank 1: tA1 vs tB1
      expect(pairs[1]).toEqual([teamsA[1], teamsB[1]]);
    });

    it('teams without rankSlot fall back to rank 999', () => {
      const players = [
        makePlayer('p1', 'clubA', 0), makePlayer('p2', 'clubA', 0),
        makePlayer('p3', 'clubA'), makePlayer('p4', 'clubA'), // no rankSlot
        makePlayer('p5', 'clubB', 0), makePlayer('p6', 'clubB', 0),
        makePlayer('p7', 'clubB'), makePlayer('p8', 'clubB'), // no rankSlot
      ];
      const teamsA = [makeTeam('tA0', 'p1', 'p2'), makeTeam('tA?', 'p3', 'p4')];
      const teamsB = [makeTeam('tB0', 'p5', 'p6'), makeTeam('tB?', 'p7', 'p8')];

      const pairs = matchFixturePairs(teamsA, teamsB, 'slots', emptyPoints, players);
      expect(pairs).toHaveLength(2);
      // Rank 0 teams paired
      expect(pairs[0]).toEqual([teamsA[0], teamsB[0]]);
      // Unranked (999) teams paired
      expect(pairs[1]).toEqual([teamsA[1], teamsB[1]]);
    });

    it('handles unequal rank group sizes (unpaired teams are dropped)', () => {
      const players = [
        makePlayer('p1', 'clubA', 0), makePlayer('p2', 'clubA', 0),
        makePlayer('p3', 'clubA', 0), makePlayer('p4', 'clubA', 0), // 2 rank-0 teams in A
        makePlayer('p5', 'clubB', 0), makePlayer('p6', 'clubB', 0), // 1 rank-0 team in B
      ];
      const teamsA = [makeTeam('tA0a', 'p1', 'p2'), makeTeam('tA0b', 'p3', 'p4')];
      const teamsB = [makeTeam('tB0', 'p5', 'p6')];

      const pairs = matchFixturePairs(teamsA, teamsB, 'slots', emptyPoints, players);
      // Only 1 pair possible (min of 2, 1)
      expect(pairs).toHaveLength(1);
      expect(pairs[0][0].id).toBe('tA0a');
      expect(pairs[0][1].id).toBe('tB0');
    });

    it('handles teams with ranks that only exist in one club', () => {
      const players = [
        makePlayer('p1', 'clubA', 0), makePlayer('p2', 'clubA', 0),
        makePlayer('p3', 'clubA', 1), makePlayer('p4', 'clubA', 1),
        makePlayer('p5', 'clubB', 0), makePlayer('p6', 'clubB', 0),
        // clubB has no rank-1 team
      ];
      const teamsA = [makeTeam('tA0', 'p1', 'p2'), makeTeam('tA1', 'p3', 'p4')];
      const teamsB = [makeTeam('tB0', 'p5', 'p6')];

      const pairs = matchFixturePairs(teamsA, teamsB, 'slots', emptyPoints, players);
      // Only rank 0 can be paired
      expect(pairs).toHaveLength(1);
      expect(pairs[0]).toEqual([teamsA[0], teamsB[0]]);
    });

    it('returns empty array when no ranks overlap', () => {
      const players = [
        makePlayer('p1', 'clubA', 0), makePlayer('p2', 'clubA', 0),
        makePlayer('p3', 'clubB', 1), makePlayer('p4', 'clubB', 1),
      ];
      const teamsA = [makeTeam('tA0', 'p1', 'p2')];
      const teamsB = [makeTeam('tB1', 'p3', 'p4')];

      const pairs = matchFixturePairs(teamsA, teamsB, 'slots', emptyPoints, players);
      expect(pairs).toHaveLength(0);
    });

    it('uses player2 rankSlot as fallback when player1 has none', () => {
      const players = [
        makePlayer('p1', 'clubA'), // no rankSlot
        makePlayer('p2', 'clubA', 0), // has rankSlot
        makePlayer('p3', 'clubB', 0), makePlayer('p4', 'clubB', 0),
      ];
      const teamsA = [makeTeam('tA', 'p1', 'p2')]; // p1 has no rank, p2 has rank 0
      const teamsB = [makeTeam('tB', 'p3', 'p4')];

      const pairs = matchFixturePairs(teamsA, teamsB, 'slots', emptyPoints, players);
      // Should use p2's rankSlot (0) as fallback
      expect(pairs).toHaveLength(1);
      expect(pairs[0]).toEqual([teamsA[0], teamsB[0]]);
    });

    it('falls back to random/standings when players is undefined', () => {
      const teamsA = [makeTeam('tA', 'p1', 'p2')];
      const teamsB = [makeTeam('tB', 'p3', 'p4')];
      // slots mode without players param falls through to the count-based logic
      const pairs = matchFixturePairs(teamsA, teamsB, 'slots', emptyPoints);
      expect(pairs).toHaveLength(1);
    });

    it('sorts ranks numerically (0, 1, 2) not lexicographically', () => {
      const players = [
        makePlayer('p1', 'clubA', 2), makePlayer('p2', 'clubA', 2),
        makePlayer('p3', 'clubA', 0), makePlayer('p4', 'clubA', 0),
        makePlayer('p5', 'clubA', 10), makePlayer('p6', 'clubA', 10),
        makePlayer('p7', 'clubB', 0), makePlayer('p8', 'clubB', 0),
        makePlayer('p9', 'clubB', 2), makePlayer('p10', 'clubB', 2),
        makePlayer('p11', 'clubB', 10), makePlayer('p12', 'clubB', 10),
      ];
      const teamsA = [
        makeTeam('tA2', 'p1', 'p2'),
        makeTeam('tA0', 'p3', 'p4'),
        makeTeam('tA10', 'p5', 'p6'),
      ];
      const teamsB = [
        makeTeam('tB0', 'p7', 'p8'),
        makeTeam('tB2', 'p9', 'p10'),
        makeTeam('tB10', 'p11', 'p12'),
      ];

      const pairs = matchFixturePairs(teamsA, teamsB, 'slots', emptyPoints, players);
      expect(pairs).toHaveLength(3);
      // Rank 0 first, then 2, then 10
      expect(pairs[0]).toEqual([teamsA[1], teamsB[0]]); // rank 0
      expect(pairs[1]).toEqual([teamsA[0], teamsB[1]]); // rank 2
      expect(pairs[2]).toEqual([teamsA[2], teamsB[2]]); // rank 10
    });
  });
});

// ── generateClubRound ───────────────────────────────────────────────────

describe('generateClubRound', () => {
  // 2 clubs, 2 teams each, 2 courts
  function makeSetup(numCourts = 2) {
    const clubs: Club[] = [
      { id: 'cA', name: 'Club A' },
      { id: 'cB', name: 'Club B' },
    ];
    const players = [
      makePlayer('p1', 'cA', 0), makePlayer('p2', 'cA', 0),
      makePlayer('p3', 'cA', 1), makePlayer('p4', 'cA', 1),
      makePlayer('p5', 'cB', 0), makePlayer('p6', 'cB', 0),
      makePlayer('p7', 'cB', 1), makePlayer('p8', 'cB', 1),
    ];
    const teams = [
      makeTeam('tA0', 'p1', 'p2'),
      makeTeam('tA1', 'p3', 'p4'),
      makeTeam('tB0', 'p5', 'p6'),
      makeTeam('tB1', 'p7', 'p8'),
    ];
    const config = makeConfig(numCourts);
    return { clubs, players, teams, config };
  }

  function emptyMaps() {
    return {
      opponentCounts: new Map<string, number>(),
      gamesPlayed: new Map<string, number>(),
      lastSitOutRound: new Map<string, number>(),
      teamPoints: new Map<string, number>(),
    };
  }

  it('creates matches for a fixture between two clubs', () => {
    const { clubs, players, teams, config } = makeSetup(2);
    const maps = emptyMaps();
    const round = generateClubRound(
      clubs, teams, players, config,
      [['cA', 'cB']], 1,
      maps.opponentCounts, maps.gamesPlayed, maps.lastSitOutRound,
      maps.teamPoints, 'slots',
    );
    expect(round.matches).toHaveLength(2);
    expect(round.roundNumber).toBe(1);
    expect(round.sitOuts).toEqual([]);
  });

  it('assigns courts in order', () => {
    const { clubs, players, teams, config } = makeSetup(2);
    const maps = emptyMaps();
    const round = generateClubRound(
      clubs, teams, players, config,
      [['cA', 'cB']], 1,
      maps.opponentCounts, maps.gamesPlayed, maps.lastSitOutRound,
      maps.teamPoints, 'slots',
    );
    expect(round.matches[0].courtId).toBe('c1');
    expect(round.matches[1].courtId).toBe('c2');
  });

  it('limits matches to available courts', () => {
    const { clubs, players, teams, config } = makeSetup(1); // only 1 court
    const maps = emptyMaps();
    const round = generateClubRound(
      clubs, teams, players, config,
      [['cA', 'cB']], 1,
      maps.opponentCounts, maps.gamesPlayed, maps.lastSitOutRound,
      maps.teamPoints, 'slots',
    );
    // 2 possible pairs but only 1 court
    expect(round.matches).toHaveLength(1);
  });

  it('skips unavailable courts', () => {
    const { clubs, players, teams } = makeSetup();
    const config: TournamentConfig = {
      format: 'club-ranked',
      pointsPerMatch: 21,
      courts: [
        { id: 'c1', name: 'Court 1', unavailable: true },
        { id: 'c2', name: 'Court 2' },
      ],
      maxRounds: null,
    };
    const maps = emptyMaps();
    const round = generateClubRound(
      clubs, teams, players, config,
      [['cA', 'cB']], 1,
      maps.opponentCounts, maps.gamesPlayed, maps.lastSitOutRound,
      maps.teamPoints, 'slots',
    );
    expect(round.matches).toHaveLength(1);
    expect(round.matches[0].courtId).toBe('c2');
  });

  it('puts bye-club players in sitOuts', () => {
    const clubs: Club[] = [
      { id: 'cA', name: 'Club A' },
      { id: 'cB', name: 'Club B' },
      { id: 'cC', name: 'Club C' },
    ];
    const players = [
      makePlayer('p1', 'cA'), makePlayer('p2', 'cA'),
      makePlayer('p3', 'cB'), makePlayer('p4', 'cB'),
      makePlayer('p5', 'cC'), makePlayer('p6', 'cC'),
    ];
    const teams = [
      makeTeam('tA', 'p1', 'p2'),
      makeTeam('tB', 'p3', 'p4'),
      makeTeam('tC', 'p5', 'p6'),
    ];
    const config = makeConfig(1);
    const maps = emptyMaps();
    // Only cA vs cB — cC has bye
    const round = generateClubRound(
      clubs, teams, players, config,
      [['cA', 'cB']], 1,
      maps.opponentCounts, maps.gamesPlayed, maps.lastSitOutRound,
      maps.teamPoints, 'random',
    );
    expect(round.sitOuts).toContain('p5');
    expect(round.sitOuts).toContain('p6');
    expect(round.sitOuts).not.toContain('p1');
    expect(round.sitOuts).not.toContain('p3');
  });

  it('puts unpaired teams (unequal clubs) in sitOuts', () => {
    const clubs: Club[] = [
      { id: 'cA', name: 'Club A' },
      { id: 'cB', name: 'Club B' },
    ];
    const players = [
      makePlayer('p1', 'cA', 0), makePlayer('p2', 'cA', 0),
      makePlayer('p3', 'cA', 1), makePlayer('p4', 'cA', 1),
      makePlayer('p5', 'cB', 0), makePlayer('p6', 'cB', 0),
      // cB has no rank-1 team
    ];
    const teams = [
      makeTeam('tA0', 'p1', 'p2'),
      makeTeam('tA1', 'p3', 'p4'),
      makeTeam('tB0', 'p5', 'p6'),
    ];
    const config = makeConfig(2);
    const maps = emptyMaps();
    const round = generateClubRound(
      clubs, teams, players, config,
      [['cA', 'cB']], 1,
      maps.opponentCounts, maps.gamesPlayed, maps.lastSitOutRound,
      maps.teamPoints, 'slots',
    );
    // Only rank 0 matches; tA1 (rank 1) is unpaired
    expect(round.matches).toHaveLength(1);
    expect(round.sitOuts).toContain('p3');
    expect(round.sitOuts).toContain('p4');
  });

  it('updates opponentCounts for paired teams', () => {
    const { clubs, players, teams, config } = makeSetup(2);
    const maps = emptyMaps();
    generateClubRound(
      clubs, teams, players, config,
      [['cA', 'cB']], 1,
      maps.opponentCounts, maps.gamesPlayed, maps.lastSitOutRound,
      maps.teamPoints, 'slots',
    );
    // tA0 vs tB0, tA1 vs tB1
    // teamKey sorts lexicographically
    expect(maps.opponentCounts.size).toBe(2);
    for (const count of maps.opponentCounts.values()) {
      expect(count).toBe(1);
    }
  });

  it('updates gamesPlayed for all playing teams', () => {
    const { clubs, players, teams, config } = makeSetup(2);
    const maps = emptyMaps();
    generateClubRound(
      clubs, teams, players, config,
      [['cA', 'cB']], 1,
      maps.opponentCounts, maps.gamesPlayed, maps.lastSitOutRound,
      maps.teamPoints, 'slots',
    );
    expect(maps.gamesPlayed.get('tA0')).toBe(1);
    expect(maps.gamesPlayed.get('tA1')).toBe(1);
    expect(maps.gamesPlayed.get('tB0')).toBe(1);
    expect(maps.gamesPlayed.get('tB1')).toBe(1);
  });

  it('accumulates gamesPlayed across multiple calls', () => {
    const { clubs, players, teams, config } = makeSetup(2);
    const maps = emptyMaps();
    generateClubRound(
      clubs, teams, players, config,
      [['cA', 'cB']], 1,
      maps.opponentCounts, maps.gamesPlayed, maps.lastSitOutRound,
      maps.teamPoints, 'slots',
    );
    generateClubRound(
      clubs, teams, players, config,
      [['cA', 'cB']], 2,
      maps.opponentCounts, maps.gamesPlayed, maps.lastSitOutRound,
      maps.teamPoints, 'slots',
    );
    expect(maps.gamesPlayed.get('tA0')).toBe(2);
  });

  it('updates lastSitOutRound for bye-club teams', () => {
    const clubs: Club[] = [
      { id: 'cA', name: 'Club A' },
      { id: 'cB', name: 'Club B' },
      { id: 'cC', name: 'Club C' },
    ];
    const players = [
      makePlayer('p1', 'cA'), makePlayer('p2', 'cA'),
      makePlayer('p3', 'cB'), makePlayer('p4', 'cB'),
      makePlayer('p5', 'cC'), makePlayer('p6', 'cC'),
    ];
    const teams = [
      makeTeam('tA', 'p1', 'p2'),
      makeTeam('tB', 'p3', 'p4'),
      makeTeam('tC', 'p5', 'p6'),
    ];
    const config = makeConfig(1);
    const maps = emptyMaps();
    generateClubRound(
      clubs, teams, players, config,
      [['cA', 'cB']], 3,
      maps.opponentCounts, maps.gamesPlayed, maps.lastSitOutRound,
      maps.teamPoints, 'random',
    );
    expect(maps.lastSitOutRound.get('tC')).toBe(3);
  });

  it('updates lastSitOutRound for unpaired teams', () => {
    const clubs: Club[] = [
      { id: 'cA', name: 'Club A' },
      { id: 'cB', name: 'Club B' },
    ];
    const players = [
      makePlayer('p1', 'cA', 0), makePlayer('p2', 'cA', 0),
      makePlayer('p3', 'cA', 1), makePlayer('p4', 'cA', 1),
      makePlayer('p5', 'cB', 0), makePlayer('p6', 'cB', 0),
    ];
    const teams = [
      makeTeam('tA0', 'p1', 'p2'),
      makeTeam('tA1', 'p3', 'p4'),
      makeTeam('tB0', 'p5', 'p6'),
    ];
    const config = makeConfig(2);
    const maps = emptyMaps();
    generateClubRound(
      clubs, teams, players, config,
      [['cA', 'cB']], 5,
      maps.opponentCounts, maps.gamesPlayed, maps.lastSitOutRound,
      maps.teamPoints, 'slots',
    );
    // tA1 is unpaired (no rank-1 in cB)
    expect(maps.lastSitOutRound.get('tA1')).toBe(5);
    // tA0 and tB0 played, no sit-out
    expect(maps.lastSitOutRound.has('tA0')).toBe(false);
    expect(maps.lastSitOutRound.has('tB0')).toBe(false);
  });

  it('match team arrays contain correct player ids', () => {
    const { clubs, players, teams, config } = makeSetup(2);
    const maps = emptyMaps();
    const round = generateClubRound(
      clubs, teams, players, config,
      [['cA', 'cB']], 1,
      maps.opponentCounts, maps.gamesPlayed, maps.lastSitOutRound,
      maps.teamPoints, 'slots',
    );
    // With slots mode, rank 0 vs rank 0: tA0(p1,p2) vs tB0(p5,p6)
    const m0 = round.matches[0];
    expect(m0.team1).toEqual(['p1', 'p2']);
    expect(m0.team2).toEqual(['p5', 'p6']);
    // rank 1 vs rank 1: tA1(p3,p4) vs tB1(p7,p8)
    const m1 = round.matches[1];
    expect(m1.team1).toEqual(['p3', 'p4']);
    expect(m1.team2).toEqual(['p7', 'p8']);
  });

  it('all matches have null scores', () => {
    const { clubs, players, teams, config } = makeSetup(2);
    const maps = emptyMaps();
    const round = generateClubRound(
      clubs, teams, players, config,
      [['cA', 'cB']], 1,
      maps.opponentCounts, maps.gamesPlayed, maps.lastSitOutRound,
      maps.teamPoints, 'slots',
    );
    for (const match of round.matches) {
      expect(match.score).toBeNull();
    }
  });

  it('handles multiple fixtures in one round (4 clubs, 2 fixtures)', () => {
    const clubs: Club[] = [
      { id: 'cA', name: 'A' }, { id: 'cB', name: 'B' },
      { id: 'cC', name: 'C' }, { id: 'cD', name: 'D' },
    ];
    const players = [
      makePlayer('p1', 'cA'), makePlayer('p2', 'cA'),
      makePlayer('p3', 'cB'), makePlayer('p4', 'cB'),
      makePlayer('p5', 'cC'), makePlayer('p6', 'cC'),
      makePlayer('p7', 'cD'), makePlayer('p8', 'cD'),
    ];
    const teams = [
      makeTeam('tA', 'p1', 'p2'),
      makeTeam('tB', 'p3', 'p4'),
      makeTeam('tC', 'p5', 'p6'),
      makeTeam('tD', 'p7', 'p8'),
    ];
    const config = makeConfig(2);
    const maps = emptyMaps();
    const round = generateClubRound(
      clubs, teams, players, config,
      [['cA', 'cB'], ['cC', 'cD']], 1,
      maps.opponentCounts, maps.gamesPlayed, maps.lastSitOutRound,
      maps.teamPoints, 'random',
    );
    expect(round.matches).toHaveLength(2);
    expect(round.sitOuts).toEqual([]);
    // All 4 teams played
    expect(maps.gamesPlayed.size).toBe(4);
  });
});

// ── clubValidateSetup (team formats — 4 per club min) ──────────────────

describe('clubValidateSetup', () => {
  it('passes for valid setup', () => {
    const players = [
      makePlayer('p1', 'A'), makePlayer('p2', 'A'),
      makePlayer('p3', 'A'), makePlayer('p4', 'A'),
      makePlayer('p5', 'B'), makePlayer('p6', 'B'),
      makePlayer('p7', 'B'), makePlayer('p8', 'B'),
    ];
    expect(clubValidateSetup(players, makeConfig(2))).toEqual([]);
  });

  it('requires at least 2 clubs', () => {
    const players = [
      makePlayer('p1', 'A'), makePlayer('p2', 'A'),
      makePlayer('p3', 'A'), makePlayer('p4', 'A'),
    ];
    expect(clubValidateSetup(players, makeConfig(1))).toContain('At least 2 clubs are required');
  });

  it('requires at least 4 players per club', () => {
    const players = [
      makePlayer('p1', 'A'), makePlayer('p2', 'A'),
      makePlayer('p3', 'B'), makePlayer('p4', 'B'),
      makePlayer('p5', 'B'), makePlayer('p6', 'B'),
    ];
    const errors = clubValidateSetup(players, makeConfig(1));
    expect(errors.some(e => e.includes('4 players'))).toBe(true);
  });

  it('requires even number of players per club', () => {
    const players = [
      makePlayer('p1', 'A'), makePlayer('p2', 'A'),
      makePlayer('p3', 'A'), makePlayer('p4', 'A'),
      makePlayer('p5', 'A'), // 5 in club A — odd
      makePlayer('p6', 'B'), makePlayer('p7', 'B'),
      makePlayer('p8', 'B'), makePlayer('p9', 'B'),
    ];
    const errors = clubValidateSetup(players, makeConfig(1));
    expect(errors.some(e => e.includes('even number'))).toBe(true);
  });

  it('rejects unassigned players', () => {
    const players = [
      makePlayer('p1', 'A'), makePlayer('p2', 'A'),
      makePlayer('p3', 'A'), makePlayer('p4', 'A'),
      makePlayer('p5', 'B'), makePlayer('p6', 'B'),
      makePlayer('p7', 'B'), makePlayer('p8', 'B'),
      makePlayer('p9'), // no club
    ];
    const errors = clubValidateSetup(players, makeConfig(1));
    expect(errors.some(e => e.includes('not assigned'))).toBe(true);
  });

  it('requires at least 1 court', () => {
    const players = [
      makePlayer('p1', 'A'), makePlayer('p2', 'A'),
      makePlayer('p3', 'A'), makePlayer('p4', 'A'),
      makePlayer('p5', 'B'), makePlayer('p6', 'B'),
      makePlayer('p7', 'B'), makePlayer('p8', 'B'),
    ];
    const config: TournamentConfig = { format: 'club-ranked', pointsPerMatch: 21, courts: [], maxRounds: null };
    expect(clubValidateSetup(players, config)).toContain('At least 1 court is required');
  });

  it('requires positive points per match', () => {
    const players = [
      makePlayer('p1', 'A'), makePlayer('p2', 'A'),
      makePlayer('p3', 'A'), makePlayer('p4', 'A'),
      makePlayer('p5', 'B'), makePlayer('p6', 'B'),
      makePlayer('p7', 'B'), makePlayer('p8', 'B'),
    ];
    const config = { ...makeConfig(1), pointsPerMatch: 0 };
    expect(clubValidateSetup(players, config)).toContain('Points per match must be at least 1');
  });
});

// ── clubIndividualValidateSetup (2 per club min) ───────────────────────

describe('clubIndividualValidateSetup', () => {
  it('passes for valid setup with 2 per club', () => {
    const players = [
      makePlayer('p1', 'A'), makePlayer('p2', 'A'),
      makePlayer('p3', 'B'), makePlayer('p4', 'B'),
    ];
    expect(clubIndividualValidateSetup(players, makeConfig(1))).toEqual([]);
  });

  it('requires at least 2 players per club', () => {
    const players = [
      makePlayer('p1', 'A'),
      makePlayer('p2', 'B'), makePlayer('p3', 'B'),
    ];
    const errors = clubIndividualValidateSetup(players, makeConfig(1));
    expect(errors.some(e => e.includes('2 players'))).toBe(true);
  });
});

// ── clubValidateWarnings ────────────────────────────────────────────────

describe('clubValidateWarnings', () => {
  it('returns no warnings when clubs are equal size', () => {
    const players = [
      makePlayer('p1', 'A'), makePlayer('p2', 'A'),
      makePlayer('p3', 'A'), makePlayer('p4', 'A'),
      makePlayer('p5', 'B'), makePlayer('p6', 'B'),
      makePlayer('p7', 'B'), makePlayer('p8', 'B'),
    ];
    expect(clubValidateWarnings(players, makeConfig(1))).toEqual([]);
  });

  it('warns when clubs have different sizes', () => {
    const players = [
      makePlayer('p1', 'A'), makePlayer('p2', 'A'),
      makePlayer('p3', 'A'), makePlayer('p4', 'A'),
      makePlayer('p5', 'B'), makePlayer('p6', 'B'),
      makePlayer('p7', 'B'), makePlayer('p8', 'B'),
      makePlayer('p9', 'B'), makePlayer('p10', 'B'),
    ];
    const warnings = clubValidateWarnings(players, makeConfig(1));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('different sizes');
    expect(warnings[0]).toContain('2 vs 3 pairs');
  });

  it('returns no warnings with a single club', () => {
    const players = [
      makePlayer('p1', 'A'), makePlayer('p2', 'A'),
    ];
    expect(clubValidateWarnings(players, makeConfig(1))).toEqual([]);
  });
});
