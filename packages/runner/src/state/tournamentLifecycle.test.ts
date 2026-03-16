import { describe, it, expect } from 'vitest';
import { tournamentReducer } from './tournamentReducer';
import type { Tournament, TournamentConfig, Player, MatchScore } from '@padel/common';
import { getStrategy } from '../strategies';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(numCourts = 1, overrides?: Partial<TournamentConfig>): TournamentConfig {
  return {
    format: 'americano',
    pointsPerMatch: 24,
    courts: Array.from({ length: numCourts }, (_, i) => ({
      id: `c${i + 1}`,
      name: `Court ${i + 1}`,
    })),
    maxRounds: null,
    ...overrides,
  };
}

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
  }));
}

/** Dispatch a sequence of actions, returning the final state */
function dispatchAll(initial: Tournament | null, actions: Parameters<typeof tournamentReducer>[1][]): Tournament | null {
  return actions.reduce((state, action) => tournamentReducer(state, action), initial);
}

/** Score all matches in a round with a simple score */
function scoreRound(state: Tournament, roundIndex: number, score: MatchScore = { team1Points: 16, team2Points: 8 }): Tournament {
  let s = state;
  for (const match of state.rounds[roundIndex].matches) {
    s = tournamentReducer(s, {
      type: 'SET_MATCH_SCORE',
      payload: { roundId: s!.rounds[roundIndex].id, matchId: match.id, score },
    })!;
  }
  return s;
}

/** Score ALL rounds in the tournament */
function scoreAllRounds(state: Tournament, score?: MatchScore): Tournament {
  let s = state;
  for (let i = 0; i < s.rounds.length; i++) {
    // Only score rounds that have unscored matches
    if (s.rounds[i].matches.some(m => m.score === null)) {
      s = scoreRound(s, i, score);
    }
  }
  return s;
}

// ---------------------------------------------------------------------------
// Integration tests: full tournament lifecycle
// ---------------------------------------------------------------------------

describe('Tournament lifecycle integration', () => {
  describe('Americano: create → play → complete → ceremony', () => {
    it('full lifecycle with 8 players on 2 courts', () => {
      // 1. CREATE
      let state = tournamentReducer(null, {
        type: 'CREATE_TOURNAMENT',
        payload: { name: 'Sunday Cup', config: makeConfig(2) },
      })!;
      expect(state.phase).toBe('setup');
      expect(state.players).toEqual([]);

      // 2. LOAD players (simulates importing from planner)
      state = tournamentReducer(state, {
        type: 'LOAD_TOURNAMENT',
        payload: { ...state, players: makePlayers(8) },
      })!;
      expect(state.players).toHaveLength(8);

      // 3. GENERATE SCHEDULE → in-progress
      state = tournamentReducer(state, { type: 'GENERATE_SCHEDULE' })!;
      expect(state.phase).toBe('in-progress');
      expect(state.rounds.length).toBeGreaterThan(0);

      // Verify round structure
      for (const round of state.rounds) {
        expect(round.matches.length).toBe(2); // 2 courts
        for (const match of round.matches) {
          expect(match.team1).toHaveLength(2);
          expect(match.team2).toHaveLength(2);
          expect(match.score).toBeNull();
        }
      }

      // All 8 players accounted for in each round (playing + sit-outs)
      for (const round of state.rounds) {
        const playing = round.matches.flatMap(m => [...m.team1, ...m.team2]);
        const all = [...playing, ...round.sitOuts];
        expect(new Set(all).size).toBe(8);
      }

      // 4. SCORE all matches
      state = scoreAllRounds(state);

      // Verify all matches scored
      for (const round of state.rounds) {
        for (const match of round.matches) {
          expect(match.score).not.toBeNull();
        }
      }

      // 5. COMPLETE TOURNAMENT
      state = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' })!;
      expect(state.phase).toBe('completed');

      // 6. VERIFY STANDINGS
      const strategy = getStrategy(state.config.format);
      const standings = strategy.calculateStandings(state);
      expect(standings.length).toBeGreaterThan(0);

      // All active players have standings
      const standingIds = new Set(standings.map(s => s.playerId));
      for (const p of state.players.filter(pl => !pl.unavailable)) {
        expect(standingIds.has(p.id)).toBe(true);
      }

      // Standings are sorted by points descending
      for (let i = 1; i < standings.length; i++) {
        expect(standings[i - 1].totalPoints).toBeGreaterThanOrEqual(standings[i].totalPoints);
      }

      // Every player who played has matchesPlayed > 0
      for (const entry of standings) {
        expect(entry.matchesPlayed).toBeGreaterThan(0);
      }

      // 7. CEREMONY
      state = tournamentReducer(state, {
        type: 'COMPLETE_CEREMONY',
        payload: { nominations: [{ award: 'MVP', playerId: 'p1' }] },
      })!;
      expect(state.ceremonyCompleted).toBe(true);
      expect(state.nominations).toHaveLength(1);
    });
  });

  describe('scoring drives standings correctly', () => {
    it('player who wins every match is #1 in standings', () => {
      const players = makePlayers(4);
      const config = makeConfig(1, { maxRounds: 3 });
      let state: Tournament = {
        id: 't1', name: 'Test', config, phase: 'setup',
        players, rounds: [], createdAt: 1000, updatedAt: 1000,
      };
      state = tournamentReducer(state, { type: 'GENERATE_SCHEDULE' })!;

      // Score each round so that team1 always wins big
      for (let i = 0; i < state.rounds.length; i++) {
        state = scoreRound(state, i, { team1Points: 24, team2Points: 0 });
      }

      state = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' })!;

      const strategy = getStrategy(state.config.format);
      const standings = strategy.calculateStandings(state);

      // Top player should have maximum points per match * matches played
      expect(standings[0].totalPoints).toBeGreaterThan(0);
      expect(standings[0].totalPoints).toBeGreaterThan(standings[standings.length - 1].totalPoints);
    });
  });

  describe('partial scoring and completion', () => {
    it('completing with unscored rounds drops them', () => {
      const config = makeConfig(2, { maxRounds: 4 });
      let state: Tournament = {
        id: 't1', name: 'Test', config, phase: 'setup',
        players: makePlayers(8), rounds: [], createdAt: 1000, updatedAt: 1000,
      };
      state = tournamentReducer(state, { type: 'GENERATE_SCHEDULE' })!;
      expect(state.rounds.length).toBe(4);

      // Only score first 2 rounds
      state = scoreRound(state, 0);
      state = scoreRound(state, 1);

      state = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' })!;
      expect(state.phase).toBe('completed');
      // Unscored rounds dropped
      expect(state.rounds.length).toBe(2);
      // All remaining matches have scores
      for (const round of state.rounds) {
        for (const match of round.matches) {
          expect(match.score).not.toBeNull();
        }
      }
    });

    it('partially scored round keeps scored matches and moves unscored players to sit-outs', () => {
      const config = makeConfig(2, { maxRounds: 2 });
      let state: Tournament = {
        id: 't1', name: 'Test', config, phase: 'setup',
        players: makePlayers(8), rounds: [], createdAt: 1000, updatedAt: 1000,
      };
      state = tournamentReducer(state, { type: 'GENERATE_SCHEDULE' })!;

      // Score all of round 1
      state = scoreRound(state, 0);

      // Score only first match of round 2
      const round2 = state.rounds[1];
      state = tournamentReducer(state, {
        type: 'SET_MATCH_SCORE',
        payload: { roundId: round2.id, matchId: round2.matches[0].id, score: { team1Points: 12, team2Points: 12 } },
      })!;

      state = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' })!;

      // Both rounds kept (both have at least one scored match)
      expect(state.rounds.length).toBe(2);

      // Round 2: only 1 match (the scored one), unscored match players → sit-outs
      const completedRound2 = state.rounds[1];
      expect(completedRound2.matches.length).toBe(1);
      expect(completedRound2.matches[0].score).not.toBeNull();

      // The 4 players from the unscored match are in sit-outs
      expect(completedRound2.sitOuts.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('mid-tournament modifications', () => {
    it('player replacement preserves scored rounds and regenerates future', () => {
      const config = makeConfig(2, { maxRounds: 4 });
      let state: Tournament = {
        id: 't1', name: 'Test', config, phase: 'setup',
        players: makePlayers(8), rounds: [], createdAt: 1000, updatedAt: 1000,
      };
      state = tournamentReducer(state, { type: 'GENERATE_SCHEDULE' })!;

      // Score first round
      state = scoreRound(state, 0);
      const scoredRoundId = state.rounds[0].id;

      // Replace a player
      state = tournamentReducer(state, {
        type: 'REPLACE_PLAYER',
        payload: { oldPlayerId: 'p1', newPlayerName: 'Substitute' },
      })!;

      // Original player marked unavailable
      expect(state.players.find(p => p.id === 'p1')!.unavailable).toBe(true);
      // New player added
      expect(state.players.find(p => p.name === 'Substitute')).toBeDefined();

      // Scored round preserved
      expect(state.rounds[0].id).toBe(scoredRoundId);
      expect(state.rounds[0].matches[0].score).not.toBeNull();

      // Can still complete
      state = scoreAllRounds(state);
      state = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' })!;
      expect(state.phase).toBe('completed');

      const strategy = getStrategy(state.config.format);
      const standings = strategy.calculateStandings(state);
      expect(standings.length).toBeGreaterThan(0);
    });

    it('adding a player live regenerates future rounds', () => {
      const config = makeConfig(2, { maxRounds: 4 });
      let state: Tournament = {
        id: 't1', name: 'Test', config, phase: 'setup',
        players: makePlayers(8), rounds: [], createdAt: 1000, updatedAt: 1000,
      };
      state = tournamentReducer(state, { type: 'GENERATE_SCHEDULE' })!;

      // Score first round
      state = scoreRound(state, 0);

      // Add a 9th player mid-tournament
      state = tournamentReducer(state, {
        type: 'ADD_PLAYER_LIVE',
        payload: { name: 'Late Arrival' },
      })!;

      expect(state.players).toHaveLength(9);
      // Scored round preserved
      expect(state.rounds[0].matches[0].score).not.toBeNull();

      // Complete the tournament
      state = scoreAllRounds(state);
      state = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' })!;
      expect(state.phase).toBe('completed');
    });

    it('toggling player availability regenerates future rounds', () => {
      const config = makeConfig(2, { maxRounds: 4 });
      let state: Tournament = {
        id: 't1', name: 'Test', config, phase: 'setup',
        players: makePlayers(8), rounds: [], createdAt: 1000, updatedAt: 1000,
      };
      state = tournamentReducer(state, { type: 'GENERATE_SCHEDULE' })!;

      state = scoreRound(state, 0);

      // Mark player as unavailable
      state = tournamentReducer(state, {
        type: 'TOGGLE_PLAYER_AVAILABILITY',
        payload: { playerId: 'p8' },
      })!;
      expect(state.players.find(p => p.id === 'p8')!.unavailable).toBe(true);

      // Future rounds regenerated — p8 should not appear in unscored rounds
      for (let i = 1; i < state.rounds.length; i++) {
        if (state.rounds[i].matches.some(m => m.score === null)) {
          const allPlayers = state.rounds[i].matches.flatMap(m => [...m.team1, ...m.team2]);
          expect(allPlayers).not.toContain('p8');
        }
      }

      // Still completable
      state = scoreAllRounds(state);
      state = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' })!;
      expect(state.phase).toBe('completed');
    });
  });

  describe('round count adjustments during play', () => {
    it('adding rounds then completing', () => {
      const config = makeConfig(2, { maxRounds: 2 });
      let state: Tournament = {
        id: 't1', name: 'Test', config, phase: 'setup',
        players: makePlayers(8), rounds: [], createdAt: 1000, updatedAt: 1000,
      };
      state = tournamentReducer(state, { type: 'GENERATE_SCHEDULE' })!;
      expect(state.rounds.length).toBe(2);

      // Score everything, then add 2 more rounds
      state = scoreAllRounds(state);
      state = tournamentReducer(state, { type: 'ADD_ROUNDS', payload: { count: 2 } })!;
      expect(state.rounds.length).toBe(4);

      state = scoreAllRounds(state);
      state = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' })!;
      expect(state.phase).toBe('completed');
      expect(state.rounds.length).toBe(4);

      const strategy = getStrategy(state.config.format);
      const standings = strategy.calculateStandings(state);
      // All players should have played in more rounds than original 2
      for (const entry of standings) {
        expect(entry.matchesPlayed).toBeGreaterThanOrEqual(2);
      }
    });

    it('reducing round count trims unscored rounds', () => {
      const config = makeConfig(2, { maxRounds: 5 });
      let state: Tournament = {
        id: 't1', name: 'Test', config, phase: 'setup',
        players: makePlayers(8), rounds: [], createdAt: 1000, updatedAt: 1000,
      };
      state = tournamentReducer(state, { type: 'GENERATE_SCHEDULE' })!;
      expect(state.rounds.length).toBe(5);

      // Score first 2 rounds
      state = scoreRound(state, 0);
      state = scoreRound(state, 1);

      // Trim to 3 rounds
      state = tournamentReducer(state, { type: 'SET_ROUND_COUNT', payload: { count: 3 } })!;
      expect(state.rounds.length).toBe(3);

      // Cannot trim below scored rounds
      state = tournamentReducer(state, { type: 'SET_ROUND_COUNT', payload: { count: 1 } })!;
      expect(state.rounds.length).toBe(3); // unchanged — 2 scored rounds is the minimum
    });
  });

  describe('score correction flow', () => {
    it('clear and re-score a match before completing', () => {
      const config = makeConfig(1, { maxRounds: 2 });
      let state: Tournament = {
        id: 't1', name: 'Test', config, phase: 'setup',
        players: makePlayers(4), rounds: [], createdAt: 1000, updatedAt: 1000,
      };
      state = tournamentReducer(state, { type: 'GENERATE_SCHEDULE' })!;

      // Score round 1 with initial score
      state = scoreRound(state, 0, { team1Points: 20, team2Points: 4 });
      const matchId = state.rounds[0].matches[0].id;
      const roundId = state.rounds[0].id;

      // Clear and re-score with corrected score
      state = tournamentReducer(state, {
        type: 'CLEAR_MATCH_SCORE',
        payload: { roundId, matchId },
      })!;
      expect(state.rounds[0].matches[0].score).toBeNull();

      state = tournamentReducer(state, {
        type: 'SET_MATCH_SCORE',
        payload: { roundId, matchId, score: { team1Points: 14, team2Points: 10 } },
      })!;
      expect(state.rounds[0].matches[0].score!.team1Points).toBe(14);

      // Finish and complete
      state = scoreAllRounds(state);
      state = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' })!;

      const strategy = getStrategy(state.config.format);
      const standings = strategy.calculateStandings(state);
      // Verify corrected score is reflected in standings
      expect(standings[0].totalPoints).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('minimum viable tournament: 4 players, 1 court, 1 round', () => {
      const config = makeConfig(1, { maxRounds: 1 });
      let state: Tournament = {
        id: 't1', name: 'Mini', config, phase: 'setup',
        players: makePlayers(4), rounds: [], createdAt: 1000, updatedAt: 1000,
      };

      state = tournamentReducer(state, { type: 'GENERATE_SCHEDULE' })!;
      expect(state.rounds.length).toBe(1);
      expect(state.rounds[0].matches.length).toBe(1);
      expect(state.rounds[0].sitOuts.length).toBe(0);

      state = scoreRound(state, 0);
      state = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' })!;

      const strategy = getStrategy(state.config.format);
      const standings = strategy.calculateStandings(state);
      expect(standings).toHaveLength(4);
      expect(standings.every(s => s.matchesPlayed === 1)).toBe(true);
    });

    it('completing with zero scored rounds produces empty tournament', () => {
      const config = makeConfig(2, { maxRounds: 3 });
      let state: Tournament = {
        id: 't1', name: 'Test', config, phase: 'setup',
        players: makePlayers(8), rounds: [], createdAt: 1000, updatedAt: 1000,
      };
      state = tournamentReducer(state, { type: 'GENERATE_SCHEDULE' })!;

      // Complete without scoring anything
      state = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' })!;
      expect(state.phase).toBe('completed');
      expect(state.rounds.length).toBe(0); // all rounds dropped
    });

    it('reset mid-tournament clears everything', () => {
      const config = makeConfig(2, { maxRounds: 3 });
      let state: Tournament | null = {
        id: 't1', name: 'Test', config, phase: 'setup',
        players: makePlayers(8), rounds: [], createdAt: 1000, updatedAt: 1000,
      };
      state = tournamentReducer(state, { type: 'GENERATE_SCHEDULE' });
      state = scoreRound(state!, 0);
      state = tournamentReducer(state, { type: 'RESET_TOURNAMENT' });
      expect(state).toBeNull();
    });

    it('COMPLETE_TOURNAMENT is a no-op in setup phase', () => {
      const state: Tournament = {
        id: 't1', name: 'Test', config: makeConfig(1), phase: 'setup',
        players: makePlayers(4), rounds: [], createdAt: 1000, updatedAt: 1000,
      };
      const result = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' });
      expect(result).toBe(state); // unchanged reference
    });

    it('GENERATE_SCHEDULE is a no-op in completed phase', () => {
      const config = makeConfig(1, { maxRounds: 1 });
      let state: Tournament = {
        id: 't1', name: 'Test', config, phase: 'setup',
        players: makePlayers(4), rounds: [], createdAt: 1000, updatedAt: 1000,
      };
      state = tournamentReducer(state, { type: 'GENERATE_SCHEDULE' })!;
      state = scoreAllRounds(state);
      state = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' })!;

      const result = tournamentReducer(state, { type: 'GENERATE_SCHEDULE' });
      expect(result).toBe(state); // no change
    });
  });

  describe('large tournament stress test', () => {
    it('16 players, 4 courts, full lifecycle', () => {
      const config = makeConfig(4, { maxRounds: 5 });
      let state: Tournament = {
        id: 't1', name: 'Big Cup', config, phase: 'setup',
        players: makePlayers(16), rounds: [], createdAt: 1000, updatedAt: 1000,
      };

      state = tournamentReducer(state, { type: 'GENERATE_SCHEDULE' })!;
      expect(state.rounds.length).toBe(5);

      // Each round should use all 4 courts
      for (const round of state.rounds) {
        expect(round.matches.length).toBe(4);
      }

      state = scoreAllRounds(state);
      state = tournamentReducer(state, { type: 'COMPLETE_TOURNAMENT' })!;

      const strategy = getStrategy(state.config.format);
      const standings = strategy.calculateStandings(state);
      expect(standings).toHaveLength(16);

      // Points conservation: each match awards points to 4 players (2 per team)
      // Total points across all standings = sum of (team1Points*2 + team2Points*2) per match
      const totalPoints = standings.reduce((sum, s) => sum + s.totalPoints, 0);
      const totalMatches = state.rounds.reduce((sum, r) => sum + r.matches.length, 0);
      // Each match: 2 players get team1Points (16) + 2 players get team2Points (8) = 48 per match
      expect(totalPoints).toBe((16 + 8) * 2 * totalMatches);
    });
  });
});
