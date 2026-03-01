import type { Tournament, EventRankingRules, EventStandingEntry, EventTournamentLink } from '@padel/common';

interface PlayerAccum {
  playerName: string;
  wins: number;
  draws: number;
  losses: number;
  gamesWon: number;
  gamesLost: number;
  weightedPoints: number;
}

export function computeEventStandings(
  tournamentLinks: EventTournamentLink[],
  tournamentData: Map<string, Tournament>,
  rules: EventRankingRules,
): EventStandingEntry[] {
  const playerMap = new Map<string, PlayerAccum>();

  for (const link of tournamentLinks) {
    const tournament = tournamentData.get(link.tournamentId);
    if (!tournament) continue;

    const weight = link.weight;
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

        const winPts = rules.pointsPerWin * weight;
        const drawPts = rules.pointsPerDraw * weight;
        const lossPts = rules.pointsPerLoss * weight;

        // Process team1 players
        for (const pid of match.team1) {
          const name = nameById.get(pid) ?? pid;
          let acc = playerMap.get(name);
          if (!acc) {
            acc = { playerName: name, wins: 0, draws: 0, losses: 0, gamesWon: 0, gamesLost: 0, weightedPoints: 0 };
            playerMap.set(name, acc);
          }
          acc.gamesWon += team1Points;
          acc.gamesLost += team2Points;
          if (team1Won) { acc.wins++; acc.weightedPoints += winPts; }
          else if (isDraw) { acc.draws++; acc.weightedPoints += drawPts; }
          else { acc.losses++; acc.weightedPoints += lossPts; }
        }

        // Process team2 players
        for (const pid of match.team2) {
          const name = nameById.get(pid) ?? pid;
          let acc = playerMap.get(name);
          if (!acc) {
            acc = { playerName: name, wins: 0, draws: 0, losses: 0, gamesWon: 0, gamesLost: 0, weightedPoints: 0 };
            playerMap.set(name, acc);
          }
          acc.gamesWon += team2Points;
          acc.gamesLost += team1Points;
          if (team2Won) { acc.wins++; acc.weightedPoints += winPts; }
          else if (isDraw) { acc.draws++; acc.weightedPoints += drawPts; }
          else { acc.losses++; acc.weightedPoints += lossPts; }
        }
      }
    }
  }

  const entries: EventStandingEntry[] = Array.from(playerMap.values()).map(acc => ({
    playerName: acc.playerName,
    wins: acc.wins,
    draws: acc.draws,
    losses: acc.losses,
    points: Math.round(acc.weightedPoints * 100) / 100,
    gamesWon: acc.gamesWon,
    gamesLost: acc.gamesLost,
    pointDifference: acc.gamesWon - acc.gamesLost,
    matchesPlayed: acc.wins + acc.draws + acc.losses,
    rank: 0,
  }));

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
