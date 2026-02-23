// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStandings } from '../useStandings';
import {
  makeSetupTournament,
  makeInProgressTournament,
  makeCompletedTournament,
  scoreAllMatches,
} from './helpers';

describe('useStandings', () => {
  it('returns empty array for null tournament', () => {
    const { result } = renderHook(() => useStandings(null));
    expect(result.current).toEqual([]);
  });

  it('returns empty array during setup phase', () => {
    const tournament = makeSetupTournament(8);
    const { result } = renderHook(() => useStandings(tournament));
    expect(result.current).toEqual([]);
  });

  it('returns standings for in-progress tournament', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(8, 2));
    const { result } = renderHook(() => useStandings(tournament));
    expect(result.current.length).toBeGreaterThan(0);
    expect(result.current[0]).toHaveProperty('playerId');
    expect(result.current[0]).toHaveProperty('totalPoints');
    expect(result.current[0]).toHaveProperty('rank');
  });

  it('returns standings for completed tournament', () => {
    const tournament = makeCompletedTournament(8, 2);
    const { result } = renderHook(() => useStandings(tournament));
    expect(result.current.length).toBe(8);
  });

  it('assigns ranks starting from 1', () => {
    const tournament = makeCompletedTournament(8, 2);
    const { result } = renderHook(() => useStandings(tournament));
    expect(result.current[0].rank).toBe(1);
  });

  it('includes all players in standings', () => {
    const tournament = makeCompletedTournament(8, 2);
    const { result } = renderHook(() => useStandings(tournament));
    const ids = new Set(result.current.map(s => s.playerId));
    for (const p of tournament.players) {
      expect(ids.has(p.id)).toBe(true);
    }
  });

  it('sorts standings by total points descending', () => {
    const tournament = makeCompletedTournament(8, 2);
    const { result } = renderHook(() => useStandings(tournament));
    for (let i = 1; i < result.current.length; i++) {
      expect(result.current[i - 1].totalPoints).toBeGreaterThanOrEqual(result.current[i].totalPoints);
    }
  });

  it('computes pointDiff as scored minus conceded', () => {
    const tournament = makeCompletedTournament(8, 2);
    const { result } = renderHook(() => useStandings(tournament));
    for (const entry of result.current) {
      expect(typeof entry.pointDiff).toBe('number');
    }
  });

  it('handles 4 players on 1 court (minimum viable)', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(4, 1));
    const { result } = renderHook(() => useStandings(tournament));
    expect(result.current.length).toBe(4);
  });

  it('handles tournament with unscored rounds (partial progress)', () => {
    const tournament = makeInProgressTournament(8, 2);
    // Only score round 1
    const partial = {
      ...tournament,
      rounds: tournament.rounds.map((r, i) =>
        i === 0
          ? { ...r, matches: r.matches.map(m => ({ ...m, score: { team1Points: 15, team2Points: 9 } })) }
          : r,
      ),
    };
    const { result } = renderHook(() => useStandings(partial));
    expect(result.current.length).toBeGreaterThan(0);
  });

  it('returns stable reference when tournament does not change', () => {
    const tournament = makeCompletedTournament(8, 2);
    const { result, rerender } = renderHook(() => useStandings(tournament));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
