import { describe, it, expect } from 'vitest';
import { kingOfTheCourtStrategy } from './kingOfTheCourt';
import { makePlayers, makeConfig, simulateDynamic, analyzeSchedule, assertRoundInvariants } from './simulation-helpers.test-utils';

const TRIALS = 10;

describe('king-of-the-court simulation', () => {
  describe('8p / 2c / 7r', () => {
    const players = makePlayers(8);
    const config = makeConfig('king-of-the-court', 2);
    const numRounds = 7;

    it('games = 7 each, no sit-outs, winners promote to higher court', () => {
      let promotionWorked = 0;

      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(kingOfTheCourtStrategy, players, config, numRounds);
        expect(rounds).toHaveLength(numRounds);
        assertRoundInvariants(players, rounds);

        const stats = analyzeSchedule(players, rounds);
        expect(stats.gamesMin).toBe(7);
        expect(stats.gamesMax).toBe(7);
        expect(stats.sitMin).toBe(0);
        expect(stats.sitMax).toBe(0);

        // After deterministic scoring (lower ID = stronger), stronger players
        // should tend to cluster on court c1 (king court) by the last round.
        const lastRound = rounds[rounds.length - 1];
        const court1Match = lastRound.matches.find(m => m.courtId === 'c1');
        const court2Match = lastRound.matches.find(m => m.courtId === 'c2');
        expect(court1Match).toBeDefined();
        expect(court2Match).toBeDefined();

        const avgRank = (match: typeof court1Match) => {
          if (!match) return 999;
          const ids = [...match.team1, ...match.team2];
          return ids.reduce((sum, id) => sum + parseInt(id.replace(/\D/g, '')), 0) / ids.length;
        };

        if (avgRank(court1Match) <= avgRank(court2Match)) {
          promotionWorked++;
        }
      }

      // Promotion should work in most trials (randomized R1 can occasionally prevent perfect sorting)
      expect(promotionWorked).toBeGreaterThanOrEqual(Math.floor(TRIALS * 0.7));
    });
  });

  describe('12p / 3c / 7r', () => {
    const players = makePlayers(12);
    const config = makeConfig('king-of-the-court', 3);
    const numRounds = 7;

    it('games = 7 each, no sit-outs', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(kingOfTheCourtStrategy, players, config, numRounds);
        expect(rounds).toHaveLength(numRounds);
        assertRoundInvariants(players, rounds);

        const stats = analyzeSchedule(players, rounds);
        expect(stats.gamesMin).toBe(7);
        expect(stats.gamesMax).toBe(7);
        expect(stats.sitMin).toBe(0);
        expect(stats.sitMax).toBe(0);
      }
    });
  });

  describe('6p / 1c / 5r', () => {
    const players = makePlayers(6);
    const config = makeConfig('king-of-the-court', 1);
    const numRounds = 5;

    it('sit-outs spread ≤ 1', () => {
      let worstSitSpread = 0;

      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(kingOfTheCourtStrategy, players, config, numRounds);
        expect(rounds).toHaveLength(numRounds);
        assertRoundInvariants(players, rounds);

        const stats = analyzeSchedule(players, rounds);
        worstSitSpread = Math.max(worstSitSpread, stats.sitMax - stats.sitMin);
      }

      expect(worstSitSpread).toBeLessThanOrEqual(1);
    });
  });
});
