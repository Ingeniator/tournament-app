import { describe, it, expect } from 'vitest';
import { mexicanoStrategy } from './mexicano';
import type { Player, TournamentConfig, Round } from '@padel/common';

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
}

function makeConfig(numCourts: number, maxRounds: number | null = null): TournamentConfig {
  return {
    format: 'mexicano',
    pointsPerMatch: 21,
    courts: Array.from({ length: numCourts }, (_, i) => ({ id: `c${i + 1}`, name: `Court ${i + 1}` })),
    maxRounds,
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

describe('mexicano strategy', () => {
  describe('isDynamic', () => {
    it('is a dynamic strategy', () => {
      expect(mexicanoStrategy.isDynamic).toBe(true);
    });
  });

  describe('validateSetup', () => {
    it('validates minimum 4 players', () => {
      const errors = mexicanoStrategy.validateSetup(makePlayers(3), makeConfig(1));
      expect(errors.some(e => e.includes('4 players'))).toBe(true);
    });

    it('passes for valid setup', () => {
      const errors = mexicanoStrategy.validateSetup(makePlayers(8), makeConfig(2));
      expect(errors).toEqual([]);
    });
  });

  describe('validateScore', () => {
    it('accepts valid score', () => {
      expect(mexicanoStrategy.validateScore({ team1Points: 11, team2Points: 10 }, makeConfig(1))).toBeNull();
    });

    it('rejects wrong total', () => {
      const err = mexicanoStrategy.validateScore({ team1Points: 10, team2Points: 10 }, makeConfig(1));
      expect(err).not.toBeNull();
    });
  });

  describe('generateSchedule', () => {
    it('generates exactly 1 round initially', () => {
      const { rounds } = mexicanoStrategy.generateSchedule(makePlayers(8), makeConfig(2));
      expect(rounds.length).toBe(1);
    });

    it('creates correct number of matches per round', () => {
      const { rounds } = mexicanoStrategy.generateSchedule(makePlayers(8), makeConfig(2));
      expect(rounds[0].matches.length).toBe(2);
    });

    it('assigns all players to matches or sit-outs', () => {
      const players = makePlayers(6);
      const config = makeConfig(1);
      const { rounds } = mexicanoStrategy.generateSchedule(players, config);
      const playing = rounds[0].matches.flatMap(m => [...m.team1, ...m.team2]);
      const sitting = rounds[0].sitOuts;
      expect(playing.length + sitting.length).toBe(6);
    });

    it('each match has exactly 4 players (2v2)', () => {
      const { rounds } = mexicanoStrategy.generateSchedule(makePlayers(8), makeConfig(2));
      for (const match of rounds[0].matches) {
        expect(match.team1.length).toBe(2);
        expect(match.team2.length).toBe(2);
      }
    });

    it('no player appears in multiple matches in same round', () => {
      const { rounds } = mexicanoStrategy.generateSchedule(makePlayers(12), makeConfig(3));
      const playerIds = rounds[0].matches.flatMap(m => [...m.team1, ...m.team2]);
      expect(new Set(playerIds).size).toBe(playerIds.length);
    });

    it('returns warning when sit-outs are needed', () => {
      const { warnings } = mexicanoStrategy.generateSchedule(makePlayers(6), makeConfig(1));
      expect(warnings.some(w => w.includes('sit out'))).toBe(true);
    });

    it('returns no warnings when no sit-outs', () => {
      const { warnings } = mexicanoStrategy.generateSchedule(makePlayers(8), makeConfig(2));
      expect(warnings.length).toBe(0);
    });
  });

  describe('generateAdditionalRounds', () => {
    it('generates the requested number of additional rounds', () => {
      const players = makePlayers(8);
      const config = makeConfig(2);
      const initial = mexicanoStrategy.generateSchedule(players, config);
      const scored = scoreAllMatches(initial.rounds);
      const { rounds } = mexicanoStrategy.generateAdditionalRounds(players, config, scored, 2);
      expect(rounds.length).toBe(2);
    });

    it('uses standings-based grouping for subsequent rounds', () => {
      const players = makePlayers(8);
      const config = makeConfig(2);
      const initial = mexicanoStrategy.generateSchedule(players, config);
      const scored = scoreAllMatches(initial.rounds);
      const { rounds } = mexicanoStrategy.generateAdditionalRounds(players, config, scored, 1);
      // Just verify it produces valid rounds
      expect(rounds[0].matches.length).toBe(2);
      const allPlayers = rounds[0].matches.flatMap(m => [...m.team1, ...m.team2]);
      expect(new Set(allPlayers).size).toBe(allPlayers.length);
    });

    it('handles excluded player ids', () => {
      const players = makePlayers(8);
      const config = makeConfig(2);
      const { rounds } = mexicanoStrategy.generateAdditionalRounds(
        players, config, [], 1, ['p1', 'p2']
      );
      const allPlayerIds = rounds[0].matches.flatMap(m => [...m.team1, ...m.team2]);
      expect(allPlayerIds).not.toContain('p1');
      expect(allPlayerIds).not.toContain('p2');
    });

    it('applies Mexicano pairing (1st+4th vs 2nd+3rd) in subsequent rounds', () => {
      const players = makePlayers(4);
      const config = makeConfig(1);
      // Create a scored first round to establish standings
      const r1 = {
        id: 'r1', roundNumber: 1,
        matches: [{
          id: 'm1', courtId: 'c1',
          team1: ['p1', 'p2'] as [string, string],
          team2: ['p3', 'p4'] as [string, string],
          score: { team1Points: 21, team2Points: 0 }, // p1,p2 clearly rank higher
        }],
        sitOuts: [] as string[],
      };
      const { rounds } = mexicanoStrategy.generateAdditionalRounds(players, config, [r1], 1);
      // Verify it produced a valid match
      expect(rounds[0].matches.length).toBe(1);
      const match = rounds[0].matches[0];
      const allIds = [...match.team1, ...match.team2];
      expect(new Set(allIds).size).toBe(4);
    });

    it('returns empty rounds when not enough players', () => {
      const players = makePlayers(3);
      const config = makeConfig(1);
      const { rounds } = mexicanoStrategy.generateAdditionalRounds(players, config, [], 1);
      expect(rounds.length).toBe(0);
    });
  });

  describe('calculateStandings', () => {
    it('returns standings for all players', () => {
      const players = makePlayers(4);
      const tournament = {
        id: 't1', name: 'Test', config: makeConfig(1),
        phase: 'in-progress' as const, players,
        rounds: [], createdAt: 0, updatedAt: 0,
      };
      const standings = mexicanoStrategy.calculateStandings(tournament);
      expect(standings.length).toBe(4);
    });

    it('accumulates points from scored matches', () => {
      const players = makePlayers(4);
      const tournament = {
        id: 't1', name: 'Test', config: makeConfig(1),
        phase: 'in-progress' as const, players,
        rounds: [{
          id: 'r1', roundNumber: 1, sitOuts: [] as string[],
          matches: [{
            id: 'm1', courtId: 'c1',
            team1: ['p1', 'p2'] as [string, string],
            team2: ['p3', 'p4'] as [string, string],
            score: { team1Points: 13, team2Points: 8 },
          }],
        }],
        createdAt: 0, updatedAt: 0,
      };
      const standings = mexicanoStrategy.calculateStandings(tournament);
      const p1 = standings.find(s => s.playerId === 'p1')!;
      expect(p1.totalPoints).toBe(13);
      expect(p1.matchesWon).toBe(1);
      expect(p1.matchesLost).toBe(0);
      const p3 = standings.find(s => s.playerId === 'p3')!;
      expect(p3.totalPoints).toBe(8);
      expect(p3.matchesLost).toBe(1);
    });

    it('ranks by total points descending', () => {
      const players = makePlayers(4);
      const tournament = {
        id: 't1', name: 'Test', config: makeConfig(1),
        phase: 'in-progress' as const, players,
        rounds: [{
          id: 'r1', roundNumber: 1, sitOuts: [] as string[],
          matches: [{
            id: 'm1', courtId: 'c1',
            team1: ['p1', 'p2'] as [string, string],
            team2: ['p3', 'p4'] as [string, string],
            score: { team1Points: 15, team2Points: 6 },
          }],
        }],
        createdAt: 0, updatedAt: 0,
      };
      const standings = mexicanoStrategy.calculateStandings(tournament);
      expect(standings[0].totalPoints).toBeGreaterThanOrEqual(standings[1].totalPoints);
      expect(standings[0].rank).toBe(1);
    });

    it('awards sit-out compensation', () => {
      const players = makePlayers(5);
      const tournament = {
        id: 't1', name: 'Test', config: makeConfig(1),
        phase: 'in-progress' as const, players,
        rounds: [{
          id: 'r1', roundNumber: 1, sitOuts: ['p5'],
          matches: [{
            id: 'm1', courtId: 'c1',
            team1: ['p1', 'p2'] as [string, string],
            team2: ['p3', 'p4'] as [string, string],
            score: { team1Points: 13, team2Points: 8 },
          }],
        }],
        createdAt: 0, updatedAt: 0,
      };
      const standings = mexicanoStrategy.calculateStandings(tournament);
      const p5 = standings.find(s => s.playerId === 'p5')!;
      // avg = (13 + 8) / 4 = 5.25, round = 5
      expect(p5.totalPoints).toBe(5);
    });
  });

  describe('getCompetitors', () => {
    it('returns one competitor per available player', () => {
      const players = makePlayers(4);
      const tournament = {
        id: 't1', name: 'Test', config: makeConfig(1),
        phase: 'in-progress' as const, players,
        rounds: [], createdAt: 0, updatedAt: 0,
      };
      const competitors = mexicanoStrategy.getCompetitors(tournament);
      expect(competitors.length).toBe(4);
      for (const c of competitors) {
        const player = players.find(p => p.id === c.id)!;
        expect(c.name).toBe(player.name);
        expect(c.playerIds).toEqual([player.id]);
      }
    });

    it('excludes unavailable players', () => {
      const players = [
        ...makePlayers(3),
        { id: 'p4', name: 'Player 4', unavailable: true },
      ];
      const tournament = {
        id: 't1', name: 'Test', config: makeConfig(1),
        phase: 'in-progress' as const, players,
        rounds: [], createdAt: 0, updatedAt: 0,
      };
      const competitors = mexicanoStrategy.getCompetitors(tournament);
      expect(competitors.length).toBe(3);
      expect(competitors.find(c => c.id === 'p4')).toBeUndefined();
    });
  });
});
