import { describe, it, expect } from 'vitest';
import { mixicanoStrategy } from './mixicano';
import { makeMixicanoPlayers, makeConfig, simulateDynamic, analyzeSchedule } from './simulation-helpers';

const TRIALS = 10;

/** Verify every team in every match is cross-group (one A + one B player) */
function assertCrossGroupPartners(players: ReturnType<typeof makeMixicanoPlayers>, rounds: { matches: { team1: [string, string]; team2: [string, string] }[] }[]) {
  const groupOf = new Map(players.map(p => [p.id, p.group]));

  for (const round of rounds) {
    for (const match of round.matches) {
      for (const team of [match.team1, match.team2]) {
        const g0 = groupOf.get(team[0]);
        const g1 = groupOf.get(team[1]);
        expect(g0).toBeDefined();
        expect(g1).toBeDefined();
        expect(g0).not.toBe(g1);
      }
    }
  }
}

describe('mixicano simulation', () => {
  describe('4A+4B / 2c / 7r', () => {
    const players = makeMixicanoPlayers(4, 4);
    const config = makeConfig('mixicano', 2);
    const numRounds = 7;

    it('games balanced, partners always cross-group', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(mixicanoStrategy, players, config, numRounds);
        expect(rounds).toHaveLength(numRounds);

        const stats = analyzeSchedule(players, rounds);
        expect(stats.gamesMin).toBe(7);
        expect(stats.gamesMax).toBe(7);
        expect(stats.sitMin).toBe(0);
        expect(stats.sitMax).toBe(0);

        assertCrossGroupPartners(players, rounds);
      }
    });
  });

  describe('3A+3B / 1c / 5r', () => {
    const players = makeMixicanoPlayers(3, 3);
    const config = makeConfig('mixicano', 1);
    const numRounds = 5;

    it('sit-outs spread ≤ 1, always cross-group', () => {
      let worstSitSpread = 0;

      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(mixicanoStrategy, players, config, numRounds);
        expect(rounds).toHaveLength(numRounds);

        const stats = analyzeSchedule(players, rounds);
        worstSitSpread = Math.max(worstSitSpread, stats.sitMax - stats.sitMin);

        assertCrossGroupPartners(players, rounds);
      }

      expect(worstSitSpread).toBeLessThanOrEqual(1);
    });
  });

  describe('5A+5B / 2c / 9r', () => {
    const players = makeMixicanoPlayers(5, 5);
    const config = makeConfig('mixicano', 2);
    const numRounds = 9;

    it('sit-outs spread ≤ 1', () => {
      let worstSitSpread = 0;

      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(mixicanoStrategy, players, config, numRounds);
        expect(rounds).toHaveLength(numRounds);

        const stats = analyzeSchedule(players, rounds);
        worstSitSpread = Math.max(worstSitSpread, stats.sitMax - stats.sitMin);

        assertCrossGroupPartners(players, rounds);
      }

      expect(worstSitSpread).toBeLessThanOrEqual(1);
    });
  });

  describe('3A+2B / 1c / 5r (unequal groups)', () => {
    const players = makeMixicanoPlayers(3, 2);
    const config = makeConfig('mixicano', 1);
    const numRounds = 5;

    it('runs without error, cross-group partners maintained', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(mixicanoStrategy, players, config, numRounds);
        expect(rounds.length).toBeGreaterThan(0);

        assertCrossGroupPartners(players, rounds);
      }
    });
  });
});
