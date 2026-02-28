import { describe, it, expect } from 'vitest';
import { mixedAmericanoStrategy } from './americano';
import type { Player, TournamentConfig, Round } from '@padel/common';

function makePlayers(groupACount: number, groupBCount: number): Player[] {
  const players: Player[] = [];
  for (let i = 0; i < groupACount; i++) {
    players.push({ id: `a${i + 1}`, name: `Player A${i + 1}`, group: 'A' });
  }
  for (let i = 0; i < groupBCount; i++) {
    players.push({ id: `b${i + 1}`, name: `Player B${i + 1}`, group: 'B' });
  }
  return players;
}

function makeConfig(numCourts: number): TournamentConfig {
  return {
    format: 'mixed-americano',
    pointsPerMatch: 21,
    courts: Array.from({ length: numCourts }, (_, i) => ({ id: `c${i + 1}`, name: `Court ${i + 1}` })),
    maxRounds: null,
  };
}

function scoreAllMatches(rounds: Round[], points = 21): Round[] {
  return rounds.map(r => ({
    ...r,
    matches: r.matches.map(m => ({
      ...m,
      score: m.score ?? { team1Points: Math.ceil(points / 2), team2Points: Math.floor(points / 2) },
    })),
  }));
}

function assertCrossGroupPartners(players: Player[], rounds: Round[]) {
  const groupOf = new Map(players.map(p => [p.id, p.group]));
  for (const round of rounds) {
    for (const match of round.matches) {
      for (const team of [match.team1, match.team2]) {
        const g0 = groupOf.get(team[0]);
        const g1 = groupOf.get(team[1]);
        expect(g0).toBeDefined();
        expect(g1).toBeDefined();
        expect(g0).not.toBe(g1);
      }
    }
  }
}

describe('mixedAmericano strategy', () => {
  describe('strategy properties', () => {
    it('is a batch (non-dynamic) strategy', () => {
      expect(mixedAmericanoStrategy.isDynamic).toBe(false);
    });

    it('does not have fixed partners', () => {
      expect(mixedAmericanoStrategy.hasFixedPartners).toBe(false);
    });
  });

  describe('validateSetup', () => {
    it('requires at least 4 players', () => {
      const players = [
        { id: 'a1', name: 'A1', group: 'A' as const },
        { id: 'b1', name: 'B1', group: 'B' as const },
      ];
      const errors = mixedAmericanoStrategy.validateSetup(players, makeConfig(1));
      expect(errors.some(e => e.includes('4 players'))).toBe(true);
    });

    it('requires at least 1 court', () => {
      const config: TournamentConfig = {
        format: 'mixed-americano',
        pointsPerMatch: 21,
        courts: [],
        maxRounds: null,
      };
      const errors = mixedAmericanoStrategy.validateSetup(makePlayers(2, 2), config);
      expect(errors.some(e => e.includes('1 court'))).toBe(true);
    });

    it('requires positive points per match', () => {
      const config = { ...makeConfig(1), pointsPerMatch: 0 };
      const errors = mixedAmericanoStrategy.validateSetup(makePlayers(2, 2), config);
      expect(errors.some(e => e.includes('Points per match'))).toBe(true);
    });

    it('requires all players to have a group assigned', () => {
      const players = [
        { id: 'a1', name: 'A1', group: 'A' as const },
        { id: 'a2', name: 'A2', group: 'A' as const },
        { id: 'b1', name: 'B1', group: 'B' as const },
        { id: 'b2', name: 'B2' },
      ];
      const errors = mixedAmericanoStrategy.validateSetup(players, makeConfig(1));
      expect(errors.some(e => e.includes('no group'))).toBe(true);
    });

    it('requires at least 2 players in group A', () => {
      const players = [
        { id: 'a1', name: 'A1', group: 'A' as const },
        { id: 'b1', name: 'B1', group: 'B' as const },
        { id: 'b2', name: 'B2', group: 'B' as const },
        { id: 'b3', name: 'B3', group: 'B' as const },
      ];
      const errors = mixedAmericanoStrategy.validateSetup(players, makeConfig(1));
      expect(errors.some(e => e.includes('Group A needs at least 2'))).toBe(true);
    });

    it('requires at least 2 players in group B', () => {
      const players = [
        { id: 'a1', name: 'A1', group: 'A' as const },
        { id: 'a2', name: 'A2', group: 'A' as const },
        { id: 'a3', name: 'A3', group: 'A' as const },
        { id: 'b1', name: 'B1', group: 'B' as const },
      ];
      const errors = mixedAmericanoStrategy.validateSetup(players, makeConfig(1));
      expect(errors.some(e => e.includes('Group B needs at least 2'))).toBe(true);
    });

    it('rejects too many courts for the group sizes', () => {
      const errors = mixedAmericanoStrategy.validateSetup(makePlayers(2, 2), makeConfig(2));
      expect(errors.some(e => e.includes('Too many courts'))).toBe(true);
    });

    it('passes for valid setup', () => {
      const errors = mixedAmericanoStrategy.validateSetup(makePlayers(4, 4), makeConfig(2));
      expect(errors).toEqual([]);
    });

    it('passes for 2A + 2B on 1 court', () => {
      const errors = mixedAmericanoStrategy.validateSetup(makePlayers(2, 2), makeConfig(1));
      expect(errors).toEqual([]);
    });
  });

  describe('validateWarnings', () => {
    it('warns about unequal groups', () => {
      const warnings = mixedAmericanoStrategy.validateWarnings!(makePlayers(3, 2), makeConfig(1));
      expect(warnings.some(w => w.includes('unequal'))).toBe(true);
    });

    it('no warning for equal groups', () => {
      const warnings = mixedAmericanoStrategy.validateWarnings!(makePlayers(3, 3), makeConfig(1));
      expect(warnings).toHaveLength(0);
    });
  });

  describe('validateScore', () => {
    it('accepts valid score', () => {
      expect(mixedAmericanoStrategy.validateScore(
        { team1Points: 11, team2Points: 10 }, makeConfig(1),
      )).toBeNull();
    });

    it('rejects wrong total', () => {
      const err = mixedAmericanoStrategy.validateScore(
        { team1Points: 10, team2Points: 10 }, makeConfig(1),
      );
      expect(err).not.toBeNull();
    });
  });

  describe('generateSchedule', () => {
    it('generates all rounds upfront (batch mode)', () => {
      const { rounds } = mixedAmericanoStrategy.generateSchedule(makePlayers(4, 4), makeConfig(2));
      expect(rounds.length).toBeGreaterThan(1);
    });

    it('creates correct number of matches per round', () => {
      const { rounds } = mixedAmericanoStrategy.generateSchedule(makePlayers(4, 4), makeConfig(2));
      expect(rounds[0].matches).toHaveLength(2);
    });

    it('every team has cross-group partners', () => {
      const players = makePlayers(4, 4);
      const { rounds } = mixedAmericanoStrategy.generateSchedule(players, makeConfig(2));
      assertCrossGroupPartners(players, rounds);
    });

    it('each match has exactly 4 players (2v2)', () => {
      const { rounds } = mixedAmericanoStrategy.generateSchedule(makePlayers(4, 4), makeConfig(2));
      for (const round of rounds) {
        for (const match of round.matches) {
          expect(match.team1).toHaveLength(2);
          expect(match.team2).toHaveLength(2);
        }
      }
    });

    it('no player appears in multiple matches in same round', () => {
      const { rounds } = mixedAmericanoStrategy.generateSchedule(makePlayers(4, 4), makeConfig(2));
      for (const round of rounds) {
        const playerIds = round.matches.flatMap(m => [...m.team1, ...m.team2]);
        expect(new Set(playerIds).size).toBe(playerIds.length);
      }
    });

    it('assigns all players to matches or sit-outs', () => {
      const players = makePlayers(3, 3);
      const { rounds } = mixedAmericanoStrategy.generateSchedule(players, makeConfig(1));
      const playing = rounds[0].matches.flatMap(m => [...m.team1, ...m.team2]);
      const sitting = rounds[0].sitOuts;
      expect(playing.length + sitting.length).toBe(6);
    });

    it('returns warning when sit-outs are needed', () => {
      const { warnings } = mixedAmericanoStrategy.generateSchedule(makePlayers(3, 3), makeConfig(1));
      expect(warnings.some(w => w.includes('sit out'))).toBe(true);
    });

    it('returns no warnings when no sit-outs', () => {
      const { warnings } = mixedAmericanoStrategy.generateSchedule(makePlayers(4, 4), makeConfig(2));
      expect(warnings).toHaveLength(0);
    });

    it('returns empty rounds when not enough players per group', () => {
      const players = [
        { id: 'a1', name: 'A1', group: 'A' as const },
        { id: 'b1', name: 'B1', group: 'B' as const },
      ];
      const { rounds } = mixedAmericanoStrategy.generateSchedule(players, makeConfig(1));
      expect(rounds).toHaveLength(0);
    });
  });

  describe('generateAdditionalRounds', () => {
    it('generates the requested number of additional rounds', () => {
      const players = makePlayers(4, 4);
      const config = makeConfig(2);
      const initial = mixedAmericanoStrategy.generateSchedule(players, config);
      const scored = scoreAllMatches(initial.rounds);
      const { rounds } = mixedAmericanoStrategy.generateAdditionalRounds(players, config, scored, 3);
      expect(rounds).toHaveLength(3);
    });

    it('uses random pairing for all rounds (not standings-based)', () => {
      // Mixed Americano should NOT sort by standings — always random
      const players = makePlayers(4, 4);
      const config = makeConfig(2);
      const initial = mixedAmericanoStrategy.generateSchedule(players, config);
      const scored = scoreAllMatches(initial.rounds);
      const { rounds } = mixedAmericanoStrategy.generateAdditionalRounds(players, config, scored, 1);
      expect(rounds[0].matches).toHaveLength(2);
      assertCrossGroupPartners(players, rounds);
    });

    it('maintains cross-group partners in all additional rounds', () => {
      const players = makePlayers(4, 4);
      const config = makeConfig(2);
      const initial = mixedAmericanoStrategy.generateSchedule(players, config);
      const scored = scoreAllMatches(initial.rounds);
      const { rounds } = mixedAmericanoStrategy.generateAdditionalRounds(players, config, scored, 5);
      assertCrossGroupPartners(players, rounds);
    });

    it('handles excluded player ids', () => {
      const players = makePlayers(4, 4);
      const config = makeConfig(1);
      const { rounds } = mixedAmericanoStrategy.generateAdditionalRounds(
        players, config, [], 1, ['a1', 'b1'],
      );
      const allPlayerIds = rounds[0].matches.flatMap(m => [...m.team1, ...m.team2]);
      expect(allPlayerIds).not.toContain('a1');
      expect(allPlayerIds).not.toContain('b1');
    });

    it('round numbering continues from existing rounds', () => {
      const players = makePlayers(4, 4);
      const config = makeConfig(2);
      const initial = mixedAmericanoStrategy.generateSchedule(players, config);
      const scored = scoreAllMatches(initial.rounds);
      const existingCount = scored.length;
      const { rounds } = mixedAmericanoStrategy.generateAdditionalRounds(players, config, scored, 2);
      expect(rounds[0].roundNumber).toBe(existingCount + 1);
      expect(rounds[1].roundNumber).toBe(existingCount + 2);
    });

    it('returns empty rounds when not enough active players per group', () => {
      const players = makePlayers(2, 2);
      const config = makeConfig(1);
      // Exclude both B players — only 2 A players left, not enough for cross-group
      const { rounds } = mixedAmericanoStrategy.generateAdditionalRounds(
        players, config, [], 1, ['b1', 'b2'],
      );
      // With only 2 players left (both A), no cross-group possible and not enough for 4-player match
      expect(rounds).toHaveLength(0);
    });
  });

  describe('calculateStandings', () => {
    it('returns standings for all players', () => {
      const players = makePlayers(2, 2);
      const tournament = {
        id: 't1', name: 'Test', config: makeConfig(1),
        phase: 'in-progress' as const, players,
        rounds: [], createdAt: 0, updatedAt: 0,
      };
      const standings = mixedAmericanoStrategy.calculateStandings(tournament);
      expect(standings).toHaveLength(4);
    });

    it('accumulates points from scored matches', () => {
      const players = makePlayers(2, 2);
      const tournament = {
        id: 't1', name: 'Test', config: makeConfig(1),
        phase: 'in-progress' as const, players,
        rounds: [{
          id: 'r1', roundNumber: 1, sitOuts: [] as string[],
          matches: [{
            id: 'm1', courtId: 'c1',
            team1: ['a1', 'b1'] as [string, string],
            team2: ['a2', 'b2'] as [string, string],
            score: { team1Points: 15, team2Points: 6 },
          }],
        }],
        createdAt: 0, updatedAt: 0,
      };
      const standings = mixedAmericanoStrategy.calculateStandings(tournament);
      const a1 = standings.find(s => s.playerId === 'a1')!;
      expect(a1.totalPoints).toBe(15);
      expect(a1.matchesWon).toBe(1);
      const a2 = standings.find(s => s.playerId === 'a2')!;
      expect(a2.totalPoints).toBe(6);
      expect(a2.matchesLost).toBe(1);
    });

    it('ranks by total points descending', () => {
      const players = makePlayers(2, 2);
      const tournament = {
        id: 't1', name: 'Test', config: makeConfig(1),
        phase: 'in-progress' as const, players,
        rounds: [{
          id: 'r1', roundNumber: 1, sitOuts: [] as string[],
          matches: [{
            id: 'm1', courtId: 'c1',
            team1: ['a1', 'b1'] as [string, string],
            team2: ['a2', 'b2'] as [string, string],
            score: { team1Points: 15, team2Points: 6 },
          }],
        }],
        createdAt: 0, updatedAt: 0,
      };
      const standings = mixedAmericanoStrategy.calculateStandings(tournament);
      expect(standings[0].totalPoints).toBeGreaterThanOrEqual(standings[1].totalPoints);
      expect(standings[0].rank).toBe(1);
    });
  });

  describe('getCompetitors', () => {
    it('returns one competitor per available player', () => {
      const players = makePlayers(2, 2);
      const tournament = {
        id: 't1', name: 'Test', config: makeConfig(1),
        phase: 'in-progress' as const, players,
        rounds: [], createdAt: 0, updatedAt: 0,
      };
      const competitors = mixedAmericanoStrategy.getCompetitors(tournament);
      expect(competitors).toHaveLength(4);
      for (const c of competitors) {
        expect(c.playerIds).toEqual([c.id]);
      }
    });

    it('excludes unavailable players', () => {
      const players = makePlayers(2, 2);
      players[0].unavailable = true;
      const tournament = {
        id: 't1', name: 'Test', config: makeConfig(1),
        phase: 'in-progress' as const, players,
        rounds: [], createdAt: 0, updatedAt: 0,
      };
      const competitors = mixedAmericanoStrategy.getCompetitors(tournament);
      expect(competitors).toHaveLength(3);
      expect(competitors.find(c => c.id === 'a1')).toBeUndefined();
    });
  });
});
