import { describe, it, expect } from 'vitest';
import { resolveConfigDefaults, computeSitOutInfo } from './resolveConfigDefaults';
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
      expect(resolved.pointsPerMatch).toBeGreaterThanOrEqual(16);
      expect(resolved.pointsPerMatch).toBeLessThanOrEqual(24);
    });

    it('default points are between 16 and 24', () => {
      for (let n = 4; n <= 20; n++) {
        const config = makeConfig({ pointsPerMatch: 0 });
        const resolved = resolveConfigDefaults(config, n);
        expect(resolved.pointsPerMatch).toBeGreaterThanOrEqual(16);
        expect(resolved.pointsPerMatch).toBeLessThanOrEqual(24);
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
      expect(resolved.maxRounds).toBeGreaterThan(0);
    });

    it('returns more rounds for more players', () => {
      const small = resolveConfigDefaults(makeConfig({ maxRounds: null }), 4);
      const large = resolveConfigDefaults(makeConfig({ maxRounds: null }), 16);
      expect(large.maxRounds!).toBeGreaterThanOrEqual(small.maxRounds!);
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

    it('allows more rounds with longer duration', () => {
      const short = resolveConfigDefaults(makeConfig({ targetDuration: 60 }), 8);
      const long = resolveConfigDefaults(makeConfig({ targetDuration: 180 }), 8);
      expect(long.maxRounds!).toBeGreaterThanOrEqual(short.maxRounds!);
    });

    it('reduces rounds for shorter duration', () => {
      const standard = resolveConfigDefaults(makeConfig({ targetDuration: 120 }), 8);
      const short = resolveConfigDefaults(makeConfig({ targetDuration: 60 }), 8);
      expect(short.maxRounds!).toBeLessThanOrEqual(standard.maxRounds!);
    });
  });

  describe('edge cases', () => {
    it('handles 4 players (minimum)', () => {
      const resolved = resolveConfigDefaults(makeConfig(), 4);
      expect(resolved.maxRounds).toBeGreaterThan(0);
      expect(resolved.pointsPerMatch).toBeGreaterThan(0);
    });

    it('handles large player count', () => {
      const config = makeConfig({
        courts: Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, name: `C${i}` })),
      });
      const resolved = resolveConfigDefaults(config, 20);
      expect(resolved.maxRounds).toBeGreaterThan(0);
      expect(resolved.pointsPerMatch).toBeGreaterThan(0);
    });

    it('handles 2 courts with 8 players', () => {
      const config = makeConfig({
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
        pointsPerMatch: 0,
        maxRounds: null,
      });
      const resolved = resolveConfigDefaults(config, 8);
      expect(resolved.maxRounds).toBeGreaterThan(0);
    });

    it('handles 0 players (playersPerRound = 0)', () => {
      const config = makeConfig({ pointsPerMatch: 0, maxRounds: null });
      const resolved = resolveConfigDefaults(config, 0);
      // Should not crash, should return valid config
      expect(resolved.maxRounds).toBeGreaterThanOrEqual(1);
      expect(resolved.pointsPerMatch).toBeGreaterThanOrEqual(16);
    });

    it('handles explicit maxRounds of 0 (effectiveRounds = 0)', () => {
      const config = makeConfig({ pointsPerMatch: 0, maxRounds: 0 });
      const resolved = resolveConfigDefaults(config, 8);
      expect(resolved.maxRounds).toBe(0);
      // defaultPoints path where effectiveRounds = 0 → PREFERRED_POINTS
      expect(resolved.pointsPerMatch).toBe(24);
    });
  });

  describe('default rounds prefer equal sit-outs', () => {
    it('nudges default towards fair round count for 5 players on 1 court', () => {
      // 5 players, 1 court → 1 sits out per round → fair at multiples of 5
      const config = makeConfig({ maxRounds: null });
      const resolved = resolveConfigDefaults(config, 5);
      const info = computeSitOutInfo(5, 1, resolved.maxRounds!);
      expect(info.isEqual).toBe(true);
    });

    it('nudges default towards fair round count for 6 players on 1 court', () => {
      // 6 players, 1 court → 2 sit out per round → fair at multiples of 3
      const config = makeConfig({ maxRounds: null });
      const resolved = resolveConfigDefaults(config, 6);
      const info = computeSitOutInfo(6, 1, resolved.maxRounds!);
      expect(info.isEqual).toBe(true);
    });

    it('does not nudge when no sit-outs (4 players, 1 court)', () => {
      const config = makeConfig({ maxRounds: null });
      const resolved = resolveConfigDefaults(config, 4);
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
