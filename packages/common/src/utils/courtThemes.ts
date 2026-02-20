const KOTC_THEMES: string[][] = [
  ['King', 'Queen', 'Prince', 'Duke', 'Knight', 'Baron'],
  ['Diamond', 'Ruby', 'Emerald', 'Sapphire', 'Topaz', 'Amethyst'],
  ['Gold', 'Silver', 'Bronze', 'Iron', 'Copper', 'Steel'],
  ['Sun', 'Moon', 'Star', 'Comet', 'Aurora', 'Eclipse'],
  ['Lion', 'Eagle', 'Wolf', 'Bear', 'Hawk', 'Tiger'],
];

/**
 * Returns court names from a single random KOTC theme.
 * Never mixes names across themes.
 */
export function getKotcCourtNames(count: number): string[] {
  const theme = KOTC_THEMES[Math.floor(Math.random() * KOTC_THEMES.length)];
  return Array.from({ length: count }, (_, i) => theme[i % theme.length]);
}

/**
 * Returns default bonus points for KOTC courts by position.
 * First court (highest rank) gets the most bonus.
 */
export function getKotcDefaultBonusPoints(courtIndex: number, totalCourts: number): number {
  if (totalCourts <= 1) return 0;
  if (courtIndex === 0) return 2;
  if (courtIndex === 1) return 1;
  return 0;
}
