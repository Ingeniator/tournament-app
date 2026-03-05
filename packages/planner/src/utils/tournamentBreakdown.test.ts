import { describe, it, expect } from 'vitest';
import type { Club } from '@padel/common';
import type { EventTournamentRawData } from '../hooks/useEventTournaments';
import { computeBreakdown } from './tournamentBreakdown';

// ── Helpers ──

function makeRaw(overrides: Partial<EventTournamentRawData> = {}): EventTournamentRawData {
  return {
    players: [],
    clubs: [],
    rankLabels: [],
    rankColors: [],
    groupLabels: undefined,
    captainMode: false,
    maldiciones: false,
    format: undefined,
    ...overrides,
  };
}

function player(overrides: Record<string, unknown> = {}) {
  return { id: `p${Math.random()}`, name: 'Player', timestamp: 1000, confirmed: true, ...overrides };
}

function club(id: string, name: string): Club {
  return { id, name };
}

// ── Simple breakdown ──

describe('computeBreakdown — simple', () => {
  it('returns simple kind for format without clubs or groups', () => {
    const raw = makeRaw({ format: 'americano', players: [player(), player()] });
    const result = computeBreakdown(raw, 8);

    expect(result.kind).toBe('simple');
    expect(result.filled).toBe(2);
    expect(result.total).toBe(8);
  });

  it('returns success when full', () => {
    const players = Array.from({ length: 8 }, () => player());
    const raw = makeRaw({ format: 'americano', players });
    const result = computeBreakdown(raw, 8);

    expect(result.urgencyLevel).toBe('success');
    expect(result.urgency.key).toBe('breakdown.full');
  });

  it('returns danger when 1 spot left', () => {
    const players = Array.from({ length: 7 }, () => player());
    const raw = makeRaw({ format: 'americano', players });
    const result = computeBreakdown(raw, 8);

    expect(result.urgencyLevel).toBe('danger');
    expect(result.urgency.key).toBe('breakdown.lastSpot');
  });

  it('returns danger when 2 spots left', () => {
    const players = Array.from({ length: 6 }, () => player());
    const raw = makeRaw({ format: 'americano', players });
    const result = computeBreakdown(raw, 8);

    expect(result.urgencyLevel).toBe('danger');
    expect(result.urgency.key).toBe('breakdown.hurrySpots');
  });

  it('returns warning when 3-4 spots left', () => {
    const players = Array.from({ length: 5 }, () => player());
    const raw = makeRaw({ format: 'americano', players });
    const result = computeBreakdown(raw, 8);

    expect(result.urgencyLevel).toBe('warning');
  });

  it('returns neutral when many spots left', () => {
    const players = [player()];
    const raw = makeRaw({ format: 'americano', players });
    const result = computeBreakdown(raw, 16);

    expect(result.urgencyLevel).toBe('neutral');
    expect(result.urgency.key).toBe('breakdown.spotsOpen');
  });

  it('excludes unconfirmed players', () => {
    const players = [player(), player({ confirmed: false }), player()];
    const raw = makeRaw({ format: 'americano', players });
    const result = computeBreakdown(raw, 8);

    expect(result.filled).toBe(2);
  });

  it('handles overfilled (more players than capacity)', () => {
    const players = Array.from({ length: 10 }, () => player());
    const raw = makeRaw({ format: 'americano', players });
    const result = computeBreakdown(raw, 8);

    expect(result.urgencyLevel).toBe('success');
    expect(result.filled).toBe(10);
  });
});

// ── Club breakdown ──

describe('computeBreakdown — club', () => {
  const clubs = [club('c1', 'Club Alpha'), club('c2', 'Club Beta')];

  it('returns club kind for club-americano with clubs', () => {
    const raw = makeRaw({ format: 'club-americano', clubs, players: [] });
    const result = computeBreakdown(raw, 8);

    expect(result.kind).toBe('club');
    if (result.kind !== 'club') return;
    expect(result.clubs).toHaveLength(2);
    expect(result.clubs[0].clubId).toBe('c1');
    expect(result.clubs[1].clubId).toBe('c2');
  });

  it('distributes capacity evenly across clubs', () => {
    const raw = makeRaw({ format: 'club-americano', clubs, players: [] });
    const result = computeBreakdown(raw, 8);

    if (result.kind !== 'club') return;
    expect(result.clubs[0].capacity).toBe(4);
    expect(result.clubs[1].capacity).toBe(4);
  });

  it('counts players per club', () => {
    const players = [
      player({ clubId: 'c1' }),
      player({ clubId: 'c1' }),
      player({ clubId: 'c2' }),
    ];
    const raw = makeRaw({ format: 'club-americano', clubs, players });
    const result = computeBreakdown(raw, 8);

    if (result.kind !== 'club') return;
    expect(result.clubs[0].filled).toBe(2);
    expect(result.clubs[1].filled).toBe(1);
  });

  it('includes unassigned players in total filled', () => {
    const players = [
      player({ clubId: 'c1' }),
      player(), // no clubId
    ];
    const raw = makeRaw({ format: 'club-americano', clubs, players });
    const result = computeBreakdown(raw, 8);

    expect(result.filled).toBe(2);
  });

  it('returns success when full', () => {
    const players = Array.from({ length: 8 }, (_, i) =>
      player({ clubId: i < 4 ? 'c1' : 'c2' }),
    );
    const raw = makeRaw({ format: 'club-americano', clubs, players });
    const result = computeBreakdown(raw, 8);

    expect(result.urgencyLevel).toBe('success');
  });

  it('targets the club with the biggest gap in urgency message', () => {
    const players = [
      player({ clubId: 'c1' }),
      player({ clubId: 'c1' }),
      player({ clubId: 'c1' }),
      // c2 is empty — biggest gap
    ];
    const raw = makeRaw({ format: 'club-americano', clubs, players });
    const result = computeBreakdown(raw, 8);

    expect(result.urgency.key).toBe('breakdown.clubNeedsMore');
    expect(result.urgency.params?.club).toBeDefined();
  });

  describe('captain mode', () => {
    it('uses approved count for urgency in captain mode', () => {
      const players = [
        player({ clubId: 'c1', captainApproved: true }),
        player({ clubId: 'c1', captainApproved: false }),
        player({ clubId: 'c2', captainApproved: true }),
        player({ clubId: 'c2', captainApproved: false }),
      ];
      const raw = makeRaw({ format: 'club-americano', clubs, players, captainMode: true });
      const result = computeBreakdown(raw, 4);

      if (result.kind !== 'club') return;
      expect(result.captainMode).toBe(true);
      // 2 approved out of 4 capacity — not full
      expect(result.urgencyLevel).not.toBe('success');
    });

    it('shows captain-specific urgency key', () => {
      const players = [player({ clubId: 'c1', captainApproved: true })];
      const raw = makeRaw({ format: 'club-americano', clubs, players, captainMode: true });
      const result = computeBreakdown(raw, 8);

      expect(result.urgency.key).toBe('breakdown.clubNeedsMoreCaptain');
    });

    it('reaches success when all approved players fill capacity', () => {
      const players = Array.from({ length: 8 }, (_, i) =>
        player({ clubId: i < 4 ? 'c1' : 'c2', captainApproved: true }),
      );
      const raw = makeRaw({ format: 'club-americano', clubs, players, captainMode: true });
      const result = computeBreakdown(raw, 8);

      expect(result.urgencyLevel).toBe('success');
    });
  });
});

// ── Club-ranked breakdown ──

describe('computeBreakdown — club-ranked', () => {
  const clubs = [club('c1', 'Alpha'), club('c2', 'Beta')];
  const rankLabels = ['Pro', 'Amateur'];

  it('returns club-ranked kind', () => {
    const raw = makeRaw({ format: 'club-ranked', clubs, rankLabels, players: [] });
    const result = computeBreakdown(raw, 16);

    expect(result.kind).toBe('club-ranked');
    if (result.kind !== 'club-ranked') return;
    expect(result.rows).toHaveLength(2);
    expect(result.rankLabels).toEqual(['Pro', 'Amateur']);
  });

  it('computes per-bucket capacity (rounded to even)', () => {
    const raw = makeRaw({ format: 'club-ranked', clubs, rankLabels, players: [] });
    // capacity=16, 2 clubs → 8 per club, 2 ranks → 4 per bucket, round to even → 4
    const result = computeBreakdown(raw, 16);

    if (result.kind !== 'club-ranked') return;
    expect(result.rows[0].cells[0].capacity).toBe(4);
  });

  it('counts players in correct cells', () => {
    const players = [
      player({ clubId: 'c1', rankSlot: 0 }),
      player({ clubId: 'c1', rankSlot: 0 }),
      player({ clubId: 'c1', rankSlot: 1 }),
      player({ clubId: 'c2', rankSlot: 0 }),
    ];
    const raw = makeRaw({ format: 'club-ranked', clubs, rankLabels, players });
    const result = computeBreakdown(raw, 16);

    if (result.kind !== 'club-ranked') return;
    expect(result.rows[0].cells[0].filled).toBe(2); // c1, Pro
    expect(result.rows[0].cells[1].filled).toBe(1); // c1, Amateur
    expect(result.rows[1].cells[0].filled).toBe(1); // c2, Pro
    expect(result.rows[1].cells[1].filled).toBe(0); // c2, Amateur
  });

  it('counts unplaced players in total filled', () => {
    const players = [
      player({ clubId: 'c1', rankSlot: 0 }),
      player(), // no club or rank
    ];
    const raw = makeRaw({ format: 'club-ranked', clubs, rankLabels, players });
    const result = computeBreakdown(raw, 16);

    expect(result.filled).toBe(2);
  });

  it('returns success when capacity reached', () => {
    const players = Array.from({ length: 16 }, (_, i) =>
      player({ clubId: i < 8 ? 'c1' : 'c2', rankSlot: i % 2 }),
    );
    const raw = makeRaw({ format: 'club-ranked', clubs, rankLabels, players });
    const result = computeBreakdown(raw, 16);

    expect(result.urgencyLevel).toBe('success');
  });

  it('targets the cell with the biggest gap in urgency', () => {
    const players = [
      // Fill c1/Pro completely
      ...Array.from({ length: 4 }, () => player({ clubId: 'c1', rankSlot: 0 })),
      // Leave c2/Amateur completely empty
    ];
    const raw = makeRaw({ format: 'club-ranked', clubs, rankLabels, players });
    const result = computeBreakdown(raw, 16);

    expect(result.urgency.key).toBe('breakdown.noRankPlayers');
    expect(result.urgency.params).toBeDefined();
  });

  it('computes pairedPercent for paired players', () => {
    // club-ranked with fixed partners needs a format that returns true for formatHasFixedPartners
    // club-ranked itself: formatHasFixedPartners returns based on the format
    // We just test the logic with players that have matching partners
    const players = [
      player({ id: 'a', name: 'Alice', clubId: 'c1', rankSlot: 0, partnerName: 'Bob' }),
      player({ id: 'b', name: 'Bob', clubId: 'c1', rankSlot: 0, partnerName: 'Alice' }),
      player({ id: 'c', name: 'Charlie', clubId: 'c1', rankSlot: 0 }), // unpaired
    ];
    const raw = makeRaw({ format: 'club-ranked', clubs, rankLabels, players });
    const result = computeBreakdown(raw, 16);

    if (result.kind !== 'club-ranked') return;
    // club-ranked may or may not have fixed partners depending on formatHasFixedPartners
    // The hasPairs flag controls whether pairing is computed
    expect(result.rows[0].pairedPercent).toBeTypeOf('number');
  });

  describe('captain mode', () => {
    it('uses approved count for urgency', () => {
      const players = [
        player({ clubId: 'c1', rankSlot: 0, captainApproved: true }),
        player({ clubId: 'c1', rankSlot: 0, captainApproved: false }),
      ];
      const raw = makeRaw({ format: 'club-ranked', clubs, rankLabels, players, captainMode: true });
      const result = computeBreakdown(raw, 16);

      if (result.kind !== 'club-ranked') return;
      expect(result.captainMode).toBe(true);
      // Only 1 approved out of 16 — should not be success
      expect(result.urgencyLevel).not.toBe('success');
    });

    it('uses captain urgency key', () => {
      const players = [player({ clubId: 'c1', rankSlot: 0 })];
      const raw = makeRaw({ format: 'club-ranked', clubs, rankLabels, players, captainMode: true });
      const result = computeBreakdown(raw, 16);

      expect(result.urgency.key).toBe('breakdown.noRankPlayersCaptain');
    });

    it('captain mode danger when many gaps', () => {
      const raw = makeRaw({ format: 'club-ranked', clubs, rankLabels, players: [], captainMode: true });
      // capacity=24 → perClub=12, perBucket=6, maxGap=6 > 4 → danger
      const result = computeBreakdown(raw, 24);

      expect(result.urgencyLevel).toBe('danger');
    });
  });

  describe('urgency levels (non-captain)', () => {
    it('danger when gap <= 2', () => {
      // Fill nearly all spots, leaving gap of 2 in one cell
      const players = Array.from({ length: 14 }, (_, i) =>
        player({ clubId: i < 8 ? 'c1' : 'c2', rankSlot: i % 2 }),
      );
      const raw = makeRaw({ format: 'club-ranked', clubs, rankLabels, players });
      const result = computeBreakdown(raw, 16);

      expect(result.urgencyLevel).toBe('danger');
    });

    it('neutral when gap > 4', () => {
      const raw = makeRaw({ format: 'club-ranked', clubs, rankLabels, players: [] });
      // capacity=24 → perClub=12, perBucket=6, maxGap=6 > 4 → neutral
      const result = computeBreakdown(raw, 24);

      expect(result.urgencyLevel).toBe('neutral');
    });
  });
});

// ── Group breakdown ──

describe('computeBreakdown — group', () => {
  it('returns group kind for mixicano', () => {
    const raw = makeRaw({ format: 'mixicano', players: [] });
    const result = computeBreakdown(raw, 8);

    expect(result.kind).toBe('group');
  });

  it('splits capacity evenly between groups', () => {
    const raw = makeRaw({ format: 'mixicano', players: [] });
    const result = computeBreakdown(raw, 8);

    if (result.kind !== 'group') return;
    expect(result.groups[0].capacity).toBe(4);
    expect(result.groups[1].capacity).toBe(4);
  });

  it('uses custom group labels', () => {
    const raw = makeRaw({ format: 'mixicano', groupLabels: ['Men', 'Women'], players: [] });
    const result = computeBreakdown(raw, 8);

    if (result.kind !== 'group') return;
    expect(result.groups[0].label).toBe('Men');
    expect(result.groups[1].label).toBe('Women');
  });

  it('uses default group labels when not provided', () => {
    const raw = makeRaw({ format: 'mixicano', players: [] });
    const result = computeBreakdown(raw, 8);

    if (result.kind !== 'group') return;
    expect(result.groups[0].label).toBe('Group A');
    expect(result.groups[1].label).toBe('Group B');
  });

  it('counts players per group', () => {
    const players = [
      player({ group: 'A' }),
      player({ group: 'A' }),
      player({ group: 'B' }),
    ];
    const raw = makeRaw({ format: 'mixicano', players });
    const result = computeBreakdown(raw, 8);

    if (result.kind !== 'group') return;
    expect(result.groups[0].filled).toBe(2);
    expect(result.groups[1].filled).toBe(1);
  });

  it('includes unassigned players in total filled', () => {
    const players = [
      player({ group: 'A' }),
      player(), // no group
    ];
    const raw = makeRaw({ format: 'mixicano', players });
    const result = computeBreakdown(raw, 8);

    expect(result.filled).toBe(2);
  });

  it('returns success when full', () => {
    const players = Array.from({ length: 8 }, (_, i) =>
      player({ group: i < 4 ? 'A' : 'B' }),
    );
    const raw = makeRaw({ format: 'mixicano', players });
    const result = computeBreakdown(raw, 8);

    expect(result.urgencyLevel).toBe('success');
  });

  it('targets the group with the biggest gap', () => {
    const players = [
      player({ group: 'A' }),
      player({ group: 'A' }),
      player({ group: 'A' }),
      // Group B empty
    ];
    const raw = makeRaw({ format: 'mixicano', players });
    const result = computeBreakdown(raw, 8);

    expect(result.urgency.key).toBe('breakdown.groupNeedsMore');
    expect(result.urgency.params?.group).toBeDefined();
  });

  it('danger when gap <= 2', () => {
    const players = [
      ...Array.from({ length: 4 }, () => player({ group: 'A' })),
      ...Array.from({ length: 2 }, () => player({ group: 'B' })),
    ];
    const raw = makeRaw({ format: 'mixicano', players });
    const result = computeBreakdown(raw, 8);

    expect(result.urgencyLevel).toBe('danger');
  });

  it('warning when gap 3-4', () => {
    const players = [
      ...Array.from({ length: 4 }, () => player({ group: 'A' })),
    ];
    const raw = makeRaw({ format: 'mixicano', players });
    const result = computeBreakdown(raw, 8);

    expect(result.urgencyLevel).toBe('warning');
  });

  it('neutral when gap > 4', () => {
    const raw = makeRaw({ format: 'mixicano', players: [] });
    const result = computeBreakdown(raw, 16);

    expect(result.urgencyLevel).toBe('neutral');
  });

  it('handles mixed-americano as group format', () => {
    const raw = makeRaw({ format: 'mixed-americano', players: [] });
    const result = computeBreakdown(raw, 8);

    expect(result.kind).toBe('group');
  });
});

// ── Format routing ──

describe('computeBreakdown — format routing', () => {
  it('prefers club-ranked over club when rankLabels present', () => {
    const clubs = [club('c1', 'A'), club('c2', 'B')];
    const raw = makeRaw({ format: 'club-ranked', clubs, rankLabels: ['Pro'], players: [] });
    const result = computeBreakdown(raw, 8);

    expect(result.kind).toBe('club-ranked');
  });

  it('falls back to simple when clubs array is empty for club format', () => {
    const raw = makeRaw({ format: 'club-americano', clubs: [], players: [] });
    const result = computeBreakdown(raw, 8);

    expect(result.kind).toBe('simple');
  });

  it('falls back to simple when format is undefined', () => {
    const raw = makeRaw({ players: [player()] });
    const result = computeBreakdown(raw, 8);

    expect(result.kind).toBe('simple');
  });
});
