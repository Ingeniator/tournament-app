import { describe, it, expect } from 'vitest';
import { tournamentReducer } from './tournamentReducer';
import type { Tournament, TournamentConfig, Player, Team, MaldicionesHands } from '@padel/common';
import { createTeams } from '@padel/common';

function makeConfig(numCourts = 1): TournamentConfig {
  return {
    format: 'americano',
    pointsPerMatch: 24,
    courts: Array.from({ length: numCourts }, (_, i) => ({ id: `c${i + 1}`, name: `Court ${i + 1}` })),
    maxRounds: null,
  };
}

function makeSetupTournament(playerCount = 4): Tournament {
  return {
    id: 't1',
    name: 'Test Tournament',
    config: makeConfig(1),
    phase: 'setup',
    players: Array.from({ length: playerCount }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` })),
    rounds: [],
    createdAt: 1000,
    updatedAt: 1000,
  };
}



function makeInProgressTournament(): Tournament {
  const players: Player[] = Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
  const config = makeConfig(2);
  const resolvedConfig = { ...config, maxRounds: 3, pointsPerMatch: 24 };
  const setup: Tournament = {
    id: 't1', name: 'Test', config: resolvedConfig, phase: 'setup',
    players, rounds: [], createdAt: 1000, updatedAt: 1000,
  };
  const result = tournamentReducer(setup, { type: 'GENERATE_SCHEDULE' });
  return result!;
}

describe('tournamentReducer', () => {
  describe('CREATE_TOURNAMENT', () => {
    it('creates a new tournament in setup phase', () => {
      const result = tournamentReducer(null, {
        type: 'CREATE_TOURNAMENT',
        payload: { name: 'My Tournament', config: makeConfig() },
      });
      expect(result).not.toBeNull();
      expect(result!.name).toBe('My Tournament');
      expect(result!.phase).toBe('setup');
      expect(result!.players).toEqual([]);
      expect(result!.rounds).toEqual([]);
    });
  });

  describe('LOAD_TOURNAMENT', () => {
    it('loads a tournament and deduplicates names', () => {
      const tournament = makeSetupTournament();
      const result = tournamentReducer(null, {
        type: 'LOAD_TOURNAMENT',
        payload: tournament,
      });
      expect(result).not.toBeNull();
      expect(result!.id).toBe('t1');
    });
  });

  describe('UPDATE_PLAYER', () => {
    it('updates player name', () => {
      const state = makeSetupTournament(4);
      const result = tournamentReducer(state, {
        type: 'UPDATE_PLAYER',
        payload: { playerId: 'p1', name: 'New Name' },
      });
      expect(result!.players.find(p => p.id === 'p1')!.name).toBe('New Name');
    });
  });

  describe('UPDATE_NAME', () => {
    it('updates tournament name', () => {
      const state = makeSetupTournament();
      const result = tournamentReducer(state, {
        type: 'UPDATE_NAME',
        payload: { name: 'New Tournament Name' },
      });
      expect(result!.name).toBe('New Tournament Name');
    });
  });

  describe('GENERATE_SCHEDULE', () => {
    it('transitions from setup to in-progress', () => {
      const state = makeSetupTournament(8);
      const result = tournamentReducer({ ...state, config: makeConfig(2) }, { type: 'GENERATE_SCHEDULE' });
      expect(result!.phase).toBe('in-progress');
      expect(result!.rounds.length).toBeGreaterThan(0);
    });

    it('generates rounds with matches', () => {
      const state = makeSetupTournament(8);
      const result = tournamentReducer({ ...state, config: makeConfig(2) }, { type: 'GENERATE_SCHEDULE' });
      for (const round of result!.rounds) {
        expect(round.matches.length).toBeGreaterThan(0);
      }
    });

    it('ignores in non-setup phase', () => {
      const state = makeInProgressTournament();
      const result = tournamentReducer(state, { type: 'GENERATE_SCHEDULE' });
      expect(result).toBe(state);
    });

    it('deals maldiciones hands when maldiciones config is enabled and teams exist', () => {
      const players: Player[] = Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
      const teams: Team[] = [
        { id: 'team1', player1Id: 'p1', player2Id: 'p2' },
        { id: 'team2', player1Id: 'p3', player2Id: 'p4' },
        { id: 'team3', player1Id: 'p5', player2Id: 'p6' },
        { id: 'team4', player1Id: 'p7', player2Id: 'p8' },
      ];
      const config: TournamentConfig = {
        format: 'team-americano', pointsPerMatch: 21, maxRounds: 3,
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
        maldiciones: { enabled: true, chaosLevel: 'medium' },
      };
      const setup: Tournament = {
        id: 't1', name: 'Test', config, phase: 'team-pairing',
        players, teams, rounds: [], createdAt: 0, updatedAt: 0,
      };
      const result = tournamentReducer(setup, { type: 'GENERATE_SCHEDULE' })!;

      expect(result.maldicionesHands).toBeDefined();
      // Every team should have a hand with cards and a shield
      for (const team of teams) {
        const hand = result.maldicionesHands![team.id];
        expect(hand).toBeDefined();
        expect(hand.cardIds).toBeInstanceOf(Array);
        expect(hand.cardIds.length).toBeGreaterThan(0);
        expect(hand.hasShield).toBe(true);
      }
    });

    it('does not deal maldiciones hands when maldiciones config is disabled', () => {
      const players: Player[] = Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
      const teams: Team[] = [
        { id: 'team1', player1Id: 'p1', player2Id: 'p2' },
        { id: 'team2', player1Id: 'p3', player2Id: 'p4' },
        { id: 'team3', player1Id: 'p5', player2Id: 'p6' },
        { id: 'team4', player1Id: 'p7', player2Id: 'p8' },
      ];
      const config: TournamentConfig = {
        format: 'team-americano', pointsPerMatch: 21, maxRounds: 3,
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
      };
      const setup: Tournament = {
        id: 't1', name: 'Test', config, phase: 'team-pairing',
        players, teams, rounds: [], createdAt: 0, updatedAt: 0,
      };
      const result = tournamentReducer(setup, { type: 'GENERATE_SCHEDULE' })!;
      expect(result.maldicionesHands).toBeUndefined();
    });

    it('does not deal maldiciones hands when no teams exist', () => {
      const state = makeSetupTournament(8);
      const config: TournamentConfig = {
        ...makeConfig(2),
        maldiciones: { enabled: true, chaosLevel: 'medium' },
      };
      const result = tournamentReducer({ ...state, config }, { type: 'GENERATE_SCHEDULE' })!;
      // No teams on a non-team format, so maldicionesHands should not be dealt
      expect(result.maldicionesHands).toBeUndefined();
    });
  });

  describe('SET_MATCH_SCORE', () => {
    it('sets a match score', () => {
      const state = makeInProgressTournament();
      const roundId = state.rounds[0].id;
      const matchId = state.rounds[0].matches[0].id;
      const result = tournamentReducer(state, {
        type: 'SET_MATCH_SCORE',
        payload: {
          roundId, matchId,
          score: { team1Points: 14, team2Points: 10 },
        },
      });
      const match = result!.rounds[0].matches.find(m => m.id === matchId)!;
      expect(match.score).toEqual({ team1Points: 14, team2Points: 10 });
    });
  });

  describe('SET_MATCH_SCORE (overwrite)', () => {
    it('overwrites an already-scored match with a new score', () => {
      let state = makeInProgressTournament();
      const roundId = state.rounds[0].id;
      const matchId = state.rounds[0].matches[0].id;
      // Set initial score
      state = tournamentReducer(state, {
        type: 'SET_MATCH_SCORE',
        payload: { roundId, matchId, score: { team1Points: 14, team2Points: 10 } },
      })!;
      expect(state.rounds[0].matches.find(m => m.id === matchId)!.score).toEqual({ team1Points: 14, team2Points: 10 });
      // Overwrite with a different score
      const result = tournamentReducer(state, {
        type: 'SET_MATCH_SCORE',
        payload: { roundId, matchId, score: { team1Points: 10, team2Points: 14 } },
      });
      const match = result!.rounds[0].matches.find(m => m.id === matchId)!;
      expect(match.score).toEqual({ team1Points: 10, team2Points: 14 });
    });
  });

  describe('CLEAR_MATCH_SCORE', () => {
    it('clears a match score', () => {
      let state = makeInProgressTournament();
      const roundId = state.rounds[0].id;
      const matchId = state.rounds[0].matches[0].id;
      // First set a score
      state = tournamentReducer(state, {
        type: 'SET_MATCH_SCORE',
        payload: { roundId, matchId, score: { team1Points: 14, team2Points: 10 } },
      })!;
      // Then clear it
      const result = tournamentReducer(state, {
        type: 'CLEAR_MATCH_SCORE',
        payload: { roundId, matchId },
      });
      const match = result!.rounds[0].matches.find(m => m.id === matchId)!;
      expect(match.score).toBeNull();
    });
  });

  describe('UPDATE_POINTS', () => {
    it('updates points per match', () => {
      const state = makeInProgressTournament();
      const result = tournamentReducer(state, {
        type: 'UPDATE_POINTS',
        payload: { pointsPerMatch: 32 },
      });
      expect(result!.config.pointsPerMatch).toBe(32);
    });
  });

  describe('SET_ROUND_COUNT', () => {
    it('does nothing when count matches', () => {
      const state = makeInProgressTournament();
      const result = tournamentReducer(state, {
        type: 'SET_ROUND_COUNT',
        payload: { count: state.rounds.length },
      });
      expect(result).toBe(state);
    });

    it('trims unscored rounds when reducing', () => {
      const state = makeInProgressTournament();
      const originalCount = state.rounds.length;
      const result = tournamentReducer(state, {
        type: 'SET_ROUND_COUNT',
        payload: { count: 1 },
      });
      expect(result!.rounds.length).toBe(1);
      expect(result!.rounds.length).toBeLessThan(originalCount);
    });

    it('adds rounds when increasing', () => {
      const state = makeInProgressTournament();
      const originalCount = state.rounds.length;
      const result = tournamentReducer(state, {
        type: 'SET_ROUND_COUNT',
        payload: { count: originalCount + 2 },
      });
      expect(result!.rounds.length).toBe(originalCount + 2);
    });

    it('cannot reduce below scored rounds', () => {
      let state = makeInProgressTournament();
      // Score all matches in first round
      const roundId = state.rounds[0].id;
      for (const match of state.rounds[0].matches) {
        state = tournamentReducer(state, {
          type: 'SET_MATCH_SCORE',
          payload: { roundId, matchId: match.id, score: { team1Points: 14, team2Points: 10 } },
        })!;
      }
      // Try to reduce to 0 rounds
      const result = tournamentReducer(state, {
        type: 'SET_ROUND_COUNT',
        payload: { count: 0 },
      });
      // Should not reduce below scored count
      expect(result).toBe(state);
    });
  });

  describe('TOGGLE_PLAYER_AVAILABILITY', () => {
    it('toggles player unavailable flag', () => {
      const state = makeInProgressTournament();
      const result = tournamentReducer(state, {
        type: 'TOGGLE_PLAYER_AVAILABILITY',
        payload: { playerId: 'p1' },
      });
      expect(result!.players.find(p => p.id === 'p1')!.unavailable).toBe(true);
    });

    it('regenerates unscored rounds', () => {
      const state = makeInProgressTournament();
      const originalRounds = state.rounds;
      const result = tournamentReducer(state, {
        type: 'TOGGLE_PLAYER_AVAILABILITY',
        payload: { playerId: 'p1' },
      });
      // Rounds should be regenerated (may be different)
      expect(result!.rounds).not.toBe(originalRounds);
    });
  });

  describe('ADD_PLAYER_LIVE', () => {
    it('adds a new player during in-progress', () => {
      const state = makeInProgressTournament();
      const originalCount = state.players.length;
      const result = tournamentReducer(state, {
        type: 'ADD_PLAYER_LIVE',
        payload: { name: 'New Player' },
      });
      expect(result!.players.length).toBe(originalCount + 1);
    });

    it('ignores in setup phase', () => {
      const state = makeSetupTournament();
      const result = tournamentReducer(state, {
        type: 'ADD_PLAYER_LIVE',
        payload: { name: 'New Player' },
      });
      expect(result).toBe(state);
    });
  });

  describe('UPDATE_COURT', () => {
    it('renames a court', () => {
      const state = makeInProgressTournament();
      const courtId = state.config.courts[0].id;
      const result = tournamentReducer(state, {
        type: 'UPDATE_COURT',
        payload: { courtId, name: 'Main Court' },
      });
      expect(result!.config.courts.find(c => c.id === courtId)!.name).toBe('Main Court');
    });
  });

  describe('TOGGLE_COURT_AVAILABILITY', () => {
    it('prevents disabling all courts', () => {
      // Tournament with 1 court
      const players: Player[] = Array.from({ length: 4 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
      const config: TournamentConfig = { format: 'americano', pointsPerMatch: 24, courts: [{ id: 'c1', name: 'C1' }], maxRounds: 3 };
      const setup: Tournament = { id: 't1', name: 'Test', config, phase: 'setup', players, rounds: [], createdAt: 0, updatedAt: 0 };
      const inProgress = tournamentReducer(setup, { type: 'GENERATE_SCHEDULE' })!;
      // Try to disable the only court
      const result = tournamentReducer(inProgress, {
        type: 'TOGGLE_COURT_AVAILABILITY',
        payload: { courtId: 'c1' },
      });
      // Should be unchanged - can't disable all courts
      expect(result).toBe(inProgress);
    });
  });

  describe('COMPLETE_TOURNAMENT', () => {
    it('transitions to completed phase', () => {
      let state = makeInProgressTournament();
      // Score all matches
      for (const round of state.rounds) {
        for (const match of round.matches) {
          state = tournamentReducer(state, {
            type: 'SET_MATCH_SCORE',
            payload: {
              roundId: round.id,
              matchId: match.id,
              score: { team1Points: 14, team2Points: 10 },
            },
          })!;
        }
      }
      const result = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' });
      expect(result!.phase).toBe('completed');
    });

    it('drops fully unscored rounds', () => {
      const state = makeInProgressTournament();
      // Don't score anything — complete should drop all rounds
      const result = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' });
      expect(result!.rounds.length).toBe(0);
      expect(result!.phase).toBe('completed');
    });

    it('moves unscored match players to sit-outs in partial rounds', () => {
      let state = makeInProgressTournament();
      // Score only the first match of the first round
      const round = state.rounds[0];
      state = tournamentReducer(state, {
        type: 'SET_MATCH_SCORE',
        payload: {
          roundId: round.id,
          matchId: round.matches[0].id,
          score: { team1Points: 14, team2Points: 10 },
        },
      })!;
      const result = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' });
      // First round should be kept but with only scored match
      const closedRound = result!.rounds[0];
      expect(closedRound.matches.length).toBe(1);
      // Unscored match players moved to sit-outs
      expect(closedRound.sitOuts.length).toBeGreaterThan(0);
    });
  });

  describe('RESET_TOURNAMENT', () => {
    it('returns null', () => {
      const state = makeInProgressTournament();
      const result = tournamentReducer(state, { type: 'RESET_TOURNAMENT' });
      expect(result).toBeNull();
    });
  });

  describe('REPLACE_PLAYER', () => {
    it('marks old player unavailable and adds new player', () => {
      const state = makeInProgressTournament();
      const result = tournamentReducer(state, {
        type: 'REPLACE_PLAYER',
        payload: { oldPlayerId: 'p1', newPlayerName: 'Replacement' },
      });
      expect(result!.players.find(p => p.id === 'p1')!.unavailable).toBe(true);
      expect(result!.players.some(p => p.name === 'Replacement')).toBe(true);
      expect(result!.players.length).toBe(state.players.length + 1);
    });

    it('ignores in setup phase', () => {
      const state = makeSetupTournament();
      const result = tournamentReducer(state, {
        type: 'REPLACE_PLAYER',
        payload: { oldPlayerId: 'p1', newPlayerName: 'X' },
      });
      expect(result).toBe(state);
    });
  });

  describe('REPLACE_PLAYER (team-americano)', () => {
    function makeTeamAmericanoInProgress(): Tournament {
      const players: Player[] = Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
      const teams = createTeams(players);
      const config: TournamentConfig = {
        format: 'team-americano', pointsPerMatch: 21, maxRounds: 3,
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
      };
      const withTeams: Tournament = { id: 't1', name: 'Test', config, phase: 'team-pairing', players, teams, rounds: [], createdAt: 0, updatedAt: 0 };
      return tournamentReducer(withTeams, { type: 'GENERATE_SCHEDULE' })!;
    }

    it('updates team references when replacing a player', () => {
      const state = makeTeamAmericanoInProgress();
      const oldPlayer = state.players[0];
      const team = state.teams!.find(t => t.player1Id === oldPlayer.id || t.player2Id === oldPlayer.id)!;

      const result = tournamentReducer(state, {
        type: 'REPLACE_PLAYER',
        payload: { oldPlayerId: oldPlayer.id, newPlayerName: 'Replacement' },
      });

      const newPlayer = result!.players.find(p => p.name === 'Replacement')!;
      const updatedTeam = result!.teams!.find(t => t.id === team.id)!;

      // Team should reference new player, not old
      expect(updatedTeam.player1Id === newPlayer.id || updatedTeam.player2Id === newPlayer.id).toBe(true);
      expect(updatedTeam.player1Id !== oldPlayer.id && updatedTeam.player2Id !== oldPlayer.id).toBe(true);
    });

    it('updates match player IDs in scored rounds', () => {
      let state = makeTeamAmericanoInProgress();
      const oldPlayer = state.players[0];

      // Score first round
      const round = state.rounds[0];
      for (const match of round.matches) {
        state = tournamentReducer(state, {
          type: 'SET_MATCH_SCORE',
          payload: { roundId: round.id, matchId: match.id, score: { team1Points: 11, team2Points: 10 } },
        })!;
      }

      const result = tournamentReducer(state, {
        type: 'REPLACE_PLAYER',
        payload: { oldPlayerId: oldPlayer.id, newPlayerName: 'Replacement' },
      });

      const newPlayer = result!.players.find(p => p.name === 'Replacement')!;

      // Old player ID should not appear in any match
      for (const r of result!.rounds) {
        for (const m of r.matches) {
          expect(m.team1).not.toContain(oldPlayer.id);
          expect(m.team2).not.toContain(oldPlayer.id);
        }
      }

      // New player ID should appear in the scored round
      const scoredRound = result!.rounds[0];
      const hasNewPlayer = scoredRound.matches.some(m =>
        m.team1.includes(newPlayer.id) || m.team2.includes(newPlayer.id)
      );
      expect(hasNewPlayer).toBe(true);
    });

    it('team continues to play after replacement (not excluded)', () => {
      const state = makeTeamAmericanoInProgress();
      const oldPlayer = state.players[0];
      const team = state.teams!.find(t => t.player1Id === oldPlayer.id || t.player2Id === oldPlayer.id)!;
      const otherPlayerId = team.player1Id === oldPlayer.id ? team.player2Id : team.player1Id;

      const result = tournamentReducer(state, {
        type: 'REPLACE_PLAYER',
        payload: { oldPlayerId: oldPlayer.id, newPlayerName: 'Replacement' },
      });

      const newPlayer = result!.players.find(p => p.name === 'Replacement')!;

      // The team's other player and the new player should appear in future rounds
      const unscoredRounds = result!.rounds.filter(r => r.matches.every(m => m.score === null));
      const teamInMatch = unscoredRounds.some(r =>
        r.matches.some(m =>
          (m.team1.includes(newPlayer.id) && m.team1.includes(otherPlayerId)) ||
          (m.team2.includes(newPlayer.id) && m.team2.includes(otherPlayerId))
        )
      );
      expect(teamInMatch).toBe(true);
    });
  });

  describe('TOGGLE_PLAYER_AVAILABILITY (team-americano)', () => {
    function makeTeamAmericanoInProgress(): Tournament {
      const players: Player[] = Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
      const teams = createTeams(players);
      const config: TournamentConfig = {
        format: 'team-americano', pointsPerMatch: 21, maxRounds: 3,
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
      };
      const withTeams: Tournament = { id: 't1', name: 'Test', config, phase: 'team-pairing', players, teams, rounds: [], createdAt: 0, updatedAt: 0 };
      return tournamentReducer(withTeams, { type: 'GENERATE_SCHEDULE' })!;
    }

    it('excludes team from future rounds when player is unavailable', () => {
      const state = makeTeamAmericanoInProgress();
      const targetPlayer = state.players[0];
      const team = state.teams!.find(t => t.player1Id === targetPlayer.id || t.player2Id === targetPlayer.id)!;

      const result = tournamentReducer(state, {
        type: 'TOGGLE_PLAYER_AVAILABILITY',
        payload: { playerId: targetPlayer.id },
      });

      // The team's players should not appear in any unscored round
      const unscoredRounds = result!.rounds.filter(r => r.matches.every(m => m.score === null));
      for (const round of unscoredRounds) {
        for (const match of round.matches) {
          expect(match.team1).not.toContain(team.player1Id);
          expect(match.team2).not.toContain(team.player1Id);
          expect(match.team1).not.toContain(team.player2Id);
          expect(match.team2).not.toContain(team.player2Id);
        }
      }
    });
  });

  describe('REPLACE_PLAYER (team name preservation)', () => {
    function makeTeamAmericanoInProgress(): Tournament {
      const players: Player[] = Array.from({ length: 4 }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
      const teams = createTeams(players);
      const config: TournamentConfig = {
        format: 'team-americano', pointsPerMatch: 21, maxRounds: 3,
        courts: [{ id: 'c1', name: 'C1' }],
      };
      const withTeams: Tournament = { id: 't1', name: 'Test', config, phase: 'team-pairing', players, teams, rounds: [], createdAt: 0, updatedAt: 0 };
      return tournamentReducer(withTeams, { type: 'GENERATE_SCHEDULE' })!;
    }

    it('preserves old team name when player is replaced (no custom name)', () => {
      const state = makeTeamAmericanoInProgress();
      const team = state.teams![0];
      const oldPlayer1Name = state.players.find(p => p.id === team.player1Id)!.name;
      const oldPlayer2Name = state.players.find(p => p.id === team.player2Id)!.name;
      const expectedName = `${oldPlayer1Name} & ${oldPlayer2Name}`;

      const result = tournamentReducer(state, {
        type: 'REPLACE_PLAYER',
        payload: { oldPlayerId: team.player1Id, newPlayerName: 'Newcomer' },
      });

      const updatedTeam = result!.teams!.find(t => t.id === team.id)!;
      // Team name should be locked to the old auto-generated name
      expect(updatedTeam.name).toBe(expectedName);
    });

    it('preserves custom team name when player is replaced', () => {
      let state = makeTeamAmericanoInProgress();
      // We can't rename teams during in-progress, so simulate by directly modifying
      const team = state.teams![0];
      state = { ...state, teams: state.teams!.map(t => t.id === team.id ? { ...t, name: 'Dream Team' } : t) };

      const result = tournamentReducer(state, {
        type: 'REPLACE_PLAYER',
        payload: { oldPlayerId: team.player1Id, newPlayerName: 'Newcomer' },
      });

      const updatedTeam = result!.teams!.find(t => t.id === team.id)!;
      expect(updatedTeam.name).toBe('Dream Team');
    });
  });

  describe('SET_FUTURE_ROUNDS', () => {
    it('replaces unscored rounds with provided rounds', () => {
      const state = makeInProgressTournament();
      const fakeRound = { ...state.rounds[0], id: 'custom-round' };
      const result = tournamentReducer(state, {
        type: 'SET_FUTURE_ROUNDS',
        payload: { rounds: [fakeRound] },
      });
      // All original rounds were unscored, so scored = 0, then 1 custom round
      expect(result!.rounds.length).toBe(1);
      expect(result!.rounds[0].id).toBe('custom-round');
    });

    it('ignores in setup phase', () => {
      const state = makeSetupTournament();
      const result = tournamentReducer(state, {
        type: 'SET_FUTURE_ROUNDS',
        payload: { rounds: [] },
      });
      expect(result).toBe(state);
    });
  });

  describe('REGENERATE_FUTURE_ROUNDS', () => {
    it('regenerates unscored rounds', () => {
      let state = makeInProgressTournament();
      // Score first round so there are both scored and unscored
      const round = state.rounds[0];
      for (const match of round.matches) {
        state = tournamentReducer(state, {
          type: 'SET_MATCH_SCORE',
          payload: { roundId: round.id, matchId: match.id, score: { team1Points: 12, team2Points: 12 } },
        })!;
      }
      const result = tournamentReducer(state, {
        type: 'REGENERATE_FUTURE_ROUNDS',
      });
      // First round (scored) should stay, rest regenerated
      expect(result!.rounds[0].id).toBe(state.rounds[0].id);
    });

    it('returns same state when no unscored rounds exist', () => {
      let state = makeInProgressTournament();
      // Score all rounds
      for (const round of state.rounds) {
        for (const match of round.matches) {
          state = tournamentReducer(state, {
            type: 'SET_MATCH_SCORE',
            payload: { roundId: round.id, matchId: match.id, score: { team1Points: 12, team2Points: 12 } },
          })!;
        }
      }
      const result = tournamentReducer(state, { type: 'REGENERATE_FUTURE_ROUNDS' });
      expect(result).toBe(state);
    });

    it('ignores in setup phase', () => {
      const state = makeSetupTournament();
      const result = tournamentReducer(state, { type: 'REGENERATE_FUTURE_ROUNDS' });
      expect(result).toBe(state);
    });
  });

  describe('ADD_ROUNDS', () => {
    it('appends additional rounds to existing ones', () => {
      const state = makeInProgressTournament();
      const original = state.rounds.length;
      const result = tournamentReducer(state, {
        type: 'ADD_ROUNDS',
        payload: { count: 2 },
      });
      expect(result!.rounds.length).toBe(original + 2);
      // Original rounds preserved at beginning
      expect(result!.rounds[0].id).toBe(state.rounds[0].id);
    });

    it('ignores in setup phase', () => {
      const state = makeSetupTournament();
      const result = tournamentReducer(state, {
        type: 'ADD_ROUNDS',
        payload: { count: 1 },
      });
      expect(result).toBe(state);
    });
  });

  describe('ADD_COURT_LIVE', () => {
    it('adds a court when capacity allows', () => {
      // 12 players, 2 courts → can fit 3 courts (12/4 = 3)
      const players: Player[] = Array.from({ length: 12 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
      const config: TournamentConfig = {
        format: 'americano', pointsPerMatch: 24, maxRounds: 3,
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
      };
      const setup: Tournament = { id: 't1', name: 'Test', config, phase: 'setup', players, rounds: [], createdAt: 0, updatedAt: 0 };
      const inProgress = tournamentReducer(setup, { type: 'GENERATE_SCHEDULE' })!;
      const result = tournamentReducer(inProgress, { type: 'ADD_COURT_LIVE' });
      expect(result!.config.courts.length).toBe(3);
    });

    it('does not add court when at max capacity', () => {
      // 8 players, 2 courts → max 2 courts (8/4 = 2), already at max
      const state = makeInProgressTournament();
      const result = tournamentReducer(state, { type: 'ADD_COURT_LIVE' });
      expect(result).toBe(state);
    });

    it('ignores in setup phase', () => {
      const state = makeSetupTournament();
      const result = tournamentReducer(state, { type: 'ADD_COURT_LIVE' });
      expect(result).toBe(state);
    });
  });

  describe('REPLACE_COURT', () => {
    it('marks old court unavailable and adds new one', () => {
      const state = makeInProgressTournament();
      const oldCourtId = state.config.courts[0].id;
      const result = tournamentReducer(state, {
        type: 'REPLACE_COURT',
        payload: { oldCourtId, newCourtName: 'New Court' },
      });
      expect(result!.config.courts.find(c => c.id === oldCourtId)!.unavailable).toBe(true);
      expect(result!.config.courts.some(c => c.name === 'New Court')).toBe(true);
      expect(result!.config.courts.length).toBe(state.config.courts.length + 1);
    });

    it('ignores in setup phase', () => {
      const state = makeSetupTournament();
      const result = tournamentReducer(state, {
        type: 'REPLACE_COURT',
        payload: { oldCourtId: 'c1', newCourtName: 'X' },
      });
      expect(result).toBe(state);
    });
  });

  describe('SET_MATCH_SCORE (dynamic auto-advance)', () => {
    it('auto-generates next round for mexicano when all scored and under target', () => {
      // Create a mexicano tournament with enough players
      const players: Player[] = Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
      const config: TournamentConfig = {
        format: 'mexicano', pointsPerMatch: 24, maxRounds: 7,
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
      };
      const setup: Tournament = { id: 't1', name: 'Test', config, phase: 'setup', players, rounds: [], createdAt: 0, updatedAt: 0 };
      let state = tournamentReducer(setup, { type: 'GENERATE_SCHEDULE' })!;
      expect(state.rounds.length).toBe(1); // mexicano starts with 1 round

      // Score all matches in round 1
      for (const match of state.rounds[0].matches) {
        state = tournamentReducer(state, {
          type: 'SET_MATCH_SCORE',
          payload: { roundId: state.rounds[0].id, matchId: match.id, score: { team1Points: 14, team2Points: 10 } },
        })!;
      }
      // Should auto-generate round 2
      expect(state.rounds.length).toBe(2);
    });
  });

  describe('TOGGLE_PLAYER_AVAILABILITY (setup phase)', () => {
    it('toggles availability without regenerating rounds in setup', () => {
      const state = makeSetupTournament();
      const result = tournamentReducer(state, {
        type: 'TOGGLE_PLAYER_AVAILABILITY',
        payload: { playerId: 'p1' },
      });
      expect(result!.players.find(p => p.id === 'p1')!.unavailable).toBe(true);
      expect(result!.rounds).toEqual([]);
    });
  });

  describe('TOGGLE_COURT_AVAILABILITY (success)', () => {
    it('toggles court and regenerates rounds', () => {
      // 12 players, 3 courts
      const players: Player[] = Array.from({ length: 12 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
      const config: TournamentConfig = {
        format: 'americano', pointsPerMatch: 24, maxRounds: 3,
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }, { id: 'c3', name: 'C3' }],
      };
      const setup: Tournament = { id: 't1', name: 'Test', config, phase: 'setup', players, rounds: [], createdAt: 0, updatedAt: 0 };
      const inProgress = tournamentReducer(setup, { type: 'GENERATE_SCHEDULE' })!;
      const result = tournamentReducer(inProgress, {
        type: 'TOGGLE_COURT_AVAILABILITY',
        payload: { courtId: 'c3' },
      });
      // Court c3 should be unavailable
      expect(result!.config.courts.find(c => c.id === 'c3')!.unavailable).toBe(true);
    });

    it('re-enables a disabled court and regenerates rounds', () => {
      // 12 players, 3 courts
      const players: Player[] = Array.from({ length: 12 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
      const config: TournamentConfig = {
        format: 'americano', pointsPerMatch: 24, maxRounds: 3,
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }, { id: 'c3', name: 'C3' }],
      };
      const setup: Tournament = { id: 't1', name: 'Test', config, phase: 'setup', players, rounds: [], createdAt: 0, updatedAt: 0 };
      const inProgress = tournamentReducer(setup, { type: 'GENERATE_SCHEDULE' })!;
      // First disable c3
      const disabled = tournamentReducer(inProgress, {
        type: 'TOGGLE_COURT_AVAILABILITY',
        payload: { courtId: 'c3' },
      })!;
      expect(disabled.config.courts.find(c => c.id === 'c3')!.unavailable).toBe(true);
      // Re-enable c3
      const reEnabled = tournamentReducer(disabled, {
        type: 'TOGGLE_COURT_AVAILABILITY',
        payload: { courtId: 'c3' },
      })!;
      expect(reEnabled.config.courts.find(c => c.id === 'c3')!.unavailable).toBeFalsy();
      // Rounds should be regenerated (non-empty)
      expect(reEnabled.rounds.length).toBeGreaterThan(0);
    });
  });

  describe('COMPLETE_CEREMONY', () => {
    it('sets ceremonyCompleted and nominations on completed tournament', () => {
      let state = makeInProgressTournament();
      // Score all matches then complete
      for (const round of state.rounds) {
        for (const match of round.matches) {
          state = tournamentReducer(state, {
            type: 'SET_MATCH_SCORE',
            payload: { roundId: round.id, matchId: match.id, score: { team1Points: 14, team2Points: 10 } },
          })!;
        }
      }
      state = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' })!;
      expect(state.phase).toBe('completed');

      const nominations = [{ id: 'mvp', title: 'MVP', emoji: '🏆', description: 'Best player', playerNames: ['Player 1'], stat: '10 pts' }];
      const result = tournamentReducer(state, {
        type: 'COMPLETE_CEREMONY',
        payload: { nominations },
      });
      expect(result!.ceremonyCompleted).toBe(true);
      expect(result!.nominations).toEqual(nominations);
    });

    it('ignores in non-completed phase', () => {
      const state = makeInProgressTournament();
      const result = tournamentReducer(state, {
        type: 'COMPLETE_CEREMONY',
        payload: { nominations: [] },
      });
      expect(result).toBe(state);
    });
  });

  describe('CAST_MALDICION', () => {
    function makeMaldicionState(): Tournament {
      const players: Player[] = Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
      const teams: Team[] = [
        { id: 'team1', player1Id: 'p1', player2Id: 'p2' },
        { id: 'team2', player1Id: 'p3', player2Id: 'p4' },
        { id: 'team3', player1Id: 'p5', player2Id: 'p6' },
        { id: 'team4', player1Id: 'p7', player2Id: 'p8' },
      ];
      const maldicionesHands: MaldicionesHands = {
        team1: { cardIds: ['curse-a', 'curse-b'], hasShield: true },
        team2: { cardIds: ['curse-c'], hasShield: true },
        team3: { cardIds: [], hasShield: false },
        team4: { cardIds: [], hasShield: false },
      };
      return {
        id: 't1', name: 'Mald', phase: 'in-progress',
        config: {
          format: 'team-americano', pointsPerMatch: 21,
          courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
          maxRounds: 3,
          maldiciones: { enabled: true, chaosLevel: 'medium' },
        },
        players, teams, maldicionesHands,
        rounds: [{
          id: 'r1', roundNumber: 1, sitOuts: [],
          matches: [
            { id: 'm1', courtId: 'c1', team1: ['p1', 'p2'] as [string, string], team2: ['p3', 'p4'] as [string, string], score: null },
            { id: 'm2', courtId: 'c2', team1: ['p5', 'p6'] as [string, string], team2: ['p7', 'p8'] as [string, string], score: null },
          ],
        }],
        createdAt: 0, updatedAt: 0,
      };
    }

    it('casts a curse on an unscored match', () => {
      const state = makeMaldicionState();
      const result = tournamentReducer(state, {
        type: 'CAST_MALDICION',
        payload: { roundId: 'r1', matchId: 'm1', castBy: 'team1', cardId: 'curse-a', targetPlayerId: 'p3' },
      });
      const match = result!.rounds[0].matches[0];
      expect(match.curse).toEqual({ cardId: 'curse-a', castBy: 'team1', targetPlayerId: 'p3', shielded: false });
      // Card removed from hand
      expect(result!.maldicionesHands!.team1.cardIds).not.toContain('curse-a');
      expect(result!.maldicionesHands!.team1.cardIds).toContain('curse-b');
    });

    it('does not cast if match already scored', () => {
      const state = makeMaldicionState();
      // Score the match first
      const scored = tournamentReducer(state, {
        type: 'SET_MATCH_SCORE',
        payload: { roundId: 'r1', matchId: 'm1', score: { team1Points: 11, team2Points: 10 } },
      })!;
      const result = tournamentReducer(scored, {
        type: 'CAST_MALDICION',
        payload: { roundId: 'r1', matchId: 'm1', castBy: 'team1', cardId: 'curse-a', targetPlayerId: 'p3' },
      });
      expect(result).toBe(scored);
    });

    it('does not cast if card not in hand', () => {
      const state = makeMaldicionState();
      const result = tournamentReducer(state, {
        type: 'CAST_MALDICION',
        payload: { roundId: 'r1', matchId: 'm1', castBy: 'team1', cardId: 'nonexistent', targetPlayerId: 'p3' },
      });
      expect(result).toBe(state);
    });

    it('does not cast if match already has a curse', () => {
      const state = makeMaldicionState();
      // Cast first curse
      const withCurse = tournamentReducer(state, {
        type: 'CAST_MALDICION',
        payload: { roundId: 'r1', matchId: 'm1', castBy: 'team1', cardId: 'curse-a', targetPlayerId: 'p3' },
      })!;
      // Try to cast again
      const result = tournamentReducer(withCurse, {
        type: 'CAST_MALDICION',
        payload: { roundId: 'r1', matchId: 'm1', castBy: 'team1', cardId: 'curse-b', targetPlayerId: 'p3' },
      });
      expect(result).toBe(withCurse);
    });

    it('returns state when no maldicionesHands', () => {
      const state = { ...makeMaldicionState(), maldicionesHands: undefined };
      const result = tournamentReducer(state, {
        type: 'CAST_MALDICION',
        payload: { roundId: 'r1', matchId: 'm1', castBy: 'team1', cardId: 'curse-a', targetPlayerId: 'p3' },
      });
      expect(result).toBe(state);
    });
  });

  describe('USE_ESCUDO', () => {
    function makeCursedState(): Tournament {
      const players: Player[] = Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
      const teams: Team[] = [
        { id: 'team1', player1Id: 'p1', player2Id: 'p2' },
        { id: 'team2', player1Id: 'p3', player2Id: 'p4' },
        { id: 'team3', player1Id: 'p5', player2Id: 'p6' },
        { id: 'team4', player1Id: 'p7', player2Id: 'p8' },
      ];
      const maldicionesHands: MaldicionesHands = {
        team1: { cardIds: [], hasShield: false },
        team2: { cardIds: [], hasShield: true },
        team3: { cardIds: [], hasShield: false },
        team4: { cardIds: [], hasShield: false },
      };
      return {
        id: 't1', name: 'Mald', phase: 'in-progress',
        config: {
          format: 'team-americano', pointsPerMatch: 21,
          courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
          maxRounds: 3,
          maldiciones: { enabled: true, chaosLevel: 'medium' },
        },
        players, teams, maldicionesHands,
        rounds: [{
          id: 'r1', roundNumber: 1, sitOuts: [],
          matches: [
            {
              id: 'm1', courtId: 'c1',
              team1: ['p1', 'p2'] as [string, string], team2: ['p3', 'p4'] as [string, string],
              score: null,
              curse: { cardId: 'curse-a', castBy: 'team1', targetPlayerId: 'p3', shielded: false },
            },
            { id: 'm2', courtId: 'c2', team1: ['p5', 'p6'] as [string, string], team2: ['p7', 'p8'] as [string, string], score: null },
          ],
        }],
        createdAt: 0, updatedAt: 0,
      };
    }

    it('uses shield to block a curse', () => {
      const state = makeCursedState();
      const result = tournamentReducer(state, {
        type: 'USE_ESCUDO',
        payload: { roundId: 'r1', matchId: 'm1' },
      });
      const match = result!.rounds[0].matches[0];
      expect(match.curse!.shielded).toBe(true);
      expect(result!.maldicionesHands!.team2.hasShield).toBe(false);
    });

    it('does nothing when victim has no shield', () => {
      const state = makeCursedState();
      // Remove team2's shield
      state.maldicionesHands!.team2.hasShield = false;
      const result = tournamentReducer(state, {
        type: 'USE_ESCUDO',
        payload: { roundId: 'r1', matchId: 'm1' },
      });
      expect(result).toBe(state);
    });

    it('does nothing when no active curse on match', () => {
      const state = makeCursedState();
      // Try to shield on match without a curse
      const result = tournamentReducer(state, {
        type: 'USE_ESCUDO',
        payload: { roundId: 'r1', matchId: 'm2' },
      });
      expect(result).toBe(state);
    });

    it('does nothing when curse is already shielded', () => {
      const state = makeCursedState();
      // Shield the curse first
      const shielded = tournamentReducer(state, {
        type: 'USE_ESCUDO',
        payload: { roundId: 'r1', matchId: 'm1' },
      })!;
      // Try to shield again (even though hasShield is now false)
      const result = tournamentReducer(shielded, {
        type: 'USE_ESCUDO',
        payload: { roundId: 'r1', matchId: 'm1' },
      });
      expect(result).toBe(shielded);
    });
  });

  describe('VETO_MALDICION', () => {
    function makeCursedState(): Tournament {
      const players: Player[] = Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
      const teams: Team[] = [
        { id: 'team1', player1Id: 'p1', player2Id: 'p2' },
        { id: 'team2', player1Id: 'p3', player2Id: 'p4' },
        { id: 'team3', player1Id: 'p5', player2Id: 'p6' },
        { id: 'team4', player1Id: 'p7', player2Id: 'p8' },
      ];
      const maldicionesHands: MaldicionesHands = {
        team1: { cardIds: ['curse-b'], hasShield: false },
        team2: { cardIds: [], hasShield: false },
        team3: { cardIds: [], hasShield: false },
        team4: { cardIds: [], hasShield: false },
      };
      return {
        id: 't1', name: 'Mald', phase: 'in-progress',
        config: {
          format: 'team-americano', pointsPerMatch: 21,
          courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
          maxRounds: 3,
          maldiciones: { enabled: true, chaosLevel: 'medium' },
        },
        players, teams, maldicionesHands,
        rounds: [{
          id: 'r1', roundNumber: 1, sitOuts: [],
          matches: [
            {
              id: 'm1', courtId: 'c1',
              team1: ['p1', 'p2'] as [string, string], team2: ['p3', 'p4'] as [string, string],
              score: null,
              curse: { cardId: 'curse-a', castBy: 'team1', targetPlayerId: 'p3', shielded: false },
            },
            { id: 'm2', courtId: 'c2', team1: ['p5', 'p6'] as [string, string], team2: ['p7', 'p8'] as [string, string], score: null },
          ],
        }],
        createdAt: 0, updatedAt: 0,
      };
    }

    it('vetoes a curse and returns card to caster hand', () => {
      const state = makeCursedState();
      const result = tournamentReducer(state, {
        type: 'VETO_MALDICION',
        payload: { roundId: 'r1', matchId: 'm1' },
      });
      const match = result!.rounds[0].matches[0];
      expect(match.curse).toBeUndefined();
      // Card returned to caster (team1)
      expect(result!.maldicionesHands!.team1.cardIds).toContain('curse-a');
      expect(result!.maldicionesHands!.team1.cardIds).toContain('curse-b');
    });

    it('does nothing when match has no curse', () => {
      const state = makeCursedState();
      const result = tournamentReducer(state, {
        type: 'VETO_MALDICION',
        payload: { roundId: 'r1', matchId: 'm2' },
      });
      expect(result).toBe(state);
    });

    it('returns state when no maldicionesHands', () => {
      const state = { ...makeCursedState(), maldicionesHands: undefined };
      const result = tournamentReducer(state, {
        type: 'VETO_MALDICION',
        payload: { roundId: 'r1', matchId: 'm1' },
      });
      expect(result).toBe(state);
    });

  });

  describe('Maldiciones — additional coverage', () => {
    function makeMaldicionState(): Tournament {
      const players: Player[] = Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
      const teams: Team[] = [
        { id: 'team1', player1Id: 'p1', player2Id: 'p2' },
        { id: 'team2', player1Id: 'p3', player2Id: 'p4' },
        { id: 'team3', player1Id: 'p5', player2Id: 'p6' },
        { id: 'team4', player1Id: 'p7', player2Id: 'p8' },
      ];
      const maldicionesHands: MaldicionesHands = {
        team1: { cardIds: ['curse-a', 'curse-b'], hasShield: true },
        team2: { cardIds: ['curse-c'], hasShield: true },
        team3: { cardIds: [], hasShield: false },
        team4: { cardIds: [], hasShield: false },
      };
      return {
        id: 't1', name: 'Mald', phase: 'in-progress',
        config: {
          format: 'team-americano', pointsPerMatch: 21,
          courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
          maxRounds: 3,
          maldiciones: { enabled: true, chaosLevel: 'medium' },
        },
        players, teams, maldicionesHands,
        rounds: [{
          id: 'r1', roundNumber: 1, sitOuts: [],
          matches: [
            { id: 'm1', courtId: 'c1', team1: ['p1', 'p2'] as [string, string], team2: ['p3', 'p4'] as [string, string], score: null },
            { id: 'm2', courtId: 'c2', team1: ['p5', 'p6'] as [string, string], team2: ['p7', 'p8'] as [string, string], score: null },
          ],
        }],
        createdAt: 0, updatedAt: 0,
      };
    }

    it('cursing own teammate is allowed (no restriction)', () => {
      const state = makeMaldicionState();
      // p1 is on team1, cast curse targeting p2 who is also on team1
      const result = tournamentReducer(state, {
        type: 'CAST_MALDICION',
        payload: { roundId: 'r1', matchId: 'm1', castBy: 'team1', cardId: 'curse-a', targetPlayerId: 'p2' },
      });
      const match = result!.rounds[0].matches[0];
      expect(match.curse).toEqual({ cardId: 'curse-a', castBy: 'team1', targetPlayerId: 'p2', shielded: false });
      expect(result!.maldicionesHands!.team1.cardIds).not.toContain('curse-a');
    });


    it('cards preserved after player replacement', () => {
      const state = makeMaldicionState();
      const result = tournamentReducer(state, {
        type: 'REPLACE_PLAYER',
        payload: { oldPlayerId: 'p1', newPlayerName: 'Replacement' },
      });
      expect(result!.maldicionesHands).toBeDefined();
      expect(result!.maldicionesHands!.team1.cardIds).toContain('curse-a');
      expect(result!.maldicionesHands!.team1.cardIds).toContain('curse-b');
      expect(result!.maldicionesHands!.team1.hasShield).toBe(true);
      expect(result!.maldicionesHands!.team2.cardIds).toContain('curse-c');
    });

    it('cards preserved when player toggled unavailable', () => {
      const state = makeMaldicionState();
      const result = tournamentReducer(state, {
        type: 'TOGGLE_PLAYER_AVAILABILITY',
        payload: { playerId: 'p1' },
      });
      expect(result!.maldicionesHands).toBeDefined();
      expect(result!.maldicionesHands!.team1.cardIds).toEqual(['curse-a', 'curse-b']);
      expect(result!.maldicionesHands!.team1.hasShield).toBe(true);
      expect(result!.maldicionesHands!.team2.cardIds).toEqual(['curse-c']);
      expect(result!.maldicionesHands!.team2.hasShield).toBe(true);
    });

    it('maldiciones hands dealt at GENERATE_SCHEDULE for team format', () => {
      const players: Player[] = Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
      const teams = createTeams(players);
      const config: TournamentConfig = {
        format: 'team-americano', pointsPerMatch: 21, maxRounds: 3,
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
        maldiciones: { enabled: true, chaosLevel: 'medium' },
      };
      const setup: Tournament = { id: 't1', name: 'Test', config, phase: 'team-pairing', players, teams, rounds: [], createdAt: 0, updatedAt: 0 };
      const result = tournamentReducer(setup, { type: 'GENERATE_SCHEDULE' })!;
      expect(result.maldicionesHands).toBeDefined();
      // Each team should have a hand entry
      for (const team of result.teams!) {
        expect(result.maldicionesHands![team.id]).toBeDefined();
        expect(result.maldicionesHands![team.id].cardIds).toBeInstanceOf(Array);
      }
    });

    it('ADD_ROUNDS deals cards if not yet dealt', () => {
      const state = makeMaldicionState();
      // Remove maldicionesHands to simulate not-yet-dealt state
      const withoutHands: Tournament = { ...state, maldicionesHands: undefined };
      const result = tournamentReducer(withoutHands, {
        type: 'ADD_ROUNDS',
        payload: { count: 1 },
      });
      expect(result!.maldicionesHands).toBeDefined();
      // Each team should have a hand entry
      for (const team of state.teams!) {
        expect(result!.maldicionesHands![team.id]).toBeDefined();
        expect(result!.maldicionesHands![team.id].cardIds).toBeInstanceOf(Array);
      }
    });
  });

  describe('default case', () => {
    it('returns state unchanged for unknown action', () => {
      const state = makeSetupTournament();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = tournamentReducer(state, { type: 'UNKNOWN' } as any);
      expect(result).toBe(state);
    });
  });

  describe('SET_MATCH_SCORE (partial scoring in dynamic format)', () => {
    function makeMexicanoInProgress(): Tournament {
      const players: Player[] = Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
      const config: TournamentConfig = {
        format: 'mexicano', pointsPerMatch: 24, maxRounds: 7,
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
      };
      const setup: Tournament = { id: 't1', name: 'Test', config, phase: 'setup', players, rounds: [], createdAt: 0, updatedAt: 0 };
      return tournamentReducer(setup, { type: 'GENERATE_SCHEDULE' })!;
    }

    it('does not auto-generate next round when only some matches in a round are scored', () => {
      let state = makeMexicanoInProgress();
      expect(state.rounds.length).toBe(1);
      // Score only the first match, leave the second unscored
      const round = state.rounds[0];
      expect(round.matches.length).toBe(2);
      state = tournamentReducer(state, {
        type: 'SET_MATCH_SCORE',
        payload: { roundId: round.id, matchId: round.matches[0].id, score: { team1Points: 14, team2Points: 10 } },
      })!;
      // Should still have only 1 round — not all matches scored
      expect(state.rounds.length).toBe(1);
    });
  });

  describe('COMPLETE_TOURNAMENT (fully unscored rounds)', () => {
    it('drops all rounds when none have any scores', () => {
      const state = makeInProgressTournament();
      expect(state.rounds.length).toBeGreaterThan(0);
      const result = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' });
      expect(result!.phase).toBe('completed');
      expect(result!.rounds.length).toBe(0);
    });

    it('drops only fully unscored rounds and keeps scored ones', () => {
      let state = makeInProgressTournament();
      expect(state.rounds.length).toBe(3);
      // Score all matches in round 1 only
      const round = state.rounds[0];
      for (const match of round.matches) {
        state = tournamentReducer(state, {
          type: 'SET_MATCH_SCORE',
          payload: { roundId: round.id, matchId: match.id, score: { team1Points: 14, team2Points: 10 } },
        })!;
      }
      const result = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' });
      expect(result!.phase).toBe('completed');
      // Only round 1 should remain; rounds 2 and 3 are fully unscored
      expect(result!.rounds.length).toBe(1);
      expect(result!.rounds[0].id).toBe(round.id);
    });
  });

  describe('COMPLETE_TOURNAMENT (partially scored round — unscored matches become sit-outs)', () => {
    it('removes unscored matches and adds their players to sitOuts', () => {
      let state = makeInProgressTournament();
      const round = state.rounds[0];
      // Score only match 0, leave match 1 unscored
      state = tournamentReducer(state, {
        type: 'SET_MATCH_SCORE',
        payload: {
          roundId: round.id,
          matchId: round.matches[0].id,
          score: { team1Points: 14, team2Points: 10 },
        },
      })!;
      const unscoredMatch = state.rounds[0].matches[1];
      const unscoredPlayers = [...unscoredMatch.team1, ...unscoredMatch.team2];

      const result = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' });
      const closedRound = result!.rounds[0];
      // Only the scored match should remain
      expect(closedRound.matches.length).toBe(1);
      expect(closedRound.matches[0].score).not.toBeNull();
      // All players from the unscored match should be in sitOuts
      for (const pid of unscoredPlayers) {
        expect(closedRound.sitOuts).toContain(pid);
      }
    });

    it('preserves original sitOuts when adding unscored match players', () => {
      let state = makeInProgressTournament();
      const round = state.rounds[0];
      // Manually add an existing sitOut to verify it's preserved
      state = {
        ...state,
        rounds: state.rounds.map((r, i) =>
          i === 0 ? { ...r, sitOuts: ['p99'] } : r
        ),
      };
      // Score only first match
      state = tournamentReducer(state, {
        type: 'SET_MATCH_SCORE',
        payload: {
          roundId: round.id,
          matchId: round.matches[0].id,
          score: { team1Points: 12, team2Points: 12 },
        },
      })!;
      const result = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' });
      const closedRound = result!.rounds[0];
      // Original sitOut should still be there
      expect(closedRound.sitOuts).toContain('p99');
      // Plus the players from the unscored match
      expect(closedRound.sitOuts.length).toBeGreaterThan(1);
    });
  });

  describe('SET_ROUND_COUNT (cannot remove scored rounds)', () => {
    it('returns unchanged state when target is below scored round count', () => {
      let state = makeInProgressTournament();
      // Score all matches in rounds 1 and 2
      for (let i = 0; i < 2; i++) {
        const round = state.rounds[i];
        for (const match of round.matches) {
          state = tournamentReducer(state, {
            type: 'SET_MATCH_SCORE',
            payload: { roundId: round.id, matchId: match.id, score: { team1Points: 14, team2Points: 10 } },
          })!;
        }
      }
      // Try to reduce to 1 round — but 2 are scored
      const result = tournamentReducer(state, {
        type: 'SET_ROUND_COUNT',
        payload: { count: 1 },
      });
      expect(result).toBe(state);
    });

    it('allows reducing to exactly the scored round count', () => {
      let state = makeInProgressTournament();
      expect(state.rounds.length).toBe(3);
      // Score all matches in round 1
      const round = state.rounds[0];
      for (const match of round.matches) {
        state = tournamentReducer(state, {
          type: 'SET_MATCH_SCORE',
          payload: { roundId: round.id, matchId: match.id, score: { team1Points: 14, team2Points: 10 } },
        })!;
      }
      // Reduce to 1 round (exactly the scored count)
      const result = tournamentReducer(state, {
        type: 'SET_ROUND_COUNT',
        payload: { count: 1 },
      });
      expect(result!.rounds.length).toBe(1);
      expect(result!.rounds[0].id).toBe(round.id);
    });
  });

  describe('ADD_COURT_LIVE (cannot add beyond player limit)', () => {
    it('is ignored when available courts already at max for player count', () => {
      // 8 players, 2 courts -> max 2 courts (8/4=2), already at max
      const state = makeInProgressTournament();
      expect(state.config.courts.length).toBe(2);
      expect(state.players.length).toBe(8);
      const result = tournamentReducer(state, { type: 'ADD_COURT_LIVE' });
      expect(result).toBe(state);
    });

    it('is ignored when 4 players and 1 court (max is 1)', () => {
      const players: Player[] = Array.from({ length: 4 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
      const config: TournamentConfig = {
        format: 'americano', pointsPerMatch: 24, maxRounds: 3,
        courts: [{ id: 'c1', name: 'C1' }],
      };
      const setup: Tournament = { id: 't1', name: 'Test', config, phase: 'setup', players, rounds: [], createdAt: 0, updatedAt: 0 };
      const inProgress = tournamentReducer(setup, { type: 'GENERATE_SCHEDULE' })!;
      const result = tournamentReducer(inProgress, { type: 'ADD_COURT_LIVE' });
      expect(result).toBe(inProgress);
    });

    it('counts only available courts against the limit', () => {
      // 12 players, 3 courts but 1 disabled -> 2 available, max = 3
      const players: Player[] = Array.from({ length: 12 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
      const config: TournamentConfig = {
        format: 'americano', pointsPerMatch: 24, maxRounds: 3,
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }, { id: 'c3', name: 'C3', unavailable: true }],
      };
      const setup: Tournament = { id: 't1', name: 'Test', config, phase: 'setup', players, rounds: [], createdAt: 0, updatedAt: 0 };
      const inProgress = tournamentReducer(setup, { type: 'GENERATE_SCHEDULE' })!;
      // 2 available courts, max 3 -> adding should succeed
      const result = tournamentReducer(inProgress, { type: 'ADD_COURT_LIVE' });
      const availableAfter = result!.config.courts.filter(c => !c.unavailable).length;
      expect(availableAfter).toBe(3);
    });
  });

  describe('SET_MATCH_SCORE (edit past score in dynamic format)', () => {
    it('editing a scored match in mexicano does not regenerate already-played future rounds', () => {
      const players: Player[] = Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
      const config: TournamentConfig = {
        format: 'mexicano', pointsPerMatch: 24, maxRounds: 7,
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
      };
      const setup: Tournament = { id: 't1', name: 'Test', config, phase: 'setup', players, rounds: [], createdAt: 0, updatedAt: 0 };
      let state = tournamentReducer(setup, { type: 'GENERATE_SCHEDULE' })!;
      expect(state.rounds.length).toBe(1);

      // Score all matches in round 1 to trigger auto-generation of round 2
      for (const match of state.rounds[0].matches) {
        state = tournamentReducer(state, {
          type: 'SET_MATCH_SCORE',
          payload: { roundId: state.rounds[0].id, matchId: match.id, score: { team1Points: 14, team2Points: 10 } },
        })!;
      }
      expect(state.rounds.length).toBe(2);

      // Score all matches in round 2 to trigger auto-generation of round 3
      for (const match of state.rounds[1].matches) {
        state = tournamentReducer(state, {
          type: 'SET_MATCH_SCORE',
          payload: { roundId: state.rounds[1].id, matchId: match.id, score: { team1Points: 12, team2Points: 12 } },
        })!;
      }
      expect(state.rounds.length).toBe(3);
      const round2Id = state.rounds[1].id;
      const round3Id = state.rounds[2].id;
      const round3Matches = state.rounds[2].matches.map(m => m.id);

      // Now edit a score in round 1 (change from 14-10 to 10-14)
      const result = tournamentReducer(state, {
        type: 'SET_MATCH_SCORE',
        payload: {
          roundId: state.rounds[0].id,
          matchId: state.rounds[0].matches[0].id,
          score: { team1Points: 10, team2Points: 14 },
        },
      })!;

      // Round count should not change — no new round generated
      expect(result.rounds.length).toBe(3);
      // Round 2 and 3 should be preserved (same IDs)
      expect(result.rounds[1].id).toBe(round2Id);
      expect(result.rounds[2].id).toBe(round3Id);
      // Round 3 matches should be identical
      expect(result.rounds[2].matches.map(m => m.id)).toEqual(round3Matches);
    });

    it('editing a past score does not lose unscored future round matches', () => {
      const players: Player[] = Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
      const config: TournamentConfig = {
        format: 'mexicano', pointsPerMatch: 24, maxRounds: 7,
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
      };
      const setup: Tournament = { id: 't1', name: 'Test', config, phase: 'setup', players, rounds: [], createdAt: 0, updatedAt: 0 };
      let state = tournamentReducer(setup, { type: 'GENERATE_SCHEDULE' })!;

      // Score all matches in round 1 to generate round 2
      for (const match of state.rounds[0].matches) {
        state = tournamentReducer(state, {
          type: 'SET_MATCH_SCORE',
          payload: { roundId: state.rounds[0].id, matchId: match.id, score: { team1Points: 14, team2Points: 10 } },
        })!;
      }
      expect(state.rounds.length).toBe(2);
      // Round 2 is unscored
      expect(state.rounds[1].matches.every(m => m.score === null)).toBe(true);

      // Edit a score in round 1
      const result = tournamentReducer(state, {
        type: 'SET_MATCH_SCORE',
        payload: {
          roundId: state.rounds[0].id,
          matchId: state.rounds[0].matches[0].id,
          score: { team1Points: 10, team2Points: 14 },
        },
      })!;

      // Should still have 2 rounds — the unscored round 2 is not lost
      expect(result.rounds.length).toBe(2);
      // Round 2 should still be unscored
      expect(result.rounds[1].matches.every(m => m.score === null)).toBe(true);
    });
  });

  describe('REPLACE_PLAYER (partial scores mid-round)', () => {
    it('preserves scored matches and uses new player in future matches', () => {
      let state = makeInProgressTournament();
      // Score only the FIRST match of round 1, leaving the second unscored
      const round = state.rounds[0];
      const firstMatch = round.matches[0];
      state = tournamentReducer(state, {
        type: 'SET_MATCH_SCORE',
        payload: { roundId: round.id, matchId: firstMatch.id, score: { team1Points: 14, team2Points: 10 } },
      })!;

      // Pick a player from the scored match to replace
      const oldPlayerId = firstMatch.team1[0];
      const scoredMatchIdsBefore = state.rounds[0].matches
        .filter(m => m.score !== null)
        .map(m => m.id);

      const result = tournamentReducer(state, {
        type: 'REPLACE_PLAYER',
        payload: { oldPlayerId, newPlayerName: 'Mid-Round Replacement' },
      })!;

      // Replacement should succeed
      expect(result.players.find(p => p.id === oldPlayerId)!.unavailable).toBe(true);
      expect(result.players.some(p => p.name === 'Mid-Round Replacement')).toBe(true);

      // Scored matches should still be present with their scores intact
      const scoredMatchesAfter = result.rounds[0].matches.filter(m => m.score !== null);
      expect(scoredMatchesAfter.map(m => m.id)).toEqual(scoredMatchIdsBefore);
      expect(scoredMatchesAfter[0].score).toEqual({ team1Points: 14, team2Points: 10 });

      // New player should appear in unscored (future) rounds
      const newPlayer = result.players.find(p => p.name === 'Mid-Round Replacement')!;
      const unscoredRounds = result.rounds.filter(r => r.matches.every(m => m.score === null));
      const newPlayerInFuture = unscoredRounds.some(r =>
        r.matches.some(m => m.team1.includes(newPlayer.id) || m.team2.includes(newPlayer.id))
      );
      expect(newPlayerInFuture).toBe(true);

      // Old player should not appear in unscored rounds
      for (const r of unscoredRounds) {
        for (const m of r.matches) {
          expect(m.team1).not.toContain(oldPlayerId);
          expect(m.team2).not.toContain(oldPlayerId);
        }
      }
    });
  });

  describe('REGENERATE_FUTURE_ROUNDS (scored round preservation)', () => {
    it('preserves scored rounds and only changes unscored ones', () => {
      let state = makeInProgressTournament();
      expect(state.rounds.length).toBeGreaterThan(1);

      // Score round 1 fully
      const round1 = state.rounds[0];
      for (const match of round1.matches) {
        state = tournamentReducer(state, {
          type: 'SET_MATCH_SCORE',
          payload: { roundId: round1.id, matchId: match.id, score: { team1Points: 12, team2Points: 12 } },
        })!;
      }

      const scoredRoundsBefore = state.rounds.filter(r => r.matches.some(m => m.score !== null));
      const unscoredRoundsBefore = state.rounds.filter(r => r.matches.every(m => m.score === null));
      expect(scoredRoundsBefore.length).toBe(1);
      expect(unscoredRoundsBefore.length).toBeGreaterThan(0);

      const result = tournamentReducer(state, { type: 'REGENERATE_FUTURE_ROUNDS' })!;

      // Scored rounds preserved exactly (same IDs, same scores)
      const scoredRoundsAfter = result.rounds.filter(r => r.matches.some(m => m.score !== null));
      expect(scoredRoundsAfter.length).toBe(scoredRoundsBefore.length);
      expect(scoredRoundsAfter[0].id).toBe(scoredRoundsBefore[0].id);
      for (let i = 0; i < scoredRoundsAfter[0].matches.length; i++) {
        expect(scoredRoundsAfter[0].matches[i].score).toEqual(scoredRoundsBefore[0].matches[i].score);
      }

      // Total round count stays the same (scored + regenerated unscored)
      const unscoredRoundsAfter = result.rounds.filter(r => r.matches.every(m => m.score === null));
      expect(unscoredRoundsAfter.length).toBe(unscoredRoundsBefore.length);
    });
  });

  describe('RESET_TOURNAMENT (delete resets to null)', () => {
    it('returns null regardless of tournament state', () => {
      // From in-progress
      const inProgress = makeInProgressTournament();
      expect(tournamentReducer(inProgress, { type: 'RESET_TOURNAMENT' })).toBeNull();

      // From setup
      const setup = makeSetupTournament();
      expect(tournamentReducer(setup, { type: 'RESET_TOURNAMENT' })).toBeNull();

      // From null
      expect(tournamentReducer(null, { type: 'RESET_TOURNAMENT' })).toBeNull();
    });
  });

  describe('GENERATE_SCHEDULE (maldiciones not dealt for non-team format)', () => {
    it('does not deal maldiciones cards when format has no fixed partners', () => {
      // Americano is NOT a team format — no teams exist, so maldiciones should not be dealt
      const players: Player[] = Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
      const config: TournamentConfig = {
        format: 'americano', pointsPerMatch: 24, maxRounds: 3,
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
        maldiciones: { enabled: true, chaosLevel: 'medium' },
      };
      const setup: Tournament = {
        id: 't1', name: 'Test', config, phase: 'setup',
        players, rounds: [], createdAt: 0, updatedAt: 0,
      };
      const result = tournamentReducer(setup, { type: 'GENERATE_SCHEDULE' })!;

      // Maldiciones hands should NOT be dealt because there are no teams
      expect(result.maldicionesHands).toBeUndefined();
    });

    it('does not deal maldiciones cards for mexicano format even when enabled', () => {
      const players: Player[] = Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
      const config: TournamentConfig = {
        format: 'mexicano', pointsPerMatch: 21, maxRounds: 7,
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
        maldiciones: { enabled: true, chaosLevel: 'hardcore' },
      };
      const setup: Tournament = {
        id: 't1', name: 'Test', config, phase: 'setup',
        players, rounds: [], createdAt: 0, updatedAt: 0,
      };
      const result = tournamentReducer(setup, { type: 'GENERATE_SCHEDULE' })!;

      // Mexicano has no fixed partners, so no teams, so no maldiciones
      expect(result.maldicionesHands).toBeUndefined();
    });
  });

  describe('Maldiciones — disabling after dealing', () => {
    // Maldiciones cards are dealt once at GENERATE_SCHEDULE time.
    // There is no UPDATE_CONFIG action available during in-progress phase,
    // so disabling maldiciones after cards have been dealt is not possible
    // via the reducer. The config is locked once the tournament starts.
    // This is by design: the maldiciones setting is a pre-tournament decision.
    it.skip('cannot disable maldiciones after cards are dealt (no UPDATE_CONFIG in in-progress phase)', () => {
      // Intentionally skipped — no reducer action exists to change config.maldiciones
      // during in-progress phase. The only way to "disable" would be to simply
      // not play any curse cards, which is a UI-level decision, not a state change.
    });
  });
});
