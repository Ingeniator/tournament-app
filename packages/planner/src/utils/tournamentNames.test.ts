import { describe, it, expect } from 'vitest';
import { randomTournamentName } from './tournamentNames';

describe('randomTournamentName', () => {
  it('returns a non-empty string', () => {
    const name = randomTournamentName();
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });

  it('returns different names across multiple calls (probabilistic)', () => {
    const names = new Set(Array.from({ length: 20 }, () => randomTournamentName()));
    // With 50 possible names and 20 draws, we should almost certainly get more than 1 unique
    expect(names.size).toBeGreaterThan(1);
  });
});
