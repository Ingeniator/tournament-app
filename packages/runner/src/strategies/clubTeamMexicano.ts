import type { TournamentStrategy, ScheduleResult } from './types';
import type { Player, TournamentConfig, Round, Tournament } from '@padel/common';
import { seedTeamsFromRounds } from './shared';
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
 * Club Team Mexicano: dynamic schedule where pairs from opposing clubs
 * are matched by standings — best vs best after each round.
 */

export const clubTeamMexicanoStrategy: TournamentStrategy = {
  isDynamic: true,
  hasFixedPartners: true,

  validateSetup: clubValidateSetup,
  validateWarnings: clubValidateWarnings,
  validateScore: commonValidateScore,
  getCompetitors: clubGetCompetitors,

  calculateStandings(tournament: Tournament) {
    return clubCalculateStandings(clubTeamMexicanoStrategy, tournament);
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

    // Dynamic: generate first round only — no standings data yet
    const round = generateClubRound(
      clubs, activeTeams, players, config,
      clubFixtures[0], 1,
      opponentCounts, gamesPlayed, lastSitOutRound,
      new Map(),
      'standings',
    );

    return { rounds: [round], warnings: [] };
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

    // Seed tracking from existing rounds — standings drive pair matching
    const { opponentCounts, gamesPlayed, lastSitOutRound, teamPoints } = seedTeamsFromRounds(
      existingRounds, allTeams, activeTeams, { trackPoints: true },
    );

    const numClubs = clubs.length;
    const defaultTotal = numClubs % 2 === 0 ? numClubs - 1 : numClubs;
    const totalRounds = config.maxRounds ?? defaultTotal;
    const clubFixtures = generateClubFixtures(clubs.map(c => c.id), totalRounds);

    const rounds: Round[] = [];
    const startRound = existingRounds.length + 1;

    for (let i = 0; i < count; i++) {
      const roundNum = startRound + i;
      const fixtureIdx = (roundNum - 1) % clubFixtures.length;
      rounds.push(generateClubRound(
        clubs, activeTeams, players, config,
        clubFixtures[fixtureIdx], roundNum,
        opponentCounts, gamesPlayed, lastSitOutRound,
        teamPoints,
        'standings',
      ));
    }

    return { rounds, warnings: [] };
  },
};
