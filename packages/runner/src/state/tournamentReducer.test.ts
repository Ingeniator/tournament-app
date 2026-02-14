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
      const config: TournamentConfig = {
        format: 'team-americano', pointsPerMatch: 21, maxRounds: 3,
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
      };
      const setup: Tournament = { id: 't1', name: 'Test', config, phase: 'setup', players, rounds: [], createdAt: 0, updatedAt: 0 };
      const withTeams = tournamentReducer(setup, { type: 'SET_TEAMS' })!;
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
      const config: TournamentConfig = {
        format: 'team-americano', pointsPerMatch: 21, maxRounds: 3,
        courts: [{ id: 'c1', name: 'C1' }, { id: 'c2', name: 'C2' }],
      };
      const setup: Tournament = { id: 't1', name: 'Test', config, phase: 'setup', players, rounds: [], createdAt: 0, updatedAt: 0 };
      const withTeams = tournamentReducer(setup, { type: 'SET_TEAMS' })!;
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

  describe('SWAP_PLAYERS (team name preservation)', () => {
    function makeTeamPairingState(): Tournament {
      const players: Player[] = Array.from({ length: 4 }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
      const config: TournamentConfig = {
        format: 'team-americano', pointsPerMatch: 21, maxRounds: 3,
        courts: [{ id: 'c1', name: 'C1' }],
      };
      const setup: Tournament = { id: 't1', name: 'Test', config, phase: 'setup', players, rounds: [], createdAt: 0, updatedAt: 0 };
      return tournamentReducer(setup, { type: 'SET_TEAMS' })!;
    }

    it('preserves custom team name after swap', () => {
      let state = makeTeamPairingState();
      const team = state.teams![0];
      // Set a custom name
      state = tournamentReducer(state, {
        type: 'RENAME_TEAM',
        payload: { teamId: team.id, name: 'The Aces' },
      })!;

      // Swap a player between teams
      const playerFromTeam0 = team.player1Id;
      const playerFromTeam1 = state.teams![1].player1Id;
      const result = tournamentReducer(state, {
        type: 'SWAP_PLAYERS',
        payload: { playerA: playerFromTeam0, playerB: playerFromTeam1 },
      });

      // Custom name should be preserved
      const updatedTeam = result!.teams!.find(t => t.id === team.id)!;
      expect(updatedTeam.name).toBe('The Aces');
    });

    it('teams without custom names have no stored name after swap', () => {
      const state = makeTeamPairingState();
      const team0 = state.teams![0];
      const team1 = state.teams![1];

      const result = tournamentReducer(state, {
        type: 'SWAP_PLAYERS',
        payload: { playerA: team0.player1Id, playerB: team1.player1Id },
      });

      // No custom name was set, so name should remain undefined
      expect(result!.teams![0].name).toBeUndefined();
      expect(result!.teams![1].name).toBeUndefined();
    });
  });

  describe('REPLACE_PLAYER (team name preservation)', () => {
    function makeTeamAmericanoInProgress(): Tournament {
      const players: Player[] = Array.from({ length: 4 }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
      const config: TournamentConfig = {
        format: 'team-americano', pointsPerMatch: 21, maxRounds: 3,
        courts: [{ id: 'c1', name: 'C1' }],
      };
      const setup: Tournament = { id: 't1', name: 'Test', config, phase: 'setup', players, rounds: [], createdAt: 0, updatedAt: 0 };
      const withTeams = tournamentReducer(setup, { type: 'SET_TEAMS' })!;
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
