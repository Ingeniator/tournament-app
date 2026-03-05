import type { TournamentFormat, Club } from '@padel/common';
import { formatHasClubs, formatHasFixedPartners, formatHasGroups, getClubColor, shortLabel } from '@padel/common';
import type { EventTournamentRawData } from '../hooks/useEventTournaments';
import { findPartner } from './partnerLogic';

// ── Types ──

export interface UrgencyMessage {
  key: string;
  params?: Record<string, string | number>;
}

export type UrgencyLevel = 'neutral' | 'warning' | 'danger' | 'success';

interface BreakdownBase {
  urgency: UrgencyMessage;
  urgencyLevel: UrgencyLevel;
  filled: number;
  total: number;
}

export interface SimpleBreakdown extends BreakdownBase {
  kind: 'simple';
}

export interface ClubBarData {
  clubId: string;
  name: string;
  color: string;
  filled: number;
  capacity: number;
}

export interface ClubBreakdown extends BreakdownBase {
  kind: 'club';
  captainMode: boolean;
  clubs: ClubBarData[];
}

export interface ClubRankedCell {
  filled: number;
  capacity: number;
  paired: number; // count of paired players in this cell
}

export interface ClubRankedRow {
  clubId: string;
  name: string;
  color: string;
  cells: ClubRankedCell[];
  pairedPercent: number;
}

export interface ClubRankedBreakdown extends BreakdownBase {
  kind: 'club-ranked';
  captainMode: boolean;
  hasPairs: boolean;
  rankLabels: string[];
  rows: ClubRankedRow[];
}

export interface GroupBarData {
  group: 'A' | 'B';
  label: string;
  filled: number;
  capacity: number;
}

export interface GroupBreakdown extends BreakdownBase {
  kind: 'group';
  groups: GroupBarData[];
}

export type TournamentBreakdown = SimpleBreakdown | ClubBreakdown | ClubRankedBreakdown | GroupBreakdown;

// ── Main function ──

export function computeBreakdown(raw: EventTournamentRawData, capacity: number): TournamentBreakdown {
  const { format, clubs, rankLabels, captainMode, groupLabels, players } = raw;
  const confirmed = players.filter(p => p.confirmed !== false);

  // Club-ranked
  if (format === 'club-ranked' && clubs.length > 0 && rankLabels.length > 0) {
    return computeClubRankedBreakdown(confirmed, clubs, rankLabels, capacity, captainMode, format);
  }

  // Club formats (non-ranked)
  if (format && formatHasClubs(format) && clubs.length > 0) {
    return computeClubBreakdown(confirmed, clubs, capacity, captainMode);
  }

  // Group formats (mixicano, mixed-*)
  if (format && formatHasGroups(format)) {
    return computeGroupBreakdown(confirmed, capacity, groupLabels);
  }

  // Simple
  return computeSimpleBreakdown(confirmed.length, capacity);
}

// ── Simple ──

function computeSimpleBreakdown(filled: number, total: number): SimpleBreakdown {
  const spotsLeft = Math.max(0, total - filled);
  return {
    kind: 'simple',
    filled,
    total,
    ...urgencyFromSpots(spotsLeft),
  };
}

// ── Club ──

function computeClubBreakdown(
  confirmed: { clubId?: string }[],
  clubs: Club[],
  capacity: number,
  captainMode: boolean,
): ClubBreakdown {
  // Always show all registered (confirmed) players — never filter by captainApproved.
  // The goal is to drive registrations, not push captains to approve.
  const perClub = Math.floor(capacity / clubs.length);

  const clubBars: ClubBarData[] = clubs.map((club, i) => {
    const filled = confirmed.filter(p => p.clubId === club.id).length;
    return {
      clubId: club.id,
      name: club.name,
      color: getClubColor(club, i),
      filled,
      capacity: perClub,
    };
  });

  const assignedFilled = clubBars.reduce((s, c) => s + Math.min(c.filled, c.capacity), 0);
  const unassigned = confirmed.filter(p => !p.clubId).length;

  // Captain mode: urgency reflects club assignments only (unassigned don't count as "filling" a club)
  // Non-captain: unassigned count toward total since they'll be placed automatically
  const urgencyFilled = captainMode ? assignedFilled : assignedFilled + unassigned;
  const { urgency, urgencyLevel } = clubUrgency(clubBars, urgencyFilled, capacity, captainMode);

  return {
    kind: 'club',
    captainMode,
    clubs: clubBars,
    filled: assignedFilled + unassigned,
    total: capacity,
    urgency,
    urgencyLevel,
  };
}

// ── Club-ranked ──

function computeClubRankedBreakdown(
  confirmed: { id: string; clubId?: string; rankSlot?: number; partnerName?: string; partnerTelegram?: string }[],
  clubs: Club[],
  rankLabels: string[],
  capacity: number,
  captainMode: boolean,
  format: TournamentFormat,
): ClubRankedBreakdown {
  // Always show all registered (confirmed) players — never filter by captainApproved.
  const hasPairs = formatHasFixedPartners(format);
  const perClub = Math.floor(capacity / clubs.length);
  const perBucket = Math.floor(Math.floor(perClub / rankLabels.length) / 2) * 2; // round to even

  const rows: ClubRankedRow[] = clubs.map((club, ci) => {
    const clubPlayers = confirmed.filter(p => p.clubId === club.id);

    const cells: ClubRankedCell[] = rankLabels.map((_, ri) => {
      const inCell = clubPlayers.filter(p => p.rankSlot === ri);
      // Count paired players (only for pair formats)
      let paired = 0;
      if (hasPairs) {
        const seen = new Set<string>();
        for (const p of inCell) {
          if (seen.has(p.id)) continue;
          const partner = findPartner(p as Parameters<typeof findPartner>[0], confirmed as Parameters<typeof findPartner>[1]);
          if (partner && !seen.has(partner.id)) {
            seen.add(p.id);
            seen.add(partner.id);
            paired += 2;
          }
        }
      }
      return {
        filled: inCell.length,
        capacity: perBucket,
        paired,
      };
    });

    const totalInClub = cells.reduce((s, c) => s + c.filled, 0);
    const totalPaired = cells.reduce((s, c) => s + c.paired, 0);
    const pairedPercent = totalInClub > 0 ? Math.round((totalPaired / totalInClub) * 100) : 0;

    return {
      clubId: club.id,
      name: club.name,
      color: getClubColor(club, ci),
      cells,
      pairedPercent,
    };
  });

  const matrixFilled = rows.reduce((s, r) => s + r.cells.reduce((s2, c) => s2 + c.filled, 0), 0);
  const unplacedCount = confirmed.length - matrixFilled;

  // For urgency: captain mode only counts matrix-placed players (unplaced don't "fill" slots)
  // Non-captain: unplaced count toward total since they'll be placed automatically
  const urgencyFilled = captainMode ? matrixFilled : matrixFilled + unplacedCount;

  // Find the cell with the most gaps for urgency
  let maxGap = 0;
  let gapClub = '';
  let gapRank = '';
  for (const row of rows) {
    for (let ri = 0; ri < row.cells.length; ri++) {
      const cell = row.cells[ri];
      const gap = Math.max(0, cell.capacity - cell.filled);
      if (gap > maxGap) {
        maxGap = gap;
        gapClub = row.name;
        gapRank = rankLabels[ri];
      }
    }
  }

  let urgency: UrgencyMessage;
  let urgencyLevel: UrgencyLevel;

  if (urgencyFilled >= capacity) {
    urgency = { key: 'breakdown.full' };
    urgencyLevel = 'success';
  } else {
    // If no per-cell gap (rounding edge case), find the weakest cell
    if (maxGap === 0) {
      maxGap = Math.max(0, capacity - urgencyFilled);
      // Pick the cell with fewest players
      let minFilled = Infinity;
      for (const row of rows) {
        for (let ri = 0; ri < row.cells.length; ri++) {
          if (row.cells[ri].filled < minFilled) {
            minFilled = row.cells[ri].filled;
            gapClub = row.name;
            gapRank = rankLabels[ri];
          }
        }
      }
    }

    if (captainMode) {
      // Captain mode: "very empty" = danger (concerning — captain needs to recruit)
      urgency = { key: 'breakdown.noRankPlayersCaptain', params: { club: shortLabel(gapClub), rank: shortLabel(gapRank) } };
      urgencyLevel = maxGap > 4 ? 'danger' : maxGap > 2 ? 'warning' : 'neutral';
    } else {
      // Non-captain: "almost full" = danger (exciting — hurry up!)
      urgency = { key: 'breakdown.noRankPlayers', params: { club: shortLabel(gapClub), rank: shortLabel(gapRank), count: maxGap } };
      urgencyLevel = maxGap <= 2 ? 'danger' : maxGap <= 4 ? 'warning' : 'neutral';
    }
  }

  return {
    kind: 'club-ranked',
    captainMode,
    hasPairs,
    rankLabels,
    rows,
    filled: matrixFilled + unplacedCount,
    total: capacity,
    urgency,
    urgencyLevel,
  };
}

// ── Group ──

function computeGroupBreakdown(
  confirmed: { group?: 'A' | 'B' }[],
  capacity: number,
  groupLabels?: [string, string],
): GroupBreakdown {
  const perGroup = Math.floor(capacity / 2);
  const labelA = groupLabels?.[0] ?? 'Group A';
  const labelB = groupLabels?.[1] ?? 'Group B';

  const filledA = confirmed.filter(p => p.group === 'A').length;
  const filledB = confirmed.filter(p => p.group === 'B').length;

  const groups: GroupBarData[] = [
    { group: 'A', label: labelA, filled: filledA, capacity: perGroup },
    { group: 'B', label: labelB, filled: filledB, capacity: perGroup },
  ];

  const totalFilled = filledA + filledB + confirmed.filter(p => !p.group).length;

  // Find group with most gaps
  const gapA = Math.max(0, perGroup - filledA);
  const gapB = Math.max(0, perGroup - filledB);

  let urgency: UrgencyMessage;
  let urgencyLevel: UrgencyLevel;

  if (totalFilled >= capacity) {
    urgency = { key: 'breakdown.full' };
    urgencyLevel = 'success';
  } else if (gapA > gapB && gapA > 0) {
    urgency = { key: 'breakdown.groupNeedsMore', params: { group: labelA, count: gapA } };
    urgencyLevel = gapA <= 2 ? 'danger' : gapA <= 4 ? 'warning' : 'neutral';
  } else if (gapB > 0) {
    urgency = { key: 'breakdown.groupNeedsMore', params: { group: labelB, count: gapB } };
    urgencyLevel = gapB <= 2 ? 'danger' : gapB <= 4 ? 'warning' : 'neutral';
  } else {
    urgency = { key: 'breakdown.full' };
    urgencyLevel = 'success';
  }

  return {
    kind: 'group',
    groups,
    filled: totalFilled,
    total: capacity,
    urgency,
    urgencyLevel,
  };
}

// ── Helpers ──

function urgencyFromSpots(spotsLeft: number): { urgency: UrgencyMessage; urgencyLevel: UrgencyLevel } {
  if (spotsLeft === 0) {
    return { urgency: { key: 'breakdown.full' }, urgencyLevel: 'success' };
  }
  if (spotsLeft === 1) {
    return { urgency: { key: 'breakdown.lastSpot' }, urgencyLevel: 'danger' };
  }
  if (spotsLeft <= 2) {
    return { urgency: { key: 'breakdown.hurrySpots', params: { count: spotsLeft } }, urgencyLevel: 'danger' };
  }
  if (spotsLeft <= 4) {
    return { urgency: { key: 'breakdown.hurrySpots', params: { count: spotsLeft } }, urgencyLevel: 'warning' };
  }
  return { urgency: { key: 'breakdown.spotsOpen', params: { count: spotsLeft } }, urgencyLevel: 'neutral' };
}

function clubUrgency(bars: ClubBarData[], totalFilled: number, capacity: number, captainMode: boolean): { urgency: UrgencyMessage; urgencyLevel: UrgencyLevel } {
  if (totalFilled >= capacity) {
    return { urgency: { key: 'breakdown.full' }, urgencyLevel: 'success' };
  }

  // Find club with biggest gap to capacity
  let maxGap = 0;
  let gapClubName = '';
  for (const bar of bars) {
    const gap = Math.max(0, bar.capacity - bar.filled);
    if (gap > maxGap) {
      maxGap = gap;
      gapClubName = bar.name;
    }
  }

  // If no per-club gap (rounding edge case), pick the club with fewest players
  if (maxGap === 0) {
    let minFilled = Infinity;
    for (const bar of bars) {
      if (bar.filled < minFilled) {
        minFilled = bar.filled;
        gapClubName = bar.name;
      }
    }
    maxGap = Math.max(0, capacity - totalFilled);
  }

  if (captainMode) {
    // Captain mode: "very empty" = danger (concerning — captain needs to recruit)
    return {
      urgency: { key: 'breakdown.clubNeedsMoreCaptain', params: { club: shortLabel(gapClubName) } },
      urgencyLevel: maxGap > 4 ? 'danger' : maxGap > 2 ? 'warning' : 'neutral',
    };
  }

  // Non-captain: "almost full" = danger (exciting — hurry up!)
  return {
    urgency: { key: 'breakdown.clubNeedsMore', params: { club: shortLabel(gapClubName), count: maxGap } },
    urgencyLevel: maxGap <= 2 ? 'danger' : maxGap <= 4 ? 'warning' : 'neutral',
  };
}
