import { describe, it, expect } from 'vitest';
import type { PlannerRegistration, PlannerTournament } from '@padel/common';
import type { PlayerStatus } from './playerStatus';
import { validateLaunch } from './validateLaunch';

function makeTournament(overrides?: Partial<PlannerTournament>): PlannerTournament {
  return {
    id: 'pt-1',
    name: 'Test',
    format: 'americano',
    courts: [{ id: 'c1', name: 'Court 1' }],
    organizerId: 'org-1',
    code: 'ABC123',
    createdAt: 1000,
    duration: 120,
    ...overrides,
  };
}

function makePlayer(id: string, overrides?: Partial<PlannerRegistration>): PlannerRegistration {
  return { id, name: `Player ${id}`, timestamp: 1000, ...overrides };
}

function statusMap(entries: [string, PlayerStatus][]): Map<string, PlayerStatus> {
  return new Map(entries);
}

describe('validateLaunch', () => {
  it('returns null when valid (4+ players, enough courts)', () => {
    const t = makeTournament();
    const players = [makePlayer('1'), makePlayer('2'), makePlayer('3'), makePlayer('4')];
    const statuses = statusMap([['1', 'playing'], ['2', 'playing'], ['3', 'playing'], ['4', 'playing']]);
    expect(validateLaunch(t, players, statuses)).toBeNull();
  });

  it('rejects when fewer than 4 playing players', () => {
    const t = makeTournament();
    const players = [makePlayer('1'), makePlayer('2'), makePlayer('3')];
    const statuses = statusMap([['1', 'playing'], ['2', 'playing'], ['3', 'playing']]);
    expect(validateLaunch(t, players, statuses)).toEqual({ key: 'organizer.validationMinPlayers' });
  });

  it('counts only playing players toward minimum', () => {
    const t = makeTournament();
    const players = [makePlayer('1'), makePlayer('2'), makePlayer('3'), makePlayer('4'), makePlayer('5')];
    const statuses = statusMap([
      ['1', 'playing'], ['2', 'playing'], ['3', 'playing'],
      ['4', 'reserve'], ['5', 'cancelled'],
    ]);
    expect(validateLaunch(t, players, statuses)).toEqual({ key: 'organizer.validationMinPlayers' });
  });

  // ─── Team format: needs-partner ───

  it('rejects team format when players need partners', () => {
    const t = makeTournament({ format: 'team-americano' });
    const players = [
      makePlayer('1'), makePlayer('2'), makePlayer('3'),
      makePlayer('4'), makePlayer('5'),
    ];
    const statuses = statusMap([
      ['1', 'playing'], ['2', 'playing'], ['3', 'playing'], ['4', 'playing'],
      ['5', 'needs-partner'],
    ]);
    expect(validateLaunch(t, players, statuses)).toEqual({
      key: 'organizer.validationNeedsPartner',
      params: { count: 1 },
    });
  });

  it('counts multiple needs-partner players', () => {
    const t = makeTournament({ format: 'team-mexicano' });
    const players = [makePlayer('1'), makePlayer('2'), makePlayer('3'), makePlayer('4')];
    const statuses = statusMap([
      ['1', 'playing'], ['2', 'playing'],
      ['3', 'needs-partner'], ['4', 'needs-partner'],
    ]);
    expect(validateLaunch(t, players, statuses)).toEqual({
      key: 'organizer.validationNeedsPartner',
      params: { count: 2 },
    });
  });

  it('does not check needs-partner for non-team formats', () => {
    const t = makeTournament({ format: 'americano' });
    const players = [makePlayer('1'), makePlayer('2'), makePlayer('3'), makePlayer('4')];
    const statuses = statusMap([
      ['1', 'playing'], ['2', 'playing'], ['3', 'playing'], ['4', 'playing'],
    ]);
    // americano is not a team format — no needs-partner check
    expect(validateLaunch(t, players, statuses)).toBeNull();
  });

  // ─── Team format: even players ───

  it('rejects team format with odd number of playing players', () => {
    const t = makeTournament({
      format: 'team-americano',
      courts: [{ id: 'c1', name: 'Court 1' }, { id: 'c2', name: 'Court 2' }],
    });
    const players = Array.from({ length: 5 }, (_, i) => makePlayer(String(i + 1)));
    const statuses = statusMap(players.map(p => [p.id, 'playing']));
    expect(validateLaunch(t, players, statuses)).toEqual({ key: 'organizer.validationEvenPlayers' });
  });

  it('allows team format with even number of playing players', () => {
    const t = makeTournament({ format: 'team-americano' });
    const players = Array.from({ length: 4 }, (_, i) => makePlayer(String(i + 1)));
    const statuses = statusMap(players.map(p => [p.id, 'playing']));
    expect(validateLaunch(t, players, statuses)).toBeNull();
  });

  it('does not check even for non-team formats', () => {
    const t = makeTournament({ format: 'americano' });
    // 5 players, 1 court — odd count is fine for non-team format
    const players = Array.from({ length: 5 }, (_, i) => makePlayer(String(i + 1)));
    const statuses = statusMap(players.map(p => [p.id, 'playing']));
    expect(validateLaunch(t, players, statuses)).toBeNull();
  });

  // ─── Club format: unassigned clubs ───

  it('rejects club format when playing players have no club', () => {
    const t = makeTournament({ format: 'club-americano' });
    const players = [
      makePlayer('1', { clubId: 'c1' }),
      makePlayer('2', { clubId: 'c1' }),
      makePlayer('3'),
      makePlayer('4', { clubId: 'c2' }),
    ];
    const statuses = statusMap([
      ['1', 'playing'], ['2', 'playing'], ['3', 'playing'], ['4', 'playing'],
    ]);
    expect(validateLaunch(t, players, statuses)).toEqual({
      key: 'organizer.validationUnassignedClubs',
      params: { count: 1 },
    });
  });

  it('does not count non-playing players as unassigned', () => {
    const t = makeTournament({ format: 'club-americano' });
    const players = [
      makePlayer('1', { clubId: 'c1' }),
      makePlayer('2', { clubId: 'c1' }),
      makePlayer('3'), // no club but reserve
      makePlayer('4', { clubId: 'c2' }),
      makePlayer('5', { clubId: 'c2' }),
    ];
    const statuses = statusMap([
      ['1', 'playing'], ['2', 'playing'], ['3', 'reserve'],
      ['4', 'playing'], ['5', 'playing'],
    ]);
    expect(validateLaunch(t, players, statuses)).toBeNull();
  });

  it('does not check clubs for non-club format', () => {
    const t = makeTournament({ format: 'americano' });
    const players = Array.from({ length: 4 }, (_, i) => makePlayer(String(i + 1)));
    const statuses = statusMap(players.map(p => [p.id, 'playing']));
    expect(validateLaunch(t, players, statuses)).toBeNull();
  });

  // ─── Too many courts ───

  it('rejects when too many courts for player count', () => {
    const t = makeTournament({
      courts: [
        { id: 'c1', name: 'Court 1' },
        { id: 'c2', name: 'Court 2' },
      ],
    });
    // 4 players → maxCourts = floor(4/4) = 1, but we have 2 courts
    const players = Array.from({ length: 4 }, (_, i) => makePlayer(String(i + 1)));
    const statuses = statusMap(players.map(p => [p.id, 'playing']));
    expect(validateLaunch(t, players, statuses)).toEqual({
      key: 'organizer.validationTooManyCourts',
      params: { courts: 2, max: 1 },
    });
  });

  it('rejects too many courts in team format (pair-based court calc)', () => {
    const t = makeTournament({
      format: 'team-americano',
      courts: [
        { id: 'c1', name: 'Court 1' },
        { id: 'c2', name: 'Court 2' },
      ],
    });
    // 4 players in team format → 2 pairs → maxCourts = floor(2/2) = 1
    const players = Array.from({ length: 4 }, (_, i) => makePlayer(String(i + 1)));
    const statuses = statusMap(players.map(p => [p.id, 'playing']));
    expect(validateLaunch(t, players, statuses)).toEqual({
      key: 'organizer.validationTooManyCourts',
      params: { courts: 2, max: 1 },
    });
  });

  it('allows enough courts for player count', () => {
    const t = makeTournament({
      courts: [
        { id: 'c1', name: 'Court 1' },
        { id: 'c2', name: 'Court 2' },
      ],
    });
    // 8 players → maxCourts = 2
    const players = Array.from({ length: 8 }, (_, i) => makePlayer(String(i + 1)));
    const statuses = statusMap(players.map(p => [p.id, 'playing']));
    expect(validateLaunch(t, players, statuses)).toBeNull();
  });

  // ─── Priority order ───

  it('checks needs-partner before min-players', () => {
    const t = makeTournament({ format: 'team-americano' });
    const players = [makePlayer('1'), makePlayer('2')];
    const statuses = statusMap([['1', 'playing'], ['2', 'needs-partner']]);
    // Only 1 playing (below 4), but needs-partner should trigger first
    const result = validateLaunch(t, players, statuses);
    expect(result?.key).toBe('organizer.validationNeedsPartner');
  });

  it('checks min-players before even-players', () => {
    const t = makeTournament({ format: 'team-americano' });
    // 3 playing → below 4, also odd
    const players = Array.from({ length: 3 }, (_, i) => makePlayer(String(i + 1)));
    const statuses = statusMap(players.map(p => [p.id, 'playing']));
    const result = validateLaunch(t, players, statuses);
    expect(result?.key).toBe('organizer.validationMinPlayers');
  });
});
