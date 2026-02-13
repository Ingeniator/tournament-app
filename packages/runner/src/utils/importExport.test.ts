import { describe, it, expect } from 'vitest';
import { exportTournament, validateImport, EXPORT_FORMAT } from './importExport';
import type { Tournament } from '@padel/common';

function makeTournament(): Tournament {
  return {
    id: 't1',
    name: 'Test Tournament',
    config: {
      format: 'americano',
      pointsPerMatch: 24,
      courts: [{ id: 'c1', name: 'Court 1' }],
      maxRounds: 5,
    },
    phase: 'in-progress',
    players: [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
    ],
    rounds: [],
    createdAt: 1000,
    updatedAt: 2000,
  };
}

describe('exportTournament', () => {
  it('produces valid JSON', () => {
    const json = exportTournament(makeTournament());
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes format header', () => {
    const json = exportTournament(makeTournament());
    const parsed = JSON.parse(json);
    expect(parsed._format).toBe(EXPORT_FORMAT);
  });

  it('includes tournament data', () => {
    const tournament = makeTournament();
    const json = exportTournament(tournament);
    const parsed = JSON.parse(json);
    expect(parsed.tournament.id).toBe('t1');
    expect(parsed.tournament.name).toBe('Test Tournament');
  });

  it('roundtrips through validateImport', () => {
    const tournament = makeTournament();
    const json = exportTournament(tournament);
    const result = validateImport(json);
    expect(result.error).toBeNull();
    expect(result.tournament).not.toBeNull();
    expect(result.tournament!.id).toBe('t1');
  });
});

describe('validateImport', () => {
  it('accepts valid export', () => {
    const json = exportTournament(makeTournament());
    const result = validateImport(json);
    expect(result.error).toBeNull();
    expect(result.tournament).not.toBeNull();
  });

  it('rejects invalid JSON', () => {
    const result = validateImport('not valid json{');
    expect(result.error).toContain('Invalid JSON');
    expect(result.tournament).toBeNull();
  });

  it('rejects non-object JSON', () => {
    const result = validateImport('"just a string"');
    expect(result.error).toContain('Invalid format');
    expect(result.tournament).toBeNull();
  });

  it('rejects null JSON', () => {
    const result = validateImport('null');
    expect(result.error).toContain('Invalid format');
  });

  it('rejects wrong format version', () => {
    const json = JSON.stringify({ _format: 'wrong-format', tournament: {} });
    const result = validateImport(json);
    expect(result.error).toContain('Unknown format');
  });

  it('rejects missing format field', () => {
    const json = JSON.stringify({ tournament: {} });
    const result = validateImport(json);
    expect(result.error).toContain('Unknown format');
  });

  it('rejects missing tournament', () => {
    const json = JSON.stringify({ _format: EXPORT_FORMAT });
    const result = validateImport(json);
    expect(result.error).toContain('Missing tournament data');
  });

  it('rejects missing id field', () => {
    const json = JSON.stringify({
      _format: EXPORT_FORMAT,
      tournament: { name: 'Test', phase: 'setup', players: [], rounds: [], config: { courts: [] } },
    });
    const result = validateImport(json);
    expect(result.error).toContain('id');
  });

  it('rejects missing name field', () => {
    const json = JSON.stringify({
      _format: EXPORT_FORMAT,
      tournament: { id: 't1', phase: 'setup', players: [], rounds: [], config: { courts: [] } },
    });
    const result = validateImport(json);
    expect(result.error).toContain('name');
  });

  it('rejects missing phase field', () => {
    const json = JSON.stringify({
      _format: EXPORT_FORMAT,
      tournament: { id: 't1', name: 'T', players: [], rounds: [], config: { courts: [] } },
    });
    const result = validateImport(json);
    expect(result.error).toContain('phase');
  });

  it('rejects missing players array', () => {
    const json = JSON.stringify({
      _format: EXPORT_FORMAT,
      tournament: { id: 't1', name: 'T', phase: 'setup', rounds: [], config: { courts: [] } },
    });
    const result = validateImport(json);
    expect(result.error).toContain('players or rounds');
  });

  it('rejects missing rounds array', () => {
    const json = JSON.stringify({
      _format: EXPORT_FORMAT,
      tournament: { id: 't1', name: 'T', phase: 'setup', players: [], config: { courts: [] } },
    });
    const result = validateImport(json);
    expect(result.error).toContain('players or rounds');
  });

  it('rejects missing config', () => {
    const json = JSON.stringify({
      _format: EXPORT_FORMAT,
      tournament: { id: 't1', name: 'T', phase: 'setup', players: [], rounds: [] },
    });
    const result = validateImport(json);
    expect(result.error).toContain('config');
  });

  it('rejects config without courts array', () => {
    const json = JSON.stringify({
      _format: EXPORT_FORMAT,
      tournament: { id: 't1', name: 'T', phase: 'setup', players: [], rounds: [], config: {} },
    });
    const result = validateImport(json);
    expect(result.error).toContain('config');
  });

  it('accepts tournament with empty players and rounds', () => {
    const json = JSON.stringify({
      _format: EXPORT_FORMAT,
      tournament: {
        id: 't1', name: 'T', phase: 'setup',
        players: [], rounds: [],
        config: { courts: [], format: 'americano', pointsPerMatch: 24, maxRounds: null },
      },
    });
    const result = validateImport(json);
    expect(result.error).toBeNull();
  });
});
