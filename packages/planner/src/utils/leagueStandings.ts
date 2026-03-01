import type { Tournament, LeagueRankingRules, LeagueStandingEntry } from '@padel/common';

interface PlayerAccum {
  playerName: string;
  wins: number;
  draws: number;
  losses: number;
  gamesWon: number;
  gamesLost: number;
}

export function computeLeagueStandings(
  tournaments: Tournament[],
  rules: LeagueRankingRules,
): LeagueStandingEntry[] {
  const playerMap = new Map<string, PlayerAccum>();

  for (const tournament of tournaments) {
    const nameById = new Map<string, string>();
    for (const p of tournament.players) {
      nameById.set(p.id, p.name);
    }

    for (const round of tournament.rounds) {
      for (const match of round.matches) {
        if (!match.score) continue;
        const { team1Points, team2Points } = match.score;

        const team1Won = team1Points > team2Points;
        const team2Won = team2Points > team1Points;
        const isDraw = team1Points === team2Points;

        // Process team1 players
        for (const pid of match.team1) {
          const name = nameById.get(pid) ?? pid;
          let acc = playerMap.get(name);
          if (!acc) {
            acc = { playerName: name, wins: 0, draws: 0, losses: 0, gamesWon: 0, gamesLost: 0 };
            playerMap.set(name, acc);
          }
          acc.gamesWon += team1Points;
          acc.gamesLost += team2Points;
          if (team1Won) acc.wins++;
          else if (isDraw) acc.draws++;
          else acc.losses++;
        }

        // Process team2 players
        for (const pid of match.team2) {
          const name = nameById.get(pid) ?? pid;
          let acc = playerMap.get(name);
          if (!acc) {
            acc = { playerName: name, wins: 0, draws: 0, losses: 0, gamesWon: 0, gamesLost: 0 };
            playerMap.set(name, acc);
          }
          acc.gamesWon += team2Points;
          acc.gamesLost += team1Points;
          if (team2Won) acc.wins++;
          else if (isDraw) acc.draws++;
          else acc.losses++;
        }
      }
    }
  }

  const entries: LeagueStandingEntry[] = Array.from(playerMap.values()).map(acc => {
    const points =
      acc.wins * rules.pointsPerWin +
      acc.draws * rules.pointsPerDraw +
      acc.losses * rules.pointsPerLoss;
    return {
      playerName: acc.playerName,
      wins: acc.wins,
      draws: acc.draws,
      losses: acc.losses,
      points,
      gamesWon: acc.gamesWon,
      gamesLost: acc.gamesLost,
      pointDifference: acc.gamesWon - acc.gamesLost,
      matchesPlayed: acc.wins + acc.draws + acc.losses,
      rank: 0,
    };
  });

  // Sort by points descending, then by tiebreaker
  entries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    switch (rules.tiebreaker) {
      case 'pointDifference':
        return b.pointDifference - a.pointDifference;
      case 'gamesWon':
        return b.gamesWon - a.gamesWon;
      case 'headToHead':
        // Fall back to point difference when head-to-head is not computable in aggregate
        return b.pointDifference - a.pointDifference;
    }
  });

  // Assign ranks (tied players share the same rank)
  for (let i = 0; i < entries.length; i++) {
    if (i === 0) {
      entries[i].rank = 1;
    } else {
      const prev = entries[i - 1];
      const curr = entries[i];
      entries[i].rank =
        curr.points === prev.points && curr.pointDifference === prev.pointDifference
          ? prev.rank
          : i + 1;
    }
  }

  return entries;
}
