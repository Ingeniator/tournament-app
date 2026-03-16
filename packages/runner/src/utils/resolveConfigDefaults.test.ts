import { describe, it, expect } from 'vitest';
import { resolveConfigDefaults, computeSitOutInfo } from '@padel/common';
import type { TournamentConfig } from '@padel/common';

function makeConfig(overrides: Partial<TournamentConfig> = {}): TournamentConfig {
  return {
    format: 'americano',
    pointsPerMatch: 0, // 0 = use default
    courts: [{ id: 'c1', name: 'Court 1' }],
    maxRounds: null,
    ...overrides,
  };
}

describe('resolveConfigDefaults', () => {
  describe('pointsPerMatch', () => {
    it('uses explicit points when > 0', () => {
      const config = makeConfig({ pointsPerMatch: 32 });
      const resolved = resolveConfigDefaults(config, 8);
      expect(resolved.pointsPerMatch).toBe(32);
    });

    it('resolves default points when set to 0', () => {
      const config = makeConfig({ pointsPerMatch: 0 });
      const resolved = resolveConfigDefaults(config, 8);
      expect(resolved.pointsPerMatch).toBe(18);
      expect(resolved.maxRounds).toBe(10);
    });

    it('resolves correct points for each player count', () => {
      const expected: Record<number, { pts: number; rounds: number }> = {
        4: { pts: 18, rounds: 10 },
        5: { pts: 18, rounds: 10 },
        6: { pts: 20, rounds: 9 },
        7: { pts: 28, rounds: 7 },
        8: { pts: 18, rounds: 10 },
        9: { pts: 20, rounds: 9 },
        10: { pts: 18, rounds: 10 },
        11: { pts: 18, rounds: 10 },
        12: { pts: 20, rounds: 9 },
        13: { pts: 18, rounds: 10 },
        14: { pts: 28, rounds: 7 },
        15: { pts: 18, rounds: 10 },
        16: { pts: 24, rounds: 8 },
        17: { pts: 18, rounds: 10 },
        18: { pts: 20, rounds: 9 },
        19: { pts: 18, rounds: 10 },
        20: { pts: 18, rounds: 10 },
      };
      for (let n = 4; n <= 20; n++) {
        const config = makeConfig({ pointsPerMatch: 0 });
        const resolved = resolveConfigDefaults(config, n);
        expect(resolved.pointsPerMatch).toBe(expected[n].pts);
        expect(resolved.maxRounds).toBe(expected[n].rounds);
      }
    });
  });

  describe('maxRounds', () => {
    it('uses explicit maxRounds when provided', () => {
      const config = makeConfig({ maxRounds: 5 });
      const resolved = resolveConfigDefaults(config, 8);
      expect(resolved.maxRounds).toBe(5);
    });

    it('calculates default maxRounds based on player count', () => {
      const config = makeConfig({ maxRounds: null });
      const resolved = resolveConfigDefaults(config, 8);
      expect(resolved.maxRounds).toBe(10);
    });

    it('returns correct values for different court/player combos', () => {
      const small = resolveConfigDefaults(makeConfig({ maxRounds: null }), 4);
      expect(small.maxRounds).toBe(10);
      expect(small.pointsPerMatch).toBe(18);

      const large = resolveConfigDefaults(makeConfig({
        maxRounds: null,
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }, { id: 'c3', name: 'C3' }, { id: 'c4', name: 'C4' }],
      }), 16);
      expect(large.maxRounds).toBe(10);
      expect(large.pointsPerMatch).toBe(18);
    });
  });

  describe('passthrough', () => {
    it('preserves format', () => {
      const config = makeConfig({ format: 'mexicano' });
      const resolved = resolveConfigDefaults(config, 8);
      expect(resolved.format).toBe('mexicano');
    });

    it('preserves courts', () => {
      const courts = [
        { id: 'c1', name: 'Court 1' },
        { id: 'c2', name: 'Court 2' },
      ];
      const config = makeConfig({ courts });
      const resolved = resolveConfigDefaults(config, 8);
      expect(resolved.courts).toBe(courts);
    });
  });

  describe('targetDuration', () => {
    it('uses default 120 minutes when targetDuration is not set', () => {
      const config = makeConfig({ pointsPerMatch: 0, maxRounds: null });
      const resolved = resolveConfigDefaults(config, 8);
      // Same as default behavior
      const configWithExplicit = makeConfig({ pointsPerMatch: 0, maxRounds: null, targetDuration: 120 });
      const resolvedExplicit = resolveConfigDefaults(configWithExplicit, 8);
      expect(resolved.maxRounds).toBe(resolvedExplicit.maxRounds);
      expect(resolved.pointsPerMatch).toBe(resolvedExplicit.pointsPerMatch);
    });

    it('scales rounds with duration', () => {
      const short = resolveConfigDefaults(makeConfig({ targetDuration: 60 }), 8);
      expect(short.maxRounds).toBe(4);
      expect(short.pointsPerMatch).toBe(24);

      const standard = resolveConfigDefaults(makeConfig({ targetDuration: 120 }), 8);
      expect(standard.maxRounds).toBe(10);
      expect(standard.pointsPerMatch).toBe(18);

      const long = resolveConfigDefaults(makeConfig({ targetDuration: 180 }), 8);
      expect(long.maxRounds).toBe(12);
      expect(long.pointsPerMatch).toBe(24);
    });
  });

  describe('edge cases', () => {
    it('handles 4 players (minimum)', () => {
      const resolved = resolveConfigDefaults(makeConfig(), 4);
      expect(resolved.maxRounds).toBe(10);
      expect(resolved.pointsPerMatch).toBe(18);
    });

    it('handles large player count', () => {
      const config = makeConfig({
        courts: Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, name: `C${i}` })),
      });
      const resolved = resolveConfigDefaults(config, 20);
      expect(resolved.maxRounds).toBe(10);
      expect(resolved.pointsPerMatch).toBe(18);
    });

    it('handles 2 courts with 8 players', () => {
      const config = makeConfig({
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
        pointsPerMatch: 0,
        maxRounds: null,
      });
      const resolved = resolveConfigDefaults(config, 8);
      expect(resolved.maxRounds).toBe(10);
      expect(resolved.pointsPerMatch).toBe(18);
    });

    it('handles 0 players (playersPerRound = 0)', () => {
      const config = makeConfig({ pointsPerMatch: 0, maxRounds: null });
      const resolved = resolveConfigDefaults(config, 0);
      expect(resolved.maxRounds).toBe(10);
      expect(resolved.pointsPerMatch).toBe(18);
    });

    it('handles explicit maxRounds of 0 (effectiveRounds = 0)', () => {
      const config = makeConfig({ pointsPerMatch: 0, maxRounds: 0 });
      const resolved = resolveConfigDefaults(config, 8);
      expect(resolved.maxRounds).toBe(0);
      // defaultPoints path where effectiveRounds = 0 → PREFERRED_POINTS
      expect(resolved.pointsPerMatch).toBe(32);
    });
  });

  describe('estimates fill target duration', () => {
    function estimateMinutes(config: TournamentConfig): number {
      return config.maxRounds! * Math.round(config.pointsPerMatch * 0.5 + 3);
    }

    it('fills 120 min target for 6 players on 1 court', () => {
      const resolved = resolveConfigDefaults(makeConfig({ targetDuration: 120 }), 6);
      expect(resolved.pointsPerMatch).toBe(20);
      expect(resolved.maxRounds).toBe(9);
      const est = estimateMinutes(resolved);
      expect(est).toBe(117); // 9 * (20*0.5+3) = 9 * 13 = 117
    });

    it('fills 180 min target for 6 players on 1 court', () => {
      const resolved = resolveConfigDefaults(makeConfig({ targetDuration: 180 }), 6);
      expect(resolved.pointsPerMatch).toBe(18);
      expect(resolved.maxRounds).toBe(15);
      const est = estimateMinutes(resolved);
      expect(est).toBe(180); // 15 * (18*0.5+3) = 15 * 12 = 180
    });

    it('fills 90 min target for 10 players on 1 court', () => {
      const resolved = resolveConfigDefaults(makeConfig({ targetDuration: 90 }), 10);
      expect(resolved.pointsPerMatch).toBe(30);
      expect(resolved.maxRounds).toBe(5);
      const est = estimateMinutes(resolved);
      expect(est).toBe(90); // 5 * (30*0.5+3) = 5 * 18 = 90
    });

    it('does not exceed target duration', () => {
      const expected: Record<string, { pts: number; rounds: number }> = {
        '60-4': { pts: 18, rounds: 5 },
        '60-5': { pts: 18, rounds: 5 },
        '60-6': { pts: 18, rounds: 5 },
        '60-8': { pts: 24, rounds: 4 },
        '60-10': { pts: 18, rounds: 5 },
        '60-12': { pts: 18, rounds: 5 },
        '90-4': { pts: 24, rounds: 6 },
        '90-5': { pts: 30, rounds: 5 },
        '90-6': { pts: 24, rounds: 6 },
        '90-8': { pts: 24, rounds: 6 },
        '90-10': { pts: 30, rounds: 5 },
        '90-12': { pts: 24, rounds: 6 },
        '120-4': { pts: 18, rounds: 10 },
        '120-5': { pts: 18, rounds: 10 },
        '120-6': { pts: 20, rounds: 9 },
        '120-8': { pts: 18, rounds: 10 },
        '120-10': { pts: 18, rounds: 10 },
        '120-12': { pts: 20, rounds: 9 },
        '180-4': { pts: 18, rounds: 15 },
        '180-5': { pts: 18, rounds: 15 },
        '180-6': { pts: 18, rounds: 15 },
        '180-8': { pts: 24, rounds: 12 },
        '180-10': { pts: 18, rounds: 15 },
        '180-12': { pts: 18, rounds: 15 },
      };
      for (const duration of [60, 90, 120, 180]) {
        for (const players of [4, 5, 6, 8, 10, 12]) {
          const key = `${duration}-${players}`;
          const resolved = resolveConfigDefaults(makeConfig({ targetDuration: duration }), players);
          expect(resolved.pointsPerMatch).toBe(expected[key].pts);
          expect(resolved.maxRounds).toBe(expected[key].rounds);
          const est = estimateMinutes(resolved);
          expect(est).toBeLessThanOrEqual(duration + 3);
        }
      }
    });
  });

  describe('default rounds prefer equal sit-outs', () => {
    it('nudges default towards fair round count for 5 players on 1 court', () => {
      // 5 players, 1 court → 1 sits out per round → fair at multiples of 5
      const config = makeConfig({ maxRounds: null });
      const resolved = resolveConfigDefaults(config, 5);
      expect(resolved.maxRounds).toBe(10); // multiple of 5
      expect(resolved.pointsPerMatch).toBe(18);
      const info = computeSitOutInfo(5, 1, resolved.maxRounds!);
      expect(info.isEqual).toBe(true);
    });

    it('nudges default towards fair round count for 6 players on 1 court', () => {
      // 6 players, 1 court → 2 sit out per round → fair at multiples of 3
      const config = makeConfig({ maxRounds: null });
      const resolved = resolveConfigDefaults(config, 6);
      expect(resolved.maxRounds).toBe(9); // multiple of 3
      expect(resolved.pointsPerMatch).toBe(20);
      const info = computeSitOutInfo(6, 1, resolved.maxRounds!);
      expect(info.isEqual).toBe(true);
    });

    it('does not nudge when no sit-outs (4 players, 1 court)', () => {
      const config = makeConfig({ maxRounds: null });
      const resolved = resolveConfigDefaults(config, 4);
      expect(resolved.maxRounds).toBe(10);
      expect(resolved.pointsPerMatch).toBe(18);
      const info = computeSitOutInfo(4, 1, resolved.maxRounds!);
      expect(info.isEqual).toBe(true);
      expect(info.sitOutsPerRound).toBe(0);
    });

    it('does not nudge when explicit maxRounds is set', () => {
      const config = makeConfig({ maxRounds: 7 });
      const resolved = resolveConfigDefaults(config, 5);
      expect(resolved.maxRounds).toBe(7);
    });
  });

  describe('timed mode', () => {
    it('returns both values when both rounds and minutesPerRound are set', () => {
      const config = makeConfig({ scoringMode: 'timed', maxRounds: 5, minutesPerRound: 15 });
      const resolved = resolveConfigDefaults(config, 8);
      expect(resolved.maxRounds).toBe(5);
      expect(resolved.minutesPerRound).toBe(15);
      expect(resolved.scoringMode).toBe('timed');
    });

    it('derives rounds from duration when only minutesPerRound is set', () => {
      const config = makeConfig({ scoringMode: 'timed', minutesPerRound: 20, maxRounds: null, targetDuration: 120 });
      const resolved = resolveConfigDefaults(config, 8);
      expect(resolved.minutesPerRound).toBe(20);
      expect(resolved.maxRounds).toBe(6); // floor(120/20)
      expect(resolved.scoringMode).toBe('timed');
    });

    it('derives minutesPerRound from duration when only rounds are set', () => {
      const config = makeConfig({ scoringMode: 'timed', maxRounds: 4, targetDuration: 120 });
      const resolved = resolveConfigDefaults(config, 8);
      expect(resolved.maxRounds).toBe(4);
      expect(resolved.minutesPerRound).toBe(30); // floor(120/4)
      expect(resolved.scoringMode).toBe('timed');
    });

    it('derives both when neither rounds nor minutesPerRound is set', () => {
      const config = makeConfig({ scoringMode: 'timed', maxRounds: null, targetDuration: 120 });
      const resolved = resolveConfigDefaults(config, 8);
      expect(resolved.maxRounds).toBe(6);
      expect(resolved.minutesPerRound).toBe(20);
      expect(resolved.scoringMode).toBe('timed');
    });

    it('uses clubFixedRounds when club count is provided and rounds not explicit', () => {
      // 4 clubs (even) → clubFixedRounds = 4-1 = 3
      const config = makeConfig({ scoringMode: 'timed', minutesPerRound: 20, maxRounds: null, targetDuration: 120 });
      const resolved = resolveConfigDefaults(config, 16, 4);
      expect(resolved.maxRounds).toBe(3);
      expect(resolved.minutesPerRound).toBe(20);
    });

    it('uses clubFixedRounds for odd club count', () => {
      // 3 clubs (odd) → clubFixedRounds = 3
      const config = makeConfig({ scoringMode: 'timed', maxRounds: null, targetDuration: 120 });
      const resolved = resolveConfigDefaults(config, 12, 3);
      expect(resolved.maxRounds).toBe(3);
      expect(resolved.minutesPerRound).toBe(40);
    });
  });

  describe('club format with fixed rounds', () => {
    it('overrides auto rounds with club-based round count', () => {
      // 4 clubs (even) → clubFixedRounds = 3
      const config = makeConfig({ maxRounds: null, pointsPerMatch: 0, targetDuration: 120 });
      const resolved = resolveConfigDefaults(config, 16, 4);
      expect(resolved.maxRounds).toBe(3);
      expect(resolved.pointsPerMatch).toBe(9);
      expect(resolved.scoringMode).toBe('games');
    });

    it('does not override explicit maxRounds even with clubs', () => {
      const config = makeConfig({ maxRounds: 7, pointsPerMatch: 24 });
      const resolved = resolveConfigDefaults(config, 16, 4);
      expect(resolved.maxRounds).toBe(7);
    });
  });

  describe('auto-switch from points to games', () => {
    it('switches to games when points would exceed cap (explicit rounds, no explicit scoringMode)', () => {
      // Very few rounds with long duration → points per match would be huge
      const config: TournamentConfig = {
        format: 'americano',
        pointsPerMatch: 0,
        courts: [{ id: 'c1', name: 'C1' }],
        maxRounds: 2,
        targetDuration: 240,
        // scoringMode NOT set → undefined → auto-detect
      };
      const resolved = resolveConfigDefaults(config, 4);
      expect(resolved.scoringMode).toBe('games');
      expect(resolved.pointsPerMatch).toBe(16);
      expect(resolved.maxRounds).toBe(2);
    });

    it('does not switch when scoringMode is explicitly set to points', () => {
      const config: TournamentConfig = {
        format: 'americano',
        pointsPerMatch: 0,
        courts: [{ id: 'c1', name: 'C1' }],
        maxRounds: 2,
        targetDuration: 240,
        scoringMode: 'points', // explicit
      };
      const resolved = resolveConfigDefaults(config, 4);
      expect(resolved.scoringMode).toBe('points');
      expect(resolved.pointsPerMatch).toBe(32);
      expect(resolved.maxRounds).toBe(2);
    });
  });

  describe('king-of-the-court min points override', () => {
    it('enforces 12 as minimum points for king-of-the-court', () => {
      const config: TournamentConfig = {
        format: 'king-of-the-court',
        pointsPerMatch: 0,
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
        maxRounds: 20,
        targetDuration: 60, // short duration → would push points down
      };
      const resolved = resolveConfigDefaults(config, 8);
      expect(resolved.pointsPerMatch).toBe(12);
      expect(resolved.maxRounds).toBe(20);
    });
  });
});

describe('computeSitOutInfo', () => {
  it('returns equal when no sit-outs needed', () => {
    // 4 players, 1 court → 4 play, 0 sit out
    const info = computeSitOutInfo(4, 1, 5);
    expect(info.isEqual).toBe(true);
    expect(info.sitOutsPerRound).toBe(0);
  });

  it('returns equal when all players fit on courts', () => {
    // 8 players, 2 courts → 8 play, 0 sit out
    const info = computeSitOutInfo(8, 2, 3);
    expect(info.isEqual).toBe(true);
    expect(info.sitOutsPerRound).toBe(0);
  });

  it('detects unequal sit-outs: 5 players, 1 court, 3 rounds', () => {
    // 1 sits out per round, 3 total sit-outs across 5 players → unequal
    const info = computeSitOutInfo(5, 1, 3);
    expect(info.isEqual).toBe(false);
    expect(info.sitOutsPerRound).toBe(1);
  });

  it('detects equal sit-outs: 5 players, 1 court, 5 rounds', () => {
    // 1 sits out per round, 5 total sit-outs across 5 players → equal (1 each)
    const info = computeSitOutInfo(5, 1, 5);
    expect(info.isEqual).toBe(true);
    expect(info.sitOutsPerRound).toBe(1);
  });

  it('detects equal sit-outs: 5 players, 1 court, 10 rounds', () => {
    // 1 sits out per round, 10 total sit-outs across 5 players → equal (2 each)
    const info = computeSitOutInfo(5, 1, 10);
    expect(info.isEqual).toBe(true);
  });

  it('suggests nearest fair values: 5 players, 1 court, 7 rounds', () => {
    const info = computeSitOutInfo(5, 1, 7);
    expect(info.isEqual).toBe(false);
    expect(info.nearestFairBelow).toBe(5);
    expect(info.nearestFairAbove).toBe(10);
  });

  it('suggests nearest fair values: 6 players, 1 court, 4 rounds', () => {
    // 2 sit out per round, fair step = 6/gcd(2,6) = 6/2 = 3
    const info = computeSitOutInfo(6, 1, 4);
    expect(info.isEqual).toBe(false);
    expect(info.nearestFairBelow).toBe(3);
    expect(info.nearestFairAbove).toBe(6);
  });

  it('handles 7 players, 1 court, 3 rounds', () => {
    // 3 sit out per round, fair step = 7/gcd(3,7) = 7/1 = 7
    const info = computeSitOutInfo(7, 1, 3);
    expect(info.isEqual).toBe(false);
    expect(info.nearestFairBelow).toBe(null); // floor(3/7)*7 = 0 → null
    expect(info.nearestFairAbove).toBe(7);
  });

  it('handles when current rounds is already a fair value', () => {
    const info = computeSitOutInfo(6, 1, 3);
    expect(info.isEqual).toBe(true);
    expect(info.nearestFairBelow).toBe(3);
    expect(info.nearestFairAbove).toBe(3);
  });

  it('handles 0 players', () => {
    const info = computeSitOutInfo(0, 1, 5);
    expect(info.isEqual).toBe(true);
    expect(info.sitOutsPerRound).toBe(0);
  });

  it('handles multiple courts: 9 players, 2 courts, 4 rounds', () => {
    // 8 play per round, 1 sits out → fair step = 9/gcd(1,9) = 9
    const info = computeSitOutInfo(9, 2, 4);
    expect(info.isEqual).toBe(false);
    expect(info.sitOutsPerRound).toBe(1);
    expect(info.nearestFairAbove).toBe(9);
  });

  it('handles multiple courts: 9 players, 2 courts, 9 rounds', () => {
    const info = computeSitOutInfo(9, 2, 9);
    expect(info.isEqual).toBe(true);
    expect(info.sitOutsPerRound).toBe(1);
  });
});
