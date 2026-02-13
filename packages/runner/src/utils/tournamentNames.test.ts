import { describe, it, expect } from 'vitest';
import { randomTournamentName } from './tournamentNames';

describe('randomTournamentName', () => {
  it('returns a non-empty string', () => {
    const name = randomTournamentName();
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });

  it('returns different names over many calls (not always the same)', () => {
    const names = new Set<string>();
    for (let i = 0; i < 50; i++) {
      names.add(randomTournamentName());
    }
    // With 50+ names in the list, 50 draws should produce at least 2 unique
    expect(names.size).toBeGreaterThan(1);
  });
});
