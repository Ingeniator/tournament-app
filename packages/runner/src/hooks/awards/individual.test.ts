import { describe, it, expect } from 'vitest';
import type { Tournament, StandingsEntry, Competitor, Nomination } from '@padel/common';
import type { AwardContext, ScoredMatch, CompetitorMatchInfo } from './types';
import { computeIndividualAwards } from './individual';

// ---------------------------------------------------------------------------
// Helpers to build AwardContext with precise control
// ---------------------------------------------------------------------------

function makeStandingsEntry(overrides: Partial<StandingsEntry> & { playerId: string; playerName: string }): StandingsEntry {
  return {
    totalPoints: 0,
    matchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
    matchesDraw: 0,
    pointDiff: 0,
    rank: 1,
    ...overrides,
  };
}

function makeCompetitor(id: string, name?: string): Competitor {
  return { id, name: name ?? id, playerIds: [id] };
}

function makeMatch(overrides: Partial<ScoredMatch> & { team1: [string, string]; team2: [string, string]; t1: number; t2: number }): ScoredMatch {
  return {
    roundNumber: 1,
    margin: Math.abs(overrides.t1 - overrides.t2),
    totalPoints: overrides.t1 + overrides.t2,
    ...overrides,
  };
}

function makeCompetitorMatch(overrides: Partial<CompetitorMatchInfo>): CompetitorMatchInfo {
  const won = overrides.won ?? false;
  const lost = overrides.lost ?? false;
  const ps = overrides.pointsScored ?? 0;
  const pc = overrides.pointsConceded ?? 0;
  return {
    roundNumber: 1,
    pointsScored: ps,
    pointsConceded: pc,
    won,
    lost,
    margin: ps - pc,
    ...overrides,
  };
}

function baseTournament(format: string = 'americano'): Tournament {
  return {
    id: 't1',
    name: 'Test',
    config: {
      format: format as Tournament['config']['format'],
      pointsPerMatch: 24,
      courts: [
        { id: 'c1', name: 'Court 1' },
        { id: 'c2', name: 'Court 2' },
      ],
      maxRounds: 5,
    },
    phase: 'completed',
    players: [],
    rounds: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

interface CtxOptions {
  standings: StandingsEntry[];
  competitors: Competitor[];
  competitorMatches: Map<string, CompetitorMatchInfo[]>;
  allScored?: ScoredMatch[];
  closeThreshold?: number;
  playerToCompetitor?: Map<string, Competitor>;
}

function buildCtx(opts: CtxOptions): AwardContext {
  const playerToCompetitor = opts.playerToCompetitor ?? new Map<string, Competitor>();
  if (playerToCompetitor.size === 0) {
    for (const c of opts.competitors) {
      for (const pid of c.playerIds) playerToCompetitor.set(pid, c);
    }
  }
  return {
    allScored: opts.allScored ?? [],
    playerMatches: new Map(),
    competitorMatches: opts.competitorMatches,
    playerToCompetitor,
    competitors: opts.competitors,
    standings: opts.standings,
    closeThreshold: opts.closeThreshold ?? 3,
    nameOf: (id: string) => opts.competitors.find(c => c.id === id)?.name ?? id,
    competitorNameOf: (id: string) => opts.competitors.find(c => c.id === id)?.name ?? id,
    rankOf: (id: string) => opts.standings.find(s => s.playerId === id)?.rank ?? 999,
  };
}

function findAward(awards: Nomination[], id: string): Nomination | undefined {
  return awards.find(a => a.id === id);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeIndividualAwards', () => {
  // === UNDEFEATED ===
  describe('undefeated', () => {
    it('awards undefeated to player who won all matches', () => {
      const standings = [
        makeStandingsEntry({ playerId: 'A', playerName: 'Alice', rank: 1, matchesPlayed: 4, matchesWon: 4, matchesLost: 0, totalPoints: 60 }),
        makeStandingsEntry({ playerId: 'B', playerName: 'Bob', rank: 2, matchesPlayed: 4, matchesWon: 2, matchesLost: 2, totalPoints: 40 }),
      ];
      const cm = new Map([
        ['A', [makeCompetitorMatch({ won: true }), makeCompetitorMatch({ won: true })]],
        ['B', [makeCompetitorMatch({ won: true }), makeCompetitorMatch({ lost: true })]],
      ]);
      const ctx = buildCtx({ standings, competitors: [makeCompetitor('A', 'Alice'), makeCompetitor('B', 'Bob')], competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());

      const award = findAward(awards, 'undefeated');
      expect(award).toBeDefined();
      expect(award!.playerNames).toEqual(['Alice']);
      expect(award!.stat).toBe('4W \u2013 0L');
    });

    it('does not award undefeated if best player played only 1 match', () => {
      const standings = [
        makeStandingsEntry({ playerId: 'A', playerName: 'Alice', rank: 1, matchesPlayed: 1, matchesWon: 1, matchesLost: 0, totalPoints: 15 }),
      ];
      const cm = new Map([['A', [makeCompetitorMatch({ won: true })]]]);
      const ctx = buildCtx({ standings, competitors: [makeCompetitor('A', 'Alice')], competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'undefeated')).toBeUndefined();
    });

    it('does not award undefeated if top player has a loss', () => {
      const standings = [
        makeStandingsEntry({ playerId: 'A', playerName: 'Alice', rank: 1, matchesPlayed: 4, matchesWon: 3, matchesLost: 1, totalPoints: 50 }),
      ];
      const cm = new Map([['A', []]]);
      const ctx = buildCtx({ standings, competitors: [makeCompetitor('A', 'Alice')], competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'undefeated')).toBeUndefined();
    });
  });

  // === GIANT SLAYER ===
  describe('giant-slayer', () => {
    it('awards giant slayer when low-ranked player beats #1', () => {
      const competitors = ['A', 'B', 'C', 'D', 'E'].map((id, i) => makeCompetitor(id, `P${id}`));
      const standings = competitors.map((c, i) => makeStandingsEntry({
        playerId: c.id, playerName: c.name, rank: i + 1,
        matchesPlayed: 4, matchesWon: 4 - i, matchesLost: i, totalPoints: 60 - i * 10,
      }));

      // A (rank 1) lost one match against E (rank 5)
      const allScored: ScoredMatch[] = [
        makeMatch({ roundNumber: 1, team1: ['A', 'B'] as [string, string], team2: ['E', 'C'] as [string, string], t1: 8, t2: 16 }),
      ];

      const cm = new Map<string, CompetitorMatchInfo[]>([
        ['A', [makeCompetitorMatch({ won: false, lost: true, roundNumber: 1, pointsScored: 8, pointsConceded: 16 })]],
        ['B', []], ['C', []], ['D', []], ['E', []],
      ]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm, allScored });
      const awards = computeIndividualAwards(ctx, baseTournament());

      const award = findAward(awards, 'giant-slayer');
      expect(award).toBeDefined();
      expect(award!.stat).toBe('Ranked #5');
    });

    it('does not award giant slayer if beater is top-3 ranked', () => {
      const competitors = ['A', 'B', 'C'].map((id, i) => makeCompetitor(id, `P${id}`));
      const standings = competitors.map((c, i) => makeStandingsEntry({
        playerId: c.id, playerName: c.name, rank: i + 1,
        matchesPlayed: 3, matchesWon: 3 - i, matchesLost: i, totalPoints: 50 - i * 10,
      }));
      const allScored: ScoredMatch[] = [
        makeMatch({ roundNumber: 1, team1: ['A', 'C'] as [string, string], team2: ['B', 'C'] as [string, string], t1: 8, t2: 16 }),
      ];
      const cm = new Map<string, CompetitorMatchInfo[]>([
        ['A', [makeCompetitorMatch({ lost: true })]],
        ['B', []], ['C', []],
      ]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm, allScored });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'giant-slayer')).toBeUndefined();
    });
  });

  // === UNDERDOG ===
  describe('underdog', () => {
    it('awards underdog to bottom-half player with >50% win rate', () => {
      const competitors = ['A', 'B', 'C', 'D'].map(id => makeCompetitor(id, `P${id}`));
      const standings = competitors.map((c, i) => makeStandingsEntry({
        playerId: c.id, playerName: c.name, rank: i + 1,
        matchesPlayed: 4, matchesWon: 4 - i, matchesLost: i, totalPoints: 60 - i * 10,
      }));
      // D is rank 4 (bottom half for 4 players, halfPoint=2), with 3/4 wins
      const cm = new Map<string, CompetitorMatchInfo[]>([
        ['A', []], ['B', []], ['C', []],
        ['D', [
          makeCompetitorMatch({ won: true, roundNumber: 1 }),
          makeCompetitorMatch({ won: true, roundNumber: 2 }),
          makeCompetitorMatch({ won: true, roundNumber: 3 }),
          makeCompetitorMatch({ lost: true, roundNumber: 4 }),
        ]],
      ]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());

      const award = findAward(awards, 'underdog');
      expect(award).toBeDefined();
      expect(award!.playerNames).toEqual(['PD']);
      expect(award!.stat).toContain('3/4 wins');
    });

    it('does not award underdog if no bottom-half player has >50% win rate', () => {
      const competitors = ['A', 'B', 'C', 'D'].map(id => makeCompetitor(id, `P${id}`));
      const standings = competitors.map((c, i) => makeStandingsEntry({
        playerId: c.id, playerName: c.name, rank: i + 1,
        matchesPlayed: 4, matchesWon: 4 - i, matchesLost: i, totalPoints: 60 - i * 10,
      }));
      // D rank 4 with 1/4 wins (25%)
      const cm = new Map<string, CompetitorMatchInfo[]>([
        ['A', []], ['B', []], ['C', []],
        ['D', [
          makeCompetitorMatch({ won: true, roundNumber: 1 }),
          makeCompetitorMatch({ lost: true, roundNumber: 2 }),
          makeCompetitorMatch({ lost: true, roundNumber: 3 }),
          makeCompetitorMatch({ lost: true, roundNumber: 4 }),
        ]],
      ]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'underdog')).toBeUndefined();
    });
  });

  // === POINT MACHINE ===
  describe('point-machine', () => {
    it('awards point machine to highest scorer who is not #1', () => {
      const competitors = ['A', 'B'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [
        makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1, totalPoints: 50 }),
        makeStandingsEntry({ playerId: 'B', playerName: 'PB', rank: 2, totalPoints: 40 }),
      ];
      // B scored more raw points in matches than A
      const cm = new Map<string, CompetitorMatchInfo[]>([
        ['A', [makeCompetitorMatch({ pointsScored: 20 }), makeCompetitorMatch({ pointsScored: 18 })]],
        ['B', [makeCompetitorMatch({ pointsScored: 25 }), makeCompetitorMatch({ pointsScored: 22 })]],
      ]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());

      const award = findAward(awards, 'point-machine');
      expect(award).toBeDefined();
      expect(award!.playerNames).toEqual(['PB']);
      expect(award!.stat).toBe('47 total points');
    });

    it('does not award point machine if #1 is also the top scorer', () => {
      const competitors = ['A', 'B'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [
        makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1, totalPoints: 60 }),
        makeStandingsEntry({ playerId: 'B', playerName: 'PB', rank: 2, totalPoints: 40 }),
      ];
      const cm = new Map<string, CompetitorMatchInfo[]>([
        ['A', [makeCompetitorMatch({ pointsScored: 30 }), makeCompetitorMatch({ pointsScored: 25 })]],
        ['B', [makeCompetitorMatch({ pointsScored: 20 }), makeCompetitorMatch({ pointsScored: 15 })]],
      ]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'point-machine')).toBeUndefined();
    });
  });

  // === IRON WALL ===
  describe('iron-wall', () => {
    it('awards iron wall to player with lowest avg points conceded', () => {
      const competitors = ['A', 'B'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [
        makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1, totalPoints: 50 }),
        makeStandingsEntry({ playerId: 'B', playerName: 'PB', rank: 2, totalPoints: 40 }),
      ];
      const cm = new Map<string, CompetitorMatchInfo[]>([
        ['A', [makeCompetitorMatch({ pointsConceded: 10 }), makeCompetitorMatch({ pointsConceded: 12 })]],
        ['B', [makeCompetitorMatch({ pointsConceded: 4 }), makeCompetitorMatch({ pointsConceded: 6 })]],
      ]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());

      const award = findAward(awards, 'iron-wall');
      expect(award).toBeDefined();
      expect(award!.playerNames).toEqual(['PB']);
      expect(award!.stat).toBe('5.0 avg per game');
    });

    it('requires at least 2 matches', () => {
      const competitors = ['A'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1 })];
      const cm = new Map([['A', [makeCompetitorMatch({ pointsConceded: 2 })]]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'iron-wall')).toBeUndefined();
    });
  });

  // === QUICK STRIKE ===
  describe('quick-strike', () => {
    it('awards quick strike for largest victory margin', () => {
      const competitors = ['A', 'B', 'C', 'D'].map(id => makeCompetitor(id, `P${id}`));
      const standings = competitors.map((c, i) => makeStandingsEntry({ playerId: c.id, playerName: c.name, rank: i + 1 }));
      const allScored: ScoredMatch[] = [
        makeMatch({ roundNumber: 1, team1: ['A', 'B'] as [string, string], team2: ['C', 'D'] as [string, string], t1: 20, t2: 4 }),
        makeMatch({ roundNumber: 2, team1: ['A', 'C'] as [string, string], team2: ['B', 'D'] as [string, string], t1: 14, t2: 10 }),
      ];
      const cm = new Map<string, CompetitorMatchInfo[]>([['A', []], ['B', []], ['C', []], ['D', []]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm, allScored });
      const awards = computeIndividualAwards(ctx, baseTournament());

      const award = findAward(awards, 'quick-strike');
      expect(award).toBeDefined();
      expect(award!.stat).toBe('20\u20134');
      expect(award!.playerNames).toContain('PA');
      expect(award!.playerNames).toContain('PB');
    });
  });

  // === CONSISTENCY CHAMPION ===
  describe('consistency-champion', () => {
    it('awards consistency to player with lowest score stddev and positive mean margin', () => {
      const competitors = ['A', 'B'].map(id => makeCompetitor(id, `P${id}`));
      const standings = competitors.map((c, i) => makeStandingsEntry({ playerId: c.id, playerName: c.name, rank: i + 1 }));
      // A: margins [2, 2, 2] -> stddev = 0, mean = 2
      // B: margins [10, -8, 6] -> high stddev, mean > 0
      const cm = new Map<string, CompetitorMatchInfo[]>([
        ['A', [
          makeCompetitorMatch({ pointsScored: 13, pointsConceded: 11, won: true, roundNumber: 1, margin: 2 }),
          makeCompetitorMatch({ pointsScored: 13, pointsConceded: 11, won: true, roundNumber: 2, margin: 2 }),
          makeCompetitorMatch({ pointsScored: 13, pointsConceded: 11, won: true, roundNumber: 3, margin: 2 }),
        ]],
        ['B', [
          makeCompetitorMatch({ pointsScored: 17, pointsConceded: 7, won: true, roundNumber: 1, margin: 10 }),
          makeCompetitorMatch({ pointsScored: 8, pointsConceded: 16, lost: true, roundNumber: 2, margin: -8 }),
          makeCompetitorMatch({ pointsScored: 15, pointsConceded: 9, won: true, roundNumber: 3, margin: 6 }),
        ]],
      ]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());

      const award = findAward(awards, 'consistency-champion');
      expect(award).toBeDefined();
      expect(award!.playerNames).toEqual(['PA']);
      expect(award!.stat).toContain('+2.0 avg margin');
    });

    it('skips player with negative mean margin', () => {
      const competitors = ['A'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1 })];
      // A: margins [-1, -1, -1] -> stddev 0 but mean < 0 -> skip
      const cm = new Map([['A', [
        makeCompetitorMatch({ margin: -1, roundNumber: 1 }),
        makeCompetitorMatch({ margin: -1, roundNumber: 2 }),
        makeCompetitorMatch({ margin: -1, roundNumber: 3 }),
      ]]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'consistency-champion')).toBeUndefined();
    });

    it('requires at least 3 matches', () => {
      const competitors = ['A'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1 })];
      const cm = new Map([['A', [
        makeCompetitorMatch({ margin: 2, roundNumber: 1 }),
        makeCompetitorMatch({ margin: 2, roundNumber: 2 }),
      ]]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'consistency-champion')).toBeUndefined();
    });
  });

  // === COMEBACK KING ===
  describe('comeback-king', () => {
    it('awards comeback king for big improvement from first to second half', () => {
      const competitors = ['A'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1 })];
      // 6 matches: first 3 all losses (0%), second 3 all wins (100%) -> improvement 1.0
      const cm = new Map([['A', [
        makeCompetitorMatch({ won: false, lost: true, roundNumber: 1 }),
        makeCompetitorMatch({ won: false, lost: true, roundNumber: 2 }),
        makeCompetitorMatch({ won: false, lost: true, roundNumber: 3 }),
        makeCompetitorMatch({ won: true, lost: false, roundNumber: 4 }),
        makeCompetitorMatch({ won: true, lost: false, roundNumber: 5 }),
        makeCompetitorMatch({ won: true, lost: false, roundNumber: 6 }),
      ]]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());

      const award = findAward(awards, 'comeback-king');
      expect(award).toBeDefined();
      expect(award!.playerNames).toEqual(['PA']);
      expect(award!.stat).toBe('0W/3L \u2192 3W/0L');
    });

    it('requires at least 4 matches', () => {
      const competitors = ['A'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1 })];
      const cm = new Map([['A', [
        makeCompetitorMatch({ won: false, lost: true, roundNumber: 1 }),
        makeCompetitorMatch({ won: true, lost: false, roundNumber: 2 }),
        makeCompetitorMatch({ won: true, lost: false, roundNumber: 3 }),
      ]]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'comeback-king')).toBeUndefined();
    });

    it('does not award if second half win rate <= 50%', () => {
      const competitors = ['A'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1 })];
      // first half: 0/2 wins, second half: 1/2 wins (50%) -> secondWR not > 0.5
      const cm = new Map([['A', [
        makeCompetitorMatch({ won: false, lost: true, roundNumber: 1 }),
        makeCompetitorMatch({ won: false, lost: true, roundNumber: 2 }),
        makeCompetitorMatch({ won: true, lost: false, roundNumber: 3 }),
        makeCompetitorMatch({ won: false, lost: true, roundNumber: 4 }),
      ]]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'comeback-king')).toBeUndefined();
    });
  });

  // === CLUTCH PLAYER ===
  describe('clutch-player', () => {
    it('awards clutch player for best win rate in close games', () => {
      const competitors = ['A', 'B'].map(id => makeCompetitor(id, `P${id}`));
      const standings = competitors.map((c, i) => makeStandingsEntry({ playerId: c.id, playerName: c.name, rank: i + 1 }));
      const cm = new Map<string, CompetitorMatchInfo[]>([
        ['A', [
          makeCompetitorMatch({ won: true, margin: 2, roundNumber: 1 }),  // close win
          makeCompetitorMatch({ won: true, margin: 1, roundNumber: 2 }),  // close win
          makeCompetitorMatch({ won: true, margin: 10, roundNumber: 3 }), // not close
        ]],
        ['B', [
          makeCompetitorMatch({ won: true, margin: 3, roundNumber: 1 }),  // close win
          makeCompetitorMatch({ lost: true, margin: -2, roundNumber: 2 }), // close loss
        ]],
      ]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm, closeThreshold: 3 });
      const awards = computeIndividualAwards(ctx, baseTournament());

      const award = findAward(awards, 'clutch-player');
      expect(award).toBeDefined();
      expect(award!.playerNames).toEqual(['PA']);
      expect(award!.stat).toBe('2/2 close games won');
    });

    it('requires at least 2 close games', () => {
      const competitors = ['A'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1 })];
      const cm = new Map([['A', [makeCompetitorMatch({ won: true, margin: 1 })]]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm, closeThreshold: 3 });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'clutch-player')).toBeUndefined();
    });
  });

  // === SEE-SAW SPECIALIST ===
  describe('see-saw', () => {
    it('awards see-saw specialist for most close games played', () => {
      const competitors = ['A', 'B'].map(id => makeCompetitor(id, `P${id}`));
      const standings = competitors.map((c, i) => makeStandingsEntry({ playerId: c.id, playerName: c.name, rank: i + 1 }));
      const cm = new Map<string, CompetitorMatchInfo[]>([
        ['A', [
          makeCompetitorMatch({ margin: 1, roundNumber: 1 }),
          makeCompetitorMatch({ margin: -2, roundNumber: 2 }),
          makeCompetitorMatch({ margin: 3, roundNumber: 3 }),
        ]],
        ['B', [
          makeCompetitorMatch({ margin: 2, roundNumber: 1 }),
          makeCompetitorMatch({ margin: -1, roundNumber: 2 }),
        ]],
      ]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm, closeThreshold: 3 });
      const awards = computeIndividualAwards(ctx, baseTournament());

      const award = findAward(awards, 'see-saw');
      expect(award).toBeDefined();
      expect(award!.playerNames).toEqual(['PA']);
      expect(award!.stat).toBe('3 close games');
    });
  });

  // === INSTANT CLASSIC ===
  describe('instant classic (competitive-game)', () => {
    it('awards instant classic for closest match', () => {
      const competitors = ['A', 'B', 'C', 'D'].map(id => makeCompetitor(id, `P${id}`));
      const standings = competitors.map((c, i) => makeStandingsEntry({ playerId: c.id, playerName: c.name, rank: i + 1 }));
      const allScored: ScoredMatch[] = [
        makeMatch({ roundNumber: 2, team1: ['A', 'B'] as [string, string], team2: ['C', 'D'] as [string, string], t1: 12, t2: 12, margin: 0 }),
        makeMatch({ roundNumber: 1, team1: ['A', 'C'] as [string, string], team2: ['B', 'D'] as [string, string], t1: 16, t2: 8 }),
      ];
      const cm = new Map<string, CompetitorMatchInfo[]>([['A', []], ['B', []], ['C', []], ['D', []]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm, allScored, closeThreshold: 3 });
      const awards = computeIndividualAwards(ctx, baseTournament());

      const award = findAward(awards, 'competitive-game');
      expect(award).toBeDefined();
      expect(award!.stat).toBe('12\u201312');
      expect(award!.description).toContain('Round 2');
      expect(award!.playerNames.length).toBe(4);
    });

    it('does not award if smallest margin exceeds closeThreshold', () => {
      const competitors = ['A', 'B', 'C', 'D'].map(id => makeCompetitor(id, `P${id}`));
      const standings = competitors.map((c, i) => makeStandingsEntry({ playerId: c.id, playerName: c.name, rank: i + 1 }));
      const allScored: ScoredMatch[] = [
        makeMatch({ roundNumber: 1, team1: ['A', 'B'] as [string, string], team2: ['C', 'D'] as [string, string], t1: 18, t2: 6 }),
      ];
      const cm = new Map<string, CompetitorMatchInfo[]>([['A', []], ['B', []], ['C', []], ['D', []]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm, allScored, closeThreshold: 3 });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'competitive-game')).toBeUndefined();
    });
  });

  // === NEARLY THERE ===
  describe('nearly-there', () => {
    it('awards nearly there when runner-up is within tight gap', () => {
      const competitors = ['A', 'B'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [
        makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1, totalPoints: 100 }),
        makeStandingsEntry({ playerId: 'B', playerName: 'PB', rank: 2, totalPoints: 98 }),
      ];
      const cm = new Map<string, CompetitorMatchInfo[]>([['A', []], ['B', []]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());

      const award = findAward(awards, 'nearly-there');
      expect(award).toBeDefined();
      expect(award!.playerNames).toEqual(['PB']);
      expect(award!.stat).toBe('2 points behind #1');
    });

    it('shows singular "point" when gap is 1', () => {
      const competitors = ['A', 'B'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [
        makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1, totalPoints: 50 }),
        makeStandingsEntry({ playerId: 'B', playerName: 'PB', rank: 2, totalPoints: 49 }),
      ];
      const cm = new Map<string, CompetitorMatchInfo[]>([['A', []], ['B', []]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());

      const award = findAward(awards, 'nearly-there');
      expect(award).toBeDefined();
      expect(award!.stat).toBe('1 point behind #1');
    });

    it('shows tied message when gap is 0', () => {
      const competitors = ['A', 'B'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [
        makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1, totalPoints: 50 }),
        makeStandingsEntry({ playerId: 'B', playerName: 'PB', rank: 2, totalPoints: 50 }),
      ];
      const cm = new Map<string, CompetitorMatchInfo[]>([['A', []], ['B', []]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());

      const award = findAward(awards, 'nearly-there');
      expect(award).toBeDefined();
      expect(award!.stat).toBe('Tied on points with #1');
    });

    it('does not award if gap is too large', () => {
      const competitors = ['A', 'B'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [
        makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1, totalPoints: 100 }),
        makeStandingsEntry({ playerId: 'B', playerName: 'PB', rank: 2, totalPoints: 80 }),
      ];
      const cm = new Map<string, CompetitorMatchInfo[]>([['A', []], ['B', []]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'nearly-there')).toBeUndefined();
    });
  });

  // === BATTLE TESTED ===
  describe('battle-tested', () => {
    it('awards battle tested for most close games lost', () => {
      const competitors = ['A'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1 })];
      const cm = new Map([['A', [
        makeCompetitorMatch({ lost: true, margin: -2, roundNumber: 1 }),
        makeCompetitorMatch({ lost: true, margin: -1, roundNumber: 2 }),
        makeCompetitorMatch({ won: true, margin: 10, roundNumber: 3 }),
      ]]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm, closeThreshold: 3 });
      const awards = computeIndividualAwards(ctx, baseTournament());

      const award = findAward(awards, 'battle-tested');
      expect(award).toBeDefined();
      expect(award!.stat).toContain('2 games decided');
    });

    it('requires at least 2 close losses', () => {
      const competitors = ['A'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1 })];
      const cm = new Map([['A', [makeCompetitorMatch({ lost: true, margin: -1 })]]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm, closeThreshold: 3 });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'battle-tested')).toBeUndefined();
    });
  });

  // === WARRIOR ===
  describe('warrior', () => {
    it('awards warrior to player(s) with most games when there is variation', () => {
      const competitors = ['A', 'B'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [
        makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1, matchesPlayed: 6 }),
        makeStandingsEntry({ playerId: 'B', playerName: 'PB', rank: 2, matchesPlayed: 4 }),
      ];
      const cm = new Map<string, CompetitorMatchInfo[]>([['A', []], ['B', []]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());

      const award = findAward(awards, 'warrior');
      expect(award).toBeDefined();
      expect(award!.playerNames).toEqual(['PA']);
      expect(award!.stat).toBe('6 games played');
    });

    it('does not award warrior if all players played same number of games', () => {
      const competitors = ['A', 'B'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [
        makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1, matchesPlayed: 5 }),
        makeStandingsEntry({ playerId: 'B', playerName: 'PB', rank: 2, matchesPlayed: 5 }),
      ];
      const cm = new Map<string, CompetitorMatchInfo[]>([['A', []], ['B', []]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'warrior')).toBeUndefined();
    });

    it('does not award warrior if more than 2 players tied at max', () => {
      const competitors = ['A', 'B', 'C', 'D'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [
        makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1, matchesPlayed: 6 }),
        makeStandingsEntry({ playerId: 'B', playerName: 'PB', rank: 2, matchesPlayed: 6 }),
        makeStandingsEntry({ playerId: 'C', playerName: 'PC', rank: 3, matchesPlayed: 6 }),
        makeStandingsEntry({ playerId: 'D', playerName: 'PD', rank: 4, matchesPlayed: 4 }),
      ];
      const cm = new Map<string, CompetitorMatchInfo[]>([['A', []], ['B', []], ['C', []], ['D', []]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'warrior')).toBeUndefined();
    });
  });

  // === DOMINATOR ===
  describe('dominator', () => {
    it('awards dominator for longest winning streak >= 3', () => {
      const competitors = ['A'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1 })];
      const cm = new Map([['A', [
        makeCompetitorMatch({ won: false, lost: true, roundNumber: 1 }),
        makeCompetitorMatch({ won: true, roundNumber: 2 }),
        makeCompetitorMatch({ won: true, roundNumber: 3 }),
        makeCompetitorMatch({ won: true, roundNumber: 4 }),
        makeCompetitorMatch({ won: true, roundNumber: 5 }),
      ]]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());

      const award = findAward(awards, 'dominator');
      expect(award).toBeDefined();
      expect(award!.stat).toBe('4 wins in a row');
    });

    it('does not award if longest streak < 3', () => {
      const competitors = ['A'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1 })];
      const cm = new Map([['A', [
        makeCompetitorMatch({ won: true, roundNumber: 1 }),
        makeCompetitorMatch({ won: true, roundNumber: 2 }),
        makeCompetitorMatch({ won: false, lost: true, roundNumber: 3 }),
      ]]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'dominator')).toBeUndefined();
    });

    it('requires at least 3 matches', () => {
      const competitors = ['A'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1 })];
      const cm = new Map([['A', [
        makeCompetitorMatch({ won: true, roundNumber: 1 }),
        makeCompetitorMatch({ won: true, roundNumber: 2 }),
      ]]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'dominator')).toBeUndefined();
    });
  });

  // === OFFENSIVE POWERHOUSE ===
  describe('offensive-powerhouse', () => {
    it('awards to highest avg scorer who is not #1 and not iron-wall winner', () => {
      const competitors = ['A', 'B', 'C'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [
        makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1, totalPoints: 60 }),
        makeStandingsEntry({ playerId: 'B', playerName: 'PB', rank: 2, totalPoints: 50 }),
        makeStandingsEntry({ playerId: 'C', playerName: 'PC', rank: 3, totalPoints: 40 }),
      ];
      // B has highest avg points scored, A is #1
      // C has lowest conceded (iron-wall winner)
      const cm = new Map<string, CompetitorMatchInfo[]>([
        ['A', [makeCompetitorMatch({ pointsScored: 14, pointsConceded: 10 }), makeCompetitorMatch({ pointsScored: 14, pointsConceded: 10 })]],
        ['B', [makeCompetitorMatch({ pointsScored: 18, pointsConceded: 10 }), makeCompetitorMatch({ pointsScored: 16, pointsConceded: 10 })]],
        ['C', [makeCompetitorMatch({ pointsScored: 12, pointsConceded: 4 }), makeCompetitorMatch({ pointsScored: 10, pointsConceded: 4 })]],
      ]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());

      const award = findAward(awards, 'offensive-powerhouse');
      expect(award).toBeDefined();
      expect(award!.playerNames).toEqual(['PB']);
    });

    it('does not award if best scorer is #1', () => {
      const competitors = ['A', 'B'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [
        makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1, totalPoints: 60 }),
        makeStandingsEntry({ playerId: 'B', playerName: 'PB', rank: 2, totalPoints: 40 }),
      ];
      const cm = new Map<string, CompetitorMatchInfo[]>([
        ['A', [makeCompetitorMatch({ pointsScored: 20, pointsConceded: 5 }), makeCompetitorMatch({ pointsScored: 20, pointsConceded: 5 })]],
        ['B', [makeCompetitorMatch({ pointsScored: 10, pointsConceded: 8 }), makeCompetitorMatch({ pointsScored: 10, pointsConceded: 8 })]],
      ]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'offensive-powerhouse')).toBeUndefined();
    });
  });

  // === PEACEMAKER ===
  describe('peacemaker', () => {
    it('awards peacemaker for most draws (>= 2)', () => {
      const competitors = ['A', 'B'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [
        makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1, matchesPlayed: 3, matchesDraw: 3 }),
        makeStandingsEntry({ playerId: 'B', playerName: 'PB', rank: 2, matchesPlayed: 3, matchesDraw: 1 }),
      ];
      const cm = new Map<string, CompetitorMatchInfo[]>([['A', []], ['B', []]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());

      const award = findAward(awards, 'peacemaker');
      expect(award).toBeDefined();
      expect(award!.playerNames).toEqual(['PA']);
      expect(award!.stat).toBe('3 drawn matches');
    });

    it('does not award when max draws < 2', () => {
      const competitors = ['A'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1, matchesPlayed: 4, matchesDraw: 1 })];
      const cm = new Map<string, CompetitorMatchInfo[]>([['A', []]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'peacemaker')).toBeUndefined();
    });

    it('skips if draw ratio is too low for many-game player', () => {
      const competitors = ['A', 'B'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [
        // 2 draws out of 10 games = 20% < 45%, and matchesPlayed >= 4
        makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1, matchesPlayed: 10, matchesDraw: 2 }),
        makeStandingsEntry({ playerId: 'B', playerName: 'PB', rank: 2, matchesPlayed: 10, matchesDraw: 0 }),
      ];
      const cm = new Map<string, CompetitorMatchInfo[]>([['A', []], ['B', []]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());
      expect(findAward(awards, 'peacemaker')).toBeUndefined();
    });
  });

  // === COURT CLIMBER (KOTC only) ===
  describe('court-climber', () => {
    it('awards court climber in king-of-the-court format', () => {
      const competitors = ['A'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1 })];
      const cm = new Map<string, CompetitorMatchInfo[]>([['A', []]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });

      // Tournament with KOTC format and rounds where A climbs courts
      const tournament: Tournament = {
        ...baseTournament('king-of-the-court'),
        config: {
          ...baseTournament('king-of-the-court').config,
          courts: [
            { id: 'c1', name: 'Court 1' }, // index 0 = top
            { id: 'c2', name: 'Court 2' }, // index 1
            { id: 'c3', name: 'Court 3' }, // index 2 = bottom
          ],
        },
        players: [{ id: 'A', name: 'PA' }, { id: 'B', name: 'PB' }, { id: 'C', name: 'PC' }, { id: 'D', name: 'PD' }],
        rounds: [
          {
            id: 'r1', roundNumber: 1, sitOuts: [],
            matches: [{ id: 'm1', courtId: 'c3', team1: ['A', 'B'], team2: ['C', 'D'], score: { team1Points: 10, team2Points: 5 } }],
          },
          {
            id: 'r2', roundNumber: 2, sitOuts: [],
            matches: [{ id: 'm2', courtId: 'c2', team1: ['A', 'B'], team2: ['C', 'D'], score: { team1Points: 10, team2Points: 5 } }],
          },
          {
            id: 'r3', roundNumber: 3, sitOuts: [],
            matches: [{ id: 'm3', courtId: 'c1', team1: ['A', 'B'], team2: ['C', 'D'], score: { team1Points: 10, team2Points: 5 } }],
          },
        ],
      };

      const awards = computeIndividualAwards(ctx, tournament);
      const award = findAward(awards, 'court-climber');
      expect(award).toBeDefined();
      expect(award!.playerNames).toEqual(['PA']);
      expect(award!.stat).toBe('2 promotions');
    });

    it('does not award court climber for non-KOTC format', () => {
      const competitors = ['A'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1 })];
      const cm = new Map<string, CompetitorMatchInfo[]>([['A', []]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament('americano'));
      expect(findAward(awards, 'court-climber')).toBeUndefined();
    });
  });

  // === EDGE CASES ===
  describe('edge cases', () => {
    it('handles single-player standings gracefully', () => {
      const competitors = ['A'].map(id => makeCompetitor(id, `P${id}`));
      const standings = [makeStandingsEntry({ playerId: 'A', playerName: 'PA', rank: 1, matchesPlayed: 0 })];
      const cm = new Map<string, CompetitorMatchInfo[]>([['A', []]]);
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm });
      const awards = computeIndividualAwards(ctx, baseTournament());
      // Should not crash, may produce few or no awards
      expect(Array.isArray(awards)).toBe(true);
    });

    it('each award has all required fields', () => {
      const competitors = ['A', 'B', 'C', 'D'].map(id => makeCompetitor(id, `P${id}`));
      const standings = competitors.map((c, i) => makeStandingsEntry({
        playerId: c.id, playerName: c.name, rank: i + 1,
        matchesPlayed: 5, matchesWon: 5 - i, matchesLost: i, totalPoints: 80 - i * 15, pointDiff: 20 - i * 10,
      }));
      const cm = new Map<string, CompetitorMatchInfo[]>([
        ['A', Array.from({ length: 5 }, (_, i) => makeCompetitorMatch({ won: true, roundNumber: i + 1, pointsScored: 15, pointsConceded: 9, margin: 6 }))],
        ['B', Array.from({ length: 5 }, (_, i) => makeCompetitorMatch({ won: i < 3, lost: i >= 3, roundNumber: i + 1, pointsScored: 12, pointsConceded: 12, margin: i < 3 ? 2 : -2 }))],
        ['C', Array.from({ length: 5 }, (_, i) => makeCompetitorMatch({ won: i < 2, lost: i >= 2, roundNumber: i + 1, pointsScored: 10, pointsConceded: 14, margin: i < 2 ? 1 : -3 }))],
        ['D', Array.from({ length: 5 }, (_, i) => makeCompetitorMatch({ won: i < 1, lost: i >= 1, roundNumber: i + 1, pointsScored: 8, pointsConceded: 16, margin: i < 1 ? 1 : -6 }))],
      ]);
      const allScored: ScoredMatch[] = [
        makeMatch({ roundNumber: 1, team1: ['A', 'B'] as [string, string], team2: ['C', 'D'] as [string, string], t1: 15, t2: 9 }),
      ];
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm, allScored, closeThreshold: 3 });
      const awards = computeIndividualAwards(ctx, baseTournament());

      for (const award of awards) {
        expect(award.id).toBeTruthy();
        expect(award.title).toBeTruthy();
        expect(award.emoji).toBeTruthy();
        expect(award.description).toBeTruthy();
        expect(award.playerNames.length).toBeGreaterThan(0);
        expect(typeof award.stat).toBe('string');
      }
    });

    it('no duplicate award IDs', () => {
      const competitors = ['A', 'B', 'C', 'D'].map(id => makeCompetitor(id, `P${id}`));
      const standings = competitors.map((c, i) => makeStandingsEntry({
        playerId: c.id, playerName: c.name, rank: i + 1,
        matchesPlayed: 6, matchesWon: 6 - i * 2, matchesLost: i * 2, matchesDraw: 0,
        totalPoints: 80 - i * 15, pointDiff: 20 - i * 10,
      }));
      const cm = new Map<string, CompetitorMatchInfo[]>(
        competitors.map(c => [c.id, Array.from({ length: 6 }, (_, i) => makeCompetitorMatch({
          won: true, roundNumber: i + 1, pointsScored: 14, pointsConceded: 10, margin: 4,
        }))])
      );
      const allScored: ScoredMatch[] = [
        makeMatch({ roundNumber: 1, team1: ['A', 'B'] as [string, string], team2: ['C', 'D'] as [string, string], t1: 14, t2: 10 }),
      ];
      const ctx = buildCtx({ standings, competitors, competitorMatches: cm, allScored, closeThreshold: 3 });
      const awards = computeIndividualAwards(ctx, baseTournament());

      const ids = awards.map(a => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
