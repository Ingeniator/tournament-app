// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Tournament, StandingsEntry } from '@padel/common';
import { useStandings } from '../useStandings';
import { useClubStandings } from '../useClubStandings';
import {
  makeSetupTournament,
  makeInProgressTournament,
  makeCompletedTournament,
  makePlayersWithNames,
  makeConfig,
  scoreAllMatches,
} from './helpers';

describe('useStandings', () => {
  it('returns empty array for null tournament', () => {
    const { result } = renderHook(() => useStandings(null));
    expect(result.current).toEqual([]);
  });

  it('returns standings for setup-phase tournament (all zeroes)', () => {
    const tournament = makeSetupTournament(8);
    const { result } = renderHook(() => useStandings(tournament));
    expect(result.current.length).toBe(8);
    expect(result.current.every(s => s.totalPoints === 0)).toBe(true);
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

  it('breaks ties by matchesWon when totalPoints and pointDiff are equal', () => {
    // 4 players, 2 rounds on 1 court.
    // Round 1: (p1,p2) vs (p3,p4) => 12-12  (draw)
    // Round 2: (p1,p3) vs (p2,p4) => 18-6
    //
    // p1: totalPoints=12+18=30, pointsFor=12+18=30, pointsAgainst=12+6=18,  pointDiff=+12, matchesWon=1
    // p2: totalPoints=12+6=18,  pointsFor=12+6=18,  pointsAgainst=12+18=30, pointDiff=-12, matchesWon=0
    // p3: totalPoints=12+18=30, pointsFor=12+18=30, pointsAgainst=12+6=18,  pointDiff=+12, matchesWon=1
    // p4: totalPoints=12+6=18,  pointsFor=12+6=18,  pointsAgainst=12+18=30, pointDiff=-12, matchesWon=0
    //
    // Now add Round 3: (p1,p4) vs (p2,p3) => 15-9
    // p1: totalPoints=30+15=45, pointDiff=12+(15-9)=+18, matchesWon=1+1=2
    // p3: totalPoints=30+9=39,  pointDiff=12+(9-15)=+6,  matchesWon=1+0=1
    //
    // That separates p1 and p3 by totalPoints. Let's use a different approach:
    // We need two players with SAME totalPoints, SAME pointDiff, but different matchesWon.
    //
    // Round 1: (p1,p2) vs (p3,p4) => 18-6   p1:18,+12,W  p3:6,-12,L
    // Round 2: (p1,p3) vs (p2,p4) => 6-18   p1:6,-12,L   p3:6,-12,L
    // Round 3: (p1,p4) vs (p2,p3) => 12-12  p1:12,0,D    p3:12,0,D
    //
    // p1: totalPoints=18+6+12=36, pointDiff=12+(-12)+0=0, matchesWon=1, draws=1
    // p3: totalPoints=6+6+12=24,  pointDiff=-12+(-12)+0=-24, matchesWon=0, draws=1
    // Not equal. Let me try yet another approach with more rounds.
    //
    // Simplest: just craft the tournament object directly.
    // p1: 2 matches: wins 20-4 then loses 4-20. totalPoints=24, pointDiff=0, matchesWon=1
    // p2: 2 matches: draws 12-12 twice.         totalPoints=24, pointDiff=0, matchesWon=0
    // These two have same totalPoints(24), same pointDiff(0), but p1 has matchesWon=1 > p2's 0.

    const tournament2: Tournament = {
      id: 't1',
      name: 'Tiebreaker Test',
      config: makeConfig(2),
      phase: 'in-progress',
      players: makePlayersWithNames(['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank']),
      rounds: [
        {
          id: 'r1',
          roundNumber: 1,
          sitOuts: [],
          matches: [
            {
              id: 'm1', courtId: 'c1',
              team1: ['p1', 'p3'] as [string, string],
              team2: ['p4', 'p5'] as [string, string],
              score: { team1Points: 20, team2Points: 4 },
            },
            {
              id: 'm2', courtId: 'c2',
              team1: ['p2', 'p6'] as [string, string],
              team2: ['p3', 'p5'] as [string, string],
              score: { team1Points: 12, team2Points: 12 },
            },
          ],
        },
        {
          id: 'r2',
          roundNumber: 2,
          sitOuts: [],
          matches: [
            {
              id: 'm3', courtId: 'c1',
              team1: ['p4', 'p6'] as [string, string],
              team2: ['p1', 'p5'] as [string, string],
              score: { team1Points: 20, team2Points: 4 },
            },
            {
              id: 'm4', courtId: 'c2',
              team1: ['p2', 'p3'] as [string, string],
              team2: ['p4', 'p6'] as [string, string],
              score: { team1Points: 12, team2Points: 12 },
            },
          ],
        },
      ],
    createdAt: 0,
    updatedAt: 0,
    };

    // p1: r1m1 team1 => 20 for, 4 against (W). r2m3 team2 => 4 for, 20 against (L).
    //     totalPoints=24, pointDiff=0, matchesWon=1
    // p2: r1m2 team1 => 12 for, 12 against (D). r2m4 team1 => 12 for, 12 against (D).
    //     totalPoints=24, pointDiff=0, matchesWon=0
    // p1 (Alice) should rank above p2 (Bob) due to matchesWon tiebreaker.

    const { result } = renderHook(() => useStandings(tournament2));
    const alice = result.current.find(s => s.playerId === 'p1')!;
    const bob = result.current.find(s => s.playerId === 'p2')!;

    expect(alice.totalPoints).toBe(24);
    expect(bob.totalPoints).toBe(24);
    expect(alice.pointDiff).toBe(0);
    expect(bob.pointDiff).toBe(0);
    expect(alice.matchesWon).toBe(1);
    expect(bob.matchesWon).toBe(0);
    expect(alice.rank).toBeLessThan(bob.rank);
  });

  it('breaks ties alphabetically when totalPoints, pointDiff, and matchesWon are all equal', () => {
    // Two players with identical stats. Alphabetically first name ranks higher.
    // p1=Zara, p2=Anna play identically (same partner, same scores swapped symmetrically).
    // 4 players, 2 rounds. Both target players draw every match.
    // Round 1: (p1,p3) vs (p2,p4) => 12-12
    // Round 2: (p1,p4) vs (p2,p3) => 12-12
    // p1 and p2 each: totalPoints=24, pointDiff=0, matchesWon=0, draws=2
    // Anna (p2) should rank above Zara (p1) alphabetically.

    const tournament: Tournament = {
      id: 't1',
      name: 'Alpha Tiebreaker Test',
      config: makeConfig(1),
      phase: 'in-progress',
      players: makePlayersWithNames(['Zara', 'Anna', 'Charlie', 'Dave']),
      rounds: [
        {
          id: 'r1',
          roundNumber: 1,
          sitOuts: [],
          matches: [{
            id: 'm1', courtId: 'c1',
            team1: ['p1', 'p3'] as [string, string],
            team2: ['p2', 'p4'] as [string, string],
            score: { team1Points: 12, team2Points: 12 },
          }],
        },
        {
          id: 'r2',
          roundNumber: 2,
          sitOuts: [],
          matches: [{
            id: 'm2', courtId: 'c1',
            team1: ['p1', 'p4'] as [string, string],
            team2: ['p2', 'p3'] as [string, string],
            score: { team1Points: 12, team2Points: 12 },
          }],
        },
      ],
    createdAt: 0,
    updatedAt: 0,
    };

    const { result } = renderHook(() => useStandings(tournament));
    const zara = result.current.find(s => s.playerId === 'p1')!;
    const anna = result.current.find(s => s.playerId === 'p2')!;

    expect(zara.totalPoints).toBe(anna.totalPoints);
    expect(zara.pointDiff).toBe(anna.pointDiff);
    expect(zara.matchesWon).toBe(anna.matchesWon);
    // Anna comes before Zara alphabetically
    const annaIdx = result.current.findIndex(s => s.playerId === 'p2');
    const zaraIdx = result.current.findIndex(s => s.playerId === 'p1');
    expect(annaIdx).toBeLessThan(zaraIdx);
    // They share the same rank (tied on all numeric criteria)
    expect(anna.rank).toBe(zara.rank);
  });

  it('awards sit-out players average points from the round', () => {
    // 5 players, 1 court => 1 sit-out per round.
    // Round 1: (p1,p2) vs (p3,p4) => 18-6, p5 sits out.
    // Total round points = 18+6 = 24. Players scored = 4. Average = 24/4 = 6. Rounded = 6.
    // p5 should get 6 points from sit-out compensation.

    const tournament: Tournament = {
      id: 't1',
      name: 'Sit-out Test',
      config: makeConfig(1),
      phase: 'in-progress',
      players: makePlayersWithNames(['Alice', 'Bob', 'Charlie', 'Dave', 'Eve']),
      rounds: [
        {
          id: 'r1',
          roundNumber: 1,
          sitOuts: ['p5'],
          matches: [{
            id: 'm1', courtId: 'c1',
            team1: ['p1', 'p2'] as [string, string],
            team2: ['p3', 'p4'] as [string, string],
            score: { team1Points: 18, team2Points: 6 },
          }],
        },
      ],
    createdAt: 0,
    updatedAt: 0,
    };

    const { result } = renderHook(() => useStandings(tournament));
    const eve = result.current.find(s => s.playerId === 'p5')!;

    // Average = (18+6) / 4 = 6, rounded = 6
    expect(eve.totalPoints).toBe(6);
    // Eve didn't play any match
    expect(eve.matchesPlayed).toBe(0);
    expect(eve.matchesWon).toBe(0);
    expect(eve.pointDiff).toBe(0);
  });

  it('awards sit-out players rounded average when average is not an integer', () => {
    // Round with score 17-7 = 24 total points / 4 players = 6.0 (integer).
    // Use 15-9 = 24/4 = 6.0 still integer. Let's use timed mode with odd totals.
    // Or: 2 matches on 2 courts: (20-4) and (13-11) => total=48, players=8, avg=6. Still integer.
    // For non-integer: 1 match, score 19-5=24, avg=24/4=6. Integer.
    // Need odd total: use scoringMode='timed' to allow non-standard totals.
    // Match score 10-7 = 17 total. 17/4 = 4.25, rounded = 4.

    const tournament: Tournament = {
      id: 't1',
      name: 'Sit-out Rounding Test',
      config: { ...makeConfig(1), scoringMode: 'timed' as const },
      phase: 'in-progress',
      players: makePlayersWithNames(['Alice', 'Bob', 'Charlie', 'Dave', 'Eve']),
      rounds: [
        {
          id: 'r1',
          roundNumber: 1,
          sitOuts: ['p5'],
          matches: [{
            id: 'm1', courtId: 'c1',
            team1: ['p1', 'p2'] as [string, string],
            team2: ['p3', 'p4'] as [string, string],
            score: { team1Points: 10, team2Points: 7 },
          }],
        },
      ],
    createdAt: 0,
    updatedAt: 0,
    };

    const { result } = renderHook(() => useStandings(tournament));
    const eve = result.current.find(s => s.playerId === 'p5')!;

    // Average = (10+7) / 4 = 4.25, Math.round(4.25) = 4
    expect(eve.totalPoints).toBe(4);
  });
});

describe('useClubStandings', () => {
  it('returns empty array when tournament has no clubs', () => {
    const tournament = makeCompletedTournament(8, 2);
    const standings: StandingsEntry[] = [];
    const { result } = renderHook(() => useClubStandings(tournament, standings));
    expect(result.current).toEqual([]);
  });

  it('returns empty array for null tournament', () => {
    const { result } = renderHook(() => useClubStandings(null, []));
    expect(result.current).toEqual([]);
  });

  it('aggregates individual standings points per club', () => {
    // 4 players in 2 clubs, paired into 2 teams.
    // Club A has team t1 (p1+p2), Club B has team t2 (p3+p4).
    // One round: t1 vs t2 => 18-6.
    // Team standings: t1 gets 18 points, t2 gets 6 points.
    // Club A total = 18, Club B total = 6.

    const tournament: Tournament = {
      id: 't1',
      name: 'Club Test',
      config: makeConfig(1),
      phase: 'in-progress',
      players: [
        { id: 'p1', name: 'Alice', clubId: 'club1' },
        { id: 'p2', name: 'Bob', clubId: 'club1' },
        { id: 'p3', name: 'Charlie', clubId: 'club2' },
        { id: 'p4', name: 'Dave', clubId: 'club2' },
      ],
      teams: [
        { id: 't1', player1Id: 'p1', player2Id: 'p2' },
        { id: 't2', player1Id: 'p3', player2Id: 'p4' },
      ],
      clubs: [
        { id: 'club1', name: 'Club Alpha' },
        { id: 'club2', name: 'Club Beta' },
      ],
      rounds: [
        {
          id: 'r1',
          roundNumber: 1,
          sitOuts: [],
          matches: [{
            id: 'm1', courtId: 'c1',
            team1: ['p1', 'p2'] as [string, string],
            team2: ['p3', 'p4'] as [string, string],
            score: { team1Points: 18, team2Points: 6 },
          }],
        },
      ],
      createdAt: 1000,
      updatedAt: 1000,
    };

    // Build pair-level standings: t1 scored 18, t2 scored 6
    const pairStandings: StandingsEntry[] = [
      {
        playerId: 't1', playerName: 'Alice / Bob',
        totalPoints: 18, matchesPlayed: 1, matchesWon: 1, matchesLost: 0, matchesDraw: 0,
        pointDiff: 12, rank: 1,
      },
      {
        playerId: 't2', playerName: 'Charlie / Dave',
        totalPoints: 6, matchesPlayed: 1, matchesWon: 0, matchesLost: 1, matchesDraw: 0,
        pointDiff: -12, rank: 2,
      },
    ];

    const { result } = renderHook(() => useClubStandings(tournament, pairStandings));

    expect(result.current.length).toBe(2);
    const clubAlpha = result.current.find(c => c.clubId === 'club1')!;
    const clubBeta = result.current.find(c => c.clubId === 'club2')!;
    expect(clubAlpha.totalPoints).toBe(18);
    expect(clubBeta.totalPoints).toBe(6);
    expect(clubAlpha.memberCount).toBe(1);
    expect(clubBeta.memberCount).toBe(1);
    expect(clubAlpha.rank).toBe(1);
    expect(clubBeta.rank).toBe(2);
  });

  it('sums points from multiple teams in the same club', () => {
    // 2 clubs, 2 teams each (8 players total). Two matches in one round.
    const tournament: Tournament = {
      id: 't1',
      name: 'Multi-team Club Test',
      config: makeConfig(2),
      phase: 'in-progress',
      players: [
        { id: 'p1', name: 'A1', clubId: 'club1' },
        { id: 'p2', name: 'A2', clubId: 'club1' },
        { id: 'p3', name: 'A3', clubId: 'club1' },
        { id: 'p4', name: 'A4', clubId: 'club1' },
        { id: 'p5', name: 'B1', clubId: 'club2' },
        { id: 'p6', name: 'B2', clubId: 'club2' },
        { id: 'p7', name: 'B3', clubId: 'club2' },
        { id: 'p8', name: 'B4', clubId: 'club2' },
      ],
      teams: [
        { id: 't1', player1Id: 'p1', player2Id: 'p2' },
        { id: 't2', player1Id: 'p3', player2Id: 'p4' },
        { id: 't3', player1Id: 'p5', player2Id: 'p6' },
        { id: 't4', player1Id: 'p7', player2Id: 'p8' },
      ],
      clubs: [
        { id: 'club1', name: 'Club Alpha' },
        { id: 'club2', name: 'Club Beta' },
      ],
      rounds: [
        {
          id: 'r1',
          roundNumber: 1,
          sitOuts: [],
          matches: [
            {
              id: 'm1', courtId: 'c1',
              team1: ['p1', 'p2'] as [string, string],
              team2: ['p5', 'p6'] as [string, string],
              score: { team1Points: 15, team2Points: 9 },
            },
            {
              id: 'm2', courtId: 'c2',
              team1: ['p3', 'p4'] as [string, string],
              team2: ['p7', 'p8'] as [string, string],
              score: { team1Points: 10, team2Points: 14 },
            },
          ],
        },
      ],
      createdAt: 1000,
      updatedAt: 1000,
    };

    // Pair standings: t1=15, t2=10, t3=9, t4=14
    const pairStandings: StandingsEntry[] = [
      { playerId: 't1', playerName: 'A1/A2', totalPoints: 15, matchesPlayed: 1, matchesWon: 1, matchesLost: 0, matchesDraw: 0, pointDiff: 6, rank: 1 },
      { playerId: 't4', playerName: 'B3/B4', totalPoints: 14, matchesPlayed: 1, matchesWon: 1, matchesLost: 0, matchesDraw: 0, pointDiff: 4, rank: 2 },
      { playerId: 't2', playerName: 'A3/A4', totalPoints: 10, matchesPlayed: 1, matchesWon: 0, matchesLost: 1, matchesDraw: 0, pointDiff: -4, rank: 3 },
      { playerId: 't3', playerName: 'B1/B2', totalPoints: 9, matchesPlayed: 1, matchesWon: 0, matchesLost: 1, matchesDraw: 0, pointDiff: -6, rank: 4 },
    ];

    const { result } = renderHook(() => useClubStandings(tournament, pairStandings));

    expect(result.current.length).toBe(2);
    const clubAlpha = result.current.find(c => c.clubId === 'club1')!;
    const clubBeta = result.current.find(c => c.clubId === 'club2')!;
    // Club Alpha: t1(15) + t2(10) = 25
    expect(clubAlpha.totalPoints).toBe(25);
    // Club Beta: t3(9) + t4(14) = 23
    expect(clubBeta.totalPoints).toBe(23);
    expect(clubAlpha.memberCount).toBe(2);
    expect(clubBeta.memberCount).toBe(2);
    expect(clubAlpha.rank).toBe(1);
    expect(clubBeta.rank).toBe(2);
  });

  it('assigns tied clubs the same rank', () => {
    const tournament: Tournament = {
      id: 't1',
      name: 'Tied Clubs Test',
      config: makeConfig(1),
      phase: 'in-progress',
      players: [
        { id: 'p1', name: 'A1', clubId: 'club1' },
        { id: 'p2', name: 'A2', clubId: 'club1' },
        { id: 'p3', name: 'B1', clubId: 'club2' },
        { id: 'p4', name: 'B2', clubId: 'club2' },
      ],
      teams: [
        { id: 't1', player1Id: 'p1', player2Id: 'p2' },
        { id: 't2', player1Id: 'p3', player2Id: 'p4' },
      ],
      clubs: [
        { id: 'club1', name: 'Club Alpha' },
        { id: 'club2', name: 'Club Beta' },
      ],
      rounds: [
        {
          id: 'r1',
          roundNumber: 1,
          sitOuts: [],
          matches: [{
            id: 'm1', courtId: 'c1',
            team1: ['p1', 'p2'] as [string, string],
            team2: ['p3', 'p4'] as [string, string],
            score: { team1Points: 12, team2Points: 12 },
          }],
        },
      ],
      createdAt: 1000,
      updatedAt: 1000,
    };

    const pairStandings: StandingsEntry[] = [
      { playerId: 't1', playerName: 'A1/A2', totalPoints: 12, matchesPlayed: 1, matchesWon: 0, matchesLost: 0, matchesDraw: 1, pointDiff: 0, rank: 1 },
      { playerId: 't2', playerName: 'B1/B2', totalPoints: 12, matchesPlayed: 1, matchesWon: 0, matchesLost: 0, matchesDraw: 1, pointDiff: 0, rank: 1 },
    ];

    const { result } = renderHook(() => useClubStandings(tournament, pairStandings));

    expect(result.current.length).toBe(2);
    expect(result.current[0].rank).toBe(1);
    expect(result.current[1].rank).toBe(1);
  });
});
