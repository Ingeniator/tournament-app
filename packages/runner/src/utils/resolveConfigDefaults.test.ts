import { describe, it, expect } from 'vitest';
import { resolveConfigDefaults } from './resolveConfigDefaults';
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
  });
});
