import { describe, it, expect } from 'vitest';
import { getPlayerStatuses } from './playerStatus';
import type { PlannerRegistration, Club } from '@padel/common';

function makePlayer(id: string, opts?: { confirmed?: boolean; group?: 'A' | 'B'; clubId?: string; rankSlot?: number; timestamp?: number }): PlannerRegistration {
  return {
    id,
    name: `Player ${id}`,
    confirmed: opts?.confirmed ?? true,
    timestamp: opts?.timestamp ?? parseInt(id, 10),
    group: opts?.group,
    clubId: opts?.clubId,
    rankSlot: opts?.rankSlot,
  } as PlannerRegistration;
}

describe('getPlayerStatuses', () => {
  describe('default behavior', () => {
    it('marks first N players as playing', () => {
      const players = [makePlayer('1'), makePlayer('2'), makePlayer('3')];
      const statuses = getPlayerStatuses(players, 2);
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('reserve');
    });

    it('marks cancelled players as cancelled', () => {
      const players = [makePlayer('1', { confirmed: false }), makePlayer('2')];
      const statuses = getPlayerStatuses(players, 4);
      expect(statuses.get('1')).toBe('cancelled');
      expect(statuses.get('2')).toBe('playing');
    });
  });

  describe('club format', () => {
    const clubs: Club[] = [
      { id: 'c1', name: 'Club A' },
      { id: 'c2', name: 'Club B' },
    ];

    it('distributes capacity evenly across clubs', () => {
      const players = [
        makePlayer('1', { clubId: 'c1', timestamp: 1 }),
        makePlayer('2', { clubId: 'c1', timestamp: 2 }),
        makePlayer('3', { clubId: 'c1', timestamp: 3 }),
        makePlayer('4', { clubId: 'c2', timestamp: 4 }),
        makePlayer('5', { clubId: 'c2', timestamp: 5 }),
      ];
      // capacity=4, 2 clubs → 2 per club
      const statuses = getPlayerStatuses(players, 4, { format: 'club-ranked', clubs });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('reserve'); // 3rd in club A, only 2 spots
      expect(statuses.get('4')).toBe('playing');
      expect(statuses.get('5')).toBe('playing');
    });

    it('puts unassigned players in remaining slots', () => {
      const players = [
        makePlayer('1', { clubId: 'c1', timestamp: 1 }),
        makePlayer('2', { timestamp: 2 }), // no club
        makePlayer('3', { clubId: 'c2', timestamp: 3 }),
      ];
      // capacity=4, 2 clubs → 2 per club; club A uses 1, club B uses 1 → 2 remaining
      const statuses = getPlayerStatuses(players, 4, { format: 'club-ranked', clubs });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('3')).toBe('playing');
      expect(statuses.get('2')).toBe('playing'); // fills remaining slot
    });

    it('marks excess unassigned players as reserve', () => {
      const players = [
        makePlayer('1', { clubId: 'c1', timestamp: 1 }),
        makePlayer('2', { clubId: 'c1', timestamp: 2 }),
        makePlayer('3', { clubId: 'c2', timestamp: 3 }),
        makePlayer('4', { clubId: 'c2', timestamp: 4 }),
        makePlayer('5', { timestamp: 5 }), // unassigned
        makePlayer('6', { timestamp: 6 }), // unassigned
      ];
      // capacity=4, 2 per club → clubs fill 4 spots, no room for unassigned
      const statuses = getPlayerStatuses(players, 4, { format: 'club-ranked', clubs });
      expect(statuses.get('5')).toBe('reserve');
      expect(statuses.get('6')).toBe('reserve');
    });

    it('falls back to default when no players have clubId', () => {
      const players = [
        makePlayer('1', { timestamp: 1 }),
        makePlayer('2', { timestamp: 2 }),
        makePlayer('3', { timestamp: 3 }),
      ];
      const statuses = getPlayerStatuses(players, 2, { format: 'club-ranked', clubs });
      // No clubId on any player → falls through to default logic
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('reserve');
    });

    it('handles cancelled players in club format', () => {
      const players = [
        makePlayer('1', { clubId: 'c1', confirmed: false, timestamp: 1 }),
        makePlayer('2', { clubId: 'c1', timestamp: 2 }),
        makePlayer('3', { clubId: 'c2', timestamp: 3 }),
      ];
      const statuses = getPlayerStatuses(players, 4, { format: 'club-ranked', clubs });
      expect(statuses.get('1')).toBe('cancelled');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('playing');
    });

    it('falls back to default when clubs array is empty', () => {
      const players = [
        makePlayer('1', { clubId: 'c1', timestamp: 1 }),
        makePlayer('2', { timestamp: 2 }),
      ];
      const statuses = getPlayerStatuses(players, 2, { format: 'club-ranked', clubs: [] });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
    });
  });

  describe('club-ranked format (per-club-per-rank capacity)', () => {
    const clubs: Club[] = [
      { id: 'c1', name: 'Club A' },
      { id: 'c2', name: 'Club B' },
    ];
    const rankLabels = ['Beginners', 'Advanced'];

    // 2 clubs, capacity 8 → 4 per club; 2 ranks → 2 per (club, rank)
    it('limits per club per rank bucket', () => {
      const players = [
        makePlayer('1', { rankSlot: 0, clubId: 'c1', timestamp: 1 }),
        makePlayer('2', { rankSlot: 0, clubId: 'c1', timestamp: 2 }),
        makePlayer('3', { rankSlot: 0, clubId: 'c1', timestamp: 3 }), // 3rd in c1/rank0 → reserve
        makePlayer('4', { rankSlot: 0, clubId: 'c2', timestamp: 4 }),
        makePlayer('5', { rankSlot: 1, clubId: 'c1', timestamp: 5 }),
      ];
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('reserve'); // bucket c1/rank0 full (2 slots)
      expect(statuses.get('4')).toBe('playing');
      expect(statuses.get('5')).toBe('playing');
    });

    it('players with club but no rank fill remaining club slots', () => {
      const players = [
        makePlayer('1', { rankSlot: 0, clubId: 'c1', timestamp: 1 }),
        makePlayer('2', { clubId: 'c1', timestamp: 2 }), // no rank, same club
      ];
      // c1 has 4 slots, rank0 uses 1 → 3 remaining for no-rank (perBucket=2, only 1 used)
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
    });

    it('fully unassigned players fill remaining global slots', () => {
      const players = [
        makePlayer('1', { rankSlot: 0, clubId: 'c1', timestamp: 1 }),
        makePlayer('2', { timestamp: 2 }), // no club, no rank
      ];
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
    });

    it('marks excess as reserve when all buckets full', () => {
      const players = [
        makePlayer('1', { rankSlot: 0, clubId: 'c1', timestamp: 1 }),
        makePlayer('2', { rankSlot: 0, clubId: 'c1', timestamp: 2 }),
        makePlayer('3', { rankSlot: 1, clubId: 'c1', timestamp: 3 }),
        makePlayer('4', { rankSlot: 1, clubId: 'c1', timestamp: 4 }),
        makePlayer('5', { rankSlot: 0, clubId: 'c2', timestamp: 5 }),
        makePlayer('6', { rankSlot: 0, clubId: 'c2', timestamp: 6 }),
        makePlayer('7', { rankSlot: 1, clubId: 'c2', timestamp: 7 }),
        makePlayer('8', { rankSlot: 1, clubId: 'c2', timestamp: 8 }),
        makePlayer('9', { timestamp: 9 }), // capacity 8 full
      ];
      // capacity=8, 2 clubs → 4 per club, 2 ranks → 2 per (club, rank)
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels });
      for (let i = 1; i <= 8; i++) {
        expect(statuses.get(String(i))).toBe('playing');
      }
      expect(statuses.get('9')).toBe('reserve');
    });

    it('falls through to club logic when no rankLabels provided', () => {
      const players = [
        makePlayer('1', { clubId: 'c1', timestamp: 1 }),
        makePlayer('2', { clubId: 'c1', timestamp: 2 }),
        makePlayer('3', { clubId: 'c1', timestamp: 3 }),
        makePlayer('4', { clubId: 'c2', timestamp: 4 }),
      ];
      // No rankLabels → per-club capacity (2 per club)
      const statuses = getPlayerStatuses(players, 4, { format: 'club-ranked', clubs });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('reserve');
      expect(statuses.get('4')).toBe('playing');
    });

    it('handles cancelled players', () => {
      const players = [
        makePlayer('1', { rankSlot: 0, clubId: 'c1', confirmed: false, timestamp: 1 }),
        makePlayer('2', { rankSlot: 0, clubId: 'c2', timestamp: 2 }),
      ];
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels });
      expect(statuses.get('1')).toBe('cancelled');
      expect(statuses.get('2')).toBe('playing');
    });

    it('keeps per-bucket capacity even and gives extra pair to rank with earliest overflow', () => {
      // capacity=12, 2 clubs → 6 per club, 2 ranks → raw 3 per bucket (odd)
      // base=2 (rounded down to even), remainingPerClub=2, 1 bonus pair
      const players = [
        makePlayer('1',  { rankSlot: 0, clubId: 'c1', timestamp: 1 }),
        makePlayer('2',  { rankSlot: 0, clubId: 'c2', timestamp: 2 }),
        makePlayer('3',  { rankSlot: 1, clubId: 'c1', timestamp: 3 }),
        makePlayer('4',  { rankSlot: 1, clubId: 'c2', timestamp: 4 }),
        makePlayer('5',  { rankSlot: 0, clubId: 'c1', timestamp: 5 }),
        makePlayer('6',  { rankSlot: 0, clubId: 'c2', timestamp: 6 }),
        makePlayer('7',  { rankSlot: 1, clubId: 'c1', timestamp: 7 }),
        makePlayer('8',  { rankSlot: 1, clubId: 'c2', timestamp: 8 }),
        // base slots full (2 per bucket). Next overflow decides bonus rank.
        makePlayer('9',  { rankSlot: 0, clubId: 'c1', timestamp: 9 }),  // rank 0 overflows first → gets +2
        makePlayer('10', { rankSlot: 0, clubId: 'c2', timestamp: 10 }), // fits in rank 0 bonus
        makePlayer('11', { rankSlot: 1, clubId: 'c1', timestamp: 11 }), // rank 1 no bonus → reserve
        makePlayer('12', { rankSlot: 1, clubId: 'c2', timestamp: 12 }), // rank 1 no bonus → reserve
      ];
      const statuses = getPlayerStatuses(players, 12, { format: 'club-ranked', clubs, rankLabels });
      // rank 0: cap 4 per club
      expect(statuses.get('9')).toBe('playing');
      expect(statuses.get('10')).toBe('playing');
      // rank 1: cap 2 per club
      expect(statuses.get('11')).toBe('reserve');
      expect(statuses.get('12')).toBe('reserve');
    });

    it('gives bonus to rank 1 when it overflows first', () => {
      // Same setup but rank 1 overflows before rank 0
      const players = [
        makePlayer('1',  { rankSlot: 0, clubId: 'c1', timestamp: 1 }),
        makePlayer('2',  { rankSlot: 1, clubId: 'c1', timestamp: 2 }),
        makePlayer('3',  { rankSlot: 0, clubId: 'c2', timestamp: 3 }),
        makePlayer('4',  { rankSlot: 1, clubId: 'c2', timestamp: 4 }),
        makePlayer('5',  { rankSlot: 1, clubId: 'c1', timestamp: 5 }),
        makePlayer('6',  { rankSlot: 1, clubId: 'c2', timestamp: 6 }),
        // rank 1 has 2 per club already; rank 0 has 1 per club
        makePlayer('7',  { rankSlot: 1, clubId: 'c1', timestamp: 7 }),  // rank 1 overflows → gets bonus
        makePlayer('8',  { rankSlot: 0, clubId: 'c1', timestamp: 8 }),
        makePlayer('9',  { rankSlot: 0, clubId: 'c2', timestamp: 9 }),
      ];
      const statuses = getPlayerStatuses(players, 12, { format: 'club-ranked', clubs, rankLabels });
      expect(statuses.get('7')).toBe('playing');  // rank 1 got bonus
    });
  });

  describe('mixicano format', () => {
    it('distributes capacity per group', () => {
      const players = [
        makePlayer('1', { group: 'A', timestamp: 1 }),
        makePlayer('2', { group: 'A', timestamp: 2 }),
        makePlayer('3', { group: 'A', timestamp: 3 }),
        makePlayer('4', { group: 'B', timestamp: 4 }),
        makePlayer('5', { group: 'B', timestamp: 5 }),
      ];
      // capacity=4, so 2 per group
      const statuses = getPlayerStatuses(players, 4, { format: 'mixicano' });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('reserve');
      expect(statuses.get('4')).toBe('playing');
      expect(statuses.get('5')).toBe('playing');
    });
  });
});
