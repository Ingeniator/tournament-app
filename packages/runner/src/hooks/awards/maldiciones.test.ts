import { describe, it, expect } from 'vitest';
import type { Tournament, Match, Round, MatchCurse } from '@padel/common';
import { computeMaldicionesAwards } from './maldiciones';

// ---- Helpers ----

function makePlayers(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
  }));
}

function curse(cardId: string, castBy: 'team1' | 'team2', targetPlayerId: string, shielded = false): MatchCurse {
  return { cardId, castBy, targetPlayerId, shielded };
}

function match(
  team1: [string, string],
  team2: [string, string],
  t1Points: number,
  t2Points: number,
  matchCurse?: MatchCurse,
): Match {
  return {
    id: `m-${Math.random().toString(36).slice(2, 8)}`,
    courtId: 'c1',
    team1,
    team2,
    score: { team1Points: t1Points, team2Points: t2Points },
    curse: matchCurse,
  };
}

function round(roundNumber: number, matches: Match[]): Round {
  return { id: `r${roundNumber}`, roundNumber, matches, sitOuts: [] };
}

function makeTournament(rounds: Round[], format: string = 'americano'): Tournament {
  return {
    id: 't1',
    name: 'Test',
    config: {
      format: format as Tournament['config']['format'],
      pointsPerMatch: 24,
      courts: [{ id: 'c1', name: 'Court 1' }],
      maxRounds: null,
      maldiciones: { enabled: true, chaosLevel: 'hardcore' as const },
    },
    phase: 'completed',
    players: makePlayers(8),
    rounds,
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function findAward(awards: ReturnType<typeof computeMaldicionesAwards>, id: string) {
  return awards.find(a => a.id === id);
}

// ---- Tests ----

describe('computeMaldicionesAwards', () => {
  it('returns empty when maldiciones not enabled', () => {
    const t = makeTournament([]);
    t.config.maldiciones = undefined;
    expect(computeMaldicionesAwards(t)).toEqual([]);
  });

  it('returns empty when no scored rounds', () => {
    const t = makeTournament([]);
    expect(computeMaldicionesAwards(t)).toEqual([]);
  });

  it('returns empty when no curses were cast', () => {
    const t = makeTournament([
      round(1, [match(['p1', 'p2'], ['p3', 'p4'], 12, 10)]),
      round(2, [match(['p1', 'p3'], ['p2', 'p4'], 14, 10)]),
    ]);
    expect(computeMaldicionesAwards(t)).toEqual([]);
  });

  describe('el-brujo', () => {
    it('awards when a pair has 2+ effective curses', () => {
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 14, 10, curse('los-mudos', 'team1', 'p3'))]),
        round(2, [match(['p1', 'p2'], ['p5', 'p6'], 16, 8, curse('el-espejo', 'team1', 'p5'))]),
      ]);
      const award = findAward(computeMaldicionesAwards(t), 'el-brujo');
      expect(award).toBeTruthy();
      expect(award!.stat).toBe('2 effective curses');
      expect(award!.playerNames[0]).toContain('Player 1');
      expect(award!.playerNames[0]).toContain('Player 2');
    });

    it('does not award with only 1 effective curse', () => {
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 14, 10, curse('los-mudos', 'team1', 'p3'))]),
        round(2, [match(['p1', 'p2'], ['p5', 'p6'], 8, 16, curse('el-espejo', 'team1', 'p5'))]), // caster lost
      ]);
      expect(findAward(computeMaldicionesAwards(t), 'el-brujo')).toBeUndefined();
    });

    it('does not count shielded curses as effective', () => {
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 14, 10, curse('los-mudos', 'team1', 'p3', true))]),
        round(2, [match(['p1', 'p2'], ['p5', 'p6'], 16, 8, curse('el-espejo', 'team1', 'p5', true))]),
      ]);
      expect(findAward(computeMaldicionesAwards(t), 'el-brujo')).toBeUndefined();
    });
  });

  describe('el-superviviente', () => {
    it('awards when a pair wins 2+ games while cursed', () => {
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 16, 8, curse('los-mudos', 'team2', 'p1'))]),  // p1&p2 cursed but won (t1 wins)
        round(2, [match(['p1', 'p2'], ['p5', 'p6'], 14, 10, curse('el-espejo', 'team2', 'p2'))]), // p1&p2 cursed but won
      ]);
      const award = findAward(computeMaldicionesAwards(t), 'el-superviviente');
      expect(award).toBeTruthy();
      expect(award!.stat).toBe('2 wins under a curse');
    });

    it('does not award when cursed pair lost', () => {
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 8, 16, curse('los-mudos', 'team2', 'p1'))]),  // cursed and lost
        round(2, [match(['p1', 'p2'], ['p5', 'p6'], 10, 14, curse('el-espejo', 'team2', 'p2'))]), // cursed and lost
      ]);
      expect(findAward(computeMaldicionesAwards(t), 'el-superviviente')).toBeUndefined();
    });
  });

  describe('escudo-de-oro', () => {
    it('awards with 1 shield block', () => {
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 12, 12, curse('los-mudos', 'team1', 'p3', true))]),
      ]);
      const award = findAward(computeMaldicionesAwards(t), 'escudo-de-oro');
      expect(award).toBeTruthy();
      expect(award!.stat).toBe('1 block(s)');
    });

    it('does not award when no shields used', () => {
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 14, 10, curse('los-mudos', 'team1', 'p3'))]),
      ]);
      expect(findAward(computeMaldicionesAwards(t), 'escudo-de-oro')).toBeUndefined();
    });
  });

  describe('el-maldito', () => {
    it('awards when a pair receives 2+ curses', () => {
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 14, 10, curse('los-mudos', 'team1', 'p3'))]),
        round(2, [match(['p5', 'p6'], ['p3', 'p4'], 12, 10, curse('el-espejo', 'team1', 'p4'))]),
      ]);
      const award = findAward(computeMaldicionesAwards(t), 'el-maldito');
      expect(award).toBeTruthy();
      expect(award!.stat).toBe('2 curses received');
      expect(award!.playerNames[0]).toContain('Player 3');
      expect(award!.playerNames[0]).toContain('Player 4');
    });

    it('does not award with only 1 curse received', () => {
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 14, 10, curse('los-mudos', 'team1', 'p3'))]),
      ]);
      expect(findAward(computeMaldicionesAwards(t), 'el-maldito')).toBeUndefined();
    });

    it('counts shielded curses as received', () => {
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 14, 10, curse('los-mudos', 'team1', 'p3', true))]),
        round(2, [match(['p5', 'p6'], ['p3', 'p4'], 12, 10, curse('el-espejo', 'team1', 'p4'))]),
      ]);
      const award = findAward(computeMaldicionesAwards(t), 'el-maldito');
      expect(award).toBeTruthy();
      expect(award!.stat).toBe('2 curses received');
    });
  });

  describe('el-inmune', () => {
    it('awards when a pair wins 3 consecutive cursed games', () => {
      // p1&p2 are victims each time but win all 3
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 14, 10, curse('los-mudos', 'team2', 'p1'))]),
        round(2, [match(['p1', 'p2'], ['p5', 'p6'], 16, 8, curse('el-espejo', 'team2', 'p2'))]),
        round(3, [match(['p1', 'p2'], ['p7', 'p8'], 12, 10, curse('slow-motion', 'team2', 'p1'))]),
      ]);
      const award = findAward(computeMaldicionesAwards(t), 'el-inmune');
      expect(award).toBeTruthy();
      expect(award!.stat).toBe('3 consecutive cursed wins');
    });

    it('does not award with only 2 consecutive cursed wins', () => {
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 14, 10, curse('los-mudos', 'team2', 'p1'))]),
        round(2, [match(['p1', 'p2'], ['p5', 'p6'], 16, 8, curse('el-espejo', 'team2', 'p2'))]),
      ]);
      expect(findAward(computeMaldicionesAwards(t), 'el-inmune')).toBeUndefined();
    });

    it('streak resets when cursed pair loses', () => {
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 14, 10, curse('los-mudos', 'team2', 'p1'))]),
        round(2, [match(['p1', 'p2'], ['p5', 'p6'], 16, 8, curse('el-espejo', 'team2', 'p2'))]),
        round(3, [match(['p1', 'p2'], ['p7', 'p8'], 8, 16, curse('slow-motion', 'team2', 'p1'))]), // lost
        round(4, [match(['p1', 'p2'], ['p3', 'p4'], 14, 10, curse('mano-muerta', 'team2', 'p1'))]),
        round(5, [match(['p1', 'p2'], ['p5', 'p6'], 14, 10, curse('el-fantasma', 'team2', 'p2'))]),
      ]);
      // Max consecutive was 2, then reset, then 2 again — never reached 3
      expect(findAward(computeMaldicionesAwards(t), 'el-inmune')).toBeUndefined();
    });
  });

  describe('el-resistente', () => {
    it('awards best win rate while cursed (min 2 games)', () => {
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 14, 10, curse('los-mudos', 'team2', 'p1'))]), // victim won
        round(2, [match(['p1', 'p2'], ['p5', 'p6'], 16, 8, curse('el-espejo', 'team2', 'p2'))]),  // victim won
        round(3, [match(['p1', 'p2'], ['p7', 'p8'], 8, 16, curse('slow-motion', 'team2', 'p1'))]), // victim lost
      ]);
      const award = findAward(computeMaldicionesAwards(t), 'el-resistente');
      expect(award).toBeTruthy();
      expect(award!.stat).toBe('2/3 wins (67%)');
    });

    it('does not award with fewer than 2 cursed games', () => {
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 14, 10, curse('los-mudos', 'team2', 'p1'))]),
      ]);
      expect(findAward(computeMaldicionesAwards(t), 'el-resistente')).toBeUndefined();
    });

    it('does not count shielded games toward cursed games played', () => {
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 14, 10, curse('los-mudos', 'team2', 'p1', true))]),  // shielded
        round(2, [match(['p1', 'p2'], ['p5', 'p6'], 16, 8, curse('el-espejo', 'team2', 'p2'))]),          // 1 non-shielded
      ]);
      // Only 1 non-shielded cursed game — below threshold of 2
      expect(findAward(computeMaldicionesAwards(t), 'el-resistente')).toBeUndefined();
    });
  });

  describe('karma', () => {
    it('awards when a pair has 2+ backfired curses', () => {
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 8, 16, curse('los-mudos', 'team1', 'p3'))]),  // p1&p2 cast, lost
        round(2, [match(['p1', 'p2'], ['p5', 'p6'], 10, 14, curse('el-espejo', 'team1', 'p5'))]), // p1&p2 cast, lost
      ]);
      const award = findAward(computeMaldicionesAwards(t), 'karma');
      expect(award).toBeTruthy();
      expect(award!.stat).toBe('2 curses backfired');
    });

    it('does not award with only 1 backfire', () => {
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 8, 16, curse('los-mudos', 'team1', 'p3'))]),
      ]);
      expect(findAward(computeMaldicionesAwards(t), 'karma')).toBeUndefined();
    });
  });

  describe('el-intocable', () => {
    it('awards when exactly 1 pair played 3+ games with 0 curses received', () => {
      // p1&p2 cast curses (team1) in all 3 games — they are casters, never victims
      // Each opponent pair only plays 1 game so none reach the 3-game threshold
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 14, 10, curse('los-mudos', 'team1', 'p3'))]),
        round(2, [match(['p1', 'p2'], ['p5', 'p6'], 16, 8, curse('el-espejo', 'team1', 'p5'))]),
        round(3, [match(['p1', 'p2'], ['p7', 'p8'], 12, 10, curse('slow-motion', 'team1', 'p7'))]),
      ]);
      const award = findAward(computeMaldicionesAwards(t), 'el-intocable');
      expect(award).toBeTruthy();
      expect(award!.playerNames[0]).toContain('Player 1');
      expect(award!.stat).toContain('3 games, 0 curses received');
    });

    it('does not award when multiple pairs qualify', () => {
      // Both p1&p2 and p3&p4 play 3+ games with 0 curses
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p5', 'p6'], 14, 10)]),
        round(2, [match(['p1', 'p2'], ['p7', 'p8'], 16, 8)]),
        round(3, [match(['p1', 'p2'], ['p5', 'p6'], 12, 12)]),
        round(4, [match(['p3', 'p4'], ['p5', 'p6'], 14, 10)]),
        round(5, [match(['p3', 'p4'], ['p7', 'p8'], 16, 8)]),
        round(6, [match(['p3', 'p4'], ['p5', 'p6'], 12, 12)]),
      ]);
      expect(findAward(computeMaldicionesAwards(t), 'el-intocable')).toBeUndefined();
    });

    it('does not award when pair has fewer than 3 games', () => {
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p5', 'p6'], 14, 10)]),
        round(2, [match(['p1', 'p2'], ['p7', 'p8'], 16, 8)]),
      ]);
      expect(findAward(computeMaldicionesAwards(t), 'el-intocable')).toBeUndefined();
    });
  });

  describe('rotating partners (americano format)', () => {
    it('tracks by ad-hoc pair key, not fixed team id', () => {
      // p1&p2 cast effective curses in 2 different rounds with same pair
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 14, 10, curse('los-mudos', 'team1', 'p3'))]),
        round(2, [match(['p2', 'p1'], ['p5', 'p6'], 16, 8, curse('el-espejo', 'team1', 'p5'))]), // reversed order
      ], 'americano');
      const award = findAward(computeMaldicionesAwards(t), 'el-brujo');
      expect(award).toBeTruthy();
      expect(award!.stat).toBe('2 effective curses');
    });

    it('treats different pair compositions as separate keys', () => {
      // p1 plays with p2, then p1 plays with p3 — these are different pairs
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p5', 'p6'], 14, 10, curse('los-mudos', 'team1', 'p5'))]),
        round(2, [match(['p1', 'p3'], ['p7', 'p8'], 16, 8, curse('el-espejo', 'team1', 'p7'))]),
      ], 'americano');
      // Each pair only has 1 effective curse, below threshold of 2
      expect(findAward(computeMaldicionesAwards(t), 'el-brujo')).toBeUndefined();
    });
  });

  describe('fixed partners (team-americano format)', () => {
    it('uses team id when teams are defined', () => {
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 14, 10, curse('los-mudos', 'team1', 'p3'))]),
        round(2, [match(['p1', 'p2'], ['p5', 'p6'], 16, 8, curse('el-espejo', 'team1', 'p5'))]),
      ], 'team-americano');
      t.teams = [
        { id: 'team-a', player1Id: 'p1', player2Id: 'p2', name: 'Los Lobos' },
        { id: 'team-b', player1Id: 'p3', player2Id: 'p4', name: 'Las Aguilas' },
        { id: 'team-c', player1Id: 'p5', player2Id: 'p6', name: 'Los Tigres' },
        { id: 'team-d', player1Id: 'p7', player2Id: 'p8', name: 'Las Panteras' },
      ];
      const award = findAward(computeMaldicionesAwards(t), 'el-brujo');
      expect(award).toBeTruthy();
      expect(award!.playerNames[0]).toBe('Los Lobos');
    });
  });

  describe('all awards together', () => {
    it('generates multiple awards from a rich tournament', () => {
      const t = makeTournament([
        // p1&p2 cast 3 effective curses (el-brujo candidate)
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 14, 10, curse('los-mudos', 'team1', 'p3'))]),
        round(2, [match(['p1', 'p2'], ['p5', 'p6'], 16, 8, curse('el-espejo', 'team1', 'p5'))]),
        round(3, [match(['p1', 'p2'], ['p7', 'p8'], 18, 6, curse('slow-motion', 'team1', 'p7'))]),
        // p3&p4 receive 2 curses above + 1 more below (el-maldito candidate, 3 total)
        round(4, [match(['p5', 'p6'], ['p3', 'p4'], 12, 10, curse('mano-muerta', 'team1', 'p3'))]),
        // p7&p8 use shield (escudo-de-oro)
        round(5, [match(['p5', 'p6'], ['p7', 'p8'], 10, 14, curse('el-fantasma', 'team1', 'p7', true))]),
      ]);
      const awards = computeMaldicionesAwards(t);
      expect(findAward(awards, 'el-brujo')).toBeTruthy();
      expect(findAward(awards, 'el-maldito')).toBeTruthy();
      expect(findAward(awards, 'escudo-de-oro')).toBeTruthy();
    });

    it('every award has required fields', () => {
      const t = makeTournament([
        round(1, [match(['p1', 'p2'], ['p3', 'p4'], 14, 10, curse('los-mudos', 'team1', 'p3'))]),
        round(2, [match(['p1', 'p2'], ['p5', 'p6'], 16, 8, curse('el-espejo', 'team1', 'p5'))]),
        round(3, [match(['p5', 'p6'], ['p3', 'p4'], 12, 10, curse('mano-muerta', 'team1', 'p3'))]),
      ]);
      for (const award of computeMaldicionesAwards(t)) {
        expect(award.id).toBeTruthy();
        expect(award.title).toBeTruthy();
        expect(award.emoji).toBeTruthy();
        expect(award.description).toBeTruthy();
        expect(award.playerNames.length).toBeGreaterThanOrEqual(1);
        expect(award.stat).toBeTruthy();
      }
    });
  });
});
