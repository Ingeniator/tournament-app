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
    return computeClubBreakdown(confirmed, clubs, capacity, captainMode, format);
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
  _format: TournamentFormat,
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

  const totalFilled = clubBars.reduce((s, c) => s + Math.min(c.filled, c.capacity), 0);
  const unassigned = confirmed.filter(p => !p.clubId).length;

  // Find club with most open spots for urgency
  const { urgency, urgencyLevel } = clubUrgency(clubBars, totalFilled + unassigned, capacity, captainMode);

  return {
    kind: 'club',
    captainMode,
    clubs: clubBars,
    filled: totalFilled + unassigned,
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

  const totalFilled = rows.reduce((s, r) => s + r.cells.reduce((s2, c) => s2 + c.filled, 0), 0);

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

  if (totalFilled >= capacity) {
    urgency = { key: 'breakdown.full' };
    urgencyLevel = 'success';
  } else if (maxGap > 0 && gapRank) {
    // Captain mode: no specific count — captain decides who gets in
    urgency = captainMode
      ? { key: 'breakdown.noRankPlayersCaptain', params: { club: shortLabel(gapClub), rank: shortLabel(gapRank) } }
      : { key: 'breakdown.noRankPlayers', params: { club: shortLabel(gapClub), rank: shortLabel(gapRank), count: maxGap } };
    urgencyLevel = captainMode ? 'neutral' : (maxGap <= 2 ? 'warning' : 'danger');
  } else {
    const spotsLeft = Math.max(0, capacity - totalFilled);
    urgency = { key: 'breakdown.spotsOpen', params: { count: spotsLeft } };
    urgencyLevel = spotsLeft <= 2 ? 'warning' : 'neutral';
  }

  return {
    kind: 'club-ranked',
    captainMode,
    hasPairs,
    rankLabels,
    rows,
    filled: totalFilled,
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
    urgencyLevel = gapA <= 2 ? 'warning' : 'neutral';
  } else if (gapB > 0) {
    urgency = { key: 'breakdown.groupNeedsMore', params: { group: labelB, count: gapB } };
    urgencyLevel = gapB <= 2 ? 'warning' : 'neutral';
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
  if (spotsLeft <= 3) {
    return { urgency: { key: 'breakdown.hurrySpots', params: { count: spotsLeft } }, urgencyLevel: 'warning' };
  }
  return { urgency: { key: 'breakdown.spotsOpen', params: { count: spotsLeft } }, urgencyLevel: 'neutral' };
}

function clubUrgency(bars: ClubBarData[], totalFilled: number, capacity: number, captainMode: boolean): { urgency: UrgencyMessage; urgencyLevel: UrgencyLevel } {
  if (totalFilled >= capacity) {
    return { urgency: { key: 'breakdown.full' }, urgencyLevel: 'success' };
  }

  // Find club with fewest registrations (biggest imbalance)
  let minFilled = Infinity;
  let minClubName = '';
  for (const bar of bars) {
    if (bar.filled < minFilled) {
      minFilled = bar.filled;
      minClubName = bar.name;
    }
  }

  // Captain mode: no specific count — captain decides
  if (captainMode && minFilled < Math.max(...bars.map(b => b.filled))) {
    return {
      urgency: { key: 'breakdown.clubNeedsMoreCaptain', params: { club: shortLabel(minClubName) } },
      urgencyLevel: 'neutral',
    };
  }

  // Non-captain: show specific gap
  let maxGap = 0;
  let gapClubName = '';
  for (const bar of bars) {
    const gap = Math.max(0, bar.capacity - bar.filled);
    if (gap > maxGap) {
      maxGap = gap;
      gapClubName = bar.name;
    }
  }

  if (maxGap > 0) {
    return {
      urgency: { key: 'breakdown.clubNeedsMore', params: { club: shortLabel(gapClubName), count: maxGap } },
      urgencyLevel: maxGap <= 2 ? 'warning' : 'neutral',
    };
  }

  const spotsLeft = Math.max(0, capacity - totalFilled);
  return urgencyFromSpots(spotsLeft);
}
