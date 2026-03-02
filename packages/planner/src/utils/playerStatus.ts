import type { PlannerRegistration, TournamentFormat, Club } from '@padel/common';
import { formatHasClubs } from '@padel/common';

export type PlayerStatus = 'playing' | 'reserve' | 'cancelled';

export interface StatusOptions {
  format?: TournamentFormat;
  clubs?: Club[];
  rankLabels?: string[];
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

  // Club-ranked: per-(club, rank) bucket capacity, always even (pairs).
  // When slotsPerClub / rankCount is odd, round down to even base and
  // distribute extra pairs to ranks by earliest overflow player.
  const rankLabels = options?.rankLabels;
  if (format === 'club-ranked' && clubs && clubs.length > 0 && rankLabels && rankLabels.length > 0) {
    const slotsPerClub = Math.floor(capacity / clubs.length);
    const rankCount = rankLabels.length;
    const rawPerBucket = Math.floor(slotsPerClub / rankCount);
    const basePerBucket = Math.floor(rawPerBucket / 2) * 2; // round down to even
    const remainingPerClub = slotsPerClub - basePerBucket * rankCount;
    let bonusPairsLeft = Math.floor(remainingPerClub / 2);

    // Bucket caps start at base; first overflow rank gets +2 (one extra pair)
    const bucketCap = new Array<number>(rankCount).fill(basePerBucket);
    const counts = new Map<string, number>(); // "clubId:rankSlot" → count

    // Process players with club+rank by timestamp
    const ranked = confirmed
      .filter(p => p.clubId && p.rankSlot != null)
      .sort((a, b) => a.timestamp - b.timestamp);

    for (const p of ranked) {
      const key = `${p.clubId}:${p.rankSlot}`;
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);

      if (count <= bucketCap[p.rankSlot!]) {
        statuses.set(p.id, 'playing');
      } else if (bonusPairsLeft > 0) {
        bucketCap[p.rankSlot!] += 2;
        bonusPairsLeft--;
        statuses.set(p.id, 'playing');
      } else {
        statuses.set(p.id, 'reserve');
      }
    }

    // Players in club with no rank fill remaining club slots
    for (const club of clubs) {
      const clubPlaying = confirmed.filter(p => p.clubId === club.id && statuses.get(p.id) === 'playing').length;
      let clubRemaining = slotsPerClub - clubPlaying;
      const noRank = confirmed
        .filter(p => p.clubId === club.id && p.rankSlot == null)
        .sort((a, b) => a.timestamp - b.timestamp);

      for (const p of noRank) {
        if (clubRemaining > 0) {
          statuses.set(p.id, 'playing');
          clubRemaining--;
        } else {
          statuses.set(p.id, 'reserve');
        }
      }
    }

    // Fully unassigned (no club, no rank) fill remaining global slots
    const totalPlaying = [...statuses.values()].filter(s => s === 'playing').length;
    let remaining = capacity - totalPlaying;
    const unassigned = confirmed
      .filter(p => !p.clubId && p.rankSlot == null)
      .sort((a, b) => a.timestamp - b.timestamp);

    for (const p of unassigned) {
      if (remaining > 0) {
        statuses.set(p.id, 'playing');
        remaining--;
      } else {
        statuses.set(p.id, 'reserve');
      }
    }

    // Players with rank but no club — also fill remaining
    const totalPlaying2 = [...statuses.values()].filter(s => s === 'playing').length;
    let remaining2 = capacity - totalPlaying2;
    const rankNoClub = confirmed
      .filter(p => !p.clubId && p.rankSlot != null && !statuses.has(p.id))
      .sort((a, b) => a.timestamp - b.timestamp);

    for (const p of rankNoClub) {
      if (remaining2 > 0) {
        statuses.set(p.id, 'playing');
        remaining2--;
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
