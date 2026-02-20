import { describe, it, expect } from 'vitest';
import { mexicanoStrategy } from './mexicano';
import { makePlayers, makeConfig, simulateDynamic, analyzeSchedule, assertRoundInvariants } from './simulation-helpers';

const TRIALS = 10;

describe('mexicano simulation', () => {
  describe('8p / 2c / 7r', () => {
    const players = makePlayers(8);
    const config = makeConfig('mexicano', 2);
    const numRounds = 7;

    it('games = 7 each, no sit-outs, partner repeats within bounds', () => {
      let worstPartnerRepeats = 0;

      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(mexicanoStrategy, players, config, numRounds);
        expect(rounds).toHaveLength(numRounds);
        assertRoundInvariants(players, rounds);

        const stats = analyzeSchedule(players, rounds);
        expect(stats.gamesMin).toBe(7);
        expect(stats.gamesMax).toBe(7);
        expect(stats.sitMin).toBe(0);
        expect(stats.sitMax).toBe(0);
        worstPartnerRepeats = Math.max(worstPartnerRepeats, stats.partnerRepeats);
      }

      // Mexicano's standings-based pairing (1st+4th vs 2nd+3rd) naturally
      // repeats partnerships when standings stabilize with deterministic scoring.
      expect(worstPartnerRepeats).toBeLessThanOrEqual(20);
    });
  });

  describe('6p / 1c / 5r', () => {
    const players = makePlayers(6);
    const config = makeConfig('mexicano', 1);
    const numRounds = 5;

    it('games spread ≤ 1, sit-out spread ≤ 1', () => {
      let worstGameSpread = 0;
      let worstSitSpread = 0;

      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(mexicanoStrategy, players, config, numRounds);
        expect(rounds).toHaveLength(numRounds);
        assertRoundInvariants(players, rounds);

        const stats = analyzeSchedule(players, rounds);
        worstGameSpread = Math.max(worstGameSpread, stats.gamesMax - stats.gamesMin);
        worstSitSpread = Math.max(worstSitSpread, stats.sitMax - stats.sitMin);
      }

      expect(worstGameSpread).toBeLessThanOrEqual(1);
      expect(worstSitSpread).toBeLessThanOrEqual(1);
    });
  });

  describe('10p / 2c / 9r', () => {
    const players = makePlayers(10);
    const config = makeConfig('mexicano', 2);
    const numRounds = 9;

    it('games spread ≤ 1, sit-out spread ≤ 1', () => {
      let worstGameSpread = 0;
      let worstSitSpread = 0;

      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(mexicanoStrategy, players, config, numRounds);
        expect(rounds).toHaveLength(numRounds);
        assertRoundInvariants(players, rounds);

        const stats = analyzeSchedule(players, rounds);
        worstGameSpread = Math.max(worstGameSpread, stats.gamesMax - stats.gamesMin);
        worstSitSpread = Math.max(worstSitSpread, stats.sitMax - stats.sitMin);
      }

      expect(worstGameSpread).toBeLessThanOrEqual(1);
      expect(worstSitSpread).toBeLessThanOrEqual(1);
    });
  });

  describe('12p / 3c / 7r', () => {
    const players = makePlayers(12);
    const config = makeConfig('mexicano', 3);
    const numRounds = 7;

    it('games = 7 each, no sit-outs', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(mexicanoStrategy, players, config, numRounds);
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
});
