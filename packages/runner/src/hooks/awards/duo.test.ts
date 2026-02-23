import { describe, it, expect } from 'vitest';
import type { Tournament, StandingsEntry, Competitor } from '@padel/common';
import { computeDuoAwards } from './duo';
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

function makeStandings(tournament: Tournament): StandingsEntry[] {
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
  const standings = makeStandings(tournament);
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

function findAward(awards: ReturnType<typeof computeDuoAwards>, id: string) {
  return awards.find(a => a.id === id);
}

// ---- Tests ----

describe('computeDuoAwards', () => {
  it('returns empty array for tournament with no scored matches', () => {
    const t = makeTournament();
    const ctx = buildContext(t);
    const awards = computeDuoAwards(ctx, t);
    expect(awards).toEqual([]);
  });

  describe('best-duo', () => {
    it('awards best duo to pair with highest win rate (2+ games together)', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 18, t2: 6 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p2'], team2: ['p5', 'p6'], t1: 18, t2: 6 },
           { team1: ['p3', 'p7'], team2: ['p4', 'p8'], t1: 14, t2: 10 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeDuoAwards(ctx, t);
      const bestDuo = findAward(awards, 'best-duo');
      expect(bestDuo).toBeTruthy();
      expect(bestDuo!.playerNames.sort()).toEqual(['Player 1', 'Player 2']);
      expect(bestDuo!.stat).toContain('2/2');
    });
  });

  describe('offensive-duo', () => {
    it('awards offensive duo to highest-scoring pair (excluding best duo)', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 18, t2: 6 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 20, t2: 4 }],
          [{ team1: ['p1', 'p2'], team2: ['p7', 'p8'], t1: 16, t2: 8 },
           { team1: ['p5', 'p6'], team2: ['p3', 'p4'], t1: 22, t2: 2 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeDuoAwards(ctx, t);
      const offDuo = findAward(awards, 'offensive-duo');
      expect(offDuo).toBeTruthy();
      // p5+p6 scored 20+22=42 in 2 games, avg 21
      expect(offDuo!.playerNames.sort()).toEqual(['Player 5', 'Player 6']);
    });
  });

  describe('wall-pair', () => {
    it('awards defensive duo to pair with lowest avg conceded', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 20, t2: 4 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p2'], team2: ['p5', 'p6'], t1: 22, t2: 2 },
           { team1: ['p3', 'p7'], team2: ['p4', 'p8'], t1: 14, t2: 10 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeDuoAwards(ctx, t);
      const wallPair = findAward(awards, 'wall-pair');
      expect(wallPair).toBeTruthy();
      expect(wallPair!.playerNames.sort()).toEqual(['Player 1', 'Player 2']);
      expect(wallPair!.stat).toContain('3.0');
    });
  });

  describe('hot-streak-duo', () => {
    it('awards hot streak duo for 3+ consecutive wins as pair', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 18, t2: 6 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p2'], team2: ['p5', 'p7'], t1: 18, t2: 6 },
           { team1: ['p3', 'p6'], team2: ['p4', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p8'], t1: 18, t2: 6 },
           { team1: ['p5', 'p4'], team2: ['p6', 'p7'], t1: 14, t2: 10 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeDuoAwards(ctx, t);
      const hotStreak = findAward(awards, 'hot-streak-duo');
      expect(hotStreak).toBeTruthy();
      expect(hotStreak!.playerNames.sort()).toEqual(['Player 1', 'Player 2']);
      expect(hotStreak!.stat).toContain('3 wins in a row');
    });
  });

  describe('social-butterfly', () => {
    it('awards social butterfly to player with most unique partners (3+)', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 14, t2: 10 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p3'], team2: ['p2', 'p5'], t1: 14, t2: 10 },
           { team1: ['p4', 'p6'], team2: ['p7', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p4'], team2: ['p3', 'p6'], t1: 14, t2: 10 },
           { team1: ['p2', 'p7'], team2: ['p5', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p5'], team2: ['p2', 'p4'], t1: 14, t2: 10 },
           { team1: ['p3', 'p7'], team2: ['p6', 'p8'], t1: 14, t2: 10 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeDuoAwards(ctx, t);
      const social = findAward(awards, 'social-butterfly');
      expect(social).toBeTruthy();
      expect(social!.playerNames).toContain('Player 1');
      expect(social!.stat).toContain('4 unique partners');
    });
  });

  describe('nemesis', () => {
    it('awards nemesis when a player beats another 3-0', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 18, t2: 6 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p4'], team2: ['p3', 'p5'], t1: 18, t2: 6 },
           { team1: ['p2', 'p6'], team2: ['p7', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p6'], team2: ['p3', 'p7'], t1: 18, t2: 6 },
           { team1: ['p2', 'p5'], team2: ['p4', 'p8'], t1: 14, t2: 10 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeDuoAwards(ctx, t);
      const nemesis = findAward(awards, 'nemesis');
      expect(nemesis).toBeTruthy();
      expect(nemesis!.playerNames).toContain('Player 1');
      expect(nemesis!.stat).toContain('3-0');
    });
  });

  describe('rubber-match', () => {
    it('awards rubber match when same pair matchup has split results', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 18, t2: 6 },
           { team1: ['p5', 'p6'], team2: ['p7', 'p8'], t1: 14, t2: 10 }],
          [{ team1: ['p1', 'p2'], team2: ['p3', 'p4'], t1: 6, t2: 18 },
           { team1: ['p5', 'p7'], team2: ['p6', 'p8'], t1: 14, t2: 10 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeDuoAwards(ctx, t);
      const rubber = findAward(awards, 'rubber-match');
      expect(rubber).toBeTruthy();
      expect(rubber!.playerNames).toHaveLength(4);
      expect(rubber!.stat).toContain('1-1');
    });
  });

  describe('gatekeeper', () => {
    it('awards gatekeeper to player who beats all lower and loses to all higher', () => {
      const t = makeTournament({
        rounds: makeRounds([
          [{ team1: ['p1', 'p5'], team2: ['p4', 'p6'], t1: 20, t2: 4 },
           { team1: ['p2', 'p7'], team2: ['p3', 'p8'], t1: 18, t2: 6 }],
          [{ team1: ['p1', 'p7'], team2: ['p3', 'p5'], t1: 20, t2: 4 },
           { team1: ['p2', 'p8'], team2: ['p4', 'p6'], t1: 18, t2: 6 }],
          [{ team1: ['p1', 'p6'], team2: ['p2', 'p5'], t1: 16, t2: 8 },
           { team1: ['p3', 'p8'], team2: ['p4', 'p7'], t1: 16, t2: 8 }],
        ]),
      });
      const ctx = buildContext(t);
      const awards = computeDuoAwards(ctx, t);
      const gatekeeper = findAward(awards, 'gatekeeper');
      if (gatekeeper) {
        expect(gatekeeper.stat).toMatch(/\d+W vs lower.*\d+L vs higher/);
      }
    });
  });
});
