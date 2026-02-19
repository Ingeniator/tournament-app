import type { Player, TournamentFormat } from '@padel/common';

type TFn = (key: string, params?: Record<string, string | number>) => string;

/** Compute group-related warnings (non-blocking) for mexicano format. */
export function getGroupWarnings(
  players: Player[],
  format: TournamentFormat,
  t: TFn,
): string[] {
  if (format !== 'mexicano') return [];

  const withGroup = players.filter(p => p.group);
  if (withGroup.length === 0) return [];

  const warnings: string[] = [];
  const groups = new Map<string, number>();
  for (const p of withGroup) {
    groups.set(p.group!, (groups.get(p.group!) ?? 0) + 1);
  }

  const withoutGroup = players.length - withGroup.length;
  if (withoutGroup > 0) {
    warnings.push(t('groups.playersWithoutGroup', { count: withoutGroup }));
  }

  if (groups.size >= 2) {
    const counts = [...groups.entries()];
    const allEqual = counts.every(([, c]) => c === counts[0][1]);
    if (!allEqual) {
      const desc = counts.map(([g, c]) => `${g}: ${c}`).join(', ');
      warnings.push(t('groups.unequalGroups', { distribution: desc }));
    }
  } else if (groups.size === 1 && withGroup.length > 0) {
    warnings.push(t('groups.needTwoGroups'));
  }

  return warnings;
}
