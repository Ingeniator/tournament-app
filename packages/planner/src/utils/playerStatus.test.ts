import { describe, it, expect } from 'vitest';
import { getPlayerStatuses } from './playerStatus';
import type { PlannerRegistration, Club } from '@padel/common';

function makePlayer(id: string, opts?: { confirmed?: boolean; group?: 'A' | 'B'; clubId?: string; timestamp?: number }): PlannerRegistration {
  return {
    id,
    name: `Player ${id}`,
    confirmed: opts?.confirmed ?? true,
    timestamp: opts?.timestamp ?? parseInt(id, 10),
    group: opts?.group,
    clubId: opts?.clubId,
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
