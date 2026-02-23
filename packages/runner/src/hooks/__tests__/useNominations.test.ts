// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNominations } from '../useNominations';
import {
  makeCompletedTournament,
  makeInProgressTournament,
  makeSetupTournament,
  scoreAllMatches,
  makeStandings,
} from './helpers';
import type { StandingsEntry, Nomination } from '@padel/common';

describe('useNominations', () => {
  it('returns empty array for null tournament', () => {
    const { result } = renderHook(() => useNominations(null, []));
    expect(result.current).toEqual([]);
  });

  it('returns empty array for setup phase', () => {
    const tournament = makeSetupTournament(8);
    const { result } = renderHook(() => useNominations(tournament, []));
    expect(result.current).toEqual([]);
  });

  it('returns empty array for in-progress phase', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(8, 2));
    const standings = makeStandings(tournament);
    const { result } = renderHook(() => useNominations(tournament, standings));
    expect(result.current).toEqual([]);
  });

  it('returns empty array when standings has fewer than 2 entries', () => {
    const tournament = makeCompletedTournament(8, 2);
    const { result } = renderHook(() => useNominations(tournament, [{ playerId: 'p1', playerName: 'P1', totalPoints: 10, matchesPlayed: 1, matchesWon: 1, matchesLost: 0, matchesDraw: 0, pointDiff: 5, rank: 1 }]));
    expect(result.current).toEqual([]);
  });

  it('generates nominations for completed tournament with standings', () => {
    const tournament = makeCompletedTournament(8, 2);
    const standings = makeStandings(tournament);
    const { result } = renderHook(() => useNominations(tournament, standings));
    expect(result.current.length).toBeGreaterThan(0);
  });

  it('always includes podium nominations (rank 1-3)', () => {
    const tournament = makeCompletedTournament(8, 2);
    const standings = makeStandings(tournament);
    const { result } = renderHook(() => useNominations(tournament, standings));
    const podium = result.current.filter(n => n.id.startsWith('podium-'));
    expect(podium.length).toBeGreaterThanOrEqual(1);
    // Ties can produce more than 3 podium entries (e.g., 2 players share rank 2)
    // but every podium entry must have rank 1, 2, or 3
    for (const nom of podium) {
      expect(nom.id).toMatch(/^podium-[123]/);
    }
  });

  it('podium champion has correct emoji', () => {
    const tournament = makeCompletedTournament(8, 2);
    const standings = makeStandings(tournament);
    const { result } = renderHook(() => useNominations(tournament, standings));
    const champion = result.current.find(n => n.id === 'podium-1');
    expect(champion).toBeDefined();
    expect(champion!.emoji).toBe('\uD83E\uDD47'); // gold medal
    expect(champion!.title).toBe('Champion');
  });

  it('includes lucky one nomination', () => {
    const tournament = makeCompletedTournament(8, 2);
    const standings = makeStandings(tournament);
    const { result } = renderHook(() => useNominations(tournament, standings));
    const lucky = result.current.find(n => n.id === 'lucky');
    expect(lucky).toBeDefined();
    expect(lucky!.emoji).toBe('\uD83C\uDF40'); // four-leaf clover
  });

  it('returns cached nominations if ceremony already completed', () => {
    const tournament = makeCompletedTournament(8, 2);
    const standings = makeStandings(tournament);
    const cached: Nomination[] = [
      { id: 'cached-1', title: 'Cached Award', emoji: '\u2B50', description: 'Test', playerNames: ['Test Player'], stat: 'test' },
    ];
    const tournamentWithNoms = { ...tournament, nominations: cached };
    const { result } = renderHook(() => useNominations(tournamentWithNoms, standings));
    expect(result.current).toBe(cached);
  });

  it('each nomination has required fields', () => {
    const tournament = makeCompletedTournament(8, 2);
    const standings = makeStandings(tournament);
    const { result } = renderHook(() => useNominations(tournament, standings));
    for (const nom of result.current) {
      expect(nom.id).toBeTruthy();
      expect(nom.title).toBeTruthy();
      expect(nom.emoji).toBeTruthy();
      expect(nom.description).toBeTruthy();
      expect(nom.playerNames.length).toBeGreaterThan(0);
      expect(typeof nom.stat).toBe('string');
    }
  });

  it('generates more awards for larger tournaments', () => {
    const small = makeCompletedTournament(4, 1);
    const large = makeCompletedTournament(8, 2);
    const smallStandings = makeStandings(small);
    const largeStandings = makeStandings(large);

    const { result: smallResult } = renderHook(() => useNominations(small, smallStandings));
    const { result: largeResult } = renderHook(() => useNominations(large, largeStandings));

    // Large tournament should have at least as many nominations
    expect(largeResult.current.length).toBeGreaterThanOrEqual(smallResult.current.length);
  });

  it('returns empty when completed tournament has no scored matches', () => {
    const tournament = makeInProgressTournament(8, 2);
    // Mark as completed but don't score any matches
    const noScores = { ...tournament, phase: 'completed' as const };
    const standings = makeStandings(noScores);
    const { result } = renderHook(() => useNominations(noScores, standings));
    // With no scored matches, should return empty (allScored.length === 0)
    expect(result.current).toEqual([]);
  });

  it('returns stable reference when inputs do not change', () => {
    const tournament = makeCompletedTournament(8, 2);
    const standings = makeStandings(tournament);
    const { result, rerender } = renderHook(() => useNominations(tournament, standings));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
