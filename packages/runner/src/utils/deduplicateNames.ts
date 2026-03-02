import type { Player } from '@padel/common';
import { deduplicateNames as dedup } from '@padel/common';

/**
 * Runner-specific wrapper that returns a new array with deduplicated names applied.
 */
export function deduplicateNames(players: Player[]): Player[] {
  const renames = dedup(players);
  if (renames.size === 0) return players;
  return players.map(p =>
    renames.has(p.id) ? { ...p, name: renames.get(p.id)! } : p
  );
}
