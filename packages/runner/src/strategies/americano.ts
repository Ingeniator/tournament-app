import type { TournamentStrategy, ScheduleResult } from './types';
import type { Player, TournamentConfig, Round, Match } from '@padel/common';
import { generateId } from '@padel/common';
import { shuffle, partnerKey, commonValidateSetup, commonValidateScore, calculateIndividualStandings } from './shared';

function scoreGrouping(
  groups: string[][],
  partnerCounts: Map<string, number>,
  opponentCounts: Map<string, number>
): number {
  let total = 0;
  for (const group of groups) {
    const pairings = getPairingsForGroup(group);
    const minScore = Math.min(
      ...pairings.map(([p1, p2]) => {
        const partnerScore =
          (partnerCounts.get(partnerKey(p1[0], p1[1])) ?? 0) +
          (partnerCounts.get(partnerKey(p2[0], p2[1])) ?? 0);
        const opponentScore =
          (opponentCounts.get(partnerKey(p1[0], p2[0])) ?? 0) +
          (opponentCounts.get(partnerKey(p1[0], p2[1])) ?? 0) +
          (opponentCounts.get(partnerKey(p1[1], p2[0])) ?? 0) +
          (opponentCounts.get(partnerKey(p1[1], p2[1])) ?? 0);
        return partnerScore * 2 + opponentScore;
      })
    );
    total += minScore;
  }
  return total;
}

type Pairing = [[string, string], [string, string]];

function getPairingsForGroup(group: string[]): Pairing[] {
  const [a, b, c, d] = group;
  return [
    [[a, b], [c, d]],
    [[a, c], [b, d]],
    [[a, d], [b, c]],
  ];
}

function bestPairingForGroup(
  group: string[],
  partnerCounts: Map<string, number>,
  opponentCounts: Map<string, number>
): Pairing {
  const pairings = getPairingsForGroup(group);
  let best = pairings[0];
  let bestScore = Infinity;
  for (const pairing of pairings) {
    const [p1, p2] = pairing;
    const partnerScore =
      (partnerCounts.get(partnerKey(p1[0], p1[1])) ?? 0) +
      (partnerCounts.get(partnerKey(p2[0], p2[1])) ?? 0);
    const opponentScore =
      (opponentCounts.get(partnerKey(p1[0], p2[0])) ?? 0) +
      (opponentCounts.get(partnerKey(p1[0], p2[1])) ?? 0) +
      (opponentCounts.get(partnerKey(p1[1], p2[0])) ?? 0) +
      (opponentCounts.get(partnerKey(p1[1], p2[1])) ?? 0);
    const score = partnerScore * 2 + opponentScore;
    if (score < bestScore) {
      bestScore = score;
      best = pairing;
    }
  }
  return best;
}

/** Seed partner counts, opponent counts, and games played from existing rounds */
function seedFromRounds(
  existingRounds: Round[],
  players: Player[]
): { partnerCounts: Map<string, number>; opponentCounts: Map<string, number>; gamesPlayed: Map<string, number> } {
  const partnerCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();
  const gamesPlayed = new Map<string, number>();
  players.forEach(p => gamesPlayed.set(p.id, 0));

  for (const round of existingRounds) {
    for (const match of round.matches) {
      const k1 = partnerKey(match.team1[0], match.team1[1]);
      const k2 = partnerKey(match.team2[0], match.team2[1]);
      partnerCounts.set(k1, (partnerCounts.get(k1) ?? 0) + 1);
      partnerCounts.set(k2, (partnerCounts.get(k2) ?? 0) + 1);
      for (const a of match.team1) {
        for (const b of match.team2) {
          const ok = partnerKey(a, b);
          opponentCounts.set(ok, (opponentCounts.get(ok) ?? 0) + 1);
        }
      }
      for (const pid of [...match.team1, ...match.team2]) {
        gamesPlayed.set(pid, (gamesPlayed.get(pid) ?? 0) + 1);
      }
    }
  }

  return { partnerCounts, opponentCounts, gamesPlayed };
}

/** Generate `count` rounds starting from `startRoundNumber`, using existing history for balance */
function generateRounds(
  players: Player[],
  config: TournamentConfig,
  count: number,
  startRoundNumber: number,
  partnerCounts: Map<string, number>,
  opponentCounts: Map<string, number>,
  gamesPlayed: Map<string, number>
): { rounds: Round[]; warnings: string[] } {
  const warnings: string[] = [];
  const n = players.length;
  const numCourts = Math.min(config.courts.length, Math.floor(n / 4));
  const playersPerRound = numCourts * 4;
  const sitOutCount = n - playersPerRound;
  const maxAttempts = numCourts <= 2 ? 250 : numCourts <= 4 ? 6000 : 20000;

  if (sitOutCount > 0 && startRoundNumber === 1) {
    warnings.push(`${sitOutCount} player(s) will sit out each round`);
  }

  const rounds: Round[] = [];

  for (let r = 0; r < count; r++) {
    // Select sit-outs: players with most games sit out first, randomize ties
    const sorted = shuffle([...players]).sort(
      (a, b) => (gamesPlayed.get(b.id) ?? 0) - (gamesPlayed.get(a.id) ?? 0)
    );
    const sitOutPlayers = sorted.slice(0, sitOutCount);
    const sitOutIds = new Set(sitOutPlayers.map(p => p.id));
    const activePlayers = players.filter(p => !sitOutIds.has(p.id));

    // Greedy: try many shuffles, pick best partition
    let bestGroups: string[][] = [];
    let bestScore = Infinity;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const shuffled = shuffle(activePlayers.map(p => p.id));
      const groups: string[][] = [];
      for (let i = 0; i < numCourts; i++) {
        groups.push(shuffled.slice(i * 4, i * 4 + 4));
      }
      const score = scoreGrouping(groups, partnerCounts, opponentCounts);
      if (score < bestScore) {
        bestScore = score;
        bestGroups = groups;
        if (score === 0) break;
      }
    }

    // Create matches from best groups
    const matches: Match[] = bestGroups.map((group, idx) => {
      const pairing = bestPairingForGroup(group, partnerCounts, opponentCounts);
      const [team1, team2] = pairing;
      return {
        id: generateId(),
        courtId: config.courts[idx].id,
        team1: team1 as [string, string],
        team2: team2 as [string, string],
        score: null,
      };
    });

    // Update partner counts, opponent counts, and games played
    for (const match of matches) {
      const k1 = partnerKey(match.team1[0], match.team1[1]);
      const k2 = partnerKey(match.team2[0], match.team2[1]);
      partnerCounts.set(k1, (partnerCounts.get(k1) ?? 0) + 1);
      partnerCounts.set(k2, (partnerCounts.get(k2) ?? 0) + 1);
      for (const a of match.team1) {
        for (const b of match.team2) {
          const ok = partnerKey(a, b);
          opponentCounts.set(ok, (opponentCounts.get(ok) ?? 0) + 1);
        }
      }
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

export const americanoStrategy: TournamentStrategy = {
  isDynamic: false,
  validateSetup: commonValidateSetup,
  validateScore: commonValidateScore,
  calculateStandings: calculateIndividualStandings,

  generateSchedule(players: Player[], config: TournamentConfig): ScheduleResult {
    const totalRounds = config.maxRounds ?? players.length - 1;
    const gamesPlayed = new Map<string, number>();
    players.forEach(p => gamesPlayed.set(p.id, 0));
    return generateRounds(players, config, totalRounds, 1, new Map(), new Map(), gamesPlayed);
  },

  generateAdditionalRounds(players: Player[], config: TournamentConfig, existingRounds: Round[], count: number, excludePlayerIds?: string[]): ScheduleResult {
    const activePlayers = excludePlayerIds?.length
      ? players.filter(p => !excludePlayerIds.includes(p.id))
      : players;
    const { partnerCounts, opponentCounts, gamesPlayed } = seedFromRounds(existingRounds, activePlayers);
    const startRoundNumber = existingRounds.length + 1;
    return generateRounds(activePlayers, config, count, startRoundNumber, partnerCounts, opponentCounts, gamesPlayed);
  },
};
