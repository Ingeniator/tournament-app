import type { Tournament, Player, Court } from '@padel/common';
import type { TournamentAction } from './actions';
import { generateId } from '@padel/common';
import { getStrategy } from '../strategies';
import { deduplicateNames } from '../utils/deduplicateNames';

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

    case 'LOAD_TOURNAMENT': {
      const loaded = action.payload;
      return { ...loaded, players: deduplicateNames(loaded.players) };
    }

    case 'ADD_PLAYER': {
      if (!state || state.phase !== 'setup') return state;
      const newPlayer = { id: generateId(), name: action.payload.name };
      return {
        ...state,
        players: deduplicateNames([...state.players, newPlayer]),
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
      const updatedPlrs = state.players.map(p =>
        p.id === action.payload.playerId ? { ...p, name: action.payload.name } : p
      );
      return {
        ...state,
        players: deduplicateNames(updatedPlrs),
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
      const rawReplace = state.players.map(p =>
        p.id === oldPlayerId ? { ...p, unavailable: true } : p
      );
      rawReplace.push(replaceNew);
      const replacePlayers = deduplicateNames(rawReplace);

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
      const updatedPlayers = deduplicateNames([...state.players, livePlayer]);

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

    case 'SET_FUTURE_ROUNDS': {
      if (!state || state.phase !== 'in-progress') return state;
      const sfScored = state.rounds.filter(r => r.matches.some(m => m.score !== null));
      return {
        ...state,
        rounds: [...sfScored, ...action.payload.rounds],
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
        active, state.config, scored, droppedNum, excIds, action.payload?.timeBudgetMs
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

    case 'ADD_COURT_LIVE': {
      if (!state || state.phase !== 'in-progress') return state;
      const activePlrs = state.players.filter(p => !p.unavailable);
      const maxCourts = Math.max(1, Math.floor(activePlrs.length / 4));
      const availableCourtCount = state.config.courts.filter(c => !c.unavailable).length;
      if (availableCourtCount >= maxCourts) return state;

      const newCourt: Court = {
        id: generateId(),
        name: `Court ${state.config.courts.length + 1}`,
      };
      const newConfig = { ...state.config, courts: [...state.config.courts, newCourt] };

      // Regenerate unscored rounds with the new court available
      const scoredAcl = state.rounds.filter(r => r.matches.some(m => m.score !== null));
      const droppedAcl = state.rounds.length - scoredAcl.length;
      if (droppedAcl > 0) {
        const aclStrategy = getStrategy(newConfig.format);
        const aclExcl = state.players.filter(p => p.unavailable).map(p => p.id);
        const { rounds: aclRegen } = aclStrategy.generateAdditionalRounds(
          activePlrs, newConfig, scoredAcl, droppedAcl, aclExcl
        );
        return {
          ...state,
          config: newConfig,
          rounds: [...scoredAcl, ...aclRegen],
          updatedAt: Date.now(),
        };
      }

      return { ...state, config: newConfig, updatedAt: Date.now() };
    }

    case 'TOGGLE_COURT_AVAILABILITY': {
      if (!state || state.phase !== 'in-progress') return state;
      const tcCourts = state.config.courts.map(c =>
        c.id === action.payload.courtId ? { ...c, unavailable: !c.unavailable } : c
      );
      // Must keep at least 1 available court
      if (tcCourts.every(c => c.unavailable)) return state;

      const tcConfig = { ...state.config, courts: tcCourts };

      // Regenerate unscored rounds with updated court set
      const tcScored = state.rounds.filter(r => r.matches.some(m => m.score !== null));
      const tcDropped = state.rounds.length - tcScored.length;
      if (tcDropped > 0) {
        const tcStrategy = getStrategy(tcConfig.format);
        const tcActive = state.players.filter(p => !p.unavailable);
        const tcExcl = state.players.filter(p => p.unavailable).map(p => p.id);
        const { rounds: tcRegen } = tcStrategy.generateAdditionalRounds(
          tcActive, tcConfig, tcScored, tcDropped, tcExcl
        );
        return {
          ...state,
          config: tcConfig,
          rounds: [...tcScored, ...tcRegen],
          updatedAt: Date.now(),
        };
      }

      return { ...state, config: tcConfig, updatedAt: Date.now() };
    }

    case 'REPLACE_COURT': {
      if (!state || state.phase !== 'in-progress') return state;
      const { oldCourtId, newCourtName } = action.payload;
      const rcCourts = state.config.courts.map(c =>
        c.id === oldCourtId ? { ...c, unavailable: true } : c
      );
      const rcNewCourt: Court = { id: generateId(), name: newCourtName };
      rcCourts.push(rcNewCourt);
      const rcConfig = { ...state.config, courts: rcCourts };

      // Regenerate unscored rounds with updated court set
      const rcScored = state.rounds.filter(r => r.matches.some(m => m.score !== null));
      const rcDropped = state.rounds.length - rcScored.length;
      if (rcDropped > 0) {
        const rcStrategy = getStrategy(rcConfig.format);
        const rcActive = state.players.filter(p => !p.unavailable);
        const rcExcl = state.players.filter(p => p.unavailable).map(p => p.id);
        const { rounds: rcRegen } = rcStrategy.generateAdditionalRounds(
          rcActive, rcConfig, rcScored, rcDropped, rcExcl
        );
        return { ...state, config: rcConfig, rounds: [...rcScored, ...rcRegen], updatedAt: Date.now() };
      }

      return { ...state, config: rcConfig, updatedAt: Date.now() };
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
      const players = deduplicateNames(state.players);
      const strategy = getStrategy(state.config.format);
      const { rounds } = strategy.generateSchedule(players, state.config);
      return {
        ...state,
        players,
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

    case 'UPDATE_POINTS': {
      if (!state) return state;
      return {
        ...state,
        config: { ...state.config, pointsPerMatch: action.payload.pointsPerMatch },
        updatedAt: Date.now(),
      };
    }

    case 'SET_ROUND_COUNT': {
      if (!state || state.phase !== 'in-progress') return state;
      const targetCount = action.payload.count;
      const currentCount = state.rounds.length;
      if (targetCount === currentCount) return state;

      const scoredRnds = state.rounds.filter(r => r.matches.some(m => m.score !== null));
      const minCount = scoredRnds.length;
      if (targetCount < minCount) return state;

      if (targetCount < currentCount) {
        // Trim unscored rounds from the end
        const unscoredFromEnd = currentCount - targetCount;
        const kept = state.rounds.slice(0, currentCount - unscoredFromEnd);
        return { ...state, rounds: kept, updatedAt: Date.now() };
      }

      // Increase: generate additional rounds
      const addCount = targetCount - currentCount;
      const strat = getStrategy(state.config.format);
      const excl = state.players.filter(p => p.unavailable).map(p => p.id);
      const actv = state.players.filter(p => !p.unavailable);
      const { rounds: extra } = strat.generateAdditionalRounds(actv, state.config, state.rounds, addCount, excl);
      return { ...state, rounds: [...state.rounds, ...extra], updatedAt: Date.now() };
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
