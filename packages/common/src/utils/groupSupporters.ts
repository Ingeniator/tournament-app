import type { Supporter, GroupedSupporter } from '../types/supporter';

export function groupSupporters(supporters: Supporter[]): GroupedSupporter[] {
  const map = new Map<string, GroupedSupporter & { latestTs: number }>();
  for (const s of supporters) {
    const key = s.name.toLowerCase();
    const existing = map.get(key);
    const amt = s.amount ?? 0;
    if (existing) {
      existing.totalAmount += amt;
      existing.count++;
      if (s.timestamp > existing.latestTs) {
        existing.message = s.message;
        existing.latestTs = s.timestamp;
      }
    } else {
      map.set(key, {
        name: s.name,
        totalAmount: amt,
        message: s.message,
        count: 1,
        latestTs: s.timestamp,
      });
    }
  }
  return [...map.values()]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .map(({ latestTs: _latestTs, ...rest }) => rest);
}
