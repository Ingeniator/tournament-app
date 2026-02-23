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
    // With 50 names in the list, 50 draws should produce at least 2 unique
    expect(names.size).toBeGreaterThan(1);
  });

  it('returns a name from the known list', () => {
    const knownNames = new Set([
      'Smash & Chill', 'The Glass Wall Classic', 'Net Gains Open',
      'Lob City Showdown', 'Bandeja Bonanza', 'Drop Shot Derby',
      'The Vibora Invitational', 'Weekend Warriors Cup', 'Padel Royale',
      'The Cage Match', 'Serve & Volley Fiesta', 'The Smash Brothers',
      'Golden Set Open', 'The Wall Street Cup', 'Rally Kings Classic',
      'The Double Trouble Open', 'Chiquita Challenge', 'Glass House Games',
      'The Backwall Brawl', 'Sunset Smash', 'The Overtime Open',
      'Point Break Classic', 'Court Jesters Cup', 'The Grand Slam Jam',
      'Deuce or Nothing', 'The Net Effect', 'Spin City Open',
      'The Friendly Fire Cup', 'Volley of the Titans', 'The Match Point Mixer',
      'Ace Ventura Open', 'The Power Hour Cup', 'Baseline Bash',
      'The Corner Pocket Classic', 'No Mercy Monday', 'The Weekend Rumble',
      'Smashville Open', 'The Big Bounce', 'Court Chaos Cup',
      'The After Work Clash', 'Topspin Throwdown', 'The Lucky Lob Cup',
      'Glass Cage Gladiators', 'The Comeback Classic', 'Full Send Open',
      'The Sunday Showdown', 'Wall of Fame Cup', 'The Zero to Hero Open',
      'Padel Palooza', 'The Last Court Standing',
    ]);

    for (let i = 0; i < 20; i++) {
      expect(knownNames.has(randomTournamentName())).toBe(true);
    }
  });
});
