import { describe, it, expect } from 'vitest';
import type { PlannerTournament, PlannerRegistration } from '@padel/common';
import { exportPlannerTournament, parsePlannerExport, parsePlannerEventExport } from './plannerExport';

function makeTournament(overrides?: Partial<PlannerTournament>): PlannerTournament {
  return {
    id: 't-1',
    name: 'Saturday Padel',
    format: 'americano',
    courts: [{ id: 'c1', name: 'Court 1' }],
    organizerId: 'org-1',
    code: 'ABC123',
    createdAt: 1000,
    ...overrides,
  };
}

function makeRegistrations(count: number, extras?: Partial<PlannerRegistration>): PlannerRegistration[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `r${i + 1}`,
    name: `Player ${i + 1}`,
    timestamp: 1000 + i,
    ...extras,
  }));
}

describe('exportPlannerTournament', () => {
  it('exports minimal tournament with required fields', () => {
    const t = makeTournament();
    const json = exportPlannerTournament(t, []);
    const data = JSON.parse(json);

    expect(data._format).toBe('planner-tournament-v1');
    expect(data.name).toBe('Saturday Padel');
    expect(data.format).toBe('americano');
    expect(data.courts).toEqual([{ id: 'c1', name: 'Court 1' }]);
    expect(data.players).toEqual([]);
  });

  it('includes optional fields when present', () => {
    const t = makeTournament({
      duration: 120,
      date: '2026-03-15',
      place: 'Club XYZ',
      description: 'Fun tournament',
      chatLink: 'https://t.me/group',
      pointsPerMatch: 32,
      maxRounds: 5,
      extraSpots: 2,
      scoringMode: 'points',
      minutesPerRound: 15,
      captainMode: true,
    });
    const json = exportPlannerTournament(t, []);
    const data = JSON.parse(json);

    expect(data.duration).toBe(120);
    expect(data.date).toBe('2026-03-15');
    expect(data.place).toBe('Club XYZ');
    expect(data.description).toBe('Fun tournament');
    expect(data.chatLink).toBe('https://t.me/group');
    expect(data.pointsPerMatch).toBe(32);
    expect(data.maxRounds).toBe(5);
    expect(data.extraSpots).toBe(2);
    expect(data.scoringMode).toBe('points');
    expect(data.minutesPerRound).toBe(15);
    expect(data.captainMode).toBe(true);
  });

  it('omits undefined optional fields', () => {
    const t = makeTournament();
    const json = exportPlannerTournament(t, []);
    const data = JSON.parse(json);

    expect(data).not.toHaveProperty('duration');
    expect(data).not.toHaveProperty('date');
    expect(data).not.toHaveProperty('place');
    expect(data).not.toHaveProperty('description');
    expect(data).not.toHaveProperty('captainMode');
  });

  it('exports player data with all optional fields', () => {
    const players: PlannerRegistration[] = [
      { id: 'r1', name: 'Alice', timestamp: 1000, confirmed: true, alias: 'Ali', group: 'A', clubId: 'club-1', rankSlot: 1, partnerName: 'Bob', telegramUsername: 'alice_tg' },
      { id: 'r2', name: 'Bob', timestamp: 1001 },
    ];
    const json = exportPlannerTournament(makeTournament(), players);
    const data = JSON.parse(json);

    expect(data.players).toHaveLength(2);
    expect(data.players[0]).toEqual({
      name: 'Alice',
      confirmed: true,
      alias: 'Ali',
      group: 'A',
      clubId: 'club-1',
      rankSlot: 1,
      partnerName: 'Bob',
      telegramUsername: 'alice_tg',
    });
    expect(data.players[1]).toEqual({ name: 'Bob' });
  });

  it('strips internal fields (id, organizerId, code, createdAt)', () => {
    const json = exportPlannerTournament(makeTournament(), []);
    const data = JSON.parse(json);

    expect(data).not.toHaveProperty('id');
    expect(data).not.toHaveProperty('organizerId');
    expect(data).not.toHaveProperty('code');
    expect(data).not.toHaveProperty('createdAt');
  });

  it('includes maxRounds when set to 0', () => {
    const t = makeTournament({ maxRounds: 0 });
    const json = exportPlannerTournament(t, []);
    const data = JSON.parse(json);
    expect(data.maxRounds).toBe(0);
  });

  it('includes clubs, groupLabels, rankLabels, rankColors', () => {
    const t = makeTournament({
      clubs: [{ id: 'c1', name: 'Club A', color: 1 }],
      groupLabels: ['Pros', 'Amateurs'] as [string, string],
      rankLabels: ['Gold', 'Silver'],
      rankColors: [0xffd700, 0xc0c0c0],
    });
    const json = exportPlannerTournament(t, []);
    const data = JSON.parse(json);

    expect(data.clubs).toEqual([{ id: 'c1', name: 'Club A', color: 1 }]);
    expect(data.groupLabels).toEqual(['Pros', 'Amateurs']);
    expect(data.rankLabels).toEqual(['Gold', 'Silver']);
    expect(data.rankColors).toEqual([0xffd700, 0xc0c0c0]);
  });
});

describe('parsePlannerExport', () => {
  it('round-trips through export and parse', () => {
    const t = makeTournament({ duration: 90, date: '2026-04-01', place: 'Beach Club' });
    const players = makeRegistrations(3);
    const json = exportPlannerTournament(t, players);
    const parsed = parsePlannerExport(json);

    expect(parsed.tournament.name).toBe('Saturday Padel');
    expect(parsed.tournament.format).toBe('americano');
    expect(parsed.tournament.duration).toBe(90);
    expect(parsed.tournament.date).toBe('2026-04-01');
    expect(parsed.tournament.place).toBe('Beach Club');
    expect(parsed.players).toHaveLength(3);
    expect(parsed.players[0].name).toBe('Player 1');
  });

  it('throws on wrong format marker', () => {
    const json = JSON.stringify({ _format: 'wrong-format', name: 'X', format: 'americano', courts: [] });
    expect(() => parsePlannerExport(json)).toThrow('Invalid format');
  });

  it('throws on missing name', () => {
    const json = JSON.stringify({ _format: 'planner-tournament-v1', format: 'americano', courts: [{ id: '1', name: 'C1' }] });
    expect(() => parsePlannerExport(json)).toThrow('Missing required fields');
  });

  it('throws on missing format', () => {
    const json = JSON.stringify({ _format: 'planner-tournament-v1', name: 'T', courts: [{ id: '1', name: 'C1' }] });
    expect(() => parsePlannerExport(json)).toThrow('Missing required fields');
  });

  it('throws on missing courts', () => {
    const json = JSON.stringify({ _format: 'planner-tournament-v1', name: 'T', format: 'americano' });
    expect(() => parsePlannerExport(json)).toThrow('Missing required fields');
  });

  it('throws on invalid JSON', () => {
    expect(() => parsePlannerExport('not json')).toThrow();
  });

  it('defaults players to empty array when missing', () => {
    const json = JSON.stringify({
      _format: 'planner-tournament-v1',
      name: 'T',
      format: 'americano',
      courts: [{ id: '1', name: 'C1' }],
    });
    const parsed = parsePlannerExport(json);
    expect(parsed.players).toEqual([]);
  });

  it('strips _format from parsed tournament', () => {
    const t = makeTournament();
    const json = exportPlannerTournament(t, []);
    const parsed = parsePlannerExport(json);
    expect(parsed.tournament).not.toHaveProperty('_format');
  });
});

describe('parsePlannerEventExport', () => {
  function makeEventJson(overrides?: Record<string, unknown>) {
    return JSON.stringify({
      _format: 'planner-event-v1',
      name: 'Summer Event',
      date: '2026-06-15',
      tournaments: [
        {
          name: 'T1',
          format: 'americano',
          courts: [{ id: 'c1', name: 'Court 1' }],
          weight: 2,
          players: [{ name: 'Alice' }, { name: 'Bob' }],
        },
      ],
      ...overrides,
    });
  }

  it('parses valid event export', () => {
    const parsed = parsePlannerEventExport(makeEventJson());

    expect(parsed.name).toBe('Summer Event');
    expect(parsed.date).toBe('2026-06-15');
    expect(parsed.tournaments).toHaveLength(1);
    expect(parsed.tournaments[0].tournament.name).toBe('T1');
    expect(parsed.tournaments[0].tournament.format).toBe('americano');
    expect(parsed.tournaments[0].weight).toBe(2);
    expect(parsed.tournaments[0].players).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);
  });

  it('includes description when present', () => {
    const parsed = parsePlannerEventExport(makeEventJson({ description: 'Big event' }));
    expect(parsed.description).toBe('Big event');
  });

  it('defaults weight to 1 when missing', () => {
    const json = JSON.stringify({
      _format: 'planner-event-v1',
      name: 'E',
      date: '2026-01-01',
      tournaments: [{ name: 'T', format: 'mexicano', courts: [], players: [] }],
    });
    const parsed = parsePlannerEventExport(json);
    expect(parsed.tournaments[0].weight).toBe(1);
  });

  it('defaults players to empty array when missing', () => {
    const json = JSON.stringify({
      _format: 'planner-event-v1',
      name: 'E',
      date: '2026-01-01',
      tournaments: [{ name: 'T', format: 'mexicano', courts: [], weight: 1 }],
    });
    const parsed = parsePlannerEventExport(json);
    expect(parsed.tournaments[0].players).toEqual([]);
  });

  it('throws on wrong format marker', () => {
    expect(() => parsePlannerEventExport(makeEventJson({ _format: 'wrong' }))).toThrow('Invalid format');
  });

  it('throws on missing name', () => {
    expect(() => parsePlannerEventExport(JSON.stringify({
      _format: 'planner-event-v1', date: '2026-01-01', tournaments: [],
    }))).toThrow('Missing required fields');
  });

  it('throws on missing date', () => {
    expect(() => parsePlannerEventExport(JSON.stringify({
      _format: 'planner-event-v1', name: 'E', tournaments: [],
    }))).toThrow('Missing required fields');
  });

  it('throws on missing tournaments array', () => {
    expect(() => parsePlannerEventExport(JSON.stringify({
      _format: 'planner-event-v1', name: 'E', date: '2026-01-01',
    }))).toThrow('Missing required fields');
  });

  it('throws on invalid JSON', () => {
    expect(() => parsePlannerEventExport('{bad')).toThrow();
  });

  it('handles multiple tournaments', () => {
    const json = JSON.stringify({
      _format: 'planner-event-v1',
      name: 'Multi',
      date: '2026-07-01',
      tournaments: [
        { name: 'T1', format: 'americano', courts: [], weight: 1, players: [{ name: 'A' }] },
        { name: 'T2', format: 'mexicano', courts: [], weight: 1.5, players: [{ name: 'B' }, { name: 'C' }] },
      ],
    });
    const parsed = parsePlannerEventExport(json);
    expect(parsed.tournaments).toHaveLength(2);
    expect(parsed.tournaments[0].tournament.name).toBe('T1');
    expect(parsed.tournaments[1].tournament.name).toBe('T2');
    expect(parsed.tournaments[1].weight).toBe(1.5);
    expect(parsed.tournaments[1].players).toHaveLength(2);
  });

  it('separates tournament fields from players and weight', () => {
    const parsed = parsePlannerEventExport(makeEventJson());
    const t = parsed.tournaments[0].tournament;
    expect(t).not.toHaveProperty('players');
    expect(t).not.toHaveProperty('weight');
  });
});
