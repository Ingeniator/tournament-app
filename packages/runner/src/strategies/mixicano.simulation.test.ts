import { describe, it, expect } from 'vitest';
import { mixicanoStrategy } from './mixicano';
import { makeMixicanoPlayers, makeConfig, simulateDynamic, analyzeSchedule, assertRoundInvariants } from './simulation-helpers';
import type { Round } from '@padel/common';

const TRIALS = 10;

/** Verify every team in every match is cross-group (one A + one B player) */
function assertCrossGroupPartners(players: ReturnType<typeof makeMixicanoPlayers>, rounds: Round[]) {
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
        assertRoundInvariants(players, rounds);

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

    it('game spread ≤ 1, sit-out spread ≤ 1, always cross-group', () => {
      let worstGameSpread = 0;
      let worstSitSpread = 0;

      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(mixicanoStrategy, players, config, numRounds);
        expect(rounds).toHaveLength(numRounds);
        assertRoundInvariants(players, rounds);

        const stats = analyzeSchedule(players, rounds);
        worstGameSpread = Math.max(worstGameSpread, stats.gamesMax - stats.gamesMin);
        worstSitSpread = Math.max(worstSitSpread, stats.sitMax - stats.sitMin);

        assertCrossGroupPartners(players, rounds);
      }

      expect(worstGameSpread).toBeLessThanOrEqual(1);
      expect(worstSitSpread).toBeLessThanOrEqual(1);
    });
  });

  describe('5A+5B / 2c / 9r', () => {
    const players = makeMixicanoPlayers(5, 5);
    const config = makeConfig('mixicano', 2);
    const numRounds = 9;

    it('game spread ≤ 1, sit-out spread ≤ 1', () => {
      let worstGameSpread = 0;
      let worstSitSpread = 0;

      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(mixicanoStrategy, players, config, numRounds);
        expect(rounds).toHaveLength(numRounds);
        assertRoundInvariants(players, rounds);

        const stats = analyzeSchedule(players, rounds);
        worstGameSpread = Math.max(worstGameSpread, stats.gamesMax - stats.gamesMin);
        worstSitSpread = Math.max(worstSitSpread, stats.sitMax - stats.sitMin);

        assertCrossGroupPartners(players, rounds);
      }

      expect(worstGameSpread).toBeLessThanOrEqual(1);
      expect(worstSitSpread).toBeLessThanOrEqual(1);
    });
  });

  describe('3A+2B / 1c / 5r (unequal groups)', () => {
    const players = makeMixicanoPlayers(3, 2);
    const config = makeConfig('mixicano', 1);
    const numRounds = 5;

    it('runs correctly, cross-group partners, group A absorbs all sit-outs', () => {
      const groupAIds = new Set(players.filter(p => p.group === 'A').map(p => p.id));
      const groupBIds = new Set(players.filter(p => p.group === 'B').map(p => p.id));

      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(mixicanoStrategy, players, config, numRounds);
        expect(rounds.length).toBeGreaterThan(0);
        assertRoundInvariants(players, rounds);
        assertCrossGroupPartners(players, rounds);

        // With 3A+2B and 1 court (needs 2A+2B), 1 group-A player must sit out
        // each round. Group B should never sit out.
        for (const round of rounds) {
          for (const pid of round.sitOuts) {
            expect(groupAIds.has(pid)).toBe(true);
            expect(groupBIds.has(pid)).toBe(false);
          }
        }
      }
    });
  });
});
