import type { Player, TournamentConfig, Tournament, StandingsEntry, MatchScore } from '@padel/common';

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
