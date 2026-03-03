import type { PlannerRegistration, TournamentFormat, Club } from '@padel/common';
import { formatHasClubs, formatHasFixedPartners } from '@padel/common';
import { findPartner } from './partnerLogic';

export type PlayerStatus = 'playing' | 'reserve' | 'cancelled' | 'needs-partner' | 'registered';

export interface StatusOptions {
  format?: TournamentFormat;
  clubs?: Club[];
  rankLabels?: string[];
  captainMode?: boolean;
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

  // Pair-format: capacity is counted in pair slots for formatHasFixedPartners
  // (club-ranked has its own specialized logic above and falls through to club-americano)
  if (format && format !== 'club-ranked' && formatHasFixedPartners(format)) {
    const captainMode = options?.captainMode;
    const processed = new Set<string>();

    // Build pairs: each confirmed player matched with their partner
    type Pair = { players: [PlannerRegistration, PlannerRegistration]; pairedAt: number };
    const pairs: Pair[] = [];
    const soloPlayers: PlannerRegistration[] = [];

    for (const p of confirmed) {
      if (processed.has(p.id)) continue;
      processed.add(p.id);

      const partner = findPartner(p, confirmed);
      if (partner && !processed.has(partner.id)) {
        processed.add(partner.id);
        const pairedAt = Math.min(p.pairedAt ?? p.timestamp, partner.pairedAt ?? partner.timestamp);
        pairs.push({ players: [p, partner], pairedAt });
      } else if (!partner) {
        soloPlayers.push(p);
      }
      // If partner already processed (in another pair), treat this as solo
      else {
        soloPlayers.push(p);
      }
    }

    // Solo players → needs-partner
    for (const p of soloPlayers) {
      statuses.set(p.id, 'needs-partner');
    }

    // Captain mode: unapproved pairs → 'registered'
    const approvedPairs: Pair[] = [];
    if (captainMode) {
      for (const pair of pairs) {
        const [a, b] = pair.players;
        if (a.captainApproved !== true || b.captainApproved !== true) {
          statuses.set(a.id, 'registered');
          statuses.set(b.id, 'registered');
        } else {
          approvedPairs.push(pair);
        }
      }
    } else {
      approvedPairs.push(...pairs);
    }

    // Sort eligible pairs by pairedAt (earlier pairs get priority)
    approvedPairs.sort((a, b) => a.pairedAt - b.pairedAt);

    const pairCapacity = Math.floor(capacity / 2);

    // Club formats: distribute pair capacity per club
    if (clubs && clubs.length > 0 && confirmed.some(p => p.clubId)) {
      const perClubPairCap = Math.floor(pairCapacity / clubs.length);
      const clubPairCounts = new Map<string, number>();

      for (const pair of approvedPairs) {
        const clubId = pair.players[0].clubId ?? pair.players[1].clubId ?? '';
        const count = clubPairCounts.get(clubId) ?? 0;
        if (count < perClubPairCap) {
          statuses.set(pair.players[0].id, 'playing');
          statuses.set(pair.players[1].id, 'playing');
          clubPairCounts.set(clubId, count + 1);
        } else {
          statuses.set(pair.players[0].id, 'reserve');
          statuses.set(pair.players[1].id, 'reserve');
        }
      }
    } else {
      // Non-club: simple pair capacity
      let pairsPlaying = 0;
      for (const pair of approvedPairs) {
        if (pairsPlaying < pairCapacity) {
          statuses.set(pair.players[0].id, 'playing');
          statuses.set(pair.players[1].id, 'playing');
          pairsPlaying++;
        } else {
          statuses.set(pair.players[0].id, 'reserve');
          statuses.set(pair.players[1].id, 'reserve');
        }
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
