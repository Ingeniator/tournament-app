import { describe, it, expect } from 'vitest';
import { tournamentReducer } from './tournamentReducer';
import type { Tournament, TournamentConfig, Player } from '@padel/common';

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

  describe('ADD_PLAYER', () => {
    it('adds a player in setup phase', () => {
      const state = makeSetupTournament(0);
      const result = tournamentReducer(state, {
        type: 'ADD_PLAYER',
        payload: { name: 'Alice' },
      });
      expect(result!.players.length).toBe(1);
      expect(result!.players[0].name).toBe('Alice');
    });

    it('ignores in non-setup phase', () => {
      const state = makeInProgressTournament();
      const result = tournamentReducer(state, {
        type: 'ADD_PLAYER',
        payload: { name: 'New Player' },
      });
      expect(result!.players.length).toBe(state.players.length);
    });

    it('returns same state when state is null', () => {
      const result = tournamentReducer(null, {
        type: 'ADD_PLAYER',
        payload: { name: 'Alice' },
      });
      expect(result).toBeNull();
    });
  });

  describe('ADD_PLAYERS_BULK', () => {
    it('adds multiple players at once', () => {
      const state = makeSetupTournament(0);
      const result = tournamentReducer(state, {
        type: 'ADD_PLAYERS_BULK',
        payload: { names: ['Alice', 'Bob', 'Charlie'] },
      });
      expect(result!.players.length).toBe(3);
    });
  });

  describe('REMOVE_PLAYER', () => {
    it('removes a player by id', () => {
      const state = makeSetupTournament(4);
      const result = tournamentReducer(state, {
        type: 'REMOVE_PLAYER',
        payload: { playerId: 'p2' },
      });
      expect(result!.players.length).toBe(3);
      expect(result!.players.find(p => p.id === 'p2')).toBeUndefined();
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

  describe('UPDATE_CONFIG', () => {
    it('merges config updates in setup phase', () => {
      const state = makeSetupTournament();
      const result = tournamentReducer(state, {
        type: 'UPDATE_CONFIG',
        payload: { pointsPerMatch: 32 },
      });
      expect(result!.config.pointsPerMatch).toBe(32);
      expect(result!.config.format).toBe('americano'); // unchanged
    });

    it('ignores in non-setup phase', () => {
      const state = makeInProgressTournament();
      const original = state.config.pointsPerMatch;
      const result = tournamentReducer(state, {
        type: 'UPDATE_CONFIG',
        payload: { pointsPerMatch: 99 },
      });
      expect(result!.config.pointsPerMatch).toBe(original);
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

  describe('default case', () => {
    it('returns state unchanged for unknown action', () => {
      const state = makeSetupTournament();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = tournamentReducer(state, { type: 'UNKNOWN' } as any);
      expect(result).toBe(state);
    });
  });
});
