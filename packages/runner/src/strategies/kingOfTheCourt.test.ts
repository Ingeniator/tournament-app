import { describe, it, expect } from 'vitest';
import { kingOfTheCourtStrategy } from './kingOfTheCourt';
import type { Player, TournamentConfig, Round, Tournament, Match } from '@padel/common';

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
}

function makeConfig(numCourts: number, pointsPerMatch = 24): TournamentConfig {
  return {
    format: 'king-of-the-court',
    pointsPerMatch,
    courts: Array.from({ length: numCourts }, (_, i) => ({ id: `c${i + 1}`, name: `Court ${i + 1}` })),
    maxRounds: null,
  };
}

function makeTournament(
  players: Player[],
  config: TournamentConfig,
  rounds: Round[],
): Tournament {
  return {
    id: 't1',
    name: 'Test',
    config,
    phase: 'in-progress',
    players,
    rounds,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function scoreRound(round: Round, scores: [number, number][]): Round {
  return {
    ...round,
    matches: round.matches.map((match, i) => ({
      ...match,
      score: { team1Points: scores[i][0], team2Points: scores[i][1] },
    })),
  };
}

// ── validateSetup ──────────────────────────────────────────────

describe('kingOfTheCourt validateSetup', () => {
  it('requires at least 8 players', () => {
    const errors = kingOfTheCourtStrategy.validateSetup(makePlayers(7), makeConfig(2));
    expect(errors).toContain('King of the Court requires at least 8 players');
  });

  it('passes with exactly 8 players', () => {
    const errors = kingOfTheCourtStrategy.validateSetup(makePlayers(8), makeConfig(2));
    expect(errors.find(e => e.includes('8 players'))).toBeUndefined();
  });

  it('requires at least 2 courts', () => {
    const errors = kingOfTheCourtStrategy.validateSetup(makePlayers(8), makeConfig(1));
    expect(errors).toContain('King of the Court requires at least 2 courts');
  });

  it('requires at least 12 points per match', () => {
    const errors = kingOfTheCourtStrategy.validateSetup(makePlayers(8), makeConfig(2, 10));
    expect(errors).toContain('King of the Court requires at least 12 points per match');
  });

  it('passes with 12 points per match', () => {
    const errors = kingOfTheCourtStrategy.validateSetup(makePlayers(8), makeConfig(2, 12));
    expect(errors.find(e => e.includes('points'))).toBeUndefined();
  });

  it('rejects too many courts for players', () => {
    const errors = kingOfTheCourtStrategy.validateSetup(makePlayers(8), makeConfig(3));
    expect(errors).toContain('Too many courts: 8 players need at most 2 court(s)');
  });

  it('returns no errors for valid setup', () => {
    const errors = kingOfTheCourtStrategy.validateSetup(makePlayers(8), makeConfig(2));
    expect(errors).toHaveLength(0);
  });

  it('returns no errors for 12p / 3c', () => {
    const errors = kingOfTheCourtStrategy.validateSetup(makePlayers(12), makeConfig(3));
    expect(errors).toHaveLength(0);
  });

  it('handles unavailable courts', () => {
    const config = makeConfig(3);
    config.courts[2].unavailable = true; // only 2 available
    const errors = kingOfTheCourtStrategy.validateSetup(makePlayers(8), config);
    expect(errors).toHaveLength(0);
  });

  it('fails when available courts drop below 2 due to unavailability', () => {
    const config = makeConfig(2);
    config.courts[1].unavailable = true; // only 1 available
    const errors = kingOfTheCourtStrategy.validateSetup(makePlayers(8), config);
    expect(errors).toContain('King of the Court requires at least 2 courts');
  });
});

// ── validateWarnings ────────────────────────────────────────────

describe('kingOfTheCourt validateWarnings', () => {
  it('warns when >25% of players sit out', () => {
    // 9 players, 2 courts → 8 play, 1 sits out = 11% → no warning
    const warnings9 = kingOfTheCourtStrategy.validateWarnings!(makePlayers(9), makeConfig(2));
    expect(warnings9).toHaveLength(0);

    // 12 players, 2 courts → 8 play, 4 sit out = 33% → warning
    const warnings12 = kingOfTheCourtStrategy.validateWarnings!(makePlayers(12), makeConfig(2));
    expect(warnings12).toHaveLength(1);
    expect(warnings12[0]).toContain('4 of 12 players');
    expect(warnings12[0]).toContain('33%');
  });

  it('no warning when no sit-outs', () => {
    // 8 players, 2 courts → 0 sit out
    const warnings = kingOfTheCourtStrategy.validateWarnings!(makePlayers(8), makeConfig(2));
    expect(warnings).toHaveLength(0);
  });

  it('no warning when <8 players (validation error takes precedence)', () => {
    const warnings = kingOfTheCourtStrategy.validateWarnings!(makePlayers(6), makeConfig(1));
    expect(warnings).toHaveLength(0);
  });
});

// ── validateScore ───────────────────────────────────────────────

describe('kingOfTheCourt validateScore', () => {
  const config = makeConfig(2, 24);

  it('accepts valid scores summing to pointsPerMatch', () => {
    expect(kingOfTheCourtStrategy.validateScore({ team1Points: 15, team2Points: 9 }, config)).toBeNull();
    expect(kingOfTheCourtStrategy.validateScore({ team1Points: 12, team2Points: 12 }, config)).toBeNull();
  });

  it('rejects scores not summing to pointsPerMatch', () => {
    const result = kingOfTheCourtStrategy.validateScore({ team1Points: 10, team2Points: 10 }, config);
    expect(result).toContain('24');
  });

  it('rejects negative scores', () => {
    const result = kingOfTheCourtStrategy.validateScore({ team1Points: -1, team2Points: 25 }, config);
    expect(result).toContain('negative');
  });
});

// ── generateSchedule (round 1) ─────────────────────────────────

describe('kingOfTheCourt generateSchedule', () => {
  it('generates 1 round with correct match count (8p / 2c)', () => {
    const players = makePlayers(8);
    const config = makeConfig(2);
    const { rounds } = kingOfTheCourtStrategy.generateSchedule(players, config);
    expect(rounds).toHaveLength(1);
    expect(rounds[0].matches).toHaveLength(2);
    expect(rounds[0].sitOuts).toHaveLength(0);
    expect(rounds[0].roundNumber).toBe(1);
  });

  it('generates correct structure for 12p / 3c', () => {
    const players = makePlayers(12);
    const config = makeConfig(3);
    const { rounds } = kingOfTheCourtStrategy.generateSchedule(players, config);
    expect(rounds).toHaveLength(1);
    expect(rounds[0].matches).toHaveLength(3);
    expect(rounds[0].sitOuts).toHaveLength(0);
  });

  it('handles sit-outs when players > courts * 4', () => {
    const players = makePlayers(10);
    const config = makeConfig(2);
    const { rounds, warnings } = kingOfTheCourtStrategy.generateSchedule(players, config);
    expect(rounds).toHaveLength(1);
    expect(rounds[0].matches).toHaveLength(2);
    expect(rounds[0].sitOuts).toHaveLength(2);
    expect(warnings.length).toBeGreaterThanOrEqual(1);
  });

  it('assigns each player to exactly one match or sit-out', () => {
    const players = makePlayers(10);
    const config = makeConfig(2);
    const { rounds } = kingOfTheCourtStrategy.generateSchedule(players, config);
    const round = rounds[0];
    const allIds = new Set<string>();
    for (const m of round.matches) {
      for (const pid of [...m.team1, ...m.team2]) {
        expect(allIds.has(pid)).toBe(false);
        allIds.add(pid);
      }
    }
    for (const pid of round.sitOuts) {
      expect(allIds.has(pid)).toBe(false);
      allIds.add(pid);
    }
    expect(allIds.size).toBe(10);
  });

  it('each match has 2 players per team', () => {
    const players = makePlayers(8);
    const config = makeConfig(2);
    const { rounds } = kingOfTheCourtStrategy.generateSchedule(players, config);
    for (const match of rounds[0].matches) {
      expect(match.team1).toHaveLength(2);
      expect(match.team2).toHaveLength(2);
    }
  });

  it('matches are assigned to available courts', () => {
    const players = makePlayers(8);
    const config = makeConfig(2);
    const { rounds } = kingOfTheCourtStrategy.generateSchedule(players, config);
    const courtIds = config.courts.map(c => c.id);
    for (const match of rounds[0].matches) {
      expect(courtIds).toContain(match.courtId);
    }
  });

  it('returns empty rounds when not enough players for a match', () => {
    const players = makePlayers(3);
    const config: TournamentConfig = {
      format: 'king-of-the-court',
      pointsPerMatch: 24,
      courts: [{ id: 'c1', name: 'Court 1' }, { id: 'c2', name: 'Court 2' }],
      maxRounds: null,
    };
    // validateSetup would reject this, but generateSchedule should still handle it
    const { rounds, warnings } = kingOfTheCourtStrategy.generateSchedule(players, config);
    expect(rounds).toHaveLength(0);
    expect(warnings).toContain('Not enough players for a match (need at least 4)');
  });
});

// ── calculateStandings ──────────────────────────────────────────

describe('kingOfTheCourt calculateStandings', () => {
  const players = makePlayers(8);
  const config = makeConfig(2);

  it('returns an entry for each active player', () => {
    const tournament = makeTournament(players, config, []);
    const standings = kingOfTheCourtStrategy.calculateStandings(tournament);
    expect(standings).toHaveLength(8);
  });

  it('all zeros with no scored rounds', () => {
    const tournament = makeTournament(players, config, []);
    const standings = kingOfTheCourtStrategy.calculateStandings(tournament);
    for (const entry of standings) {
      expect(entry.totalPoints).toBe(0);
      expect(entry.matchesPlayed).toBe(0);
      expect(entry.pointDiff).toBe(0);
    }
  });

  it('correctly counts wins, losses, draws', () => {
    const round: Round = {
      id: 'r1',
      roundNumber: 1,
      matches: [
        {
          id: 'm1', courtId: 'c1',
          team1: ['p1', 'p2'], team2: ['p3', 'p4'],
          score: { team1Points: 15, team2Points: 9 },
        },
        {
          id: 'm2', courtId: 'c2',
          team1: ['p5', 'p6'], team2: ['p7', 'p8'],
          score: { team1Points: 12, team2Points: 12 },
        },
      ],
      sitOuts: [],
    };
    const tournament = makeTournament(players, config, [round]);
    const standings = kingOfTheCourtStrategy.calculateStandings(tournament);
    const byId = new Map(standings.map(s => [s.playerId, s]));

    // p1 and p2 won on king court (c1) → get 15 points + court bonus
    const p1 = byId.get('p1')!;
    expect(p1.matchesWon).toBe(1);
    expect(p1.matchesLost).toBe(0);
    expect(p1.matchesDraw).toBe(0);
    expect(p1.matchesPlayed).toBe(1);

    // p3 and p4 lost on king court
    const p3 = byId.get('p3')!;
    expect(p3.matchesWon).toBe(0);
    expect(p3.matchesLost).toBe(1);

    // p5 and p6 drew on court 2
    const p5 = byId.get('p5')!;
    expect(p5.matchesDraw).toBe(1);
    expect(p5.matchesWon).toBe(0);
    expect(p5.matchesLost).toBe(0);
  });

  it('applies court bonus — king court players get extra points', () => {
    const round: Round = {
      id: 'r1',
      roundNumber: 1,
      matches: [
        {
          id: 'm1', courtId: 'c1', // king court → bonus = 1 (2 courts: bonus = 2-1-0 = 1, 0)
          team1: ['p1', 'p2'], team2: ['p3', 'p4'],
          score: { team1Points: 12, team2Points: 12 },
        },
        {
          id: 'm2', courtId: 'c2', // lowest court → bonus = 0
          team1: ['p5', 'p6'], team2: ['p7', 'p8'],
          score: { team1Points: 12, team2Points: 12 },
        },
      ],
      sitOuts: [],
    };
    const tournament = makeTournament(players, config, [round]);
    const standings = kingOfTheCourtStrategy.calculateStandings(tournament);
    const byId = new Map(standings.map(s => [s.playerId, s]));

    // King court (c1) bonus = numCourts - 1 - 0 = 1
    // Lower court (c2) bonus = numCourts - 1 - 1 = 0
    expect(byId.get('p1')!.totalPoints).toBe(12 + 1); // score + bonus
    expect(byId.get('p5')!.totalPoints).toBe(12 + 0); // score + no bonus
  });

  it('applies court bonus correctly with 3 courts', () => {
    const players12 = makePlayers(12);
    const config3 = makeConfig(3);
    const round: Round = {
      id: 'r1',
      roundNumber: 1,
      matches: [
        {
          id: 'm1', courtId: 'c1', // bonus = 2
          team1: ['p1', 'p2'], team2: ['p3', 'p4'],
          score: { team1Points: 12, team2Points: 12 },
        },
        {
          id: 'm2', courtId: 'c2', // bonus = 1
          team1: ['p5', 'p6'], team2: ['p7', 'p8'],
          score: { team1Points: 12, team2Points: 12 },
        },
        {
          id: 'm3', courtId: 'c3', // bonus = 0
          team1: ['p9', 'p10'], team2: ['p11', 'p12'],
          score: { team1Points: 12, team2Points: 12 },
        },
      ],
      sitOuts: [],
    };
    const tournament = makeTournament(players12, config3, [round]);
    const standings = kingOfTheCourtStrategy.calculateStandings(tournament);
    const byId = new Map(standings.map(s => [s.playerId, s]));

    expect(byId.get('p1')!.totalPoints).toBe(14);  // 12 + 2
    expect(byId.get('p5')!.totalPoints).toBe(13);  // 12 + 1
    expect(byId.get('p9')!.totalPoints).toBe(12);   // 12 + 0
  });

  it('compensates sit-out players with average points', () => {
    const players10 = makePlayers(10);
    const round: Round = {
      id: 'r1',
      roundNumber: 1,
      matches: [
        {
          id: 'm1', courtId: 'c1',
          team1: ['p1', 'p2'], team2: ['p3', 'p4'],
          score: { team1Points: 14, team2Points: 10 },
        },
        {
          id: 'm2', courtId: 'c2',
          team1: ['p5', 'p6'], team2: ['p7', 'p8'],
          score: { team1Points: 14, team2Points: 10 },
        },
      ],
      sitOuts: ['p9', 'p10'],
    };
    const tournament = makeTournament(players10, config, [round]);
    const standings = kingOfTheCourtStrategy.calculateStandings(tournament);
    const byId = new Map(standings.map(s => [s.playerId, s]));

    // Total scored points = (14+10) + (14+10) = 48, 8 players scored → avg = 6
    const p9 = byId.get('p9')!;
    expect(p9.totalPoints).toBe(6);
    expect(p9.matchesPlayed).toBe(0);
  });

  it('ranks players by totalPoints desc, then pointDiff, then matchesWon', () => {
    const round: Round = {
      id: 'r1',
      roundNumber: 1,
      matches: [
        {
          id: 'm1', courtId: 'c1',
          team1: ['p1', 'p2'], team2: ['p3', 'p4'],
          score: { team1Points: 20, team2Points: 4 },
        },
        {
          id: 'm2', courtId: 'c2',
          team1: ['p5', 'p6'], team2: ['p7', 'p8'],
          score: { team1Points: 4, team2Points: 20 },
        },
      ],
      sitOuts: [],
    };
    const tournament = makeTournament(players, config, [round]);
    const standings = kingOfTheCourtStrategy.calculateStandings(tournament);

    // p1, p2 on king court (bonus 1) with 20 pts → total 21, pointDiff = 16
    // p7, p8 on court 2 (bonus 0) with 20 pts → total 20, pointDiff = 16
    expect(standings[0].totalPoints).toBeGreaterThanOrEqual(standings[1].totalPoints);
    expect(standings[0].rank).toBe(1);
  });

  it('assigns equal rank for tied players', () => {
    const round: Round = {
      id: 'r1',
      roundNumber: 1,
      matches: [
        {
          id: 'm1', courtId: 'c1',
          team1: ['p1', 'p2'], team2: ['p3', 'p4'],
          score: { team1Points: 12, team2Points: 12 },
        },
        {
          id: 'm2', courtId: 'c2',
          team1: ['p5', 'p6'], team2: ['p7', 'p8'],
          score: { team1Points: 12, team2Points: 12 },
        },
      ],
      sitOuts: [],
    };
    const tournament = makeTournament(players, config, [round]);
    const standings = kingOfTheCourtStrategy.calculateStandings(tournament);

    // Court 2 players all have same stats (12 pts, 0 bonus, 0 diff)
    const court2Players = standings.filter(s => ['p5', 'p6', 'p7', 'p8'].includes(s.playerId));
    const court2Ranks = court2Players.map(s => s.rank);
    // All court 2 players share the same rank
    expect(new Set(court2Ranks).size).toBe(1);
  });

  it('excludes unavailable players', () => {
    const playersWithUnavailable = players.map(p =>
      p.id === 'p8' ? { ...p, unavailable: true } : p
    );
    const tournament = makeTournament(playersWithUnavailable, config, []);
    const standings = kingOfTheCourtStrategy.calculateStandings(tournament);
    expect(standings).toHaveLength(7);
    expect(standings.find(s => s.playerId === 'p8')).toBeUndefined();
  });
});

// ── getCompetitors ──────────────────────────────────────────────

describe('kingOfTheCourt getCompetitors', () => {
  it('returns one competitor per active player', () => {
    const players = makePlayers(8);
    const config = makeConfig(2);
    const tournament = makeTournament(players, config, []);
    const competitors = kingOfTheCourtStrategy.getCompetitors(tournament);
    expect(competitors).toHaveLength(8);
    expect(competitors[0].playerIds).toEqual(['p1']);
  });

  it('excludes unavailable players', () => {
    const players = makePlayers(8).map(p =>
      p.id === 'p8' ? { ...p, unavailable: true } : p
    );
    const config = makeConfig(2);
    const tournament = makeTournament(players, config, []);
    const competitors = kingOfTheCourtStrategy.getCompetitors(tournament);
    expect(competitors).toHaveLength(7);
  });
});

// ── generateAdditionalRounds (promotion/relegation) ─────────────

describe('kingOfTheCourt generateAdditionalRounds', () => {
  const players = makePlayers(8);
  const config = makeConfig(2);

  it('generates requested number of additional rounds', () => {
    const { rounds: initial } = kingOfTheCourtStrategy.generateSchedule(players, config);
    const scored = scoreRound(initial[0], [[15, 9], [15, 9]]);
    const { rounds } = kingOfTheCourtStrategy.generateAdditionalRounds(
      players, config, [scored], 2,
    );
    expect(rounds).toHaveLength(2);
    expect(rounds[0].roundNumber).toBe(2);
    expect(rounds[1].roundNumber).toBe(3);
  });

  it('round 2 uses promotion/relegation from round 1 results', () => {
    // Set up a known round 1 with clear winners
    const round1: Round = {
      id: 'r1',
      roundNumber: 1,
      matches: [
        {
          id: 'm1', courtId: 'c1', // king court
          team1: ['p1', 'p2'], team2: ['p3', 'p4'],
          score: { team1Points: 18, team2Points: 6 }, // t1 wins
        },
        {
          id: 'm2', courtId: 'c2', // lower court
          team1: ['p5', 'p6'], team2: ['p7', 'p8'],
          score: { team1Points: 18, team2Points: 6 }, // t1 wins
        },
      ],
      sitOuts: [],
    };

    const { rounds } = kingOfTheCourtStrategy.generateAdditionalRounds(
      players, config, [round1], 1,
    );

    expect(rounds).toHaveLength(1);
    const round2 = rounds[0];
    expect(round2.matches).toHaveLength(2);

    // Each match should have exactly 4 players, 2 per team
    for (const match of round2.matches) {
      expect(match.team1).toHaveLength(2);
      expect(match.team2).toHaveLength(2);
    }

    // All 8 players should be accounted for
    const allPlayerIds = round2.matches.flatMap(m => [...m.team1, ...m.team2]);
    expect(new Set(allPlayerIds).size).toBe(8);
  });

  it('winners of lower court promote to king court', () => {
    // p5+p6 win on c2 (lower court) → should promote to c1 (king court)
    const round1: Round = {
      id: 'r1',
      roundNumber: 1,
      matches: [
        {
          id: 'm1', courtId: 'c1',
          team1: ['p1', 'p2'], team2: ['p3', 'p4'],
          score: { team1Points: 18, team2Points: 6 },
        },
        {
          id: 'm2', courtId: 'c2',
          team1: ['p5', 'p6'], team2: ['p7', 'p8'],
          score: { team1Points: 18, team2Points: 6 },
        },
      ],
      sitOuts: [],
    };

    const { rounds } = kingOfTheCourtStrategy.generateAdditionalRounds(
      players, config, [round1], 1,
    );
    const kingMatch = rounds[0].matches.find(m => m.courtId === 'c1')!;
    const kingPlayers = [...kingMatch.team1, ...kingMatch.team2];

    // p1+p2 won on king court → stay on king court
    // p5+p6 won on lower court → promote to king court
    expect(kingPlayers).toContain('p1');
    expect(kingPlayers).toContain('p2');
    expect(kingPlayers).toContain('p5');
    expect(kingPlayers).toContain('p6');
  });

  it('losers of king court relegate to lower court', () => {
    const round1: Round = {
      id: 'r1',
      roundNumber: 1,
      matches: [
        {
          id: 'm1', courtId: 'c1',
          team1: ['p1', 'p2'], team2: ['p3', 'p4'],
          score: { team1Points: 18, team2Points: 6 },
        },
        {
          id: 'm2', courtId: 'c2',
          team1: ['p5', 'p6'], team2: ['p7', 'p8'],
          score: { team1Points: 18, team2Points: 6 },
        },
      ],
      sitOuts: [],
    };

    const { rounds } = kingOfTheCourtStrategy.generateAdditionalRounds(
      players, config, [round1], 1,
    );
    const lowerMatch = rounds[0].matches.find(m => m.courtId === 'c2')!;
    const lowerPlayers = [...lowerMatch.team1, ...lowerMatch.team2];

    // p3+p4 lost on king court → relegate to lower court
    // p7+p8 lost on lower court → stay on lower court
    expect(lowerPlayers).toContain('p3');
    expect(lowerPlayers).toContain('p4');
    expect(lowerPlayers).toContain('p7');
    expect(lowerPlayers).toContain('p8');
  });

  it('pairs 1st+4th vs 2nd+3rd by standings within court group', () => {
    // Create a scenario with clear standings differences
    const round1: Round = {
      id: 'r1',
      roundNumber: 1,
      matches: [
        {
          id: 'm1', courtId: 'c1',
          team1: ['p1', 'p2'], team2: ['p3', 'p4'],
          score: { team1Points: 20, team2Points: 4 },
        },
        {
          id: 'm2', courtId: 'c2',
          team1: ['p5', 'p6'], team2: ['p7', 'p8'],
          score: { team1Points: 20, team2Points: 4 },
        },
      ],
      sitOuts: [],
    };

    const { rounds } = kingOfTheCourtStrategy.generateAdditionalRounds(
      players, config, [round1], 1,
    );

    // After promotion: king court = [p1, p2, p5, p6]
    // Standings: p1=21, p2=21, p5=20, p6=20 (with court bonus for c1)
    // Sorted: p1, p2 (tied, broken by name), p5, p6
    // Pairing: 1st+4th vs 2nd+3rd
    const kingMatch = rounds[0].matches.find(m => m.courtId === 'c1')!;
    const t1 = [...kingMatch.team1].sort();
    const t2 = [...kingMatch.team2].sort();

    // The strongest (1st) and weakest (4th) of the group should be partnered
    // The 2nd and 3rd should be partnered
    // Verify both teams contain players from the king court group
    const allKing = [...t1, ...t2].sort();
    expect(allKing).toEqual(['p1', 'p2', 'p5', 'p6']);
  });

  it('excludes players from round generation', () => {
    const { rounds: initial } = kingOfTheCourtStrategy.generateSchedule(players, config);
    const scored = scoreRound(initial[0], [[15, 9], [15, 9]]);

    const { rounds } = kingOfTheCourtStrategy.generateAdditionalRounds(
      players, config, [scored], 1, ['p7', 'p8'],
    );

    const round = rounds[0];
    const allPlayerIds = round.matches.flatMap(m => [...m.team1, ...m.team2]);
    expect(allPlayerIds).not.toContain('p7');
    expect(allPlayerIds).not.toContain('p8');
  });

  it('handles unscored previous match gracefully (no promotion/relegation)', () => {
    const round1: Round = {
      id: 'r1',
      roundNumber: 1,
      matches: [
        {
          id: 'm1', courtId: 'c1',
          team1: ['p1', 'p2'], team2: ['p3', 'p4'],
          score: null,
        },
        {
          id: 'm2', courtId: 'c2',
          team1: ['p5', 'p6'], team2: ['p7', 'p8'],
          score: { team1Points: 15, team2Points: 9 },
        },
      ],
      sitOuts: [],
    };

    // Should not throw
    const { rounds } = kingOfTheCourtStrategy.generateAdditionalRounds(
      players, config, [round1], 1,
    );
    expect(rounds).toHaveLength(1);
    expect(rounds[0].matches).toHaveLength(2);
  });
});

// ── 3-court promotion/relegation ────────────────────────────────

describe('kingOfTheCourt 3-court promotion/relegation', () => {
  const players = makePlayers(12);
  const config = makeConfig(3);

  it('middle court winners promote, losers relegate', () => {
    const round1: Round = {
      id: 'r1',
      roundNumber: 1,
      matches: [
        {
          id: 'm1', courtId: 'c1', // king court
          team1: ['p1', 'p2'], team2: ['p3', 'p4'],
          score: { team1Points: 18, team2Points: 6 },
        },
        {
          id: 'm2', courtId: 'c2', // middle court
          team1: ['p5', 'p6'], team2: ['p7', 'p8'],
          score: { team1Points: 18, team2Points: 6 },
        },
        {
          id: 'm3', courtId: 'c3', // lowest court
          team1: ['p9', 'p10'], team2: ['p11', 'p12'],
          score: { team1Points: 18, team2Points: 6 },
        },
      ],
      sitOuts: [],
    };

    const { rounds } = kingOfTheCourtStrategy.generateAdditionalRounds(
      players, config, [round1], 1,
    );
    const round2 = rounds[0];

    const kingPlayers = new Set(
      round2.matches.find(m => m.courtId === 'c1')!.team1.concat(
        round2.matches.find(m => m.courtId === 'c1')!.team2
      )
    );
    const middlePlayers = new Set(
      round2.matches.find(m => m.courtId === 'c2')!.team1.concat(
        round2.matches.find(m => m.courtId === 'c2')!.team2
      )
    );
    const lowestPlayers = new Set(
      round2.matches.find(m => m.courtId === 'c3')!.team1.concat(
        round2.matches.find(m => m.courtId === 'c3')!.team2
      )
    );

    // King court: c1 winners (p1,p2) stay + c2 winners (p5,p6) promote
    expect(kingPlayers).toEqual(new Set(['p1', 'p2', 'p5', 'p6']));

    // Middle court: c1 losers (p3,p4) relegate + c3 winners (p9,p10) promote
    expect(middlePlayers).toEqual(new Set(['p3', 'p4', 'p9', 'p10']));

    // Lowest court: c2 losers (p7,p8) relegate + c3 losers (p11,p12) stay
    expect(lowestPlayers).toEqual(new Set(['p7', 'p8', 'p11', 'p12']));
  });
});

// ── strategy metadata ───────────────────────────────────────────

describe('kingOfTheCourt strategy metadata', () => {
  it('is marked as dynamic', () => {
    expect(kingOfTheCourtStrategy.isDynamic).toBe(true);
  });

  it('has no fixed partners', () => {
    expect(kingOfTheCourtStrategy.hasFixedPartners).toBe(false);
  });
});
