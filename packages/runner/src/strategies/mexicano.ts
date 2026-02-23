import type { TournamentStrategy, ScheduleResult } from './types';
import type { Player, TournamentConfig, Round, Match, Tournament } from '@padel/common';
import { generateId } from '@padel/common';
import { shuffle, partnerKey, commonValidateSetup, commonValidateScore, calculateIndividualStandings, calculateCompetitorStandings, seedFromRounds, selectSitOuts } from './shared';

/**
 * Generate rounds using Mexicano rules:
 * - Round 1: random grouping
 * - Subsequent rounds: group by standings rank, 1st+4th vs 2nd+3rd within each group
 */
function generateMexicanoRounds(
  players: Player[],
  config: TournamentConfig,
  existingRounds: Round[],
  count: number,
  excludePlayerIds?: string[]
): ScheduleResult {
  const warnings: string[] = [];
  const activePlayers = excludePlayerIds?.length
    ? players.filter(p => !excludePlayerIds.includes(p.id))
    : players;

  const n = activePlayers.length;
  const availableCourts = config.courts.filter(c => !c.unavailable);
  const numCourts = Math.min(availableCourts.length, Math.floor(n / 4));

  if (numCourts === 0) {
    return { rounds: [], warnings: ['Not enough players for a match (need at least 4)'] };
  }

  const playersPerRound = numCourts * 4;
  const sitOutCount = n - playersPerRound;
  const { gamesPlayed, partnerCounts } = seedFromRounds(existingRounds, activePlayers);

  if (sitOutCount > 0 && existingRounds.length === 0) {
    warnings.push(`${sitOutCount} player(s) will sit out each round`);
  }

  const rounds: Round[] = [];
  const startRoundNumber = existingRounds.length + 1;

  for (let r = 0; r < count; r++) {
    const { sitOutIds } = selectSitOuts(activePlayers, sitOutCount, gamesPlayed);
    const roundPlayers = activePlayers.filter(p => !sitOutIds.has(p.id));

    let groups: string[][];

    if (existingRounds.length + r === 0) {
      // Round 1: random grouping with basic partner-repeat avoidance
      const shuffled = shuffle(roundPlayers.map(p => p.id));
      groups = [];
      for (let i = 0; i < numCourts; i++) {
        groups.push(shuffled.slice(i * 4, i * 4 + 4));
      }
    } else {
      // Subsequent rounds: group by standings
      // Build a temporary tournament to calculate standings
      const allRoundsForStandings = [...existingRounds, ...rounds];
      const standings = calculateIndividualStandings({
        players: activePlayers,
        rounds: allRoundsForStandings,
      } as Parameters<typeof calculateIndividualStandings>[0]);

      // Order active round players by their standings rank
      // Use rank (shared for ties) instead of array index, and pre-shuffle
      // so tied players (e.g. after a draw) get randomized groupings
      const rankMap = new Map(standings.map(s => [s.playerId, s.rank]));
      const ranked = shuffle([...roundPlayers]).sort(
        (a, b) => (rankMap.get(a.id) ?? 999) - (rankMap.get(b.id) ?? 999)
      );

      // Group in chunks of 4 by rank
      groups = [];
      for (let i = 0; i < numCourts; i++) {
        groups.push(ranked.slice(i * 4, i * 4 + 4).map(p => p.id));
      }
    }

    // Create matches: within each group, 1st+4th vs 2nd+3rd (Mexicano pairing)
    // For round 1 (random), pick best pairing to minimize partner repeats
    const matches: Match[] = groups.map((group, idx) => {
      let team1: [string, string];
      let team2: [string, string];

      if (existingRounds.length + r === 0) {
        // Round 1: pick pairing with fewest partner repeats
        const pairings: [[string, string], [string, string]][] = [
          [[group[0], group[3]], [group[1], group[2]]],
          [[group[0], group[2]], [group[1], group[3]]],
          [[group[0], group[1]], [group[2], group[3]]],
        ];
        let bestPairing = pairings[0];
        let bestScore = Infinity;
        for (const p of pairings) {
          const score =
            (partnerCounts.get(partnerKey(p[0][0], p[0][1])) ?? 0) +
            (partnerCounts.get(partnerKey(p[1][0], p[1][1])) ?? 0);
          if (score < bestScore) {
            bestScore = score;
            bestPairing = p;
          }
        }
        [team1, team2] = bestPairing;
      } else {
        // Mexicano rule: 1st+4th vs 2nd+3rd
        team1 = [group[0], group[3]];
        team2 = [group[1], group[2]];
      }

      return {
        id: generateId(),
        courtId: availableCourts[idx].id,
        team1,
        team2,
        score: null,
      };
    });

    // Update tracking
    for (const match of matches) {
      const k1 = partnerKey(match.team1[0], match.team1[1]);
      const k2 = partnerKey(match.team2[0], match.team2[1]);
      partnerCounts.set(k1, (partnerCounts.get(k1) ?? 0) + 1);
      partnerCounts.set(k2, (partnerCounts.get(k2) ?? 0) + 1);
      for (const pid of [...match.team1, ...match.team2]) {
        gamesPlayed.set(pid, (gamesPlayed.get(pid) ?? 0) + 1);
      }
    }

    rounds.push({
      id: generateId(),
      roundNumber: startRoundNumber + r,
      matches,
      sitOuts: [...sitOutIds],
    });
  }

  return { rounds, warnings };
}

export const mexicanoStrategy: TournamentStrategy = {
  isDynamic: true,
  hasFixedPartners: false,
  validateSetup: commonValidateSetup,
  validateScore: commonValidateScore,
  calculateStandings(tournament: Tournament) {
    const competitors = mexicanoStrategy.getCompetitors(tournament);
    return calculateCompetitorStandings(tournament, competitors, (side) =>
      side.map(pid => competitors.find(c => c.id === pid)!).filter(Boolean)
    );
  },

  getCompetitors(tournament: Tournament) {
    return tournament.players
      .filter(p => !p.unavailable)
      .map(p => ({ id: p.id, name: p.name, playerIds: [p.id] }));
  },

  generateSchedule(players: Player[], config: TournamentConfig): ScheduleResult {
    // Mexicano: only generate 1 round initially (random)
    return generateMexicanoRounds(players, config, [], 1);
  },

  generateAdditionalRounds(players: Player[], config: TournamentConfig, existingRounds: Round[], count: number, excludePlayerIds?: string[]): ScheduleResult {
    return generateMexicanoRounds(players, config, existingRounds, count, excludePlayerIds);
  },
};
