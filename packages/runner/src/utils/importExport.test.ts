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

  it('roundtrips a full tournament with scores, rounds, and optional fields', () => {
    const tournament: Tournament = {
      id: 'full-1',
      name: 'Full Tournament',
      config: {
        format: 'americano',
        pointsPerMatch: 32,
        courts: [
          { id: 'c1', name: 'Court A' },
          { id: 'c2', name: 'Court B', unavailable: true },
        ],
        maxRounds: 8,
        targetDuration: 90,
      },
      phase: 'in-progress',
      players: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Carol' },
        { id: 'p4', name: 'Dave' },
        { id: 'p5', name: 'Eve', unavailable: true },
      ],
      rounds: [
        {
          id: 'r1',
          roundNumber: 1,
          matches: [
            {
              id: 'm1',
              courtId: 'c1',
              team1: ['p1', 'p2'],
              team2: ['p3', 'p4'],
              score: { team1Points: 18, team2Points: 14 },
            },
          ],
          sitOuts: ['p5'],
        },
        {
          id: 'r2',
          roundNumber: 2,
          matches: [
            {
              id: 'm2',
              courtId: 'c1',
              team1: ['p1', 'p3'],
              team2: ['p2', 'p4'],
              score: null,
            },
          ],
          sitOuts: ['p5'],
        },
      ],
      teams: [
        { id: 'team1', player1Id: 'p1', player2Id: 'p2', name: 'Team Alpha' },
      ],
      plannerTournamentId: 'planner-xyz',
      createdAt: 1000,
      updatedAt: 2000,
    };

    const json = exportTournament(tournament);
    const result = validateImport(json);

    expect(result.error).toBeNull();
    const imported = result.tournament!;

    // Core fields
    expect(imported.id).toBe('full-1');
    expect(imported.name).toBe('Full Tournament');
    expect(imported.phase).toBe('in-progress');

    // Config with optional fields
    expect(imported.config.format).toBe('americano');
    expect(imported.config.pointsPerMatch).toBe(32);
    expect(imported.config.maxRounds).toBe(8);
    expect(imported.config.targetDuration).toBe(90);
    expect(imported.config.courts).toHaveLength(2);
    expect(imported.config.courts[1].unavailable).toBe(true);

    // Players with unavailable flag
    expect(imported.players).toHaveLength(5);
    expect(imported.players[4].unavailable).toBe(true);

    // Rounds with scored and unscored matches
    expect(imported.rounds).toHaveLength(2);
    expect(imported.rounds[0].matches[0].score).toEqual({ team1Points: 18, team2Points: 14 });
    expect(imported.rounds[1].matches[0].score).toBeNull();
    expect(imported.rounds[0].sitOuts).toEqual(['p5']);

    // Team tuples
    expect(imported.rounds[0].matches[0].team1).toEqual(['p1', 'p2']);
    expect(imported.rounds[0].matches[0].team2).toEqual(['p3', 'p4']);

    // Optional fields
    expect(imported.teams).toHaveLength(1);
    expect(imported.teams![0].name).toBe('Team Alpha');
    expect(imported.plannerTournamentId).toBe('planner-xyz');

    // Timestamps
    expect(imported.createdAt).toBe(1000);
    expect(imported.updatedAt).toBe(2000);
  });

  it('roundtrips a completed tournament with nominations', () => {
    const tournament: Tournament = {
      id: 'completed-1',
      name: 'Finished Cup',
      config: {
        format: 'mexicano',
        pointsPerMatch: 24,
        courts: [{ id: 'c1', name: 'Court 1' }],
        maxRounds: null,
      },
      phase: 'completed',
      players: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Carol' },
        { id: 'p4', name: 'Dave' },
      ],
      rounds: [
        {
          id: 'r1',
          roundNumber: 1,
          matches: [{
            id: 'm1',
            courtId: 'c1',
            team1: ['p1', 'p2'],
            team2: ['p3', 'p4'],
            score: { team1Points: 15, team2Points: 9 },
          }],
          sitOuts: [],
        },
      ],
      nominations: [
        { id: 'n1', title: 'MVP', emoji: '⭐', description: 'Most points', playerNames: ['Alice'], stat: '15 pts', tier: 'legendary' },
      ],
      ceremonyCompleted: true,
      createdAt: 1000,
      updatedAt: 3000,
    };

    const json = exportTournament(tournament);
    const result = validateImport(json);

    expect(result.error).toBeNull();
    const imported = result.tournament!;

    expect(imported.phase).toBe('completed');
    expect(imported.config.format).toBe('mexicano');
    expect(imported.nominations).toHaveLength(1);
    expect(imported.nominations![0].title).toBe('MVP');
    expect(imported.nominations![0].tier).toBe('legendary');
    expect(imported.ceremonyCompleted).toBe(true);
  });

  it('exported JSON is deep-equal to input tournament', () => {
    const tournament = makeTournament();
    const json = exportTournament(tournament);
    const result = validateImport(json);
    expect(result.tournament).toEqual(tournament);
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
    expect(result.error?.key).toBe('import.invalidJson');
    expect(result.tournament).toBeNull();
  });

  it('rejects non-object JSON', () => {
    const result = validateImport('"just a string"');
    expect(result.error?.key).toBe('import.invalidFormat');
    expect(result.tournament).toBeNull();
  });

  it('rejects null JSON', () => {
    const result = validateImport('null');
    expect(result.error?.key).toBe('import.invalidFormat');
  });

  it('rejects wrong format version', () => {
    const json = JSON.stringify({ _format: 'wrong-format', tournament: {} });
    const result = validateImport(json);
    expect(result.error?.key).toBe('import.unknownFormat');
    expect(result.error?.params).toEqual({ found: 'wrong-format', expected: EXPORT_FORMAT });
  });

  it('rejects missing format field', () => {
    const json = JSON.stringify({ tournament: {} });
    const result = validateImport(json);
    expect(result.error?.key).toBe('import.unknownFormat');
    expect(result.error?.params).toEqual({ found: '', expected: EXPORT_FORMAT });
  });

  it('rejects missing tournament', () => {
    const json = JSON.stringify({ _format: EXPORT_FORMAT });
    const result = validateImport(json);
    expect(result.error?.key).toBe('import.missingTournament');
  });

  it('rejects missing id field', () => {
    const json = JSON.stringify({
      _format: EXPORT_FORMAT,
      tournament: { name: 'Test', phase: 'setup', players: [], rounds: [], config: { courts: [] } },
    });
    const result = validateImport(json);
    expect(result.error?.key).toBe('import.missingField');
    expect(result.error?.params).toEqual({ field: 'id' });
  });

  it('rejects missing name field', () => {
    const json = JSON.stringify({
      _format: EXPORT_FORMAT,
      tournament: { id: 't1', phase: 'setup', players: [], rounds: [], config: { courts: [] } },
    });
    const result = validateImport(json);
    expect(result.error?.key).toBe('import.missingField');
    expect(result.error?.params).toEqual({ field: 'name' });
  });

  it('rejects missing phase field', () => {
    const json = JSON.stringify({
      _format: EXPORT_FORMAT,
      tournament: { id: 't1', name: 'T', players: [], rounds: [], config: { courts: [] } },
    });
    const result = validateImport(json);
    expect(result.error?.key).toBe('import.missingField');
    expect(result.error?.params).toEqual({ field: 'phase' });
  });

  it('rejects missing players array', () => {
    const json = JSON.stringify({
      _format: EXPORT_FORMAT,
      tournament: { id: 't1', name: 'T', phase: 'setup', rounds: [], config: { courts: [] } },
    });
    const result = validateImport(json);
    expect(result.error?.key).toBe('import.missingArrays');
  });

  it('rejects missing rounds array', () => {
    const json = JSON.stringify({
      _format: EXPORT_FORMAT,
      tournament: { id: 't1', name: 'T', phase: 'setup', players: [], config: { courts: [] } },
    });
    const result = validateImport(json);
    expect(result.error?.key).toBe('import.missingArrays');
  });

  it('rejects missing config', () => {
    const json = JSON.stringify({
      _format: EXPORT_FORMAT,
      tournament: { id: 't1', name: 'T', phase: 'setup', players: [], rounds: [] },
    });
    const result = validateImport(json);
    expect(result.error?.key).toBe('import.invalidConfig');
  });

  it('rejects config without courts array', () => {
    const json = JSON.stringify({
      _format: EXPORT_FORMAT,
      tournament: { id: 't1', name: 'T', phase: 'setup', players: [], rounds: [], config: {} },
    });
    const result = validateImport(json);
    expect(result.error?.key).toBe('import.invalidConfig');
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
