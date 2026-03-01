import type { TournamentStrategy, ScheduleResult } from './types';
import type { Player, TournamentConfig, Round, Tournament } from '@padel/common';
import {
  generateClubFixtures,
  generateClubRound,
  clubValidateSetup,
  clubValidateWarnings,
  clubGetCompetitors,
  clubCalculateStandings,
  commonValidateScore,
} from './clubShared';

/**
 * Club Ranked: static schedule where pairs are matched by slot position.
 * Pair #1 from Club A plays Pair #1 from Club B, etc.
 */

export const clubRankedStrategy: TournamentStrategy = {
  isDynamic: false,
  hasFixedPartners: true,

  validateSetup: clubValidateSetup,
  validateWarnings: clubValidateWarnings,
  validateScore: commonValidateScore,
  getCompetitors: clubGetCompetitors,

  calculateStandings(tournament: Tournament) {
    return clubCalculateStandings(clubRankedStrategy, tournament);
  },

  generateSchedule(_players: Player[], config: TournamentConfig, tournament?: Tournament): ScheduleResult {
    const allTeams = tournament?.teams ?? [];
    const clubs = tournament?.clubs ?? [];
    const players = tournament?.players ?? [];

    if (clubs.length < 2 || allTeams.length < 2) {
      return { rounds: [], warnings: ['Not enough clubs or teams configured'] };
    }

    const unavailableIds = new Set(players.filter(p => p.unavailable).map(p => p.id));
    const activeTeams = allTeams.filter(t => !unavailableIds.has(t.player1Id) && !unavailableIds.has(t.player2Id));

    const numClubs = clubs.length;
    const defaultRounds = numClubs % 2 === 0 ? numClubs - 1 : numClubs;
    const totalRounds = config.maxRounds ?? defaultRounds;

    const clubFixtures = generateClubFixtures(clubs.map(c => c.id), totalRounds);

    const gamesPlayed = new Map<string, number>();
    const lastSitOutRound = new Map<string, number>();
    const opponentCounts = new Map<string, number>();
    activeTeams.forEach(t => { gamesPlayed.set(t.id, 0); lastSitOutRound.set(t.id, -Infinity); });

    const rounds: Round[] = [];
    for (let i = 0; i < totalRounds; i++) {
      const fixtureIdx = i % clubFixtures.length;
      rounds.push(generateClubRound(
        clubs, activeTeams, players, config,
        clubFixtures[fixtureIdx], i + 1,
        opponentCounts, gamesPlayed, lastSitOutRound,
        new Map(),
        'slots',
      ));
    }

    return { rounds, warnings: [] };
  },

  generateAdditionalRounds(
    _players: Player[],
    config: TournamentConfig,
    existingRounds: Round[],
    count: number,
    excludePlayerIds?: string[],
    _timeBudgetMs?: number,
    tournament?: Tournament,
  ): ScheduleResult {
    const allTeams = tournament?.teams ?? [];
    const clubs = tournament?.clubs ?? [];
    const players = tournament?.players ?? [];

    const excludeSet = new Set(excludePlayerIds ?? []);
    const activeTeams = excludeSet.size > 0
      ? allTeams.filter(t => !excludeSet.has(t.player1Id) && !excludeSet.has(t.player2Id))
      : allTeams;

    if (activeTeams.length < 2 || clubs.length < 2) {
      return { rounds: [], warnings: ['Not enough active teams'] };
    }

    const numClubs = clubs.length;
    const defaultTotal = numClubs % 2 === 0 ? numClubs - 1 : numClubs;
    const totalRounds = config.maxRounds ?? defaultTotal;
    const clubFixtures = generateClubFixtures(clubs.map(c => c.id), totalRounds);

    const gamesPlayed = new Map<string, number>();
    const lastSitOutRound = new Map<string, number>();
    const opponentCounts = new Map<string, number>();
    activeTeams.forEach(t => { gamesPlayed.set(t.id, 0); lastSitOutRound.set(t.id, -Infinity); });

    const rounds: Round[] = [];
    const startRound = existingRounds.length + 1;

    for (let i = 0; i < count; i++) {
      const roundNum = startRound + i;
      const fixtureIdx = (roundNum - 1) % clubFixtures.length;
      rounds.push(generateClubRound(
        clubs, activeTeams, players, config,
        clubFixtures[fixtureIdx], roundNum,
        opponentCounts, gamesPlayed, lastSitOutRound,
        new Map(),
        'slots',
      ));
    }

    return { rounds, warnings: [] };
  },
};
