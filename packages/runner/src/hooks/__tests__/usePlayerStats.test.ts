// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlayerStats } from '../usePlayerStats';
import {
  makeSetupTournament,
  makeInProgressTournament,
  makeCompletedTournament,
  scoreAllMatches,
  makePlayersWithNames,
} from './helpers';
import type { Tournament } from '@padel/common';

describe('usePlayerStats', () => {
  it('returns empty array for null tournament', () => {
    const { result } = renderHook(() => usePlayerStats(null));
    expect(result.current).toEqual([]);
  });

  it('returns empty array during setup phase', () => {
    const tournament = makeSetupTournament(8);
    const { result } = renderHook(() => usePlayerStats(tournament));
    expect(result.current).toEqual([]);
  });

  it('returns stats for all players in in-progress tournament', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(8, 2));
    const { result } = renderHook(() => usePlayerStats(tournament));
    expect(result.current.length).toBe(8);
  });

  it('initializes all players even if they have not played', () => {
    const tournament = makeInProgressTournament(8, 2);
    // Don't score any matches - players exist but gamesPlayed may be 0 for sit-out players
    const { result } = renderHook(() => usePlayerStats(tournament));
    expect(result.current.length).toBe(8);
    for (const stat of result.current) {
      expect(stat.gamesPlayed).toBeGreaterThanOrEqual(0);
      expect(stat.sitOuts).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns correct playerName for each stat', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(8, 2));
    const { result } = renderHook(() => usePlayerStats(tournament));
    for (const stat of result.current) {
      const player = tournament.players.find(p => p.id === stat.playerId);
      expect(stat.playerName).toBe(player!.name);
    }
  });

  it('counts partners correctly (mutual relationship)', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(8, 2));
    const { result } = renderHook(() => usePlayerStats(tournament));
    // If A partnered B, B should have A as a partner with the same count
    for (const stat of result.current) {
      for (const partner of stat.partners) {
        const partnerStat = result.current.find(s => s.playerName === partner.name);
        if (partnerStat) {
          const reverse = partnerStat.partners.find(p => p.name === stat.playerName);
          expect(reverse).toBeDefined();
          expect(reverse!.count).toBe(partner.count);
        }
      }
    }
  });

  it('counts opponents correctly (mutual relationship)', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(8, 2));
    const { result } = renderHook(() => usePlayerStats(tournament));
    for (const stat of result.current) {
      for (const opp of stat.opponents) {
        const oppStat = result.current.find(s => s.playerName === opp.name);
        if (oppStat) {
          const reverse = oppStat.opponents.find(o => o.name === stat.playerName);
          expect(reverse).toBeDefined();
          expect(reverse!.count).toBe(opp.count);
        }
      }
    }
  });

  it('sorts partners by count descending', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(8, 2));
    const { result } = renderHook(() => usePlayerStats(tournament));
    for (const stat of result.current) {
      for (let i = 1; i < stat.partners.length; i++) {
        expect(stat.partners[i - 1].count).toBeGreaterThanOrEqual(stat.partners[i].count);
      }
    }
  });

  it('sorts opponents by count descending', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(8, 2));
    const { result } = renderHook(() => usePlayerStats(tournament));
    for (const stat of result.current) {
      for (let i = 1; i < stat.opponents.length; i++) {
        expect(stat.opponents[i - 1].count).toBeGreaterThanOrEqual(stat.opponents[i].count);
      }
    }
  });

  it('tracks court usage', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(8, 2));
    const { result } = renderHook(() => usePlayerStats(tournament));
    const courtNames = tournament.config.courts.map(c => c.name);
    for (const stat of result.current) {
      if (stat.gamesPlayed > 0) {
        expect(stat.courts.length).toBeGreaterThan(0);
        for (const court of stat.courts) {
          expect(courtNames).toContain(court.name);
        }
      }
    }
  });

  it('counts sit-outs from rounds', () => {
    scoreAllMatches(makeInProgressTournament(8, 2));
    // With 8 players and 2 courts (4 players per court = 8), there may not be sit-outs
    // With 5 players and 1 court, 1 player sits out per round
    const t5 = scoreAllMatches(makeInProgressTournament(5, 1));
    const { result } = renderHook(() => usePlayerStats(t5));
    const totalSitOuts = result.current.reduce((sum, s) => sum + s.sitOuts, 0);
    const roundSitOuts = t5.rounds.reduce((sum, r) => sum + r.sitOuts.length, 0);
    expect(totalSitOuts).toBe(roundSitOuts);
  });

  it('handles duplicate player names gracefully', () => {
    const players = makePlayersWithNames(['Alice', 'Alice', 'Bob', 'Charlie']);
    const tournament: Tournament = {
      id: 't1',
      name: 'Test',
      config: { format: 'americano', pointsPerMatch: 24, courts: [{ id: 'c1', name: 'Court 1' }], maxRounds: 3 },
      phase: 'in-progress',
      players,
      rounds: [{
        id: 'r1',
        roundNumber: 1,
        matches: [{
          id: 'm1',
          courtId: 'c1',
          team1: [players[0].id, players[1].id],
          team2: [players[2].id, players[3].id],
          score: { team1Points: 15, team2Points: 9 },
        }],
        sitOuts: [],
      }],
      createdAt: 1000,
      updatedAt: 1000,
    };
    const { result } = renderHook(() => usePlayerStats(tournament));
    expect(result.current.length).toBe(4);
    // Both "Alice" entries should have distinct playerId
    const alices = result.current.filter(s => s.playerName === 'Alice');
    expect(alices.length).toBe(2);
    expect(alices[0].playerId).not.toBe(alices[1].playerId);
  });

  it('handles 4 players on 1 court (minimum viable)', () => {
    const tournament = scoreAllMatches(makeInProgressTournament(4, 1));
    const { result } = renderHook(() => usePlayerStats(tournament));
    expect(result.current.length).toBe(4);
    // Every player should have played in every round (no sit-outs with 4 players, 1 court)
    for (const stat of result.current) {
      expect(stat.sitOuts).toBe(0);
      expect(stat.gamesPlayed).toBe(tournament.rounds.length);
    }
  });

  it('returns stable reference when tournament does not change', () => {
    const tournament = makeCompletedTournament(8, 2);
    const { result, rerender } = renderHook(() => usePlayerStats(tournament));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
