import type { PlannerRegistration, TournamentFormat, Club } from '@padel/common';
import { formatHasClubs } from '@padel/common';

export type PlayerStatus = 'playing' | 'reserve' | 'cancelled';

export interface StatusOptions {
  format?: TournamentFormat;
  clubs?: Club[];
}

export function getPlayerStatuses(
  players: PlannerRegistration[],
  capacity: number,
  options?: StatusOptions
): Map<string, PlayerStatus> {
  const statuses = new Map<string, PlayerStatus>();

  const confirmed = players.filter(p => p.confirmed !== false);
  const cancelled = players.filter(p => p.confirmed === false);

  cancelled.forEach(p => {
    statuses.set(p.id, 'cancelled');
  });

  const format = options?.format;
  const clubs = options?.clubs;

  // Mixicano: per-group capacity
  if (format === 'mixicano' && confirmed.some(p => p.group)) {
    const perGroupCap = Math.floor(capacity / 2);
    const groupA = confirmed.filter(p => p.group === 'A').sort((a, b) => a.timestamp - b.timestamp);
    const groupB = confirmed.filter(p => p.group === 'B').sort((a, b) => a.timestamp - b.timestamp);
    const unassigned = confirmed.filter(p => !p.group).sort((a, b) => a.timestamp - b.timestamp);

    let playingA = 0;
    for (const p of groupA) {
      if (playingA < perGroupCap) {
        statuses.set(p.id, 'playing');
        playingA++;
      } else {
        statuses.set(p.id, 'reserve');
      }
    }

    let playingB = 0;
    for (const p of groupB) {
      if (playingB < perGroupCap) {
        statuses.set(p.id, 'playing');
        playingB++;
      } else {
        statuses.set(p.id, 'reserve');
      }
    }

    // Unassigned fill remaining slots in either group
    const remainingA = perGroupCap - playingA;
    const remainingB = perGroupCap - playingB;
    let remaining = remainingA + remainingB;
    for (const p of unassigned) {
      if (remaining > 0) {
        statuses.set(p.id, 'playing');
        remaining--;
      } else {
        statuses.set(p.id, 'reserve');
      }
    }

    return statuses;
  }

  // Club Americano: per-club capacity
  if (format && formatHasClubs(format) && clubs && clubs.length > 0 && confirmed.some(p => p.clubId)) {
    const perClubCap = Math.floor(capacity / clubs.length);

    for (const club of clubs) {
      const clubPlayers = confirmed
        .filter(p => p.clubId === club.id)
        .sort((a, b) => a.timestamp - b.timestamp);

      let playing = 0;
      for (const p of clubPlayers) {
        if (playing < perClubCap) {
          statuses.set(p.id, 'playing');
          playing++;
        } else {
          statuses.set(p.id, 'reserve');
        }
      }
    }

    // Unassigned (no club) fill remaining slots
    const totalPlaying = [...statuses.values()].filter(s => s === 'playing').length;
    let remaining = capacity - totalPlaying;
    const unassigned = confirmed
      .filter(p => !p.clubId)
      .sort((a, b) => a.timestamp - b.timestamp);

    for (const p of unassigned) {
      if (remaining > 0) {
        statuses.set(p.id, 'playing');
        remaining--;
      } else {
        statuses.set(p.id, 'reserve');
      }
    }

    return statuses;
  }

  // Default: first N by timestamp are playing
  const sorted = [...confirmed].sort((a, b) => a.timestamp - b.timestamp);
  sorted.forEach((p, i) => {
    statuses.set(p.id, i < capacity ? 'playing' : 'reserve');
  });

  return statuses;
}
