import type { Tournament, Player, Court, TournamentConfig, Round, Team } from '@padel/common';
import type { TournamentAction } from './actions';
import { generateId } from '@padel/common';
import { getStrategy } from '../strategies';
import { deduplicateNames } from '../utils/deduplicateNames';
import { resolveConfigDefaults } from '../utils/resolveConfigDefaults';

function createTeams(players: Player[]): Team[] {
  // Shuffle and pair sequentially
  const shuffled = [...players];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const teams: Team[] = [];
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    teams.push({
      id: generateId(),
      player1Id: shuffled[i].id,
      player2Id: shuffled[i + 1].id,
    });
  }
  return teams;
}

function regenerateUnscoredRounds(
  state: Tournament, players: Player[], config: TournamentConfig, timeBudgetMs?: number
): Round[] {
  const scored = state.rounds.filter(r => r.matches.some(m => m.score !== null));
  const dropped = state.rounds.length - scored.length;
  if (dropped === 0) return state.rounds;
  const strategy = getStrategy(config.format);
  const active = players.filter(p => !p.unavailable);
  const excludeIds = players.filter(p => p.unavailable).map(p => p.id);
  const { rounds: regen } = strategy.generateAdditionalRounds(active, config, scored, dropped, excludeIds, timeBudgetMs, state);
  return [...scored, ...regen];
}

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

    case 'ADD_PLAYERS_BULK': {
      if (!state || state.phase !== 'setup') return state;
      const newPlayers = action.payload.names.map(name => ({
        id: generateId(),
        name,
      }));
      return {
        ...state,
        players: deduplicateNames([...state.players, ...newPlayers]),
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

      const newRounds = regenerateUnscoredRounds(state, togglePlayers, state.config);
      return { ...state, players: togglePlayers, rounds: newRounds, updatedAt: Date.now() };
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

      // For team formats: update team references and match player IDs
      const strategy = getStrategy(state.config.format);
      let intermediateState = state;
      if (strategy.hasFixedPartners && state.teams) {
        const updatedTeams = state.teams.map(t => {
          if (t.player1Id === oldPlayerId) return { ...t, player1Id: replaceNew.id };
          if (t.player2Id === oldPlayerId) return { ...t, player2Id: replaceNew.id };
          return t;
        });
        const updatedRounds = state.rounds.map(r => ({
          ...r,
          matches: r.matches.map(m => ({
            ...m,
            team1: m.team1.map(pid => pid === oldPlayerId ? replaceNew.id : pid) as [string, string],
            team2: m.team2.map(pid => pid === oldPlayerId ? replaceNew.id : pid) as [string, string],
          })),
          sitOuts: r.sitOuts.map(pid => pid === oldPlayerId ? replaceNew.id : pid),
        }));
        intermediateState = { ...state, teams: updatedTeams, rounds: updatedRounds };
      }

      const newRounds = regenerateUnscoredRounds(intermediateState, replacePlayers, state.config);
      return { ...intermediateState, players: replacePlayers, rounds: newRounds, updatedAt: Date.now() };
    }

    case 'ADD_PLAYER_LIVE': {
      if (!state || state.phase !== 'in-progress') return state;
      const livePlayer: Player = { id: generateId(), name: action.payload.name };
      const updatedPlayers = deduplicateNames([...state.players, livePlayer]);
      const newRounds = regenerateUnscoredRounds(state, updatedPlayers, state.config);
      return { ...state, players: updatedPlayers, rounds: newRounds, updatedAt: Date.now() };
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
      const newRounds = regenerateUnscoredRounds(state, state.players, state.config, action.payload?.timeBudgetMs);
      if (newRounds === state.rounds) return state;
      return { ...state, rounds: newRounds, updatedAt: Date.now() };
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
      const newRounds = regenerateUnscoredRounds(state, state.players, newConfig);
      return { ...state, config: newConfig, rounds: newRounds, updatedAt: Date.now() };
    }

    case 'TOGGLE_COURT_AVAILABILITY': {
      if (!state || state.phase !== 'in-progress') return state;
      const tcCourts = state.config.courts.map(c =>
        c.id === action.payload.courtId ? { ...c, unavailable: !c.unavailable } : c
      );
      // Must keep at least 1 available court
      if (tcCourts.every(c => c.unavailable)) return state;

      const tcConfig = { ...state.config, courts: tcCourts };
      const newRounds = regenerateUnscoredRounds(state, state.players, tcConfig);
      return { ...state, config: tcConfig, rounds: newRounds, updatedAt: Date.now() };
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
      const newRounds = regenerateUnscoredRounds(state, state.players, rcConfig);
      return { ...state, config: rcConfig, rounds: newRounds, updatedAt: Date.now() };
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

    case 'SET_TEAMS': {
      if (!state || state.phase !== 'setup') return state;
      if (!getStrategy(state.config.format).hasFixedPartners) return state;
      const teams = createTeams(state.players);
      return {
        ...state,
        teams,
        phase: 'team-pairing',
        updatedAt: Date.now(),
      };
    }

    case 'SHUFFLE_TEAMS': {
      if (!state || state.phase !== 'team-pairing') return state;
      const teams = createTeams(state.players);
      return {
        ...state,
        teams,
        updatedAt: Date.now(),
      };
    }

    case 'SWAP_PLAYERS': {
      if (!state || state.phase !== 'team-pairing' || !state.teams) return state;
      const { playerA, playerB } = action.payload;
      const teamAIdx = state.teams.findIndex(t => t.player1Id === playerA || t.player2Id === playerA);
      const teamBIdx = state.teams.findIndex(t => t.player1Id === playerB || t.player2Id === playerB);
      if (teamAIdx === -1 || teamBIdx === -1 || teamAIdx === teamBIdx) return state;

      const newTeams = state.teams.map(t => ({ ...t }));
      // Swap playerA and playerB between their teams
      const tA = newTeams[teamAIdx];
      const tB = newTeams[teamBIdx];
      if (tA.player1Id === playerA) tA.player1Id = playerB; else tA.player2Id = playerB;
      if (tB.player1Id === playerB) tB.player1Id = playerA; else tB.player2Id = playerA;
      // Clear custom names on affected teams (composition changed)
      tA.name = undefined;
      tB.name = undefined;

      return {
        ...state,
        teams: newTeams,
        updatedAt: Date.now(),
      };
    }

    case 'RENAME_TEAM': {
      if (!state || state.phase !== 'team-pairing' || !state.teams) return state;
      const { teamId, name } = action.payload;
      const newTeams = state.teams.map(t =>
        t.id === teamId ? { ...t, name: name.trim() || undefined } : t
      );
      return {
        ...state,
        teams: newTeams,
        updatedAt: Date.now(),
      };
    }

    case 'SET_TEAMS_BACK': {
      if (!state || state.phase !== 'team-pairing') return state;
      return {
        ...state,
        phase: 'setup',
        teams: undefined,
        updatedAt: Date.now(),
      };
    }

    case 'GENERATE_SCHEDULE': {
      if (!state || (state.phase !== 'setup' && state.phase !== 'team-pairing')) return state;
      const players = deduplicateNames(state.players);
      const resolvedConfig = resolveConfigDefaults(state.config, players.length);
      const strategy = getStrategy(resolvedConfig.format);
      const { rounds } = strategy.generateSchedule(players, resolvedConfig, state);
      return {
        ...state,
        players,
        config: resolvedConfig,
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
        action.payload.count,
        undefined,
        undefined,
        state
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
          const { rounds: next } = strategy.generateAdditionalRounds(active, state.config, updatedRounds, 1, excl, undefined, state);
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
      const { rounds: extra } = strat.generateAdditionalRounds(actv, state.config, state.rounds, addCount, excl, undefined, state);
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
