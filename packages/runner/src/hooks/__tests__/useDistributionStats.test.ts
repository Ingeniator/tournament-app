// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDistributionStats } from '../useDistributionStats';
import {
  makeSetupTournament,
  makeInProgressTournament,
  scoreAllMatches,
  makePlayers,
  makeConfig,
} from './helpers';
import type { Tournament } from '@padel/common';

describe('useDistributionStats', () => {
  it('returns null for null tournament', () => {
    const { result } = renderHook(() => useDistributionStats(null));
    expect(result.current).toBeNull();
  });

  it('returns null for tournament with no rounds', () => {
    const tournament: Tournament = {
      ...makeSetupTournament(8, 2),
      phase: 'in-progress',
    };
    const { result } = renderHook(() => useDistributionStats(tournament));
    expect(result.current).toBeNull();
  });

  it('returns null for fewer than 4 active players', () => {
    const tournament: Tournament = {
      id: 't1',
      name: 'Test',
      config: makeConfig(1),
      phase: 'in-progress',
      players: makePlayers(3),
      rounds: [{
        id: 'r1',
        roundNumber: 1,
        matches: [],
        sitOuts: [],
      }],
      createdAt: 1000,
      updatedAt: 1000,
    };
    const { result } = renderHook(() => useDistributionStats(tournament));
    expect(result.current).toBeNull();
  });

  it('returns distribution data for valid tournament', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(8, 2));
    const { result } = renderHook(() => useDistributionStats(tournament));
    expect(result.current).not.toBeNull();
    const data = result.current!;
    expect(data.restBalance).toBeDefined();
    expect(data.repeatPartners).toBeDefined();
    expect(data.neverPlayed).toBeDefined();
    expect(data.courtBalance).toBeDefined();
    expect(typeof data.totalPairs).toBe('number');
  });

  it('computes correct totalPairs = n*(n-1)/2', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(8, 2));
    const { result } = renderHook(() => useDistributionStats(tournament));
    expect(result.current!.totalPairs).toBe(8 * 7 / 2);
  });

  it('games balance min <= max', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(8, 2));
    const { result } = renderHook(() => useDistributionStats(tournament));
    const { games } = result.current!.restBalance;
    expect(games.min).toBeLessThanOrEqual(games.max);
    expect(games.idealMin).toBeLessThanOrEqual(games.idealMax);
  });

  it('sit-outs balance min <= max', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(5, 1));
    const { result } = renderHook(() => useDistributionStats(tournament));
    const { sitOuts } = result.current!.restBalance;
    expect(sitOuts.min).toBeLessThanOrEqual(sitOuts.max);
  });

  it('court balance entries match number of courts used', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(8, 2));
    const { result } = renderHook(() => useDistributionStats(tournament));
    expect(result.current!.courtBalance.length).toBe(2);
  });

  it('court balance min <= max for each court', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(8, 2));
    const { result } = renderHook(() => useDistributionStats(tournament));
    for (const cb of result.current!.courtBalance) {
      expect(cb.min).toBeLessThanOrEqual(cb.max);
      expect(cb.idealMin).toBeLessThanOrEqual(cb.idealMax);
    }
  });

  it('opponent spread min <= max when present', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(8, 2));
    const { result } = renderHook(() => useDistributionStats(tournament));
    if (result.current!.opponentSpread) {
      expect(result.current!.opponentSpread.min).toBeLessThanOrEqual(result.current!.opponentSpread.max);
    }
  });

  it('ideal opponent spread min <= max', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(8, 2));
    const { result } = renderHook(() => useDistributionStats(tournament));
    expect(result.current!.idealOpponentSpread.min).toBeLessThanOrEqual(result.current!.idealOpponentSpread.max);
  });

  it('repeat partners have count > 1', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(8, 2));
    const { result } = renderHook(() => useDistributionStats(tournament));
    for (const rp of result.current!.repeatPartners) {
      expect(rp.count).toBeGreaterThan(1);
      expect(rp.names.length).toBe(2);
    }
  });

  it('neverPlayed contains pairs of player names', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(8, 2));
    const { result } = renderHook(() => useDistributionStats(tournament));
    for (const pair of result.current!.neverPlayed) {
      expect(pair.length).toBe(2);
    }
  });

  it('excludes unavailable players from active count', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(8, 2));
    // Mark 5 players as unavailable → only 3 active → should return null
    const withUnavailable = {
      ...tournament,
      players: tournament.players.map((p, i) => i < 5 ? { ...p, unavailable: true } : p),
    };
    const { result } = renderHook(() => useDistributionStats(withUnavailable));
    expect(result.current).toBeNull();
  });

  it('handles tournament with sit-outs (5 players, 1 court)', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(5, 1));
    const { result } = renderHook(() => useDistributionStats(tournament));
    expect(result.current).not.toBeNull();
    // With 5 players, 1 sits out each round
    expect(result.current!.restBalance.sitOuts.max).toBeGreaterThanOrEqual(1);
  });

  it('returns stable reference when tournament does not change', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(8, 2));
    const { result, rerender } = renderHook(() => useDistributionStats(tournament));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
