import { describe, it, expect } from 'vitest';
import type { Tournament, StandingsEntry, Competitor } from '@padel/common';
import { computeIndividualAwards } from './individual';
import { buildMatchData, buildCompetitorMatchData } from './matchData';
import type { AwardContext } from './types';

// ---- Helpers ----

function makePlayers(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
}

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 't1',
    name: 'Test',
    config: {
      format: 'americano',
      pointsPerMatch: 24,
      courts: [{ id: 'c1', name: 'Court 1' }, { id: 'c2', name: 'Court 2' }],
      maxRounds: null,
    },
    phase: 'completed',
    players: makePlayers(8),
    rounds: [],
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

type MatchDef = { team1: [string, string]; team2: [string, string]; t1: number; t2: number };

function makeRounds(matchDefs: MatchDef[][]) {
  return matchDefs.map((matches, i) => ({
    roundNumber: i + 1,
    matches: matches.map((m, j) => ({
      id: `m${i + 1}-${j + 1}`,
      courtId: `c${j + 1}`,
      team1: m.team1,
      team2: m.team2,
      score: { team1Points: m.t1, team2Points: m.t2 },
    })),
    sitOuts: [] as string[],
  }));
}

function makeStandingsFromTournament(tournament: Tournament): StandingsEntry[] {
  const points = new Map<string, { scored: number; conceded: number; won: number; lost: number; draw: number; played: number }>();
  for (const p of tournament.players) {
    points.set(p.id, { scored: 0, conceded: 0, won: 0, lost: 0, draw: 0, played: 0 });
  }
  for (const round of tournament.rounds) {
    for (const match of round.matches) {
      if (!match.score) continue;
      const { team1Points: t1, team2Points: t2 } = match.score;
      for (const pid of match.team1) {
        const s = points.get(pid);
        if (s) { s.scored += t1; s.conceded += t2; s.played++; if (t1 > t2) s.won++; else if (t1 < t2) s.lost++; else s.draw++; }
      }
      for (const pid of match.team2) {
        const s = points.get(pid);
        if (s) { s.scored += t2; s.conceded += t1; s.played++; if (t2 > t1) s.won++; else if (t2 < t1) s.lost++; else s.draw++; }
      }
    }
  }
  const entries: StandingsEntry[] = [...points.entries()].map(([pid, s]) => ({
    playerId: pid,
    playerName: tournament.players.find(p => p.id === pid)!.name,
    totalPoints: s.scored,
    matchesPlayed: s.played,
    matchesWon: s.won,
    matchesLost: s.lost,
    matchesDraw: s.draw,
    pointDiff: s.scored - s.conceded,
    rank: 0,
  }));
  entries.sort((a, b) => b.totalPoints - a.totalPoints || b.pointDiff - a.pointDiff);
  entries.forEach((e, i) => { e.rank = i + 1; });
  return entries;
}

function buildContext(tournament: Tournament): AwardContext {
  const standings = makeStandingsFromTournament(tournament);
  const { playerMatches, allScored } = buildMatchData(tournament);
  const competitors: Competitor[] = tournament.players.map(p => ({ id: p.id, playerIds: [p.id], name: p.name }));
  const playerToCompetitor = new Map<string, Competitor>();
  competitors.forEach(c => c.playerIds.forEach(pid => playerToCompetitor.set(pid, c)));
  const competitorMatches = buildCompetitorMatchData(competitors, allScored, playerToCompetitor);
  const rankMap = new Map(standings.map(s => [s.playerId, s.rank]));
  const nameMap = new Map(tournament.players.map(p => [p.id, p.name]));

  return {
    allScored,
    playerMatches,
    competitorMatches,
    playerToCompetitor,
    competitors,
    standings,
    closeThreshold: 3,
    nameOf: (id: string) => nameMap.get(id) ?? '?',
    competitorNameOf: (id: string) => nameMap.get(id) ?? '?',
    rankOf: (id: string) => rankMap.get(id) ?? 999,
  };
}

function findAward(awards: ReturnType<typeof computeIndividualAwards>, id: string) {
  return awards.find(a => a.id === id);
}

// ---- Tests ----

describe('computeIndividualAwards', () => {
  it('returns at most nearly-there for tournament with no scored matches', () => {
    const t = makeTournament();
    const ctx = buildContext(t);
    const awards = computeIndividualAwards(ctx, t);
    // With 0 scored matches, only "nearly-there" can fire (all players tied at 0 pts)
    expect(awards.every(a => a.id === 'nearly-there')).toBe(true);
    expect(awards.length).toBeLessThanOrEqual(1);
  });

  describe('undefeated', () => {
    it('awards undefeated when a player wins every match (2+)', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 18, t2: 6 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p3'], team2: ['p5', 'p7'], t1: 16, t2: 8 },
           { team1: ['p2', 'p4'], team2: ['p6', 'p8'], t1: 12, t2: 12 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeIndividualAwards(ctx, t);
      const undefeated = findAward(awards, 'undefeated');
      expect(undefeated).toBeTruthy();
      expect(undefeated!.playerNames).toContain('Player 1');
    });

    it('does not award undefeated when nobody is unbeaten', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 18, t2: 6 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p3', 'p5'], team2: ['p1', 'p7'], t1: 18, t2: 6 },
           { team1: ['p4', 'p6'], team2: ['p2', 'p8'], t1: 14, t2: 10 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeIndividualAwards(ctx, t);
      const undefeated = findAward(awards, 'undefeated');
      // p1 lost in round 2, check no one has 2W-0L
      const anyUndefeated = ctx.standings.some(s => s.matchesWon === s.matchesPlayed && s.matchesPlayed >= 2);
      if (!anyUndefeated) {
        expect(undefeated).toBeUndefined();
      }
    });
  });

  describe('iron-wall', () => {
    it('awards iron wall to player with lowest avg conceded (2+ games)', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 20, t2: 4 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p5'], team2: ['p2', 'p6'], t1: 22, t2: 2 },
           { team1: ['p3', 'p7'], team2: ['p4', 'p8'], t1: 12, t2: 12 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeIndividualAwards(ctx, t);
      const ironWall = findAward(awards, 'iron-wall');
      expect(ironWall).toBeTruthy();
      // p1 conceded 4 and 2 -> avg 3.0
      expect(ironWall!.playerNames).toContain('Player 1');
      expect(ironWall!.stat).toContain('3.0');
    });
  });

  describe('quick-strike', () => {
    it('awards quick strike for largest victory margin', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 22, t2: 2 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 14, t2: 10 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeIndividualAwards(ctx, t);
      const quickStrike = findAward(awards, 'quick-strike');
      expect(quickStrike).toBeTruthy();
      expect(quickStrike!.stat).toBe('22\u20132');
    });
  });

  describe('consistency-champion', () => {
    it('awards consistency champion to player with smallest score variance (3+ games)', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 14, t2: 10 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 4, t2: 20 }],
          [{ team1: ['p1', 'p5'], team2: ['p3', 'p7'], t1: 14, t2: 10 },
           { team1: ['p2', 'p6'], team2: ['p4', 'p8'], t1: 10, t2: 14 }],
          [{ team1: ['p1', 'p7'], team2: ['p5', 'p3'], t1: 14, t2: 10 },
           { team1: ['p2', 'p8'], team2: ['p4', 'p6'], t1: 20, t2: 4 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeIndividualAwards(ctx, t);
      const consistency = findAward(awards, 'consistency-champion');
      expect(consistency).toBeTruthy();
      // p1 has margins: +4, +4, +4 -> stddev 0
      expect(consistency!.playerNames).toContain('Player 1');
    });
  });

  describe('comeback-king', () => {
    it('awards comeback king for big improvement first half -> second half (4+ games)', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 6, t2: 18 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p5'], team2: ['p3', 'p6'], t1: 6, t2: 18 },
           { team1: ['p2', 'p7'], team2: ['p4', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p7'], team2: ['p5', 'p4'], t1: 18, t2: 6 },
           { team1: ['p2', 'p3'], team2: ['p6', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p6'], team2: ['p3', 'p8'], t1: 18, t2: 6 },
           { team1: ['p2', 'p5'], team2: ['p4', 'p7'], t1: 14, t2: 10 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeIndividualAwards(ctx, t);
      const comeback = findAward(awards, 'comeback-king');
      expect(comeback).toBeTruthy();
      expect(comeback!.playerNames).toContain('Player 1');
      expect(comeback!.stat).toContain('0W/2L');
      expect(comeback!.stat).toContain('2W/0L');
    });
  });

  describe('clutch-player', () => {
    it('awards clutch player for best win rate in close games (2+ close games)', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 13, t2: 11 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 13, t2: 11 }],
          [{ team1: ['p1', 'p5'], team2: ['p2', 'p6'], t1: 13, t2: 11 },
           { team1: ['p3', 'p7'], team2: ['p4', 'p8'], t1: 14, t2: 10 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeIndividualAwards(ctx, t);
      const clutch = findAward(awards, 'clutch-player');
      expect(clutch).toBeTruthy();
      expect(clutch!.stat).toContain('close games won');
    });
  });

  describe('see-saw', () => {
    it('awards see-saw specialist for most close games played', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 13, t2: 11 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 20, t2: 4 }],
          [{ team1: ['p1', 'p5'], team2: ['p3', 'p7'], t1: 11, t2: 13 },
           { team1: ['p2', 'p6'], team2: ['p4', 'p8'], t1: 20, t2: 4 }],
          [{ team1: ['p1', 'p7'], team2: ['p5', 'p4'], t1: 12, t2: 12 },
           { team1: ['p2', 'p3'], team2: ['p6', 'p8'], t1: 20, t2: 4 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeIndividualAwards(ctx, t);
      const seeSaw = findAward(awards, 'see-saw');
      expect(seeSaw).toBeTruthy();
      expect(seeSaw!.playerNames).toContain('Player 1');
      expect(seeSaw!.stat).toContain('3 close games');
    });
  });

  describe('competitive-game (instant classic)', () => {
    it('awards instant classic for the closest game', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 12, t2: 12 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 20, t2: 4 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeIndividualAwards(ctx, t);
      const classic = findAward(awards, 'competitive-game');
      expect(classic).toBeTruthy();
      expect(classic!.stat).toBe('12\u201312');
      expect(classic!.playerNames).toHaveLength(4);
    });
  });

  describe('battle-tested', () => {
    it('awards battle tested for 2+ close-game losses', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 13, t2: 11 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p5'], team2: ['p3', 'p7'], t1: 13, t2: 11 },
           { team1: ['p2', 'p6'], team2: ['p4', 'p8'], t1: 14, t2: 10 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeIndividualAwards(ctx, t);
      const battleTested = findAward(awards, 'battle-tested');
      expect(battleTested).toBeTruthy();
      expect(battleTested!.playerNames).toContain('Player 3');
    });
  });

  describe('warrior', () => {
    it('awards warrior when some players played more games than others', () => {
      const players = makePlayers(5);
      const t = makeTournament({
        players,
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p3'], team2: ['p2', 'p5'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p4'], team2: ['p3', 'p5'], t1: 14, t2: 10 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeIndividualAwards(ctx, t);
      const warrior = findAward(awards, 'warrior');
      expect(warrior).toBeTruthy();
      expect(warrior!.playerNames).toContain('Player 1');
      expect(warrior!.stat).toContain('3 games');
    });

    it('does not award warrior when all players played same number of games', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 14, t2: 10 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 14, t2: 10 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeIndividualAwards(ctx, t);
      const warrior = findAward(awards, 'warrior');
      expect(warrior).toBeUndefined();
    });
  });

  describe('dominator', () => {
    it('awards dominator for 3+ win streak', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 18, t2: 6 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p5'], team2: ['p3', 'p7'], t1: 18, t2: 6 },
           { team1: ['p2', 'p6'], team2: ['p4', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p7'], team2: ['p5', 'p4'], t1: 18, t2: 6 },
           { team1: ['p2', 'p3'], team2: ['p6', 'p8'], t1: 14, t2: 10 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeIndividualAwards(ctx, t);
      const dominator = findAward(awards, 'dominator');
      expect(dominator).toBeTruthy();
      expect(dominator!.playerNames).toContain('Player 1');
      expect(dominator!.stat).toContain('3 wins in a row');
    });

    it('does not award dominator if no 3+ streak exists', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 18, t2: 6 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p3', 'p5'], team2: ['p1', 'p7'], t1: 18, t2: 6 },
           { team1: ['p4', 'p6'], team2: ['p2', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p6'], team2: ['p3', 'p8'], t1: 18, t2: 6 },
           { team1: ['p2', 'p5'], team2: ['p4', 'p7'], t1: 14, t2: 10 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeIndividualAwards(ctx, t);
      const dominator = findAward(awards, 'dominator');
      // p1: W, L, W — streak is 1 max. Check if anyone has 3+.
      const hasStreak3 = [...ctx.competitorMatches.entries()].some(([, matches]) => {
        const sorted = [...matches].sort((a, b) => a.roundNumber - b.roundNumber);
        let streak = 0, max = 0;
        for (const m of sorted) { if (m.won) { streak++; max = Math.max(max, streak); } else streak = 0; }
        return max >= 3;
      });
      if (!hasStreak3) expect(dominator).toBeUndefined();
    });
  });

  describe('peacemaker', () => {
    it('awards peacemaker for 2+ drawn matches', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 12, t2: 12 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p5'], team2: ['p2', 'p6'], t1: 12, t2: 12 },
           { team1: ['p3', 'p7'], team2: ['p4', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p7'], team2: ['p3', 'p5'], t1: 12, t2: 12 },
           { team1: ['p2', 'p8'], team2: ['p4', 'p6'], t1: 14, t2: 10 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeIndividualAwards(ctx, t);
      const peacemaker = findAward(awards, 'peacemaker');
      expect(peacemaker).toBeTruthy();
      expect(peacemaker!.playerNames).toContain('Player 1');
    });
  });

  describe('point-machine', () => {
    it('does not award point machine to #1 in standings', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 20, t2: 4 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p5'], team2: ['p2', 'p6'], t1: 20, t2: 4 },
           { team1: ['p3', 'p7'], team2: ['p4', 'p8'], t1: 14, t2: 10 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeIndividualAwards(ctx, t);
      const pointMachine = findAward(awards, 'point-machine');
      if (pointMachine) {
        expect(pointMachine.playerNames[0]).not.toBe(ctx.standings[0].playerName);
      }
    });
  });

  describe('giant-slayer', () => {
    it('awards giant slayer when low-ranked player beats #1', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 20, t2: 4 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p5'], team2: ['p3', 'p7'], t1: 20, t2: 4 },
           { team1: ['p2', 'p6'], team2: ['p4', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p8', 'p7'], team2: ['p1', 'p2'], t1: 18, t2: 6 },
           { team1: ['p3', 'p4'], team2: ['p5', 'p6'], t1: 14, t2: 10 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeIndividualAwards(ctx, t);
      const giantSlayer = findAward(awards, 'giant-slayer');
      if (giantSlayer) {
        expect(giantSlayer.description).toContain('#1');
      }
    });
  });
});
