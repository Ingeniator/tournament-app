import type { TournamentStrategy, ScheduleResult } from './types';
import type { Player, TournamentConfig, Round, Match, Tournament, Club } from '@padel/common';
import { generateId } from '@padel/common';
import { shuffle, partnerKey, commonValidateScore, seedFromRounds, calculateCompetitorStandings, scoreSchedule } from './shared';
import { generateClubFixtures, clubValidateSetup, clubValidateWarnings } from './clubShared';

/**
 * Club Americano: random partners within club, random opponents from other clubs.
 * Individual standings (pairs rotate each round). Static schedule.
 *
 * Each round: clubs are paired via round-robin fixtures. Within each fixture,
 * players from both clubs are randomly grouped into courts of 4 (2 from each club),
 * then within each court the best pairing is chosen to minimize partner repeats.
 */

/**
 * Score a candidate pairing within a court of 4.
 * Lower is better: penalize partner repeats heavily, opponent repeats quadratically.
 */
function scorePairing(
  p1: [string, string],
  p2: [string, string],
  partnerCounts: Map<string, number>,
  opponentCounts: Map<string, number>,
): number {
  const partnerScore =
    (partnerCounts.get(partnerKey(p1[0], p1[1])) ?? 0) +
    (partnerCounts.get(partnerKey(p2[0], p2[1])) ?? 0);
  const o1 = opponentCounts.get(partnerKey(p1[0], p2[0])) ?? 0;
  const o2 = opponentCounts.get(partnerKey(p1[0], p2[1])) ?? 0;
  const o3 = opponentCounts.get(partnerKey(p1[1], p2[0])) ?? 0;
  const o4 = opponentCounts.get(partnerKey(p1[1], p2[1])) ?? 0;
  return partnerScore * 100 + o1 * o1 + o2 * o2 + o3 * o3 + o4 * o4;
}

interface CourtAssignment {
  clubA: [string, string];
  clubB: [string, string];
}

/**
 * Given players from two clubs, create court assignments.
 * Each court has 2 players from club A and 2 from club B.
 */
function assignCourts(
  clubAPlayers: string[],
  clubBPlayers: string[],
  numCourts: number,
  partnerCounts: Map<string, number>,
  opponentCounts: Map<string, number>,
  gamesPlayed: Map<string, number>,
): { courts: CourtAssignment[]; sitOutA: string[]; sitOutB: string[] } {
  const playersPerClub = numCourts * 2;

  // Sort by games played (desc) so those who've played most sit out first
  const sortByGames = (ids: string[]) =>
    [...ids].sort((a, b) => (gamesPlayed.get(b) ?? 0) - (gamesPlayed.get(a) ?? 0));
  const sortedA = sortByGames(clubAPlayers);
  const sortedB = sortByGames(clubBPlayers);
  const sitOutA = sortedA.slice(0, sortedA.length - playersPerClub);
  const sitOutB = sortedB.slice(0, sortedB.length - playersPerClub);
  const activeA = sortedA.slice(sortedA.length - playersPerClub);
  const activeB = sortedB.slice(sortedB.length - playersPerClub);

  // Try multiple random arrangements and pick the best
  const maxAttempts = numCourts <= 2 ? 100 : 200;
  let bestCourts: CourtAssignment[] = [];
  let bestScore = Infinity;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shuffledA = shuffle(activeA);
    const shuffledB = shuffle(activeB);
    const courts: CourtAssignment[] = [];
    let totalScore = 0;

    for (let i = 0; i < numCourts; i++) {
      const a: [string, string] = [shuffledA[i * 2], shuffledA[i * 2 + 1]];
      const b: [string, string] = [shuffledB[i * 2], shuffledB[i * 2 + 1]];
      courts.push({ clubA: a, clubB: b });

      // Score: partner repeats (same-club pairs) + opponent balance
      totalScore += scorePairing(a, b, partnerCounts, opponentCounts);
    }

    if (totalScore < bestScore) {
      bestScore = totalScore;
      bestCourts = courts;
      if (totalScore === 0) break;
    }
  }

  return { courts: bestCourts, sitOutA, sitOutB };
}

function generateClubAmericanoRound(
  clubs: Club[],
  players: Player[],
  config: TournamentConfig,
  fixtures: [string, string][],
  roundNumber: number,
  partnerCounts: Map<string, number>,
  opponentCounts: Map<string, number>,
  gamesPlayed: Map<string, number>,
): Round {
  const availableCourts = config.courts.filter(c => !c.unavailable);
  const matches: Match[] = [];
  const sitOutPlayerIds: string[] = [];

  const playingClubIds = new Set(fixtures.flat());

  // Players from non-playing clubs sit out
  for (const club of clubs) {
    if (!playingClubIds.has(club.id)) {
      for (const p of players.filter(pp => pp.clubId === club.id)) {
        sitOutPlayerIds.push(p.id);
      }
    }
  }

  let courtIdx = 0;
  for (const [clubAId, clubBId] of fixtures) {
    const clubAPlayers = shuffle(players.filter(p => p.clubId === clubAId && !p.unavailable).map(p => p.id));
    const clubBPlayers = shuffle(players.filter(p => p.clubId === clubBId && !p.unavailable).map(p => p.id));

    // How many courts can this fixture use?
    const maxCourtsForFixture = Math.min(
      Math.floor(clubAPlayers.length / 2),
      Math.floor(clubBPlayers.length / 2),
      availableCourts.length - courtIdx,
    );

    if (maxCourtsForFixture <= 0) {
      for (const id of [...clubAPlayers, ...clubBPlayers]) {
        sitOutPlayerIds.push(id);
      }
      continue;
    }

    const { courts, sitOutA, sitOutB } = assignCourts(
      clubAPlayers, clubBPlayers, maxCourtsForFixture,
      partnerCounts, opponentCounts, gamesPlayed,
    );

    for (const court of courts) {
      if (courtIdx >= availableCourts.length) break;

      matches.push({
        id: generateId(),
        courtId: availableCourts[courtIdx].id,
        team1: court.clubA,
        team2: court.clubB,
        score: null,
      });

      // Update tracking
      const pk1 = partnerKey(court.clubA[0], court.clubA[1]);
      const pk2 = partnerKey(court.clubB[0], court.clubB[1]);
      partnerCounts.set(pk1, (partnerCounts.get(pk1) ?? 0) + 1);
      partnerCounts.set(pk2, (partnerCounts.get(pk2) ?? 0) + 1);
      for (const a of court.clubA) {
        for (const b of court.clubB) {
          const ok = partnerKey(a, b);
          opponentCounts.set(ok, (opponentCounts.get(ok) ?? 0) + 1);
        }
        gamesPlayed.set(a, (gamesPlayed.get(a) ?? 0) + 1);
      }
      for (const b of court.clubB) {
        gamesPlayed.set(b, (gamesPlayed.get(b) ?? 0) + 1);
      }

      courtIdx++;
    }

    for (const id of [...sitOutA, ...sitOutB]) {
      sitOutPlayerIds.push(id);
    }
  }

  return {
    id: generateId(),
    roundNumber,
    matches,
    sitOuts: sitOutPlayerIds,
  };
}

function isBetterScore(a: [number, number, number, number], b: [number, number, number, number]): boolean {
  for (let i = 0; i < 4; i++) {
    if (a[i] < b[i]) return true;
    if (a[i] > b[i]) return false;
  }
  return false;
}

export const clubAmericanoStrategy: TournamentStrategy = (() => {
  const strategy: TournamentStrategy = {
    isDynamic: false,
    hasFixedPartners: false,

    validateSetup: clubValidateSetup,
    validateWarnings: clubValidateWarnings,
    validateScore: commonValidateScore,

    getCompetitors(tournament: Tournament) {
      return tournament.players
        .filter(p => !p.unavailable)
        .map(p => ({ id: p.id, name: p.name, playerIds: [p.id] }));
    },

    calculateStandings(tournament: Tournament) {
      const competitors = strategy.getCompetitors(tournament);
      return calculateCompetitorStandings(tournament, competitors, (side) =>
        side.map(pid => competitors.find(c => c.id === pid)!).filter(Boolean),
      );
    },

    generateSchedule(_players: Player[], config: TournamentConfig, tournament?: Tournament): ScheduleResult {
      const clubs = tournament?.clubs ?? [];
      const players = tournament?.players ?? [];

      if (clubs.length < 2) {
        return { rounds: [], warnings: ['Not enough clubs configured'] };
      }

      const activePlayers = players.filter(p => !p.unavailable);
      const numClubs = clubs.length;
      const defaultRounds = numClubs % 2 === 0 ? numClubs - 1 : numClubs;
      const totalRounds = config.maxRounds ?? defaultRounds;

      const clubFixtures = generateClubFixtures(clubs.map(c => c.id), totalRounds);

      // Try multiple schedules, keep best
      let bestResult: ScheduleResult | null = null;
      let bestScore: [number, number, number, number] = [Infinity, Infinity, Infinity, Infinity];
      const attempts = 5;

      for (let attempt = 0; attempt < attempts; attempt++) {
        const partnerCounts = new Map<string, number>();
        const opponentCounts = new Map<string, number>();
        const gamesPlayed = new Map<string, number>();
        activePlayers.forEach(p => { gamesPlayed.set(p.id, 0); });

        const rounds: Round[] = [];
        for (let i = 0; i < totalRounds; i++) {
          const fixtureIdx = i % clubFixtures.length;
          rounds.push(generateClubAmericanoRound(
            clubs, activePlayers, config,
            clubFixtures[fixtureIdx], i + 1,
            partnerCounts, opponentCounts, gamesPlayed,
          ));
        }

        const result: ScheduleResult = { rounds, warnings: [] };
        const score = scoreSchedule(rounds);
        if (isBetterScore(score, bestScore)) {
          bestScore = score;
          bestResult = result;
        }
        if (bestScore[0] === 0 && bestScore[1] <= 1) break;
      }

      return bestResult!;
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
      const clubs = tournament?.clubs ?? [];
      const players = tournament?.players ?? [];

      const excludeSet = new Set(excludePlayerIds ?? []);
      const activePlayers = players.filter(p => !p.unavailable && !excludeSet.has(p.id));

      if (activePlayers.length < 4 || clubs.length < 2) {
        return { rounds: [], warnings: ['Not enough active players or clubs'] };
      }

      const { partnerCounts, opponentCounts, gamesPlayed } =
        seedFromRounds(existingRounds, activePlayers);

      const numClubs = clubs.length;
      const defaultTotal = numClubs % 2 === 0 ? numClubs - 1 : numClubs;
      const totalRounds = config.maxRounds ?? defaultTotal;
      const clubFixtures = generateClubFixtures(clubs.map(c => c.id), totalRounds);

      const startRound = existingRounds.length + 1;
      const rounds: Round[] = [];

      for (let i = 0; i < count; i++) {
        const roundNum = startRound + i;
        const fixtureIdx = (roundNum - 1) % clubFixtures.length;
        rounds.push(generateClubAmericanoRound(
          clubs, activePlayers, config,
          clubFixtures[fixtureIdx], roundNum,
          partnerCounts, opponentCounts, gamesPlayed,
        ));
      }

      return { rounds, warnings: [] };
    },
  };

  return strategy;
})();
