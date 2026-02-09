import type { Tournament, Player } from '@padel/common';
import type { TournamentAction } from './actions';
import { generateId } from '@padel/common';
import { getStrategy } from '../strategies';

export function tournamentReducer(
  state: Tournament | null,
  action: TournamentAction
): Tournament | null {
  switch (action.type) {
    case 'CREATE_TOURNAMENT': {
      const now = Date.now();
      return {
        id: generateId(),
        name: action.payload.name,
        config: action.payload.config,
        phase: 'setup',
        players: [],
        rounds: [],
        createdAt: now,
        updatedAt: now,
      };
    }

    case 'LOAD_TOURNAMENT':
      return action.payload;

    case 'ADD_PLAYER': {
      if (!state || state.phase !== 'setup') return state;
      const newPlayer = { id: generateId(), name: action.payload.name };
      return {
        ...state,
        players: [...state.players, newPlayer],
        updatedAt: Date.now(),
      };
    }

    case 'REMOVE_PLAYER': {
      if (!state || state.phase !== 'setup') return state;
      return {
        ...state,
        players: state.players.filter(p => p.id !== action.payload.playerId),
        updatedAt: Date.now(),
      };
    }

    case 'UPDATE_PLAYER': {
      if (!state) return state;
      return {
        ...state,
        players: state.players.map(p =>
          p.id === action.payload.playerId ? { ...p, name: action.payload.name } : p
        ),
        updatedAt: Date.now(),
      };
    }

    case 'TOGGLE_PLAYER_AVAILABILITY': {
      if (!state) return state;
      const { playerId: toggleId } = action.payload;
      const togglePlayers = state.players.map(p =>
        p.id === toggleId ? { ...p, unavailable: !p.unavailable } : p
      );

      if (state.phase !== 'in-progress') {
        return { ...state, players: togglePlayers, updatedAt: Date.now() };
      }

      // Drop fully unscored rounds, regenerate with updated active players
      const toggleScored = state.rounds.filter(r => r.matches.some(m => m.score !== null));
      const toggleDropped = state.rounds.length - toggleScored.length;

      if (toggleDropped > 0) {
        const strategy = getStrategy(state.config.format);
        const toggleExcludeIds = togglePlayers.filter(p => p.unavailable).map(p => p.id);
        const toggleActive = togglePlayers.filter(p => !p.unavailable);
        const { rounds: toggleRegen } = strategy.generateAdditionalRounds(
          toggleActive, state.config, toggleScored, toggleDropped, toggleExcludeIds
        );
        return {
          ...state,
          players: togglePlayers,
          rounds: [...toggleScored, ...toggleRegen],
          updatedAt: Date.now(),
        };
      }

      return { ...state, players: togglePlayers, updatedAt: Date.now() };
    }

    case 'REPLACE_PLAYER': {
      if (!state || state.phase !== 'in-progress') return state;
      const { oldPlayerId, newPlayerName } = action.payload;
      const replaceNew: Player = { id: generateId(), name: newPlayerName };
      const replacePlayers = state.players.map(p =>
        p.id === oldPlayerId ? { ...p, unavailable: true } : p
      );
      replacePlayers.push(replaceNew);

      // Drop fully unscored rounds, regenerate with updated active players
      const replaceScored = state.rounds.filter(r => r.matches.some(m => m.score !== null));
      const replaceDropped = state.rounds.length - replaceScored.length;

      if (replaceDropped > 0) {
        const replaceStrategy = getStrategy(state.config.format);
        const replaceExcludeIds = replacePlayers.filter(p => p.unavailable).map(p => p.id);
        const replaceActive = replacePlayers.filter(p => !p.unavailable);
        const { rounds: replaceRegen } = replaceStrategy.generateAdditionalRounds(
          replaceActive, state.config, replaceScored, replaceDropped, replaceExcludeIds
        );
        return {
          ...state,
          players: replacePlayers,
          rounds: [...replaceScored, ...replaceRegen],
          updatedAt: Date.now(),
        };
      }

      return {
        ...state,
        players: replacePlayers,
        updatedAt: Date.now(),
      };
    }

    case 'ADD_PLAYER_LIVE': {
      if (!state || state.phase !== 'in-progress') return state;
      const livePlayer: Player = { id: generateId(), name: action.payload.name };
      const updatedPlayers = [...state.players, livePlayer];

      // Drop all fully unscored rounds, regenerate with all active players
      const scoredRounds = state.rounds.filter(r => r.matches.some(m => m.score !== null));
      const droppedCount = state.rounds.length - scoredRounds.length;

      if (droppedCount > 0) {
        const strategy = getStrategy(state.config.format);
        const excludeIds = updatedPlayers.filter(p => p.unavailable).map(p => p.id);
        const activePlayers = updatedPlayers.filter(p => !p.unavailable);
        const { rounds: regenerated } = strategy.generateAdditionalRounds(
          activePlayers, state.config, scoredRounds, droppedCount, excludeIds
        );
        return {
          ...state,
          players: updatedPlayers,
          rounds: [...scoredRounds, ...regenerated],
          updatedAt: Date.now(),
        };
      }

      return {
        ...state,
        players: updatedPlayers,
        updatedAt: Date.now(),
      };
    }

    case 'REGENERATE_FUTURE_ROUNDS': {
      if (!state || state.phase !== 'in-progress') return state;
      const scored = state.rounds.filter(r => r.matches.some(m => m.score !== null));
      const droppedNum = state.rounds.length - scored.length;
      if (droppedNum === 0) return state;

      const strategy = getStrategy(state.config.format);
      const excIds = state.players.filter(p => p.unavailable).map(p => p.id);
      const active = state.players.filter(p => !p.unavailable);
      const { rounds: regen } = strategy.generateAdditionalRounds(
        active, state.config, scored, droppedNum, excIds
      );
      return {
        ...state,
        rounds: [...scored, ...regen],
        updatedAt: Date.now(),
      };
    }

    case 'UPDATE_COURT': {
      if (!state) return state;
      const { courtId, name } = action.payload;
      return {
        ...state,
        config: {
          ...state.config,
          courts: state.config.courts.map(c =>
            c.id === courtId ? { ...c, name } : c
          ),
        },
        updatedAt: Date.now(),
      };
    }

    case 'UPDATE_NAME': {
      if (!state) return state;
      return {
        ...state,
        name: action.payload.name,
        updatedAt: Date.now(),
      };
    }

    case 'UPDATE_CONFIG': {
      if (!state || state.phase !== 'setup') return state;
      return {
        ...state,
        config: { ...state.config, ...action.payload },
        updatedAt: Date.now(),
      };
    }

    case 'GENERATE_SCHEDULE': {
      if (!state || state.phase !== 'setup') return state;
      const strategy = getStrategy(state.config.format);
      const { rounds } = strategy.generateSchedule(state.players, state.config);
      return {
        ...state,
        phase: 'in-progress',
        rounds,
        updatedAt: Date.now(),
      };
    }

    case 'ADD_ROUNDS': {
      if (!state || state.phase !== 'in-progress') return state;
      const addStrategy = getStrategy(state.config.format);
      const { rounds: newRounds } = addStrategy.generateAdditionalRounds(
        state.players,
        state.config,
        state.rounds,
        action.payload.count
      );
      return {
        ...state,
        rounds: [...state.rounds, ...newRounds],
        updatedAt: Date.now(),
      };
    }

    case 'SET_MATCH_SCORE': {
      if (!state) return state;
      const { roundId, matchId, score } = action.payload;
      const updatedRounds = state.rounds.map(r =>
        r.id === roundId
          ? {
              ...r,
              matches: r.matches.map(m =>
                m.id === matchId ? { ...m, score } : m
              ),
            }
          : r
      );

      const strategy = getStrategy(state.config.format);
      if (strategy.isDynamic) {
        const totalTarget = state.config.maxRounds ?? state.players.length - 1;
        const allScored = updatedRounds.every(r => r.matches.every(m => m.score !== null));
        if (allScored && updatedRounds.length < totalTarget) {
          const active = state.players.filter(p => !p.unavailable);
          const excl = state.players.filter(p => p.unavailable).map(p => p.id);
          const { rounds: next } = strategy.generateAdditionalRounds(active, state.config, updatedRounds, 1, excl);
          return { ...state, rounds: [...updatedRounds, ...next], updatedAt: Date.now() };
        }
      }

      return {
        ...state,
        rounds: updatedRounds,
        updatedAt: Date.now(),
      };
    }

    case 'CLEAR_MATCH_SCORE': {
      if (!state) return state;
      const { roundId: rId, matchId: mId } = action.payload;
      return {
        ...state,
        rounds: state.rounds.map(r =>
          r.id === rId
            ? {
                ...r,
                matches: r.matches.map(m =>
                  m.id === mId ? { ...m, score: null } : m
                ),
              }
            : r
        ),
        updatedAt: Date.now(),
      };
    }

    case 'COMPLETE_TOURNAMENT': {
      if (!state || state.phase !== 'in-progress') return state;
      // Close unfinished rounds:
      // - Drop rounds with zero scores
      // - For partially scored rounds, remove unscored matches
      //   and move those players to sitOuts for compensation
      const closedRounds = state.rounds
        .filter(r => r.matches.some(m => m.score !== null))
        .map(r => {
          const scored = r.matches.filter(m => m.score !== null);
          const unscored = r.matches.filter(m => m.score === null);
          if (unscored.length === 0) return r;
          // Players from unscored matches become sit-outs
          const extraSitOuts = unscored.flatMap(m => [...m.team1, ...m.team2]);
          return {
            ...r,
            matches: scored,
            sitOuts: [...r.sitOuts, ...extraSitOuts],
          };
        });
      return {
        ...state,
        phase: 'completed',
        rounds: closedRounds,
        updatedAt: Date.now(),
      };
    }

    case 'RESET_TOURNAMENT':
      return null;

    default:
      return state;
  }
}
