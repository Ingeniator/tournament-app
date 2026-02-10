import type { Player } from '@padel/common';

const DEDUP_SUFFIXES = [
  'Jr.', 'Sr.', 'the Great', 'II', 'III', 'el Magnifico',
  'the Bold', 'v2.0', 'IV', 'the Wise', 'Remix', 'el Jefe',
  'V', 'the Swift', 'OG', 'the Brave', 'VI', 'Turbo',
  'the Strong', 'VII', 'el Crack', 'the Lucky', 'VIII', 'Primo',
];

const SUFFIX_PATTERN = new RegExp(
  ' (?:' + DEDUP_SUFFIXES.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + '|#\\d+)$'
);

export function deduplicateNames(players: Player[]): Player[] {
  // Group by base name (strip known suffixes)
  const nameGroups = new Map<string, Player[]>();
  for (const p of players) {
    const base = p.name.replace(SUFFIX_PATTERN, '');
    const group = nameGroups.get(base) ?? [];
    group.push(p);
    nameGroups.set(base, group);
  }

  if (![...nameGroups.values()].some(g => g.length > 1)) return players;

  // Collect all suffixes already in use across all players
  const usedSuffixes = new Set<string>();
  for (const p of players) {
    const match = p.name.match(SUFFIX_PATTERN);
    if (match) usedSuffixes.add(match[0].slice(1)); // strip leading space
  }

  // Shuffle available suffixes so each name group gets a random pick
  const available = DEDUP_SUFFIXES.filter(s => !usedSuffixes.has(s));
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  let idx = 0;
  let numFallback = 1;

  const renames = new Map<string, string>();
  for (const [base, group] of nameGroups) {
    if (group.length <= 1) continue;
    for (const p of group) {
      // Already has a valid suffix — keep it
      if (SUFFIX_PATTERN.test(p.name)) continue;
      // Pick next random unused suffix
      let suffix: string;
      if (idx < available.length) {
        suffix = available[idx++];
      } else {
        while (usedSuffixes.has(`#${numFallback}`)) numFallback++;
        suffix = `#${numFallback++}`;
      }
      usedSuffixes.add(suffix);
      renames.set(p.id, `${base} ${suffix}`);
    }
  }

  if (renames.size === 0) return players;
  return players.map(p =>
    renames.has(p.id) ? { ...p, name: renames.get(p.id)! } : p
  );
}
