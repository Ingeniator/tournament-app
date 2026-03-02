const DEDUP_SUFFIXES = [
  'Jr.', 'Sr.', 'the Great', 'II', 'III', 'el Magnifico',
  'the Bold', 'v2.0', 'IV', 'the Wise', 'Remix', 'el Jefe',
  'V', 'the Swift', 'OG', 'the Brave', 'VI', 'Turbo',
  'the Strong', 'VII', 'el Crack', 'the Lucky', 'VIII', 'Primo',
];

const SUFFIX_PATTERN = new RegExp(
  ' (?:' + DEDUP_SUFFIXES.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + '|#\\d+)$'
);

/**
 * Returns a Map of id → deduplicated name for entries that have duplicate names.
 * Only entries that need renaming appear in the map.
 * Works with any object that has { id: string; name: string }.
 */
export function deduplicateNames<T extends { id: string; name: string }>(items: T[]): Map<string, string> {
  const nameGroups = new Map<string, T[]>();
  for (const item of items) {
    const base = item.name.replace(SUFFIX_PATTERN, '');
    const group = nameGroups.get(base) ?? [];
    group.push(item);
    nameGroups.set(base, group);
  }

  if (![...nameGroups.values()].some(g => g.length > 1)) return new Map();

  const usedSuffixes = new Set<string>();
  for (const item of items) {
    const match = item.name.match(SUFFIX_PATTERN);
    if (match) usedSuffixes.add(match[0].slice(1));
  }

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
    for (const item of group) {
      if (SUFFIX_PATTERN.test(item.name)) continue;
      let suffix: string;
      if (idx < available.length) {
        suffix = available[idx++];
      } else {
        while (usedSuffixes.has(`#${numFallback}`)) numFallback++;
        suffix = `#${numFallback++}`;
      }
      usedSuffixes.add(suffix);
      renames.set(item.id, `${base} ${suffix}`);
    }
  }

  return renames;
}
