import { describe, it, expect } from 'vitest';
import type { PlannerTournament, PlannerRegistration, Team } from '@padel/common';
import { buildRunnerTournament, exportRunnerTournamentJSON } from './exportToRunner';

function makePlannerTournament(overrides?: Partial<PlannerTournament>): PlannerTournament {
  return {
    id: 'pt-1',
    name: 'Saturday Padel',
    format: 'americano',
    courts: [{ id: 'c1', name: 'Court 1' }],
    organizerId: 'org-1',
    code: 'ABC123',
    createdAt: 1000,
    duration: 120,
    ...overrides,
  };
}

function makeRegistrations(count: number): PlannerRegistration[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `r${i + 1}`,
    name: `Player ${i + 1}`,
    timestamp: 1000 + i,
    confirmed: true,
  }));
}

describe('buildRunnerTournament', () => {
  it('maps planner fields to runner tournament', () => {
    const pt = makePlannerTournament();
    const regs = makeRegistrations(4);
    const result = buildRunnerTournament(pt, regs);

    expect(result.name).toBe('Saturday Padel');
    expect(result.config.format).toBe('americano');
    expect(result.config.courts).toEqual([{ id: 'c1', name: 'Court 1' }]);
    expect(result.config.targetDuration).toBe(120);
    expect(result.phase).toBe('setup');
    expect(result.rounds).toEqual([]);
    expect(result.plannerTournamentId).toBe('pt-1');
  });

  it('maps player names from registrations', () => {
    const pt = makePlannerTournament();
    const regs = makeRegistrations(4);
    const result = buildRunnerTournament(pt, regs);

    expect(result.players).toHaveLength(4);
    expect(result.players.map(p => p.name)).toEqual([
      'Player 1', 'Player 2', 'Player 3', 'Player 4',
    ]);
  });

  it('generates unique ids for players', () => {
    const pt = makePlannerTournament();
    const regs = makeRegistrations(4);
    const result = buildRunnerTournament(pt, regs);

    const ids = result.players.map(p => p.id);
    expect(new Set(ids).size).toBe(4);
  });

  it('respects capacity — excess players are waitlisted', () => {
    // 1 court × 4 = capacity 4, so 6 registrations means 2 are waiting
    const pt = makePlannerTournament({ courts: [{ id: 'c1', name: 'Court 1' }], extraSpots: 0 });
    const regs = makeRegistrations(6);
    const result = buildRunnerTournament(pt, regs);

    expect(result.players).toHaveLength(4);
  });

  it('accounts for extraSpots in capacity', () => {
    // 1 court × 4 + 2 extra = capacity 6
    const pt = makePlannerTournament({ courts: [{ id: 'c1', name: 'Court 1' }], extraSpots: 2 });
    const regs = makeRegistrations(6);
    const result = buildRunnerTournament(pt, regs);

    expect(result.players).toHaveLength(6);
  });

  it('handles multiple courts', () => {
    const pt = makePlannerTournament({
      courts: [{ id: 'c1', name: 'Court 1' }, { id: 'c2', name: 'Court 2' }],
    });
    const regs = makeRegistrations(8);
    const result = buildRunnerTournament(pt, regs);

    expect(result.players).toHaveLength(8);
    expect(result.config.courts).toHaveLength(2);
  });

  it('handles mexicano format', () => {
    const pt = makePlannerTournament({ format: 'mexicano' });
    const regs = makeRegistrations(4);
    const result = buildRunnerTournament(pt, regs);

    expect(result.config.format).toBe('mexicano');
  });

  // ─── Teams & ID remapping ───

  it('remaps team player IDs from registration IDs to runner IDs', () => {
    const pt = makePlannerTournament({ format: 'team-americano' });
    const regs: PlannerRegistration[] = [
      { id: 'r1', name: 'Alice', timestamp: 1000, confirmed: true, partnerName: 'Bob', pairedAt: 100 },
      { id: 'r2', name: 'Bob', timestamp: 1001, confirmed: true, partnerName: 'Alice', pairedAt: 100 },
      { id: 'r3', name: 'Charlie', timestamp: 1002, confirmed: true, partnerName: 'Dana', pairedAt: 200 },
      { id: 'r4', name: 'Dana', timestamp: 1003, confirmed: true, partnerName: 'Charlie', pairedAt: 200 },
    ];
    const teams: Team[] = [
      { id: 't1', player1Id: 'r1', player2Id: 'r2' },
      { id: 't2', player1Id: 'r3', player2Id: 'r4' },
    ];
    const result = buildRunnerTournament(pt, regs, teams);

    // Team IDs should be remapped to new runner IDs (not r1/r2)
    const playerIdSet = new Set(result.players.map(p => p.id));
    expect(result.teams).toBeDefined();
    expect(result.teams).toHaveLength(2);
    for (const team of result.teams!) {
      expect(playerIdSet.has(team.player1Id)).toBe(true);
      expect(playerIdSet.has(team.player2Id)).toBe(true);
    }
    // Original reg IDs should NOT appear in teams
    expect(result.teams!.some(t => t.player1Id === 'r1')).toBe(false);
  });

  it('sets phase to team-pairing when teams are provided', () => {
    const pt = makePlannerTournament({ format: 'team-americano' });
    const regs: PlannerRegistration[] = [
      { id: 'r1', name: 'A', timestamp: 1000, confirmed: true, partnerName: 'B', pairedAt: 100 },
      { id: 'r2', name: 'B', timestamp: 1001, confirmed: true, partnerName: 'A', pairedAt: 100 },
      { id: 'r3', name: 'C', timestamp: 1002, confirmed: true, partnerName: 'D', pairedAt: 200 },
      { id: 'r4', name: 'D', timestamp: 1003, confirmed: true, partnerName: 'C', pairedAt: 200 },
    ];
    const teams: Team[] = [{ id: 't1', player1Id: 'r1', player2Id: 'r2' }];
    const result = buildRunnerTournament(pt, regs, teams);

    expect(result.phase).toBe('team-pairing');
  });

  it('sets phase to setup when no teams provided', () => {
    const pt = makePlannerTournament();
    const regs = makeRegistrations(4);
    const result = buildRunnerTournament(pt, regs);

    expect(result.phase).toBe('setup');
  });

  // ─── Aliases ───

  it('uses aliases for player names when provided', () => {
    const pt = makePlannerTournament();
    const regs = makeRegistrations(4);
    const aliases = new Map([['r1', 'The Boss'], ['r3', 'MVP']]);
    const result = buildRunnerTournament(pt, regs, undefined, aliases);

    expect(result.players.find(p => p.name === 'The Boss')).toBeDefined();
    expect(result.players.find(p => p.name === 'MVP')).toBeDefined();
    expect(result.players.find(p => p.name === 'Player 2')).toBeDefined();
    expect(result.players.find(p => p.name === 'Player 4')).toBeDefined();
  });

  // ─── Optional config fields ───

  it('passes scoringMode when set', () => {
    const pt = makePlannerTournament({ scoringMode: 'golden-point' } as Partial<PlannerTournament> & Record<string, unknown>);
    const result = buildRunnerTournament(pt, makeRegistrations(4));
    expect(result.config.scoringMode).toBe('golden-point');
  });

  it('omits scoringMode when not set', () => {
    const result = buildRunnerTournament(makePlannerTournament(), makeRegistrations(4));
    expect(result.config).not.toHaveProperty('scoringMode');
  });

  it('passes minutesPerRound when set', () => {
    const pt = makePlannerTournament({ minutesPerRound: 15 } as Partial<PlannerTournament> & Record<string, unknown>);
    const result = buildRunnerTournament(pt, makeRegistrations(4));
    expect(result.config.minutesPerRound).toBe(15);
  });

  it('omits minutesPerRound when not set', () => {
    const result = buildRunnerTournament(makePlannerTournament(), makeRegistrations(4));
    expect(result.config).not.toHaveProperty('minutesPerRound');
  });

  it('passes maldiciones when set', () => {
    const pt = makePlannerTournament({ maldiciones: true } as Partial<PlannerTournament> & Record<string, unknown>);
    const result = buildRunnerTournament(pt, makeRegistrations(4));
    expect(result.config.maldiciones).toBe(true);
  });

  it('passes groupLabels when set', () => {
    const labels = ['Men', 'Women'];
    const pt = makePlannerTournament({ groupLabels: labels } as Partial<PlannerTournament> & Record<string, unknown>);
    const result = buildRunnerTournament(pt, makeRegistrations(4));
    expect(result.config.groupLabels).toEqual(labels);
  });

  it('passes rankLabels when set', () => {
    const labels = ['Beginners', 'Advanced'];
    const pt = makePlannerTournament({ rankLabels: labels } as Partial<PlannerTournament> & Record<string, unknown>);
    const result = buildRunnerTournament(pt, makeRegistrations(4));
    expect(result.config.rankLabels).toEqual(labels);
  });

  // ─── Clubs ───

  it('passes clubs when set', () => {
    const clubs = [{ id: 'c1', name: 'Club Alpha' }, { id: 'c2', name: 'Club Beta' }];
    const pt = makePlannerTournament({ clubs, format: 'club-americano' });
    const regs = makeRegistrations(4);
    const result = buildRunnerTournament(pt, regs);

    expect(result.clubs).toEqual(clubs);
  });

  it('omits clubs when not set', () => {
    const result = buildRunnerTournament(makePlannerTournament(), makeRegistrations(4));
    expect(result).not.toHaveProperty('clubs');
  });

  // ─── Player fields ───

  it('maps group from registration to runner player', () => {
    const pt = makePlannerTournament({ format: 'mixicano' });
    const regs: PlannerRegistration[] = [
      { id: 'r1', name: 'P1', timestamp: 1, confirmed: true, group: 'A' },
      { id: 'r2', name: 'P2', timestamp: 2, confirmed: true, group: 'B' },
      { id: 'r3', name: 'P3', timestamp: 3, confirmed: true, group: 'A' },
      { id: 'r4', name: 'P4', timestamp: 4, confirmed: true, group: 'B' },
    ];
    const result = buildRunnerTournament(pt, regs);
    expect(result.players.find(p => p.name === 'P1')?.group).toBe('A');
    expect(result.players.find(p => p.name === 'P2')?.group).toBe('B');
  });

  it('maps clubId from registration to runner player', () => {
    const pt = makePlannerTournament({ format: 'club-americano', clubs: [{ id: 'c1', name: 'Club' }] });
    const regs: PlannerRegistration[] = [
      { id: 'r1', name: 'P1', timestamp: 1, confirmed: true, clubId: 'c1' },
      { id: 'r2', name: 'P2', timestamp: 2, confirmed: true, clubId: 'c1' },
      { id: 'r3', name: 'P3', timestamp: 3, confirmed: true, clubId: 'c1' },
      { id: 'r4', name: 'P4', timestamp: 4, confirmed: true, clubId: 'c1' },
    ];
    const result = buildRunnerTournament(pt, regs);
    expect(result.players.every(p => p.clubId === 'c1')).toBe(true);
  });

  it('maps rankSlot from registration to runner player', () => {
    const pt = makePlannerTournament({
      format: 'club-ranked',
      clubs: [{ id: 'c1', name: 'Club' }],
      rankLabels: ['A', 'B'],
    });
    const regs: PlannerRegistration[] = [
      { id: 'r1', name: 'P1', timestamp: 1, confirmed: true, clubId: 'c1', rankSlot: 0 },
      { id: 'r2', name: 'P2', timestamp: 2, confirmed: true, clubId: 'c1', rankSlot: 1 },
      { id: 'r3', name: 'P3', timestamp: 3, confirmed: true, clubId: 'c1', rankSlot: 0 },
      { id: 'r4', name: 'P4', timestamp: 4, confirmed: true, clubId: 'c1', rankSlot: 1 },
    ];
    const result = buildRunnerTournament(pt, regs);
    expect(result.players.find(p => p.name === 'P1')?.rankSlot).toBe(0);
    expect(result.players.find(p => p.name === 'P2')?.rankSlot).toBe(1);
  });

  // ─── Timestamps ───

  it('sets createdAt and updatedAt timestamps', () => {
    const before = Date.now();
    const result = buildRunnerTournament(makePlannerTournament(), makeRegistrations(4));
    const after = Date.now();

    expect(result.createdAt).toBeGreaterThanOrEqual(before);
    expect(result.createdAt).toBeLessThanOrEqual(after);
    expect(result.updatedAt).toBeGreaterThanOrEqual(before);
    expect(result.updatedAt).toBeLessThanOrEqual(after);
  });
});

describe('exportRunnerTournamentJSON', () => {
  it('produces valid JSON', () => {
    const json = exportRunnerTournamentJSON(makePlannerTournament(), makeRegistrations(4));
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes _format field', () => {
    const json = exportRunnerTournamentJSON(makePlannerTournament(), makeRegistrations(4));
    const parsed = JSON.parse(json);
    expect(parsed._format).toBe('padel-tournament-v1');
  });

  it('wraps tournament under tournament key', () => {
    const json = exportRunnerTournamentJSON(makePlannerTournament(), makeRegistrations(4));
    const parsed = JSON.parse(json);
    expect(parsed.tournament).toBeDefined();
    expect(parsed.tournament.name).toBe('Saturday Padel');
    expect(parsed.tournament.config).toBeDefined();
    expect(parsed.tournament.players).toHaveLength(4);
  });

  it('does NOT export raw tournament without envelope (regression)', () => {
    const json = exportRunnerTournamentJSON(makePlannerTournament(), makeRegistrations(4));
    const parsed = JSON.parse(json);

    // Must have _format at top level — not be a raw tournament
    expect(parsed._format).toBeDefined();
    // A raw tournament would have 'phase' at top level — envelope should not
    expect(parsed.phase).toBeUndefined();
    expect(parsed.players).toBeUndefined();
  });
});
