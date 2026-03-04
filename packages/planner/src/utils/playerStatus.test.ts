import { describe, it, expect } from 'vitest';
import { getPlayerStatuses } from './playerStatus';
import type { PlannerRegistration, Club } from '@padel/common';

function makePlayer(id: string, opts?: { confirmed?: boolean; group?: 'A' | 'B'; clubId?: string; rankSlot?: number; timestamp?: number; partnerName?: string; partnerTelegram?: string; pairedAt?: number; captainApproved?: boolean }): PlannerRegistration {
  return {
    id,
    name: `Player ${id}`,
    confirmed: opts?.confirmed ?? true,
    timestamp: opts?.timestamp ?? parseInt(id, 10),
    group: opts?.group,
    clubId: opts?.clubId,
    rankSlot: opts?.rankSlot,
    partnerName: opts?.partnerName,
    partnerTelegram: opts?.partnerTelegram,
    pairedAt: opts?.pairedAt,
    captainApproved: opts?.captainApproved,
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

    it('captain mode: unapproved player gets registered', () => {
      const players = [
        makePlayer('1', { rankSlot: 0, clubId: 'c1', timestamp: 1 }),
        makePlayer('2', { rankSlot: 0, clubId: 'c2', timestamp: 2, captainApproved: true }),
      ];
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels, captainMode: true });
      expect(statuses.get('1')).toBe('registered');
      expect(statuses.get('2')).toBe('playing');
    });

    it('captain mode: approved player within bucket gets playing', () => {
      const players = [
        makePlayer('1', { rankSlot: 0, clubId: 'c1', timestamp: 1, captainApproved: true }),
        makePlayer('2', { rankSlot: 0, clubId: 'c2', timestamp: 2, captainApproved: true }),
      ];
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels, captainMode: true });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
    });

    it('captain mode: approved player over bucket gets reserve', () => {
      const players = [
        makePlayer('1', { rankSlot: 0, clubId: 'c1', timestamp: 1, captainApproved: true }),
        makePlayer('2', { rankSlot: 0, clubId: 'c1', timestamp: 2, captainApproved: true }),
        makePlayer('3', { rankSlot: 0, clubId: 'c1', timestamp: 3, captainApproved: true }), // over bucket
      ];
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels, captainMode: true });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('reserve');
    });

    it('captain mode off: unchanged behavior (regression)', () => {
      const players = [
        makePlayer('1', { rankSlot: 0, clubId: 'c1', timestamp: 1 }),
        makePlayer('2', { rankSlot: 0, clubId: 'c2', timestamp: 2 }),
      ];
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels, captainMode: false });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
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

  describe('pair-format (team-americano)', () => {
    it('solo player gets needs-partner', () => {
      const players = [
        makePlayer('1', { timestamp: 1 }), // no partner
      ];
      const statuses = getPlayerStatuses(players, 8, { format: 'team-americano' });
      expect(statuses.get('1')).toBe('needs-partner');
    });

    it('paired within capacity gets playing', () => {
      const players = [
        makePlayer('1', { timestamp: 1, partnerName: 'Player 2', pairedAt: 100 }),
        makePlayer('2', { timestamp: 2, partnerName: 'Player 1', pairedAt: 100 }),
      ];
      // capacity=8, pair cap = 4
      const statuses = getPlayerStatuses(players, 8, { format: 'team-americano' });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
    });

    it('paired over capacity gets reserve', () => {
      const players = [
        makePlayer('1', { timestamp: 1, partnerName: 'Player 2', pairedAt: 100 }),
        makePlayer('2', { timestamp: 2, partnerName: 'Player 1', pairedAt: 100 }),
        makePlayer('3', { timestamp: 3, partnerName: 'Player 4', pairedAt: 200 }),
        makePlayer('4', { timestamp: 4, partnerName: 'Player 3', pairedAt: 200 }),
      ];
      // capacity=2 → pair cap = 1
      const statuses = getPlayerStatuses(players, 2, { format: 'team-americano' });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('reserve');
      expect(statuses.get('4')).toBe('reserve');
    });

    it('pair with earlier pairedAt wins the slot', () => {
      const players = [
        makePlayer('1', { timestamp: 1, partnerName: 'Player 2', pairedAt: 500 }),
        makePlayer('2', { timestamp: 2, partnerName: 'Player 1', pairedAt: 500 }),
        makePlayer('3', { timestamp: 3, partnerName: 'Player 4', pairedAt: 100 }),
        makePlayer('4', { timestamp: 4, partnerName: 'Player 3', pairedAt: 100 }),
      ];
      // capacity=2 → pair cap = 1. Pair 3+4 paired earlier (100 < 500)
      const statuses = getPlayerStatuses(players, 2, { format: 'team-americano' });
      expect(statuses.get('3')).toBe('playing');
      expect(statuses.get('4')).toBe('playing');
      expect(statuses.get('1')).toBe('reserve');
      expect(statuses.get('2')).toBe('reserve');
    });

    it('captain mode: unapproved pair gets registered', () => {
      const players = [
        makePlayer('1', { timestamp: 1, partnerName: 'Player 2', pairedAt: 100 }),
        makePlayer('2', { timestamp: 2, partnerName: 'Player 1', pairedAt: 100 }),
      ];
      const statuses = getPlayerStatuses(players, 8, { format: 'team-americano', captainMode: true });
      expect(statuses.get('1')).toBe('registered');
      expect(statuses.get('2')).toBe('registered');
    });

    it('captain mode: approved pair gets playing/reserve based on capacity', () => {
      const players = [
        makePlayer('1', { timestamp: 1, partnerName: 'Player 2', pairedAt: 100, captainApproved: true }),
        makePlayer('2', { timestamp: 2, partnerName: 'Player 1', pairedAt: 100, captainApproved: true }),
        makePlayer('3', { timestamp: 3, partnerName: 'Player 4', pairedAt: 200, captainApproved: true }),
        makePlayer('4', { timestamp: 4, partnerName: 'Player 3', pairedAt: 200, captainApproved: true }),
      ];
      // capacity=2 → pair cap = 1
      const statuses = getPlayerStatuses(players, 2, { format: 'team-americano', captainMode: true });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('reserve');
      expect(statuses.get('4')).toBe('reserve');
    });

    it('club pair format distributes pair capacity per club', () => {
      const clubs: Club[] = [
        { id: 'c1', name: 'Club A' },
        { id: 'c2', name: 'Club B' },
      ];
      const players = [
        makePlayer('1', { timestamp: 1, clubId: 'c1', partnerName: 'Player 2', pairedAt: 100 }),
        makePlayer('2', { timestamp: 2, clubId: 'c1', partnerName: 'Player 1', pairedAt: 100 }),
        makePlayer('3', { timestamp: 3, clubId: 'c1', partnerName: 'Player 4', pairedAt: 200 }),
        makePlayer('4', { timestamp: 4, clubId: 'c1', partnerName: 'Player 3', pairedAt: 200 }),
        makePlayer('5', { timestamp: 5, clubId: 'c2', partnerName: 'Player 6', pairedAt: 150 }),
        makePlayer('6', { timestamp: 6, clubId: 'c2', partnerName: 'Player 5', pairedAt: 150 }),
      ];
      // capacity=4 → pair cap=2, per club pair cap=1
      const statuses = getPlayerStatuses(players, 4, { format: 'club-team-americano', clubs });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('reserve'); // 2nd c1 pair exceeds per-club cap
      expect(statuses.get('4')).toBe('reserve');
      expect(statuses.get('5')).toBe('playing');
      expect(statuses.get('6')).toBe('playing');
    });

    it('non-pair format (americano) is unchanged (regression)', () => {
      const players = [
        makePlayer('1', { timestamp: 1 }),
        makePlayer('2', { timestamp: 2 }),
        makePlayer('3', { timestamp: 3 }),
      ];
      const statuses = getPlayerStatuses(players, 2, { format: 'americano' });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('reserve');
    });

    it('cancelled players still get cancelled status', () => {
      const players = [
        makePlayer('1', { timestamp: 1, confirmed: false }),
        makePlayer('2', { timestamp: 2, partnerName: 'Player 3', pairedAt: 100 }),
        makePlayer('3', { timestamp: 3, partnerName: 'Player 2', pairedAt: 100 }),
      ];
      const statuses = getPlayerStatuses(players, 8, { format: 'team-mexicano' });
      expect(statuses.get('1')).toBe('cancelled');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('playing');
    });

    it('partner referencing a cancelled player — solo player gets needs-partner', () => {
      const players = [
        makePlayer('1', { timestamp: 1, partnerName: 'Player 2', pairedAt: 100 }),
        makePlayer('2', { timestamp: 2, partnerName: 'Player 1', pairedAt: 100, confirmed: false }),
      ];
      const statuses = getPlayerStatuses(players, 8, { format: 'team-americano' });
      expect(statuses.get('2')).toBe('cancelled');
      expect(statuses.get('1')).toBe('needs-partner'); // partner is cancelled
    });

    it('pairedAt fallback to timestamp when pairedAt is missing', () => {
      const players = [
        makePlayer('1', { timestamp: 100, partnerName: 'Player 2' }), // no pairedAt
        makePlayer('2', { timestamp: 200, partnerName: 'Player 1' }), // no pairedAt
        makePlayer('3', { timestamp: 300, partnerName: 'Player 4', pairedAt: 50 }),
        makePlayer('4', { timestamp: 400, partnerName: 'Player 3', pairedAt: 50 }),
      ];
      // capacity=2 → pair cap=1. Pair 3+4 pairedAt=50 < pair 1+2 fallback=min(100,200)=100
      const statuses = getPlayerStatuses(players, 2, { format: 'team-americano' });
      expect(statuses.get('3')).toBe('playing');
      expect(statuses.get('4')).toBe('playing');
      expect(statuses.get('1')).toBe('reserve');
      expect(statuses.get('2')).toBe('reserve');
    });

    it('capacity 0 — all paired players become reserve', () => {
      const players = [
        makePlayer('1', { timestamp: 1, partnerName: 'Player 2', pairedAt: 100 }),
        makePlayer('2', { timestamp: 2, partnerName: 'Player 1', pairedAt: 100 }),
      ];
      const statuses = getPlayerStatuses(players, 0, { format: 'team-americano' });
      expect(statuses.get('1')).toBe('reserve');
      expect(statuses.get('2')).toBe('reserve');
    });

    it('odd capacity — pair cap rounds down', () => {
      const players = [
        makePlayer('1', { timestamp: 1, partnerName: 'Player 2', pairedAt: 100 }),
        makePlayer('2', { timestamp: 2, partnerName: 'Player 1', pairedAt: 100 }),
        makePlayer('3', { timestamp: 3, partnerName: 'Player 4', pairedAt: 200 }),
        makePlayer('4', { timestamp: 4, partnerName: 'Player 3', pairedAt: 200 }),
      ];
      // capacity=5 → pair cap = Math.floor(5/2) = 2
      const statuses = getPlayerStatuses(players, 5, { format: 'team-americano' });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('playing');
      expect(statuses.get('4')).toBe('playing');
    });

    it('captain mode: one partner approved, other not — still registered', () => {
      const players = [
        makePlayer('1', { timestamp: 1, partnerName: 'Player 2', pairedAt: 100, captainApproved: true }),
        makePlayer('2', { timestamp: 2, partnerName: 'Player 1', pairedAt: 100 }), // not approved
      ];
      const statuses = getPlayerStatuses(players, 8, { format: 'team-americano', captainMode: true });
      // Both should be 'registered' because not both approved
      expect(statuses.get('1')).toBe('registered');
      expect(statuses.get('2')).toBe('registered');
    });

    it('mixed solo and paired players', () => {
      const players = [
        makePlayer('1', { timestamp: 1, partnerName: 'Player 2', pairedAt: 100 }),
        makePlayer('2', { timestamp: 2, partnerName: 'Player 1', pairedAt: 100 }),
        makePlayer('3', { timestamp: 3 }), // solo
        makePlayer('4', { timestamp: 4, partnerName: 'Player 5', pairedAt: 200 }),
        makePlayer('5', { timestamp: 5, partnerName: 'Player 4', pairedAt: 200 }),
      ];
      const statuses = getPlayerStatuses(players, 8, { format: 'team-americano' });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('needs-partner');
      expect(statuses.get('4')).toBe('playing');
      expect(statuses.get('5')).toBe('playing');
    });

    it('all formats in formatHasFixedPartners use pair logic (except club-ranked)', () => {
      const pairFormats = ['team-americano', 'team-mexicano', 'mixed-team-americano', 'mixed-team-mexicano', 'club-team-americano', 'club-team-mexicano'] as const;
      for (const format of pairFormats) {
        const players = [makePlayer('1', { timestamp: 1 })]; // solo
        const statuses = getPlayerStatuses(players, 8, { format });
        expect(statuses.get('1'), `format ${format}`).toBe('needs-partner');
      }
    });

    it('club-ranked format does NOT use pair logic', () => {
      const players = [makePlayer('1', { timestamp: 1 })]; // solo, no partner
      const clubs: Club[] = [{ id: 'c1', name: 'Club A' }];
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs });
      // Should NOT be 'needs-partner' — club-ranked has its own logic
      expect(statuses.get('1')).not.toBe('needs-partner');
    });
  });
});
