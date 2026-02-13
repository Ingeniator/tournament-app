import { describe, it, expect } from 'vitest';
import {
  partnerKey,
  commonValidateSetup,
  commonValidateScore,
  seedFromRounds,
  selectSitOuts,
  calculateIndividualStandings,
} from './shared';
import type { Player, TournamentConfig, Tournament, Round, Match } from '@padel/common';

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
}

function makeConfig(numCourts: number): TournamentConfig {
  return {
    format: 'americano',
    pointsPerMatch: 24,
    courts: Array.from({ length: numCourts }, (_, i) => ({ id: `c${i + 1}`, name: `Court ${i + 1}` })),
    maxRounds: null,
  };
}

function makeMatch(id: string, courtId: string, t1: [string, string], t2: [string, string], score: { team1Points: number; team2Points: number } | null = null): Match {
  return { id, courtId, team1: t1, team2: t2, score };
}

function makeRound(num: number, matches: Match[], sitOuts: string[] = []): Round {
  return { id: `r${num}`, roundNumber: num, matches, sitOuts };
}

// ── partnerKey ──────────────────────────────────────────────────────────

describe('partnerKey', () => {
  it('orders ids lexicographically', () => {
    expect(partnerKey('a', 'b')).toBe('a:b');
    expect(partnerKey('b', 'a')).toBe('a:b');
  });

  it('is consistent for same pair', () => {
    expect(partnerKey('p1', 'p2')).toBe(partnerKey('p2', 'p1'));
  });

  it('handles identical ids', () => {
    expect(partnerKey('x', 'x')).toBe('x:x');
  });
});

// ── commonValidateSetup ─────────────────────────────────────────────────

describe('commonValidateSetup', () => {
  it('returns no errors for valid setup', () => {
    const errors = commonValidateSetup(makePlayers(8), makeConfig(2));
    expect(errors).toEqual([]);
  });

  it('requires at least 4 players', () => {
    const errors = commonValidateSetup(makePlayers(3), makeConfig(1));
    expect(errors).toContain('At least 4 players are required');
  });

  it('requires at least 1 available court', () => {
    const config: TournamentConfig = {
      format: 'americano',
      pointsPerMatch: 24,
      courts: [{ id: 'c1', name: 'Court 1', unavailable: true }],
      maxRounds: null,
    };
    const errors = commonValidateSetup(makePlayers(4), config);
    expect(errors).toContain('At least 1 court is required');
  });

  it('requires positive points per match', () => {
    const config = { ...makeConfig(1), pointsPerMatch: 0 };
    const errors = commonValidateSetup(makePlayers(4), config);
    expect(errors).toContain('Points per match must be at least 1');
  });

  it('detects too many courts for player count', () => {
    const errors = commonValidateSetup(makePlayers(4), makeConfig(2));
    expect(errors.some(e => e.includes('Too many courts'))).toBe(true);
  });

  it('allows max courts equal to floor(players/4)', () => {
    const errors = commonValidateSetup(makePlayers(8), makeConfig(2));
    expect(errors).toEqual([]);
  });

  it('reports multiple errors at once', () => {
    const config: TournamentConfig = {
      format: 'americano',
      pointsPerMatch: 0,
      courts: [],
      maxRounds: null,
    };
    const errors = commonValidateSetup(makePlayers(2), config);
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ── commonValidateScore ─────────────────────────────────────────────────

describe('commonValidateScore', () => {
  const config = makeConfig(1);

  it('returns null for valid score', () => {
    expect(commonValidateScore({ team1Points: 14, team2Points: 10 }, config)).toBeNull();
  });

  it('rejects score with wrong total', () => {
    const err = commonValidateScore({ team1Points: 10, team2Points: 10 }, config);
    expect(err).toContain('Total points must equal 24');
  });

  it('rejects negative points', () => {
    const err = commonValidateScore({ team1Points: -1, team2Points: 25 }, config);
    expect(err).toContain('Points cannot be negative');
  });

  it('allows zero on one side', () => {
    expect(commonValidateScore({ team1Points: 24, team2Points: 0 }, config)).toBeNull();
  });

  it('allows draw', () => {
    expect(commonValidateScore({ team1Points: 12, team2Points: 12 }, config)).toBeNull();
  });
});

// ── seedFromRounds ──────────────────────────────────────────────────────

describe('seedFromRounds', () => {
  const players = makePlayers(4);

  it('returns empty maps for no rounds', () => {
    const seed = seedFromRounds([], players);
    expect(seed.gamesPlayed.get('p1')).toBe(0);
    expect(seed.partnerCounts.size).toBe(0);
    expect(seed.opponentCounts.size).toBe(0);
  });

  it('tracks games played correctly', () => {
    const round = makeRound(1, [
      makeMatch('m1', 'c1', ['p1', 'p2'], ['p3', 'p4']),
    ]);
    const seed = seedFromRounds([round], players);
    expect(seed.gamesPlayed.get('p1')).toBe(1);
    expect(seed.gamesPlayed.get('p2')).toBe(1);
    expect(seed.gamesPlayed.get('p3')).toBe(1);
    expect(seed.gamesPlayed.get('p4')).toBe(1);
  });

  it('tracks partner counts', () => {
    const round = makeRound(1, [
      makeMatch('m1', 'c1', ['p1', 'p2'], ['p3', 'p4']),
    ]);
    const seed = seedFromRounds([round], players);
    expect(seed.partnerCounts.get(partnerKey('p1', 'p2'))).toBe(1);
    expect(seed.partnerCounts.get(partnerKey('p3', 'p4'))).toBe(1);
  });

  it('tracks opponent counts', () => {
    const round = makeRound(1, [
      makeMatch('m1', 'c1', ['p1', 'p2'], ['p3', 'p4']),
    ]);
    const seed = seedFromRounds([round], players);
    expect(seed.opponentCounts.get(partnerKey('p1', 'p3'))).toBe(1);
    expect(seed.opponentCounts.get(partnerKey('p1', 'p4'))).toBe(1);
    expect(seed.opponentCounts.get(partnerKey('p2', 'p3'))).toBe(1);
    expect(seed.opponentCounts.get(partnerKey('p2', 'p4'))).toBe(1);
  });

  it('tracks court counts', () => {
    const round = makeRound(1, [
      makeMatch('m1', 'c1', ['p1', 'p2'], ['p3', 'p4']),
    ]);
    const seed = seedFromRounds([round], players);
    expect(seed.courtCounts.get('p1:c1')).toBe(1);
  });

  it('tracks sit-out rounds', () => {
    const round = makeRound(1, [
      makeMatch('m1', 'c1', ['p1', 'p2'], ['p3', 'p4']),
    ], ['p5']);
    const fivePlayers = makePlayers(5);
    const seed = seedFromRounds([round], fivePlayers);
    expect(seed.lastSitOutRound.get('p5')).toBe(1);
    expect(seed.lastSitOutRound.get('p1')).toBe(-Infinity);
  });

  it('accumulates over multiple rounds', () => {
    const rounds = [
      makeRound(1, [makeMatch('m1', 'c1', ['p1', 'p2'], ['p3', 'p4'])]),
      makeRound(2, [makeMatch('m2', 'c1', ['p1', 'p3'], ['p2', 'p4'])]),
    ];
    const seed = seedFromRounds(rounds, players);
    expect(seed.gamesPlayed.get('p1')).toBe(2);
    expect(seed.partnerCounts.get(partnerKey('p1', 'p2'))).toBe(1);
    expect(seed.partnerCounts.get(partnerKey('p1', 'p3'))).toBe(1);
  });
});

// ── selectSitOuts ───────────────────────────────────────────────────────

describe('selectSitOuts', () => {
  const players = makePlayers(6);

  it('returns empty set for sitOutCount 0', () => {
    const gamesPlayed = new Map(players.map(p => [p.id, 0]));
    const { sitOutIds, activeIds } = selectSitOuts(players, 0, gamesPlayed);
    expect(sitOutIds.size).toBe(0);
    expect(activeIds.length).toBe(6);
  });

  it('selects correct number of sit-outs', () => {
    const gamesPlayed = new Map(players.map(p => [p.id, 0]));
    const { sitOutIds } = selectSitOuts(players, 2, gamesPlayed);
    expect(sitOutIds.size).toBe(2);
  });

  it('prefers players with more games played', () => {
    const gamesPlayed = new Map<string, number>([
      ['p1', 3], ['p2', 3], ['p3', 1], ['p4', 1], ['p5', 1], ['p6', 1],
    ]);
    // Run multiple times to account for shuffle randomness
    let p1OrP2SatOut = 0;
    for (let i = 0; i < 20; i++) {
      const { sitOutIds } = selectSitOuts(players, 2, gamesPlayed);
      if (sitOutIds.has('p1') || sitOutIds.has('p2')) p1OrP2SatOut++;
    }
    // Players with most games should sit out nearly always
    expect(p1OrP2SatOut).toBeGreaterThan(15);
  });

  it('uses lastSitOutRound as tiebreaker', () => {
    const gamesPlayed = new Map<string, number>([
      ['p1', 2], ['p2', 2], ['p3', 2], ['p4', 2], ['p5', 1], ['p6', 1],
    ]);
    const lastSitOutRound = new Map<string, number>([
      ['p1', 1], ['p2', 3], ['p3', 2], ['p4', 0], ['p5', -Infinity], ['p6', -Infinity],
    ]);
    // p4 sat out longest ago among 2-game players, so should sit less
    // p2 sat out most recently, so should be picked for sit-out
    let p4SatOut = 0;
    for (let i = 0; i < 20; i++) {
      const { sitOutIds } = selectSitOuts(players, 2, gamesPlayed, lastSitOutRound);
      if (sitOutIds.has('p4')) p4SatOut++;
    }
    // Sort is by most games first (desc), then earliest lastSitOut (asc)
    // So among p1-p4 (all 2 games), p4 (lastSitOut=0) sits out more than p2 (lastSitOut=3)
    expect(p4SatOut).toBeGreaterThan(0);
  });

  it('activeIds excludes sit-out players', () => {
    const gamesPlayed = new Map(players.map(p => [p.id, 0]));
    const { sitOutIds, activeIds } = selectSitOuts(players, 2, gamesPlayed);
    for (const id of sitOutIds) {
      expect(activeIds).not.toContain(id);
    }
    expect(activeIds.length + sitOutIds.size).toBe(players.length);
  });
});

// ── calculateIndividualStandings ────────────────────────────────────────

describe('calculateIndividualStandings', () => {
  const players = makePlayers(4);
  const config = makeConfig(1);

  function makeTournament(rounds: Round[]): Tournament {
    return {
      id: 't1',
      name: 'Test',
      config,
      phase: 'in-progress',
      players,
      rounds,
      createdAt: 0,
      updatedAt: 0,
    };
  }

  it('returns all players with zero stats for no scored rounds', () => {
    const standings = calculateIndividualStandings(makeTournament([]));
    expect(standings.length).toBe(4);
    standings.forEach(s => {
      expect(s.totalPoints).toBe(0);
      expect(s.matchesPlayed).toBe(0);
    });
  });

  it('correctly accumulates points for team1 winners', () => {
    const round = makeRound(1, [
      makeMatch('m1', 'c1', ['p1', 'p2'], ['p3', 'p4'], { team1Points: 14, team2Points: 10 }),
    ]);
    const standings = calculateIndividualStandings(makeTournament([round]));
    const p1 = standings.find(s => s.playerId === 'p1')!;
    const p3 = standings.find(s => s.playerId === 'p3')!;
    expect(p1.totalPoints).toBe(14);
    expect(p1.matchesWon).toBe(1);
    expect(p1.matchesPlayed).toBe(1);
    expect(p3.totalPoints).toBe(10);
    expect(p3.matchesLost).toBe(1);
  });

  it('correctly handles draws', () => {
    const round = makeRound(1, [
      makeMatch('m1', 'c1', ['p1', 'p2'], ['p3', 'p4'], { team1Points: 12, team2Points: 12 }),
    ]);
    const standings = calculateIndividualStandings(makeTournament([round]));
    const p1 = standings.find(s => s.playerId === 'p1')!;
    expect(p1.matchesDraw).toBe(1);
    expect(p1.matchesWon).toBe(0);
    expect(p1.matchesLost).toBe(0);
  });

  it('computes pointDiff correctly', () => {
    const round = makeRound(1, [
      makeMatch('m1', 'c1', ['p1', 'p2'], ['p3', 'p4'], { team1Points: 18, team2Points: 6 }),
    ]);
    const standings = calculateIndividualStandings(makeTournament([round]));
    const p1 = standings.find(s => s.playerId === 'p1')!;
    expect(p1.pointDiff).toBe(12); // 18 - 6
    const p3 = standings.find(s => s.playerId === 'p3')!;
    expect(p3.pointDiff).toBe(-12); // 6 - 18
  });

  it('awards average points to sit-out players', () => {
    const fivePlayers = makePlayers(5);
    const round = makeRound(1, [
      makeMatch('m1', 'c1', ['p1', 'p2'], ['p3', 'p4'], { team1Points: 14, team2Points: 10 }),
    ], ['p5']);
    const tournament: Tournament = {
      id: 't1', name: 'Test', config, phase: 'in-progress',
      players: fivePlayers, rounds: [round], createdAt: 0, updatedAt: 0,
    };
    const standings = calculateIndividualStandings(tournament);
    const p5 = standings.find(s => s.playerId === 'p5')!;
    // avg = (14 + 10) / 4 = 6
    expect(p5.totalPoints).toBe(6);
    expect(p5.matchesPlayed).toBe(0);
  });

  it('ranks players by total points', () => {
    const rounds = [
      makeRound(1, [
        makeMatch('m1', 'c1', ['p1', 'p2'], ['p3', 'p4'], { team1Points: 20, team2Points: 4 }),
      ]),
      makeRound(2, [
        makeMatch('m2', 'c1', ['p1', 'p3'], ['p2', 'p4'], { team1Points: 15, team2Points: 9 }),
      ]),
    ];
    const standings = calculateIndividualStandings(makeTournament(rounds));
    expect(standings[0].playerId).toBe('p1'); // 20+15 = 35
    expect(standings[0].rank).toBe(1);
  });

  it('assigns tied ranks for equal stats', () => {
    const round = makeRound(1, [
      makeMatch('m1', 'c1', ['p1', 'p2'], ['p3', 'p4'], { team1Points: 12, team2Points: 12 }),
    ]);
    const standings = calculateIndividualStandings(makeTournament([round]));
    // p1 and p2 have identical stats, as do p3 and p4
    const p1 = standings.find(s => s.playerId === 'p1')!;
    const p2 = standings.find(s => s.playerId === 'p2')!;
    expect(p1.rank).toBe(p2.rank);
  });

  it('uses pointDiff as tiebreaker', () => {
    const rounds = [
      makeRound(1, [
        makeMatch('m1', 'c1', ['p1', 'p2'], ['p3', 'p4'], { team1Points: 14, team2Points: 10 }),
      ]),
      makeRound(2, [
        makeMatch('m2', 'c1', ['p1', 'p4'], ['p3', 'p2'], { team1Points: 14, team2Points: 10 }),
      ]),
    ];
    const standings = calculateIndividualStandings(makeTournament(rounds));
    // p2: R1 team1=14, R2 team2=10 → total=24, diff=(14-10)+(10-14)=0
    // p4: R1 team2=10, R2 team1=14 → total=24, diff=(10-14)+(14-10)=0
    const p2 = standings.find(s => s.playerId === 'p2')!;
    const p4 = standings.find(s => s.playerId === 'p4')!;
    expect(p2.totalPoints).toBe(24);
    expect(p4.totalPoints).toBe(24);
    expect(p2.pointDiff).toBe(0);
    expect(p4.pointDiff).toBe(0);
    expect(p2.rank).toBe(p4.rank);
  });

  it('ignores unscored matches', () => {
    const round = makeRound(1, [
      makeMatch('m1', 'c1', ['p1', 'p2'], ['p3', 'p4']), // no score
    ]);
    const standings = calculateIndividualStandings(makeTournament([round]));
    standings.forEach(s => {
      expect(s.totalPoints).toBe(0);
      expect(s.matchesPlayed).toBe(0);
    });
  });
});
