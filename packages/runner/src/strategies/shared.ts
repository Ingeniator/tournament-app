import type { Player, Round, TournamentConfig, Tournament, StandingsEntry, MatchScore, Competitor, Team } from '@padel/common';

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function partnerKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function commonValidateSetup(players: Player[], config: TournamentConfig): string[] {
  const errors: string[] = [];
  if (players.length < 4) {
    errors.push('At least 4 players are required');
  }
  const availableCourts = config.courts.filter(c => !c.unavailable);
  if (availableCourts.length === 0) {
    errors.push('At least 1 court is required');
  }
  if (config.pointsPerMatch < 1) {
    errors.push('Points per match must be at least 1');
  }
  const maxCourts = Math.floor(players.length / 4);
  if (availableCourts.length > maxCourts && players.length >= 4) {
    errors.push(`Too many courts: ${players.length} players need at most ${maxCourts} court(s)`);
  }
  return errors;
}

export function commonValidateScore(score: MatchScore, config: TournamentConfig): string | null {
  if (score.team1Points + score.team2Points !== config.pointsPerMatch) {
    return `Total points must equal ${config.pointsPerMatch}`;
  }
  if (score.team1Points < 0 || score.team2Points < 0) {
    return 'Points cannot be negative';
  }
  return null;
}

export interface RoundSeed {
  partnerCounts: Map<string, number>;
  opponentCounts: Map<string, number>;
  gamesPlayed: Map<string, number>;
  courtCounts: Map<string, number>;
  courtMates: Set<string>;
  lastSitOutRound: Map<string, number>;
}

/** Seed tracking maps from existing rounds for schedule generation */
export function seedFromRounds(existingRounds: Round[], players: Player[]): RoundSeed {
  const partnerCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();
  const gamesPlayed = new Map<string, number>();
  const courtCounts = new Map<string, number>();
  const courtMates = new Set<string>();
  const lastSitOutRound = new Map<string, number>();
  players.forEach(p => { gamesPlayed.set(p.id, 0); lastSitOutRound.set(p.id, -Infinity); });

  for (const round of existingRounds) {
    for (const id of round.sitOuts) {
      lastSitOutRound.set(id, round.roundNumber);
    }
    for (const match of round.matches) {
      const k1 = partnerKey(match.team1[0], match.team1[1]);
      const k2 = partnerKey(match.team2[0], match.team2[1]);
      partnerCounts.set(k1, (partnerCounts.get(k1) ?? 0) + 1);
      partnerCounts.set(k2, (partnerCounts.get(k2) ?? 0) + 1);
      courtMates.add(k1);
      courtMates.add(k2);
      for (const a of match.team1) {
        for (const b of match.team2) {
          const ok = partnerKey(a, b);
          opponentCounts.set(ok, (opponentCounts.get(ok) ?? 0) + 1);
          courtMates.add(ok);
        }
      }
      for (const pid of [...match.team1, ...match.team2]) {
        gamesPlayed.set(pid, (gamesPlayed.get(pid) ?? 0) + 1);
        const ck = `${pid}:${match.courtId}`;
        courtCounts.set(ck, (courtCounts.get(ck) ?? 0) + 1);
      }
    }
  }

  return { partnerCounts, opponentCounts, gamesPlayed, courtCounts, courtMates, lastSitOutRound };
}

/** Select sit-out players: those with most games first, tiebreak by longest since last sit-out */
export function selectSitOuts(
  players: Player[],
  sitOutCount: number,
  gamesPlayed: Map<string, number>,
  lastSitOutRound?: Map<string, number>,
): { sitOutIds: Set<string>; activeIds: string[] } {
  if (sitOutCount <= 0) {
    return { sitOutIds: new Set(), activeIds: players.map(p => p.id) };
  }
  const sorted = shuffle([...players]).sort((a, b) => {
    const gamesDiff = (gamesPlayed.get(b.id) ?? 0) - (gamesPlayed.get(a.id) ?? 0);
    if (gamesDiff !== 0) return gamesDiff;
    if (lastSitOutRound) {
      return (lastSitOutRound.get(a.id) ?? -Infinity) - (lastSitOutRound.get(b.id) ?? -Infinity);
    }
    return 0;
  });
  const sitOutIds = new Set(sorted.slice(0, sitOutCount).map(p => p.id));
  const activeIds = players.filter(p => !sitOutIds.has(p.id)).map(p => p.id);
  return { sitOutIds, activeIds };
}

export function calculateIndividualStandings(tournament: Tournament): StandingsEntry[] {
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
}

/**
 * Unified standings calculation for any competitor type (individual or team).
 * `mapSideToCompetitors` maps a match side ([playerId, playerId]) to the Competitor(s) on that side.
 * For individual formats, returns 2 competitors (one per player).
 * For team formats, returns 1 competitor (the team).
 */
export function calculateCompetitorStandings(
  tournament: Tournament,
  competitors: Competitor[],
  mapSideToCompetitors: (side: [string, string]) => Competitor[],
): StandingsEntry[] {
  const stats = new Map<string, {
    totalPoints: number;
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    matchesDraw: number;
    pointsFor: number;
    pointsAgainst: number;
  }>();

  for (const c of competitors) {
    stats.set(c.id, {
      totalPoints: 0, matchesPlayed: 0, matchesWon: 0,
      matchesLost: 0, matchesDraw: 0, pointsFor: 0, pointsAgainst: 0,
    });
  }

  // Build a set of all competitor playerIds for sit-out detection
  const competitorByPlayerId = new Map<string, Competitor>();
  for (const c of competitors) {
    for (const pid of c.playerIds) {
      competitorByPlayerId.set(pid, c);
    }
  }

  for (const round of tournament.rounds) {
    const scoredMatches = round.matches.filter(m => m.score !== null);
    let roundTotalPoints = 0;
    let roundCompetitorsScored = 0;

    for (const match of scoredMatches) {
      const score = match.score!;
      const side1Competitors = mapSideToCompetitors(match.team1);
      const side2Competitors = mapSideToCompetitors(match.team2);

      for (const c of side1Competitors) {
        const s = stats.get(c.id);
        if (!s) continue;
        s.totalPoints += score.team1Points;
        s.pointsFor += score.team1Points;
        s.pointsAgainst += score.team2Points;
        s.matchesPlayed += 1;
        if (score.team1Points > score.team2Points) s.matchesWon += 1;
        else if (score.team1Points < score.team2Points) s.matchesLost += 1;
        else s.matchesDraw += 1;
      }
      for (const c of side2Competitors) {
        const s = stats.get(c.id);
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
      roundCompetitorsScored += side1Competitors.length + side2Competitors.length;
    }

    // Sit-out compensation
    if (roundCompetitorsScored > 0 && round.sitOuts.length > 0) {
      const avgPoints = roundTotalPoints / roundCompetitorsScored;
      const compensated = new Set<string>();
      for (const pid of round.sitOuts) {
        const c = competitorByPlayerId.get(pid);
        if (c && !compensated.has(c.id)) {
          const s = stats.get(c.id);
          if (s) {
            s.totalPoints += Math.round(avgPoints);
            compensated.add(c.id);
          }
        }
      }
    }
  }

  const entries: StandingsEntry[] = competitors.map(c => {
    const s = stats.get(c.id)!;
    return {
      playerId: c.id,
      playerName: c.name,
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
}

/** Find a team that contains both players of a match side */
export function findTeamByPair(teams: Team[], pair: [string, string]): Team | undefined {
  return teams.find(t =>
    (t.player1Id === pair[0] && t.player2Id === pair[1]) ||
    (t.player1Id === pair[1] && t.player2Id === pair[0])
  );
}

/** Select which teams sit out: those with most games, tiebreak by recency */
export function selectTeamSitOuts(
  teams: Team[],
  sitOutCount: number,
  gamesPlayed: Map<string, number>,
  lastSitOutRound: Map<string, number>,
): { sitOutTeams: Set<string>; activeTeams: Team[] } {
  if (sitOutCount <= 0) {
    return { sitOutTeams: new Set(), activeTeams: [...teams] };
  }
  const sortedForSitOut = shuffle([...teams]).sort((a, b) => {
    const gamesDiff = (gamesPlayed.get(b.id) ?? 0) - (gamesPlayed.get(a.id) ?? 0);
    if (gamesDiff !== 0) return gamesDiff;
    return (lastSitOutRound.get(a.id) ?? -Infinity) - (lastSitOutRound.get(b.id) ?? -Infinity);
  });
  const sitOutTeams = new Set(sortedForSitOut.slice(0, sitOutCount).map(t => t.id));
  const activeTeams = teams.filter(t => !sitOutTeams.has(t.id));
  return { sitOutTeams, activeTeams };
}

/** Score a schedule by [partner repeats, opponent spread, never played, court spread] */
export function scoreSchedule(rounds: Round[], seedPartnerCounts?: Map<string, number>): [number, number, number, number] {
  const pc = new Map<string, number>(seedPartnerCounts);
  const oc = new Map<string, number>();
  const cc = new Map<string, number>();
  const courtIds = new Set<string>();
  const playerIds = new Set<string>();
  for (const round of rounds) {
    for (const match of round.matches) {
      const k1 = partnerKey(match.team1[0], match.team1[1]);
      const k2 = partnerKey(match.team2[0], match.team2[1]);
      pc.set(k1, (pc.get(k1) ?? 0) + 1);
      pc.set(k2, (pc.get(k2) ?? 0) + 1);
      for (const a of match.team1) {
        for (const b of match.team2) {
          const ok = partnerKey(a, b);
          oc.set(ok, (oc.get(ok) ?? 0) + 1);
        }
      }
      courtIds.add(match.courtId);
      for (const pid of [...match.team1, ...match.team2]) {
        playerIds.add(pid);
        const ck = `${pid}:${match.courtId}`;
        cc.set(ck, (cc.get(ck) ?? 0) + 1);
      }
    }
    for (const pid of round.sitOuts) playerIds.add(pid);
  }
  let repeats = 0;
  for (const c of pc.values()) if (c > 1) repeats += c - 1;

  const totalPairs = playerIds.size * (playerIds.size - 1) / 2;

  let min = Infinity;
  let max = -Infinity;
  for (const c of oc.values()) {
    if (c < min) min = c;
    if (c > max) max = c;
  }
  if (oc.size < totalPairs && oc.size > 0) {
    min = 0;
  }
  const spread = max === -Infinity ? 0 : max - min;

  const courtMates = new Set<string>([...pc.keys(), ...oc.keys()]);
  const neverPlayed = totalPairs - courtMates.size;

  let courtSpread = 0;
  if (courtIds.size > 1) {
    for (const courtId of courtIds) {
      let cMin = Infinity, cMax = -Infinity;
      for (const pid of playerIds) {
        const cnt = cc.get(`${pid}:${courtId}`) ?? 0;
        if (cnt < cMin) cMin = cnt;
        if (cnt > cMax) cMax = cnt;
      }
      if (cMax - cMin > courtSpread) courtSpread = cMax - cMin;
    }
  }

  return [repeats, spread, neverPlayed, courtSpread];
}
