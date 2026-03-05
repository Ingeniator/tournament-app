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

/** Create a pair of matched players sharing the same club/rank/captain options */
function makePair(
  id1: string, id2: string,
  shared?: { clubId?: string; rankSlot?: number; captainApproved?: boolean; pairedAt?: number },
): [PlannerRegistration, PlannerRegistration] {
  const ts1 = parseInt(id1, 10);
  const ts2 = parseInt(id2, 10);
  const pairedAt = shared?.pairedAt ?? Math.min(ts1, ts2);
  return [
    makePlayer(id1, { clubId: shared?.clubId, rankSlot: shared?.rankSlot, captainApproved: shared?.captainApproved, timestamp: ts1, partnerName: `Player ${id2}`, pairedAt }),
    makePlayer(id2, { clubId: shared?.clubId, rankSlot: shared?.rankSlot, captainApproved: shared?.captainApproved, timestamp: ts2, partnerName: `Player ${id1}`, pairedAt }),
  ];
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
      const statuses = getPlayerStatuses(players, 4, { format: 'club-americano', clubs });
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
      const statuses = getPlayerStatuses(players, 4, { format: 'club-americano', clubs });
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
      const statuses = getPlayerStatuses(players, 4, { format: 'club-americano', clubs });
      expect(statuses.get('5')).toBe('reserve');
      expect(statuses.get('6')).toBe('reserve');
    });

    it('falls back to default when no players have clubId', () => {
      const players = [
        makePlayer('1', { timestamp: 1 }),
        makePlayer('2', { timestamp: 2 }),
        makePlayer('3', { timestamp: 3 }),
      ];
      const statuses = getPlayerStatuses(players, 2, { format: 'club-americano', clubs });
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
      const statuses = getPlayerStatuses(players, 4, { format: 'club-americano', clubs });
      expect(statuses.get('1')).toBe('cancelled');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('playing');
    });

    it('falls back to default when clubs array is empty', () => {
      const players = [
        makePlayer('1', { clubId: 'c1', timestamp: 1 }),
        makePlayer('2', { timestamp: 2 }),
      ];
      const statuses = getPlayerStatuses(players, 2, { format: 'club-americano', clubs: [] });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
    });

    it('captain mode: unapproved player gets registered', () => {
      const players = [
        makePlayer('1', { clubId: 'c1', timestamp: 1 }),
        makePlayer('2', { clubId: 'c2', timestamp: 2, captainApproved: true }),
      ];
      const statuses = getPlayerStatuses(players, 4, { format: 'club-americano', clubs, captainMode: true });
      expect(statuses.get('1')).toBe('registered');
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
      const [p1, p2] = makePair('1', '2', { clubId: 'c1', rankSlot: 0 });
      const [p3, p4] = makePair('3', '4', { clubId: 'c1', rankSlot: 0 }); // 2nd pair in c1/r0 → reserve
      const [p5, p6] = makePair('5', '6', { clubId: 'c2', rankSlot: 0 });
      const [p7, p8] = makePair('7', '8', { clubId: 'c1', rankSlot: 1 });
      const players = [p1, p2, p3, p4, p5, p6, p7, p8];
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('reserve'); // bucket c1/rank0 full (2 slots)
      expect(statuses.get('4')).toBe('reserve');
      expect(statuses.get('5')).toBe('playing');
      expect(statuses.get('6')).toBe('playing');
      expect(statuses.get('7')).toBe('playing');
      expect(statuses.get('8')).toBe('playing');
    });

    it('players with club but no rank fill remaining club slots', () => {
      const [p1, p2] = makePair('1', '2', { clubId: 'c1', rankSlot: 0 });
      const [p3, p4] = makePair('3', '4', { clubId: 'c1' }); // no rank
      const players = [p1, p2, p3, p4];
      // c1 has 4 slots, rank0 uses 2 → 2 remaining for no-rank
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('playing');
      expect(statuses.get('4')).toBe('playing');
    });

    it('fully unassigned players fill remaining global slots', () => {
      const [p1, p2] = makePair('1', '2', { clubId: 'c1', rankSlot: 0 });
      const [p3, p4] = makePair('3', '4'); // no club, no rank
      const players = [p1, p2, p3, p4];
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('playing');
      expect(statuses.get('4')).toBe('playing');
    });

    it('marks excess as reserve when all buckets full', () => {
      const [p1, p2] = makePair('1', '2', { clubId: 'c1', rankSlot: 0 });
      const [p3, p4] = makePair('3', '4', { clubId: 'c1', rankSlot: 1 });
      const [p5, p6] = makePair('5', '6', { clubId: 'c2', rankSlot: 0 });
      const [p7, p8] = makePair('7', '8', { clubId: 'c2', rankSlot: 1 });
      const [p9, p10] = makePair('9', '10'); // capacity 8 full → overflow
      const players = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10];
      // capacity=8, 2 clubs → 4 per club, 2 ranks → 2 per (club, rank)
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels });
      for (let i = 1; i <= 8; i++) {
        expect(statuses.get(String(i))).toBe('playing');
      }
      expect(statuses.get('9')).toBe('reserve');
      expect(statuses.get('10')).toBe('reserve');
    });

    it('falls through to pair logic when no rankLabels provided', () => {
      const [p1, p2] = makePair('1', '2', { clubId: 'c1' });
      const [p3, p4] = makePair('3', '4', { clubId: 'c1' });
      const [p5, p6] = makePair('5', '6', { clubId: 'c2' });
      const players = [p1, p2, p3, p4, p5, p6];
      // No rankLabels → falls through to pair-format branch
      // cap=4 → pairCap=2, perClubPairCap=1
      const statuses = getPlayerStatuses(players, 4, { format: 'club-ranked', clubs });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('reserve'); // 2nd c1 pair exceeds per-club pair cap
      expect(statuses.get('4')).toBe('reserve');
      expect(statuses.get('5')).toBe('playing');
      expect(statuses.get('6')).toBe('playing');
    });

    it('handles cancelled players', () => {
      const p1 = makePlayer('1', { rankSlot: 0, clubId: 'c1', confirmed: false, timestamp: 1 });
      const [p2, p3] = makePair('2', '3', { clubId: 'c2', rankSlot: 0 });
      const players = [p1, p2, p3];
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels });
      expect(statuses.get('1')).toBe('cancelled');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('playing');
    });

    it('keeps per-bucket capacity even and gives extra pair to rank with earliest overflow', () => {
      // capacity=12, 2 clubs → 6 per club, 2 ranks → raw 3 per bucket (odd)
      // base=2 (rounded down to even), remainingPerClub=2, 1 bonus pair
      const [p1, p2] = makePair('1', '2', { clubId: 'c1', rankSlot: 0 });
      const [p3, p4] = makePair('3', '4', { clubId: 'c2', rankSlot: 0 });
      const [p5, p6] = makePair('5', '6', { clubId: 'c1', rankSlot: 1 });
      const [p7, p8] = makePair('7', '8', { clubId: 'c2', rankSlot: 1 });
      // rank 0 overflows first in c1 → gets bonus
      const [p9, p10] = makePair('9', '10', { clubId: 'c1', rankSlot: 0 });
      // rank 1 in c1 overflows after bonus used → reserve
      const [p11, p12] = makePair('11', '12', { clubId: 'c1', rankSlot: 1 });
      const players = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12];
      const statuses = getPlayerStatuses(players, 12, { format: 'club-ranked', clubs, rankLabels });
      // rank 0: cap 4 per club (base 2 + bonus 2)
      expect(statuses.get('9')).toBe('playing');
      expect(statuses.get('10')).toBe('playing');
      // rank 1: cap 2 per club (no bonus left)
      expect(statuses.get('11')).toBe('reserve');
      expect(statuses.get('12')).toBe('reserve');
    });

    it('captain mode: unapproved pair gets registered', () => {
      const [p1, p2] = makePair('1', '2', { clubId: 'c1', rankSlot: 0 }); // not approved
      const [p3, p4] = makePair('3', '4', { clubId: 'c2', rankSlot: 0, captainApproved: true });
      const players = [p1, p2, p3, p4];
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels, captainMode: true });
      expect(statuses.get('1')).toBe('registered');
      expect(statuses.get('2')).toBe('registered');
      expect(statuses.get('3')).toBe('playing');
      expect(statuses.get('4')).toBe('playing');
    });

    it('captain mode: approved pair within bucket gets playing', () => {
      const [p1, p2] = makePair('1', '2', { clubId: 'c1', rankSlot: 0, captainApproved: true });
      const [p3, p4] = makePair('3', '4', { clubId: 'c2', rankSlot: 0, captainApproved: true });
      const players = [p1, p2, p3, p4];
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels, captainMode: true });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('playing');
      expect(statuses.get('4')).toBe('playing');
    });

    it('captain mode: approved pair over bucket gets reserve', () => {
      const [p1, p2] = makePair('1', '2', { clubId: 'c1', rankSlot: 0, captainApproved: true });
      const [p3, p4] = makePair('3', '4', { clubId: 'c1', rankSlot: 0, captainApproved: true }); // over bucket
      const players = [p1, p2, p3, p4];
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels, captainMode: true });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('reserve');
      expect(statuses.get('4')).toBe('reserve');
    });

    it('captain mode off: unchanged behavior (regression)', () => {
      const [p1, p2] = makePair('1', '2', { clubId: 'c1', rankSlot: 0 });
      const [p3, p4] = makePair('3', '4', { clubId: 'c2', rankSlot: 0 });
      const players = [p1, p2, p3, p4];
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels, captainMode: false });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('playing');
      expect(statuses.get('4')).toBe('playing');
    });

    it('captain mode: one partner approved, other not — both registered', () => {
      const p1 = makePlayer('1', { clubId: 'c1', rankSlot: 0, timestamp: 1, partnerName: 'Player 2', pairedAt: 100, captainApproved: true });
      const p2 = makePlayer('2', { clubId: 'c1', rankSlot: 0, timestamp: 2, partnerName: 'Player 1', pairedAt: 100 }); // not approved
      const players = [p1, p2];
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels, captainMode: true });
      expect(statuses.get('1')).toBe('registered');
      expect(statuses.get('2')).toBe('registered');
    });

    it('gives bonus to rank 1 when it overflows first', () => {
      // Same setup but rank 1 overflows before rank 0
      const [p1, p2] = makePair('1', '2', { clubId: 'c1', rankSlot: 0 });
      const [p3, p4] = makePair('3', '4', { clubId: 'c1', rankSlot: 1 });
      const [p5, p6] = makePair('5', '6', { clubId: 'c2', rankSlot: 0 });
      const [p7, p8] = makePair('7', '8', { clubId: 'c2', rankSlot: 1 });
      // rank 1 overflows first in c1
      const [p9, p10] = makePair('9', '10', { clubId: 'c1', rankSlot: 1 });
      const players = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10];
      const statuses = getPlayerStatuses(players, 12, { format: 'club-ranked', clubs, rankLabels });
      expect(statuses.get('9')).toBe('playing');  // rank 1 got bonus
      expect(statuses.get('10')).toBe('playing');
    });

    it('paired players both get reserve when bucket overflows', () => {
      // bucket cap = 2. First pair fills it, second pair overflows → both reserve.
      const [p1, p2] = makePair('1', '2', { clubId: 'c1', rankSlot: 0 });
      const [p3, p4] = makePair('3', '4', { clubId: 'c1', rankSlot: 0 });
      const players = [p1, p2, p3, p4];
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      // Pair can't split — both reserve
      expect(statuses.get('3')).toBe('reserve');
      expect(statuses.get('4')).toBe('reserve');
    });

    it('paired players both play when bucket has room', () => {
      const [p1, p2] = makePair('1', '2', { clubId: 'c1', rankSlot: 0 });
      const players = [p1, p2];
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
    });

    it('paired players use bonus together', () => {
      // capacity=12, 2 clubs, 2 ranks → 6/club, base=2, 1 bonus pair per club
      // Fill base bucket (2), then pair overflows → uses bonus (+2 slots)
      const [p1, p2] = makePair('1', '2', { clubId: 'c1', rankSlot: 0 });
      const [p3, p4] = makePair('3', '4', { clubId: 'c1', rankSlot: 1 });
      // Pair that overflows base bucket → should use bonus together
      const [p5, p6] = makePair('5', '6', { clubId: 'c1', rankSlot: 0 });
      const players = [p1, p2, p3, p4, p5, p6];
      const statuses = getPlayerStatuses(players, 12, { format: 'club-ranked', clubs, rankLabels });
      expect(statuses.get('5')).toBe('playing');
      expect(statuses.get('6')).toBe('playing');
    });

    it('paired players both reserve when no bonus available', () => {
      // capacity=8, 2 clubs, 2 ranks → 4/club, base=2, 0 bonus pairs
      // Fill bucket, then pair overflows with no bonus
      const [p1, p2] = makePair('1', '2', { clubId: 'c1', rankSlot: 0 });
      const [p3, p4] = makePair('3', '4', { clubId: 'c1', rankSlot: 0 });
      const players = [p1, p2, p3, p4];
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels });
      expect(statuses.get('1')).toBe('playing');
      expect(statuses.get('2')).toBe('playing');
      expect(statuses.get('3')).toBe('reserve');
      expect(statuses.get('4')).toBe('reserve');
    });

    it('bonus pairs are independent per club (regression)', () => {
      // 12 capacity, 2 clubs, 2 ranks → 6/club, base=2, 1 bonus pair per club
      const [p1, p2] = makePair('1', '2', { clubId: 'c1', rankSlot: 0 });
      const [p3, p4] = makePair('3', '4', { clubId: 'c1', rankSlot: 1 });
      const [p5, p6] = makePair('5', '6', { clubId: 'c2', rankSlot: 0 });
      const [p7, p8] = makePair('7', '8', { clubId: 'c2', rankSlot: 1 });
      // c1 overflows rank 0 → uses c1's bonus
      const [p9, p10] = makePair('9', '10', { clubId: 'c1', rankSlot: 0 });
      // c2 overflows rank 1 → should use c2's own bonus (not consumed by c1)
      const [p11, p12] = makePair('11', '12', { clubId: 'c2', rankSlot: 1 });
      const players = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12];
      const statuses = getPlayerStatuses(players, 12, { format: 'club-ranked', clubs, rankLabels });
      expect(statuses.get('9')).toBe('playing');   // c1 bonus → rank 0
      expect(statuses.get('10')).toBe('playing');
      expect(statuses.get('11')).toBe('playing');  // c2 bonus → rank 1 (independent)
      expect(statuses.get('12')).toBe('playing');
    });

    it('solo player gets needs-partner', () => {
      const players = [makePlayer('1', { timestamp: 1 })];
      const statuses = getPlayerStatuses(players, 8, { format: 'club-ranked', clubs, rankLabels });
      expect(statuses.get('1')).toBe('needs-partner');
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

    it('all formats in formatHasFixedPartners use pair logic', () => {
      const pairFormats = ['team-americano', 'team-mexicano', 'mixed-team-americano', 'mixed-team-mexicano', 'club-ranked', 'club-team-americano', 'club-team-mexicano'] as const;
      for (const format of pairFormats) {
        const players = [makePlayer('1', { timestamp: 1 })]; // solo
        const statuses = getPlayerStatuses(players, 8, { format });
        expect(statuses.get('1'), `format ${format}`).toBe('needs-partner');
      }
    });
  });
});
