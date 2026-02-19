/**
 * Fun themed rank labels for King of the Court format.
 * Each theme provides names for up to 6 courts (ranks).
 * Beyond 6, courts get plain rank numbers.
 */
const RANK_THEMES: string[][] = [
  // Medieval
  ["King's Throne", "Duke's Hall", "Knight's Arena", "Squire's Yard", "Peasant's Field", "The Dungeon"],
  // Castle
  ['The Crown', 'The Tower', 'The Courtyard', 'The Gatehouse', 'The Moat', 'The Cellar'],
  // Royalty
  ['Royal Palace', 'Noble Chamber', "Baron's Keep", "Herald's Post", 'The Commons', 'The Shed'],
  // Altitude
  ['The Summit', 'High Ground', 'The Plateau', 'The Valley', 'Base Camp', 'The Pit'],
  // Travel
  ['First Class', 'Business Class', 'Premium Economy', 'Economy', 'Standby', 'Lost & Found'],
  // Dining
  ['Michelin Star', 'Fine Dining', 'The Bistro', 'Food Court', 'The Canteen', 'Vending Machine'],
  // Hotel
  ['The Penthouse', 'Royal Suite', 'Deluxe Room', 'Standard Room', 'The Hostel', 'The Lobby'],
  // Pirate
  ["Captain's Deck", "First Mate's Cabin", "Crow's Nest", 'The Galley', 'The Brig', "Davy's Locker"],
];

/** Pick a random theme and return rank labels for `numCourts` courts. */
export function randomRankLabels(numCourts: number): string[] {
  const theme = RANK_THEMES[Math.floor(Math.random() * RANK_THEMES.length)];
  return Array.from({ length: numCourts }, (_, i) =>
    i < theme.length ? theme[i] : `Rank ${i + 1}`
  );
}
