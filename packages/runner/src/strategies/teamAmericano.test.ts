import { describe, it, expect } from 'vitest';
import { teamAmericanoStrategy } from './teamAmericano';
import type { Player, TournamentConfig, Team, Tournament, Round } from '@padel/common';

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
}

function makeTeams(players: Player[]): Team[] {
  const teams: Team[] = [];
  for (let i = 0; i < players.length - 1; i += 2) {
    teams.push({
      id: `t${i / 2 + 1}`,
      player1Id: players[i].id,
      player2Id: players[i + 1].id,
    });
  }
  return teams;
}

function makeConfig(numCourts: number, maxRounds: number | null = null): TournamentConfig {
  return {
    format: 'team-americano',
    pointsPerMatch: 21,
    courts: Array.from({ length: numCourts }, (_, i) => ({ id: `c${i + 1}`, name: `Court ${i + 1}` })),
    maxRounds,
  };
}

function makeTournament(
  players: Player[],
  teams: Team[],
  config: TournamentConfig,
  rounds: Round[] = [],
): Tournament {
  return {
    id: 'test',
    name: 'Test Tournament',
    config,
    phase: 'in-progress',
    players,
    teams,
    rounds,
    createdAt: 0,
    updatedAt: 0,
  };
}

function scoreRounds(rounds: Round[], team1Points: number, team2Points: number): Round[] {
  return rounds.map(r => ({
    ...r,
    matches: r.matches.map(m => ({
      ...m,
      score: m.score ?? { team1Points, team2Points },
    })),
  }));
}

describe('teamAmericano strategy', () => {
  describe('strategy properties', () => {
    it('is not dynamic', () => {
      expect(teamAmericanoStrategy.isDynamic).toBe(false);
    });

    it('has fixed partners', () => {
      expect(teamAmericanoStrategy.hasFixedPartners).toBe(true);
    });
  });

  describe('validateSetup', () => {
    it('requires at least 4 players', () => {
      const errors = teamAmericanoStrategy.validateSetup(makePlayers(2), makeConfig(1));
      expect(errors.some(e => e.includes('4 players'))).toBe(true);
    });

    it('requires even number of players', () => {
      const errors = teamAmericanoStrategy.validateSetup(makePlayers(5), makeConfig(1));
      expect(errors.some(e => e.includes('even number'))).toBe(true);
    });

    it('requires at least 1 court', () => {
      const config: TournamentConfig = {
        format: 'team-americano',
        pointsPerMatch: 21,
        courts: [],
        maxRounds: null,
      };
      const errors = teamAmericanoStrategy.validateSetup(makePlayers(4), config);
      expect(errors.some(e => e.includes('1 court'))).toBe(true);
    });

    it('requires positive points per match', () => {
      const config = { ...makeConfig(1), pointsPerMatch: 0 };
      const errors = teamAmericanoStrategy.validateSetup(makePlayers(4), config);
      expect(errors.some(e => e.includes('Points per match'))).toBe(true);
    });

    it('rejects too many courts for the number of teams', () => {
      // 4 players = 2 teams, which need at most 1 court
      const errors = teamAmericanoStrategy.validateSetup(makePlayers(4), makeConfig(2));
      expect(errors.some(e => e.includes('Too many courts'))).toBe(true);
    });

    it('passes for valid setup', () => {
      const errors = teamAmericanoStrategy.validateSetup(makePlayers(6), makeConfig(1));
      expect(errors).toEqual([]);
    });

    it('passes for 4 players and 1 court', () => {
      const errors = teamAmericanoStrategy.validateSetup(makePlayers(4), makeConfig(1));
      expect(errors).toEqual([]);
    });

    it('returns multiple errors simultaneously', () => {
      // 3 players, 0 courts
      const config: TournamentConfig = {
        format: 'team-americano',
        pointsPerMatch: 0,
        courts: [],
        maxRounds: null,
      };
      const errors = teamAmericanoStrategy.validateSetup(makePlayers(3), config);
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('validateScore', () => {
    it('accepts valid score', () => {
      expect(teamAmericanoStrategy.validateScore(
        { team1Points: 11, team2Points: 10 }, makeConfig(1),
      )).toBeNull();
    });

    it('rejects wrong total', () => {
      const err = teamAmericanoStrategy.validateScore(
        { team1Points: 10, team2Points: 10 }, makeConfig(1),
      );
      expect(err).not.toBeNull();
    });

    it('rejects negative points', () => {
      const err = teamAmericanoStrategy.validateScore(
        { team1Points: -1, team2Points: 22 }, makeConfig(1),
      );
      expect(err).not.toBeNull();
    });
  });

  describe('generateSchedule', () => {
    it('returns empty with no teams', () => {
      const players = makePlayers(4);
      const config = makeConfig(1);
      const tournament = makeTournament(players, [], config);
      const { rounds, warnings } = teamAmericanoStrategy.generateSchedule(players, config, tournament);
      expect(rounds).toHaveLength(0);
      expect(warnings.some(w => w.includes('No teams'))).toBe(true);
    });

    it('generates correct number of rounds for 4 players / 2 teams / 1 court', () => {
      const players = makePlayers(4);
      const teams = makeTeams(players);
      const config = makeConfig(1);
      const tournament = makeTournament(players, teams, config);
      const { rounds } = teamAmericanoStrategy.generateSchedule(players, config, tournament);
      // 2 teams, 1 court: totalRounds = ceil((2-1)*2/2) = 1
      expect(rounds.length).toBeGreaterThanOrEqual(1);
    });

    it('generates correct number of rounds for 6 players / 3 teams / 1 court', () => {
      const players = makePlayers(6);
      const teams = makeTeams(players);
      const config = makeConfig(1, 5);
      const tournament = makeTournament(players, teams, config);
      const { rounds } = teamAmericanoStrategy.generateSchedule(players, config, tournament);
      expect(rounds).toHaveLength(5);
    });

    it('each match has exactly 4 players (2v2)', () => {
      const players = makePlayers(8);
      const teams = makeTeams(players);
      const config = makeConfig(2);
      const tournament = makeTournament(players, teams, config);
      const { rounds } = teamAmericanoStrategy.generateSchedule(players, config, tournament);
      for (const round of rounds) {
        for (const match of round.matches) {
          expect(match.team1).toHaveLength(2);
          expect(match.team2).toHaveLength(2);
        }
      }
    });

    it('all teams play or sit out each round', () => {
      const players = makePlayers(6);
      const teams = makeTeams(players); // 3 teams
      const config = makeConfig(1, 3);
      const tournament = makeTournament(players, teams, config);
      const { rounds } = teamAmericanoStrategy.generateSchedule(players, config, tournament);

      for (const round of rounds) {
        const playingPlayerIds = round.matches.flatMap(m => [...m.team1, ...m.team2]);
        const allAccountedFor = new Set([...playingPlayerIds, ...round.sitOuts]);
        expect(allAccountedFor.size).toBe(6);
      }
    });

    it('match sides correspond to actual teams', () => {
      const players = makePlayers(8);
      const teams = makeTeams(players);
      const config = makeConfig(2);
      const tournament = makeTournament(players, teams, config);
      const { rounds } = teamAmericanoStrategy.generateSchedule(players, config, tournament);

      for (const round of rounds) {
        for (const match of round.matches) {
          // Each side should be a valid team
          const isTeam1Valid = teams.some(t =>
            (t.player1Id === match.team1[0] && t.player2Id === match.team1[1]) ||
            (t.player1Id === match.team1[1] && t.player2Id === match.team1[0])
          );
          const isTeam2Valid = teams.some(t =>
            (t.player1Id === match.team2[0] && t.player2Id === match.team2[1]) ||
            (t.player1Id === match.team2[1] && t.player2Id === match.team2[0])
          );
          expect(isTeam1Valid).toBe(true);
          expect(isTeam2Valid).toBe(true);
        }
      }
    });

    it('warns about sit-outs with odd number of teams', () => {
      const players = makePlayers(6);
      const teams = makeTeams(players); // 3 teams, 1 court → 1 team sits out
      const config = makeConfig(1, 3);
      const tournament = makeTournament(players, teams, config);
      const { warnings } = teamAmericanoStrategy.generateSchedule(players, config, tournament);
      expect(warnings.some(w => w.includes('sit out'))).toBe(true);
    });

    it('no warnings when all teams play every round', () => {
      const players = makePlayers(4);
      const teams = makeTeams(players); // 2 teams, 1 court → no sit-outs
      const config = makeConfig(1, 2);
      const tournament = makeTournament(players, teams, config);
      const { warnings } = teamAmericanoStrategy.generateSchedule(players, config, tournament);
      expect(warnings).toHaveLength(0);
    });

    it('no team appears twice in the same round', () => {
      const players = makePlayers(8);
      const teams = makeTeams(players); // 4 teams
      const config = makeConfig(2, 5);
      const tournament = makeTournament(players, teams, config);
      const { rounds } = teamAmericanoStrategy.generateSchedule(players, config, tournament);

      for (const round of rounds) {
        const allPlayerIds = round.matches.flatMap(m => [...m.team1, ...m.team2]);
        expect(new Set(allPlayerIds).size).toBe(allPlayerIds.length);
      }
    });

    it('respects maxRounds config', () => {
      const players = makePlayers(4);
      const teams = makeTeams(players);
      const config = makeConfig(1, 3);
      const tournament = makeTournament(players, teams, config);
      const { rounds } = teamAmericanoStrategy.generateSchedule(players, config, tournament);
      expect(rounds).toHaveLength(3);
    });
  });

  describe('generateAdditionalRounds', () => {
    it('generates the requested number of additional rounds', () => {
      const players = makePlayers(4);
      const teams = makeTeams(players);
      const config = makeConfig(1);
      const tournament = makeTournament(players, teams, config);
      const initial = teamAmericanoStrategy.generateSchedule(players, config, tournament);
      const scored = scoreRounds(initial.rounds, 11, 10);
      const { rounds } = teamAmericanoStrategy.generateAdditionalRounds(
        players, config, scored, 2, undefined, undefined, tournament,
      );
      expect(rounds).toHaveLength(2);
    });

    it('starts round numbering after existing rounds', () => {
      const players = makePlayers(4);
      const teams = makeTeams(players);
      const config = makeConfig(1, 1);
      const tournament = makeTournament(players, teams, config);
      const initial = teamAmericanoStrategy.generateSchedule(players, config, tournament);
      const scored = scoreRounds(initial.rounds, 11, 10);
      const { rounds } = teamAmericanoStrategy.generateAdditionalRounds(
        players, config, scored, 1, undefined, undefined, tournament,
      );
      expect(rounds[0].roundNumber).toBe(2);
    });

    it('returns empty with no teams', () => {
      const players = makePlayers(4);
      const config = makeConfig(1);
      const tournament = makeTournament(players, [], config);
      const { rounds } = teamAmericanoStrategy.generateAdditionalRounds(
        players, config, [], 1, undefined, undefined, tournament,
      );
      expect(rounds).toHaveLength(0);
    });
  });

  describe('sit-out balance', () => {
    it('distributes sit-outs evenly across teams', () => {
      const players = makePlayers(6);
      const teams = makeTeams(players); // 3 teams, 1 court → 1 team sits out per round
      const config = makeConfig(1, 6);
      const tournament = makeTournament(players, teams, config);
      const { rounds } = teamAmericanoStrategy.generateSchedule(players, config, tournament);

      // Count how many times each team sits out
      const sitOutCounts = new Map<string, number>();
      for (const t of teams) sitOutCounts.set(t.id, 0);

      for (const round of rounds) {
        for (const t of teams) {
          if (round.sitOuts.includes(t.player1Id)) {
            sitOutCounts.set(t.id, (sitOutCounts.get(t.id) ?? 0) + 1);
          }
        }
      }

      const counts = [...sitOutCounts.values()];
      const min = Math.min(...counts);
      const max = Math.max(...counts);
      // Sit-outs should be balanced: spread ≤ 1
      expect(max - min).toBeLessThanOrEqual(1);
    });

    it('sit-out entries contain player IDs from sitting-out teams', () => {
      const players = makePlayers(6);
      const teams = makeTeams(players); // 3 teams
      const config = makeConfig(1, 3);
      const tournament = makeTournament(players, teams, config);
      const { rounds } = teamAmericanoStrategy.generateSchedule(players, config, tournament);

      for (const round of rounds) {
        // Sit-out player IDs should come in pairs belonging to the same team
        if (round.sitOuts.length > 0) {
          expect(round.sitOuts.length).toBe(2); // 1 team = 2 players
          const sitTeam = teams.find(t =>
            round.sitOuts.includes(t.player1Id) && round.sitOuts.includes(t.player2Id)
          );
          expect(sitTeam).toBeDefined();
        }
      }
    });
  });

  describe('calculateStandings', () => {
    it('returns standings for all teams', () => {
      const players = makePlayers(4);
      const teams = makeTeams(players);
      const config = makeConfig(1);
      const tournament = makeTournament(players, teams, config);
      const standings = teamAmericanoStrategy.calculateStandings(tournament);
      expect(standings).toHaveLength(2);
    });

    it('returns all zeroes with no rounds', () => {
      const players = makePlayers(4);
      const teams = makeTeams(players);
      const config = makeConfig(1);
      const tournament = makeTournament(players, teams, config);
      const standings = teamAmericanoStrategy.calculateStandings(tournament);
      for (const entry of standings) {
        expect(entry.totalPoints).toBe(0);
        expect(entry.matchesPlayed).toBe(0);
      }
    });

    it('computes correct points from a single match', () => {
      const players = makePlayers(4);
      const teams = makeTeams(players); // t1: p1+p2, t2: p3+p4
      const config = makeConfig(1);
      const rounds: Round[] = [{
        id: 'r1', roundNumber: 1,
        matches: [{
          id: 'm1', courtId: 'c1',
          team1: [players[0].id, players[1].id] as [string, string],
          team2: [players[2].id, players[3].id] as [string, string],
          score: { team1Points: 15, team2Points: 6 },
        }],
        sitOuts: [],
      }];
      const tournament = makeTournament(players, teams, config, rounds);
      const standings = teamAmericanoStrategy.calculateStandings(tournament);

      // Winner team (t1) should be ranked first
      expect(standings[0].totalPoints).toBe(15);
      expect(standings[0].matchesWon).toBe(1);
      expect(standings[0].matchesLost).toBe(0);
      expect(standings[0].pointDiff).toBe(9);
      expect(standings[0].rank).toBe(1);

      // Loser team (t2) ranked second
      expect(standings[1].totalPoints).toBe(6);
      expect(standings[1].matchesWon).toBe(0);
      expect(standings[1].matchesLost).toBe(1);
      expect(standings[1].pointDiff).toBe(-9);
      expect(standings[1].rank).toBe(2);
    });

    it('accumulates points across multiple rounds', () => {
      const players = makePlayers(4);
      const teams = makeTeams(players);
      const config = makeConfig(1);
      const rounds: Round[] = [
        {
          id: 'r1', roundNumber: 1,
          matches: [{
            id: 'm1', courtId: 'c1',
            team1: [players[0].id, players[1].id] as [string, string],
            team2: [players[2].id, players[3].id] as [string, string],
            score: { team1Points: 15, team2Points: 6 },
          }],
          sitOuts: [],
        },
        {
          id: 'r2', roundNumber: 2,
          matches: [{
            id: 'm2', courtId: 'c1',
            team1: [players[0].id, players[1].id] as [string, string],
            team2: [players[2].id, players[3].id] as [string, string],
            score: { team1Points: 10, team2Points: 11 },
          }],
          sitOuts: [],
        },
      ];
      const tournament = makeTournament(players, teams, config, rounds);
      const standings = teamAmericanoStrategy.calculateStandings(tournament);

      const t1 = standings.find(s => s.playerId === 't1')!;
      const t2 = standings.find(s => s.playerId === 't2')!;

      expect(t1.totalPoints).toBe(25); // 15 + 10
      expect(t1.matchesWon).toBe(1);
      expect(t1.matchesLost).toBe(1);
      expect(t2.totalPoints).toBe(17); // 6 + 11
      expect(t2.matchesWon).toBe(1);
      expect(t2.matchesLost).toBe(1);
    });

    it('handles draws correctly', () => {
      const players = makePlayers(4);
      const teams = makeTeams(players);
      const config = { ...makeConfig(1), pointsPerMatch: 20 };
      const rounds: Round[] = [{
        id: 'r1', roundNumber: 1,
        matches: [{
          id: 'm1', courtId: 'c1',
          team1: [players[0].id, players[1].id] as [string, string],
          team2: [players[2].id, players[3].id] as [string, string],
          score: { team1Points: 10, team2Points: 10 },
        }],
        sitOuts: [],
      }];
      const tournament = makeTournament(players, teams, config, rounds);
      const standings = teamAmericanoStrategy.calculateStandings(tournament);

      for (const entry of standings) {
        expect(entry.matchesDraw).toBe(1);
        expect(entry.matchesWon).toBe(0);
        expect(entry.matchesLost).toBe(0);
      }
    });

    it('applies sit-out compensation', () => {
      const players = makePlayers(6);
      const teams = makeTeams(players); // t1: p1+p2, t2: p3+p4, t3: p5+p6
      const config = makeConfig(1);
      const rounds: Round[] = [{
        id: 'r1', roundNumber: 1,
        matches: [{
          id: 'm1', courtId: 'c1',
          team1: [players[0].id, players[1].id] as [string, string],
          team2: [players[2].id, players[3].id] as [string, string],
          score: { team1Points: 15, team2Points: 6 },
        }],
        sitOuts: [players[4].id, players[5].id], // t3 sits out
      }];
      const tournament = makeTournament(players, teams, config, rounds);
      const standings = teamAmericanoStrategy.calculateStandings(tournament);

      const t3 = standings.find(s => s.playerId === 't3')!;
      // Sit-out compensation: avg = (15 + 6) / 2 teams = 10.5 → rounds to 11
      expect(t3.totalPoints).toBe(Math.round((15 + 6) / 2));
      // Sitting out team should not have matchesPlayed incremented
      expect(t3.matchesPlayed).toBe(0);
    });

    it('sorts by totalPoints, then pointDiff, then matchesWon', () => {
      const players = makePlayers(6);
      const teams = makeTeams(players);
      const config = makeConfig(1);
      const rounds: Round[] = [
        {
          id: 'r1', roundNumber: 1,
          matches: [{
            id: 'm1', courtId: 'c1',
            team1: [players[0].id, players[1].id] as [string, string],
            team2: [players[2].id, players[3].id] as [string, string],
            score: { team1Points: 15, team2Points: 6 },
          }],
          sitOuts: [players[4].id, players[5].id],
        },
        {
          id: 'r2', roundNumber: 2,
          matches: [{
            id: 'm2', courtId: 'c1',
            team1: [players[2].id, players[3].id] as [string, string],
            team2: [players[4].id, players[5].id] as [string, string],
            score: { team1Points: 14, team2Points: 7 },
          }],
          sitOuts: [players[0].id, players[1].id],
        },
      ];
      const tournament = makeTournament(players, teams, config, rounds);
      const standings = teamAmericanoStrategy.calculateStandings(tournament);

      // Rankings should be in descending order by totalPoints
      for (let i = 1; i < standings.length; i++) {
        expect(standings[i - 1].totalPoints).toBeGreaterThanOrEqual(standings[i].totalPoints);
      }
    });

    it('assigns tied ranks correctly', () => {
      const players = makePlayers(4);
      const teams = makeTeams(players);
      const config = { ...makeConfig(1), pointsPerMatch: 20 };
      // Both teams get 10 points, same diff, same wins → tied rank
      const rounds: Round[] = [{
        id: 'r1', roundNumber: 1,
        matches: [{
          id: 'm1', courtId: 'c1',
          team1: [players[0].id, players[1].id] as [string, string],
          team2: [players[2].id, players[3].id] as [string, string],
          score: { team1Points: 10, team2Points: 10 },
        }],
        sitOuts: [],
      }];
      const tournament = makeTournament(players, teams, config, rounds);
      const standings = teamAmericanoStrategy.calculateStandings(tournament);

      expect(standings[0].rank).toBe(1);
      expect(standings[1].rank).toBe(1);
    });

    it('uses team name in standings when set', () => {
      const players = makePlayers(4);
      const teams = makeTeams(players);
      teams[0].name = 'The Aces';
      const config = makeConfig(1);
      const tournament = makeTournament(players, teams, config);
      const standings = teamAmericanoStrategy.calculateStandings(tournament);

      const t1 = standings.find(s => s.playerId === 't1')!;
      expect(t1.playerName).toBe('The Aces');
    });

    it('auto-generates team name from player names when not set', () => {
      const players = makePlayers(4);
      const teams = makeTeams(players);
      const config = makeConfig(1);
      const tournament = makeTournament(players, teams, config);
      const standings = teamAmericanoStrategy.calculateStandings(tournament);

      const t1 = standings.find(s => s.playerId === 't1')!;
      expect(t1.playerName).toBe('Player 1 & Player 2');
    });

    it('returns empty standings with no teams', () => {
      const players = makePlayers(4);
      const config = makeConfig(1);
      const tournament = makeTournament(players, [], config);
      const standings = teamAmericanoStrategy.calculateStandings(tournament);
      expect(standings).toHaveLength(0);
    });
  });

  describe('getCompetitors', () => {
    it('returns one competitor per team', () => {
      const players = makePlayers(6);
      const teams = makeTeams(players);
      const config = makeConfig(1);
      const tournament = makeTournament(players, teams, config);
      const competitors = teamAmericanoStrategy.getCompetitors(tournament);
      expect(competitors).toHaveLength(3);
    });

    it('competitor has both player IDs', () => {
      const players = makePlayers(4);
      const teams = makeTeams(players);
      const config = makeConfig(1);
      const tournament = makeTournament(players, teams, config);
      const competitors = teamAmericanoStrategy.getCompetitors(tournament);

      expect(competitors[0].playerIds).toEqual(['p1', 'p2']);
      expect(competitors[1].playerIds).toEqual(['p3', 'p4']);
    });

    it('uses custom team name when set', () => {
      const players = makePlayers(4);
      const teams = makeTeams(players);
      teams[0].name = 'Dream Team';
      const config = makeConfig(1);
      const tournament = makeTournament(players, teams, config);
      const competitors = teamAmericanoStrategy.getCompetitors(tournament);

      expect(competitors[0].name).toBe('Dream Team');
    });

    it('generates name from player names when not set', () => {
      const players = makePlayers(4);
      const teams = makeTeams(players);
      const config = makeConfig(1);
      const tournament = makeTournament(players, teams, config);
      const competitors = teamAmericanoStrategy.getCompetitors(tournament);

      expect(competitors[0].name).toBe('Player 1 & Player 2');
    });

    it('returns empty array when no teams', () => {
      const players = makePlayers(4);
      const config = makeConfig(1);
      const tournament = makeTournament(players, [], config);
      const competitors = teamAmericanoStrategy.getCompetitors(tournament);
      expect(competitors).toHaveLength(0);
    });
  });

  describe('distribution quality', () => {
    it('games are balanced across teams (4 teams / 2 courts / 6 rounds)', () => {
      const players = makePlayers(8);
      const teams = makeTeams(players); // 4 teams
      const config = makeConfig(2, 6);
      const tournament = makeTournament(players, teams, config);
      const { rounds } = teamAmericanoStrategy.generateSchedule(players, config, tournament);

      const gamesPlayed = new Map<string, number>();
      for (const t of teams) gamesPlayed.set(t.id, 0);

      for (const round of rounds) {
        for (const match of round.matches) {
          for (const t of teams) {
            const inMatch = (
              (t.player1Id === match.team1[0] || t.player1Id === match.team1[1]) ||
              (t.player1Id === match.team2[0] || t.player1Id === match.team2[1])
            );
            if (inMatch) gamesPlayed.set(t.id, (gamesPlayed.get(t.id) ?? 0) + 1);
          }
        }
      }

      const counts = [...gamesPlayed.values()];
      // With 4 teams and 2 courts, every team plays every round — all should have 6
      expect(Math.min(...counts)).toBe(6);
      expect(Math.max(...counts)).toBe(6);
    });

    it('opponent distribution is balanced (4 teams / 1 court / 6 rounds)', () => {
      const players = makePlayers(8);
      const teams = makeTeams(players); // 4 teams, 1 court → 2 sit out per round
      const config = makeConfig(1, 6);
      const tournament = makeTournament(players, teams, config);
      const { rounds } = teamAmericanoStrategy.generateSchedule(players, config, tournament);

      const opponentCounts = new Map<string, number>();
      for (const round of rounds) {
        for (const match of round.matches) {
          const t1 = teams.find(t =>
            (t.player1Id === match.team1[0] && t.player2Id === match.team1[1]) ||
            (t.player1Id === match.team1[1] && t.player2Id === match.team1[0])
          );
          const t2 = teams.find(t =>
            (t.player1Id === match.team2[0] && t.player2Id === match.team2[1]) ||
            (t.player1Id === match.team2[1] && t.player2Id === match.team2[0])
          );
          if (t1 && t2) {
            const key = [t1.id, t2.id].sort().join(':');
            opponentCounts.set(key, (opponentCounts.get(key) ?? 0) + 1);
          }
        }
      }

      const counts = [...opponentCounts.values()];
      if (counts.length > 0) {
        const min = Math.min(...counts);
        const max = Math.max(...counts);
        // Opponent spread should be reasonable (≤ 2)
        expect(max - min).toBeLessThanOrEqual(2);
      }
    });
  });
});
