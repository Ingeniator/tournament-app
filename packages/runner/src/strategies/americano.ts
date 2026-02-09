import type { TournamentStrategy, ScheduleResult } from './types';
import type { Player, TournamentConfig, Round, Match, Tournament, StandingsEntry, MatchScore } from '@padel/common';
import { generateId } from '@padel/common';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function partnerKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

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
  const maxAttempts = Math.min(500 * numCourts * numCourts, 5000);

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
  validateSetup(players: Player[], config: TournamentConfig): string[] {
    const errors: string[] = [];
    if (players.length < 4) {
      errors.push('At least 4 players are required');
    }
    if (config.courts.length === 0) {
      errors.push('At least 1 court is required');
    }
    if (config.pointsPerMatch < 1) {
      errors.push('Points per match must be at least 1');
    }
    const maxCourts = Math.floor(players.length / 4);
    if (config.courts.length > maxCourts && players.length >= 4) {
      errors.push(`Too many courts: ${players.length} players need at most ${maxCourts} court(s)`);
    }
    return errors;
  },

  validateScore(score: MatchScore, config: TournamentConfig): string | null {
    if (score.team1Points + score.team2Points !== config.pointsPerMatch) {
      return `Total points must equal ${config.pointsPerMatch}`;
    }
    if (score.team1Points < 0 || score.team2Points < 0) {
      return 'Points cannot be negative';
    }
    return null;
  },

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

  calculateStandings(tournament: Tournament): StandingsEntry[] {
    const { players, rounds } = tournament;
    const stats = new Map<string, {
      totalPoints: number;
      matchesPlayed: number;
      matchesWon: number;
      matchesLost: number;
      matchesDraw: number;
      pointsFor: number;
      pointsAgainst: number;
    }>();

    players.forEach(p => stats.set(p.id, {
      totalPoints: 0, matchesPlayed: 0, matchesWon: 0,
      matchesLost: 0, matchesDraw: 0, pointsFor: 0, pointsAgainst: 0,
    }));

    for (const round of rounds) {
      const scoredMatches = round.matches.filter(m => m.score !== null);
      let roundTotalPoints = 0;
      let roundPlayersScored = 0;

      for (const match of scoredMatches) {
        const score = match.score!;
        for (const pid of match.team1) {
          const s = stats.get(pid);
          if (!s) continue;
          s.totalPoints += score.team1Points;
          s.pointsFor += score.team1Points;
          s.pointsAgainst += score.team2Points;
          s.matchesPlayed += 1;
          if (score.team1Points > score.team2Points) s.matchesWon += 1;
          else if (score.team1Points < score.team2Points) s.matchesLost += 1;
          else s.matchesDraw += 1;
        }
        for (const pid of match.team2) {
          const s = stats.get(pid);
          if (!s) continue;
          s.totalPoints += score.team2Points;
          s.pointsFor += score.team2Points;
          s.pointsAgainst += score.team1Points;
          s.matchesPlayed += 1;
          if (score.team2Points > score.team1Points) s.matchesWon += 1;
          else if (score.team2Points < score.team1Points) s.matchesLost += 1;
          else s.matchesDraw += 1;
        }
        roundTotalPoints += score.team1Points + score.team2Points;
        roundPlayersScored += 4;
      }

      if (roundPlayersScored > 0 && round.sitOuts.length > 0) {
        const avgPoints = roundTotalPoints / roundPlayersScored;
        for (const pid of round.sitOuts) {
          const s = stats.get(pid);
          if (!s) continue;
          s.totalPoints += Math.round(avgPoints);
        }
      }
    }

    const nameMap = new Map(players.map(p => [p.id, p.name]));
    const entries: StandingsEntry[] = players.map(p => {
      const s = stats.get(p.id)!;
      return {
        playerId: p.id,
        playerName: nameMap.get(p.id) ?? '',
        totalPoints: s.totalPoints,
        matchesPlayed: s.matchesPlayed,
        matchesWon: s.matchesWon,
        matchesLost: s.matchesLost,
        matchesDraw: s.matchesDraw,
        pointDiff: s.pointsFor - s.pointsAgainst,
        rank: 0,
      };
    });

    entries.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
      if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
      return a.playerName.localeCompare(b.playerName);
    });

    entries.forEach((entry, i) => {
      if (i === 0) {
        entry.rank = 1;
      } else {
        const prev = entries[i - 1];
        if (
          entry.totalPoints === prev.totalPoints &&
          entry.pointDiff === prev.pointDiff &&
          entry.matchesWon === prev.matchesWon
        ) {
          entry.rank = prev.rank;
        } else {
          entry.rank = i + 1;
        }
      }
    });

    return entries;
  },
};
