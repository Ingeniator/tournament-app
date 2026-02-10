import { describe, it, expect } from 'vitest';
import { americanoStrategy } from './americano';
import { partnerKey } from './shared';
import type { Player, TournamentConfig } from '@padel/common';

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
}

function makeConfig(numCourts: number, maxRounds: number | null = null): TournamentConfig {
  return {
    format: 'americano',
    pointsPerMatch: 21,
    courts: Array.from({ length: numCourts }, (_, i) => ({ id: `c${i + 1}`, name: `Court ${i + 1}` })),
    maxRounds,
  };
}

/** Analyze a schedule for fairness metrics */
function analyzeSchedule(players: Player[], config: TournamentConfig, rounds: ReturnType<typeof americanoStrategy.generateSchedule>['rounds']) {
  const activePlayers = players;
  const numCourts = Math.min(config.courts.length, Math.floor(activePlayers.length / 4));
  const courtIds = config.courts.slice(0, numCourts).map(c => c.id);

  const gamesPlayed = new Map<string, number>();
  const sitOuts = new Map<string, number>();
  const partnerCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();
  const courtCounts = new Map<string, number>(); // "playerId:courtId" -> count

  for (const p of activePlayers) {
    gamesPlayed.set(p.id, 0);
    sitOuts.set(p.id, 0);
    for (const cId of courtIds) {
      courtCounts.set(`${p.id}:${cId}`, 0);
    }
  }

  for (const round of rounds) {
    for (const id of round.sitOuts) {
      sitOuts.set(id, (sitOuts.get(id) ?? 0) + 1);
    }
    for (const match of round.matches) {
      const allPlayers = [...match.team1, ...match.team2];
      for (const pid of allPlayers) {
        gamesPlayed.set(pid, (gamesPlayed.get(pid) ?? 0) + 1);
        courtCounts.set(`${pid}:${match.courtId}`, (courtCounts.get(`${pid}:${match.courtId}`) ?? 0) + 1);
      }
      const pk1 = partnerKey(match.team1[0], match.team1[1]);
      const pk2 = partnerKey(match.team2[0], match.team2[1]);
      partnerCounts.set(pk1, (partnerCounts.get(pk1) ?? 0) + 1);
      partnerCounts.set(pk2, (partnerCounts.get(pk2) ?? 0) + 1);
      for (const a of match.team1) {
        for (const b of match.team2) {
          const ok = partnerKey(a, b);
          opponentCounts.set(ok, (opponentCounts.get(ok) ?? 0) + 1);
        }
      }
    }
  }

  // Games balance
  const gamesArr = [...gamesPlayed.values()];
  const gamesMin = Math.min(...gamesArr);
  const gamesMax = Math.max(...gamesArr);

  // Sit-out balance
  const sitArr = [...sitOuts.values()];
  const sitMin = Math.min(...sitArr);
  const sitMax = Math.max(...sitArr);

  // Partner repeats
  let partnerRepeats = 0;
  for (const c of partnerCounts.values()) if (c > 1) partnerRepeats += c - 1;

  // Opponent spread
  const oppArr = [...opponentCounts.values()];
  const oppMin = oppArr.length > 0 ? Math.min(...oppArr) : 0;
  const oppMax = oppArr.length > 0 ? Math.max(...oppArr) : 0;

  // Court balance per court
  const courtSpreads: { courtId: string; min: number; max: number }[] = [];
  for (const cId of courtIds) {
    const counts = activePlayers.map(p => courtCounts.get(`${p.id}:${cId}`) ?? 0);
    courtSpreads.push({ courtId: cId, min: Math.min(...counts), max: Math.max(...counts) });
  }

  return { gamesMin, gamesMax, sitMin, sitMax, partnerRepeats, oppMin, oppMax, courtSpreads };
}

describe('americano distribution', () => {
  describe('8 players, 2 courts (no sit-outs)', () => {
    const players = makePlayers(8);
    const config = makeConfig(2, 7);

    it('generates the correct number of rounds', () => {
      const { rounds } = americanoStrategy.generateSchedule(players, config);
      expect(rounds).toHaveLength(7);
    });

    it('every player plays every round (no sit-outs)', () => {
      const { rounds } = americanoStrategy.generateSchedule(players, config);
      for (const round of rounds) {
        expect(round.sitOuts).toHaveLength(0);
        const playing = new Set(round.matches.flatMap(m => [...m.team1, ...m.team2]));
        expect(playing.size).toBe(8);
      }
    });

    it('has zero partner repeats', () => {
      const { rounds } = americanoStrategy.generateSchedule(players, config);
      const stats = analyzeSchedule(players, config, rounds);
      expect(stats.partnerRepeats).toBe(0);
    });

    it('has optimal opponent spread (≤1)', () => {
      const { rounds } = americanoStrategy.generateSchedule(players, config);
      const stats = analyzeSchedule(players, config, rounds);
      expect(stats.oppMax - stats.oppMin).toBeLessThanOrEqual(1);
    });

    it('court distribution improves over no optimization (spread ≤4)', () => {
      const { rounds } = americanoStrategy.generateSchedule(players, config);
      const stats = analyzeSchedule(players, config, rounds);
      for (const cs of stats.courtSpreads) {
        // 8p/2c/7r: ideal 3-4 per court. Partner/opponent constraints limit court optimization.
        expect(cs.max - cs.min).toBeLessThanOrEqual(4);
      }
    });

    it('each player plays exactly 7 games', () => {
      const { rounds } = americanoStrategy.generateSchedule(players, config);
      const stats = analyzeSchedule(players, config, rounds);
      expect(stats.gamesMin).toBe(7);
      expect(stats.gamesMax).toBe(7);
    });
  });

  describe('10 players, 2 courts (2 sit-outs per round)', () => {
    const players = makePlayers(10);
    const config = makeConfig(2, 9);

    it('generates the correct number of rounds', () => {
      const { rounds } = americanoStrategy.generateSchedule(players, config);
      expect(rounds).toHaveLength(9);
    });

    it('exactly 2 players sit out each round', () => {
      const { rounds } = americanoStrategy.generateSchedule(players, config);
      for (const round of rounds) {
        expect(round.sitOuts).toHaveLength(2);
        expect(round.matches).toHaveLength(2);
      }
    });

    it('games are balanced (spread ≤1)', () => {
      const { rounds } = americanoStrategy.generateSchedule(players, config);
      const stats = analyzeSchedule(players, config, rounds);
      // 2 courts × 4 players × 9 rounds = 72 slots / 10 players = 7.2 → 7 or 8
      expect(stats.gamesMax - stats.gamesMin).toBeLessThanOrEqual(1);
    });

    it('sit-outs are balanced (spread ≤1)', () => {
      const { rounds } = americanoStrategy.generateSchedule(players, config);
      const stats = analyzeSchedule(players, config, rounds);
      expect(stats.sitMax - stats.sitMin).toBeLessThanOrEqual(1);
    });

    it('has zero partner repeats', () => {
      const { rounds } = americanoStrategy.generateSchedule(players, config);
      const stats = analyzeSchedule(players, config, rounds);
      expect(stats.partnerRepeats).toBe(0);
    });

    it('has opponent spread ≤1', () => {
      const { rounds } = americanoStrategy.generateSchedule(players, config);
      const stats = analyzeSchedule(players, config, rounds);
      expect(stats.oppMax - stats.oppMin).toBeLessThanOrEqual(1);
    });

    it('has balanced court distribution (spread ≤3 per court)', () => {
      const { rounds } = americanoStrategy.generateSchedule(players, config);
      const stats = analyzeSchedule(players, config, rounds);
      for (const cs of stats.courtSpreads) {
        // 10p/2c/9r: ideal 3-4 per court. Stochastic algorithm within 500ms budget.
        expect(cs.max - cs.min).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('12 players, 3 courts (no sit-outs)', () => {
    const players = makePlayers(12);
    const config = makeConfig(3, 11);

    it('generates the correct number of rounds', () => {
      const { rounds } = americanoStrategy.generateSchedule(players, config);
      expect(rounds).toHaveLength(11);
    });

    it('no sit-outs', () => {
      const { rounds } = americanoStrategy.generateSchedule(players, config);
      for (const round of rounds) {
        expect(round.sitOuts).toHaveLength(0);
      }
    });

    it('each player plays all 11 games', () => {
      const { rounds } = americanoStrategy.generateSchedule(players, config);
      const stats = analyzeSchedule(players, config, rounds);
      expect(stats.gamesMin).toBe(11);
      expect(stats.gamesMax).toBe(11);
    });

    it('has zero partner repeats', () => {
      const { rounds } = americanoStrategy.generateSchedule(players, config);
      const stats = analyzeSchedule(players, config, rounds);
      expect(stats.partnerRepeats).toBe(0);
    });
  });

  describe('6 players, 1 court (2 sit-outs per round)', () => {
    const players = makePlayers(6);
    const config = makeConfig(1, 5);

    it('2 players sit out each round', () => {
      const { rounds } = americanoStrategy.generateSchedule(players, config);
      for (const round of rounds) {
        expect(round.sitOuts).toHaveLength(2);
        expect(round.matches).toHaveLength(1);
      }
    });

    it('games are balanced (spread ≤1)', () => {
      const { rounds } = americanoStrategy.generateSchedule(players, config);
      const stats = analyzeSchedule(players, config, rounds);
      expect(stats.gamesMax - stats.gamesMin).toBeLessThanOrEqual(1);
    });

    it('has zero partner repeats', () => {
      const { rounds } = americanoStrategy.generateSchedule(players, config);
      const stats = analyzeSchedule(players, config, rounds);
      expect(stats.partnerRepeats).toBe(0);
    });
  });

  describe('generateAdditionalRounds preserves history', () => {
    const players = makePlayers(8);
    const config = makeConfig(2, 7);

    it('additional rounds respect existing partner history', () => {
      const { rounds: initial } = americanoStrategy.generateSchedule(players, config);
      const scored = initial.slice(0, 3);
      const { rounds: additional } = americanoStrategy.generateAdditionalRounds(players, config, scored, 4);

      // Combine and check overall quality
      const allRounds = [...scored, ...additional];
      expect(allRounds).toHaveLength(7);

      const stats = analyzeSchedule(players, config, allRounds);
      // Should still achieve zero repeats for 8p/2c/7r
      expect(stats.partnerRepeats).toBe(0);
    });
  });

  describe('popular configurations: performance + quality', () => {
    // maxPartnerRepeats / maxOppSpread: realistic baselines per config
    // ≤3 courts use exhaustive enumeration (tight), 4+ courts use random sampling (looser)
    const cases: { players: number; courts: number; rounds: number; maxMs: number; maxPartnerRepeats: number; maxOppSpread: number; label: string }[] = [
      { players: 5,  courts: 1, rounds: 4,  maxMs: 600,  maxPartnerRepeats: 0, maxOppSpread: 2, label: '5p / 1c / 4r' },
      { players: 8,  courts: 2, rounds: 7,  maxMs: 600,  maxPartnerRepeats: 0, maxOppSpread: 2, label: '8p / 2c / 7r' },
      { players: 10, courts: 2, rounds: 9,  maxMs: 600,  maxPartnerRepeats: 0, maxOppSpread: 2, label: '10p / 2c / 9r' },
      { players: 12, courts: 2, rounds: 11, maxMs: 600,  maxPartnerRepeats: 0, maxOppSpread: 2, label: '12p / 2c / 11r' },
      { players: 12, courts: 3, rounds: 11, maxMs: 1200, maxPartnerRepeats: 0, maxOppSpread: 3, label: '12p / 3c / 11r' },
      { players: 15, courts: 3, rounds: 14, maxMs: 1200, maxPartnerRepeats: 0, maxOppSpread: 2, label: '15p / 3c / 14r' },
      { players: 16, courts: 4, rounds: 15, maxMs: 1500, maxPartnerRepeats: 5, maxOppSpread: 3, label: '16p / 4c / 15r' },
      { players: 20, courts: 4, rounds: 19, maxMs: 1500, maxPartnerRepeats: 0, maxOppSpread: 2, label: '20p / 4c / 19r' },
    ];

    for (const tc of cases) {
      describe(tc.label, () => {
        const players = makePlayers(tc.players);
        const config = makeConfig(tc.courts, tc.rounds);

        it(`completes under ${tc.maxMs}ms`, () => {
          const start = performance.now();
          americanoStrategy.generateSchedule(players, config);
          const elapsed = performance.now() - start;
          expect(elapsed).toBeLessThan(tc.maxMs);
        });

        it('generates correct round count', () => {
          const { rounds } = americanoStrategy.generateSchedule(players, config);
          expect(rounds).toHaveLength(tc.rounds);
        });

        it('games balanced (spread ≤ 1)', () => {
          const { rounds } = americanoStrategy.generateSchedule(players, config);
          const stats = analyzeSchedule(players, config, rounds);
          expect(stats.gamesMax - stats.gamesMin).toBeLessThanOrEqual(1);
        });

        it(`partner repeats ≤ ${tc.maxPartnerRepeats}`, () => {
          const { rounds } = americanoStrategy.generateSchedule(players, config);
          const stats = analyzeSchedule(players, config, rounds);
          expect(stats.partnerRepeats).toBeLessThanOrEqual(tc.maxPartnerRepeats);
        });

        it(`opponent spread ≤ ${tc.maxOppSpread}`, () => {
          const { rounds } = americanoStrategy.generateSchedule(players, config);
          const stats = analyzeSchedule(players, config, rounds);
          expect(stats.oppMax - stats.oppMin).toBeLessThanOrEqual(tc.maxOppSpread);
        });
      });
    }
  });
});
