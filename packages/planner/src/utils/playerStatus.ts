import type { PlannerRegistration } from '@padel/common';

export type PlayerStatus = 'playing' | 'reserve' | 'cancelled';

export function getPlayerStatuses(
  players: PlannerRegistration[],
  capacity: number
): Map<string, PlayerStatus> {
  const statuses = new Map<string, PlayerStatus>();

  const confirmed = players.filter(p => p.confirmed !== false);
  const cancelled = players.filter(p => p.confirmed === false);

  // Sort confirmed by timestamp ascending — first N are playing, rest are reserve
  const sorted = [...confirmed].sort((a, b) => a.timestamp - b.timestamp);

  sorted.forEach((p, i) => {
    statuses.set(p.id, i < capacity ? 'playing' : 'reserve');
  });

  cancelled.forEach(p => {
    statuses.set(p.id, 'cancelled');
  });

  return statuses;
}
