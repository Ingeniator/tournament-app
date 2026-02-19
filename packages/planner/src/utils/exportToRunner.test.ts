import { describe, it, expect } from 'vitest';
import type { PlannerTournament, PlannerRegistration } from '@padel/common';
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
