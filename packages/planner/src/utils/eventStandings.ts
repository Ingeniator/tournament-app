import type { Tournament, EventStandingEntry, EventClubStandingEntry, EventTournamentLink } from '@padel/common';

interface PlayerAccum {
  playerName: string;
  totalPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchesDraw: number;
  pointsFor: number;
  pointsAgainst: number;
}

/**
 * Compute event standings by summing raw game scores from each tournament × weight.
 * Uses the same tiebreaker chain as the runner: totalPoints → pointDiff → matchesWon → name.
 */
export function computeEventStandings(
  tournamentLinks: EventTournamentLink[],
  tournamentData: Map<string, Tournament>,
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

    // Per-round sit-out compensation (same as runner)
    for (const round of tournament.rounds) {
      const scoredMatches = round.matches.filter(m => m.score !== null);
      let roundTotalPoints = 0;
      let roundPlayersScored = 0;

      for (const match of scoredMatches) {
        const score = match.score!;
        const { team1Points, team2Points } = score;
        const team1Won = team1Points > team2Points;
        const team2Won = team2Points > team1Points;
        const isDraw = team1Points === team2Points;

        for (const pid of match.team1) {
          const name = nameById.get(pid) ?? pid;
          let acc = playerMap.get(name);
          if (!acc) {
            acc = { playerName: name, totalPoints: 0, matchesPlayed: 0, matchesWon: 0, matchesLost: 0, matchesDraw: 0, pointsFor: 0, pointsAgainst: 0 };
            playerMap.set(name, acc);
          }
          acc.totalPoints += team1Points * weight;
          acc.pointsFor += team1Points * weight;
          acc.pointsAgainst += team2Points * weight;
          acc.matchesPlayed += 1;
          if (team1Won) acc.matchesWon += 1;
          else if (isDraw) acc.matchesDraw += 1;
          else acc.matchesLost += 1;
        }

        for (const pid of match.team2) {
          const name = nameById.get(pid) ?? pid;
          let acc = playerMap.get(name);
          if (!acc) {
            acc = { playerName: name, totalPoints: 0, matchesPlayed: 0, matchesWon: 0, matchesLost: 0, matchesDraw: 0, pointsFor: 0, pointsAgainst: 0 };
            playerMap.set(name, acc);
          }
          acc.totalPoints += team2Points * weight;
          acc.pointsFor += team2Points * weight;
          acc.pointsAgainst += team1Points * weight;
          acc.matchesPlayed += 1;
          if (team2Won) acc.matchesWon += 1;
          else if (isDraw) acc.matchesDraw += 1;
          else acc.matchesLost += 1;
        }

        roundTotalPoints += team1Points + team2Points;
        roundPlayersScored += match.team1.length + match.team2.length;
      }

      // Sit-out compensation: average points for the round
      if (roundPlayersScored > 0 && round.sitOuts && round.sitOuts.length > 0) {
        const avgPoints = roundTotalPoints / roundPlayersScored;
        for (const pid of round.sitOuts) {
          const name = nameById.get(pid) ?? pid;
          let acc = playerMap.get(name);
          if (!acc) {
            acc = { playerName: name, totalPoints: 0, matchesPlayed: 0, matchesWon: 0, matchesLost: 0, matchesDraw: 0, pointsFor: 0, pointsAgainst: 0 };
            playerMap.set(name, acc);
          }
          acc.totalPoints += Math.round(avgPoints) * weight;
        }
      }
    }
  }

  const entries: EventStandingEntry[] = Array.from(playerMap.values()).map(acc => ({
    playerName: acc.playerName,
    totalPoints: Math.round(acc.totalPoints * 100) / 100,
    matchesPlayed: acc.matchesPlayed,
    matchesWon: acc.matchesWon,
    matchesLost: acc.matchesLost,
    matchesDraw: acc.matchesDraw,
    pointDiff: Math.round((acc.pointsFor - acc.pointsAgainst) * 100) / 100,
    rank: 0,
  }));

  // Sort: totalPoints → pointDiff → matchesWon → name (same as runner)
  entries.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
    return a.playerName.localeCompare(b.playerName);
  });

  // Assign ranks (tied = same rank)
  for (let i = 0; i < entries.length; i++) {
    if (i === 0) {
      entries[i].rank = 1;
    } else {
      const prev = entries[i - 1];
      const curr = entries[i];
      entries[i].rank =
        curr.totalPoints === prev.totalPoints &&
        curr.pointDiff === prev.pointDiff &&
        curr.matchesWon === prev.matchesWon
          ? prev.rank
          : i + 1;
    }
  }

  return entries;
}

/**
 * Compute club standings by summing club totalPoints across tournaments × weight.
 * Clubs matched by name.
 */
export function computeEventClubStandings(
  tournamentLinks: EventTournamentLink[],
  tournamentData: Map<string, Tournament>,
): EventClubStandingEntry[] {
  const clubMap = new Map<string, { totalPoints: number; members: Set<string> }>();

  for (const link of tournamentLinks) {
    const tournament = tournamentData.get(link.tournamentId);
    if (!tournament) continue;
    const clubs = tournament.clubs ?? [];
    if (clubs.length === 0) continue;

    const weight = link.weight;

    // Build player→clubName map for this tournament
    const clubNameById = new Map<string, string>();
    for (const club of clubs) {
      clubNameById.set(club.id, club.name);
    }
    const playerClubName = new Map<string, string>();
    for (const p of tournament.players) {
      if (p.clubId) {
        const cname = clubNameById.get(p.clubId);
        if (cname) playerClubName.set(p.id, cname);
      }
    }

    // Accumulate raw game scores per club
    for (const round of tournament.rounds) {
      const scoredMatches = round.matches.filter(m => m.score !== null);
      let roundTotalPoints = 0;
      let roundPlayersScored = 0;

      for (const match of scoredMatches) {
        const score = match.score!;

        for (const pid of match.team1) {
          const cname = playerClubName.get(pid);
          if (!cname) continue;
          let acc = clubMap.get(cname);
          if (!acc) {
            acc = { totalPoints: 0, members: new Set() };
            clubMap.set(cname, acc);
          }
          acc.totalPoints += score.team1Points * weight;
          acc.members.add(pid);
        }

        for (const pid of match.team2) {
          const cname = playerClubName.get(pid);
          if (!cname) continue;
          let acc = clubMap.get(cname);
          if (!acc) {
            acc = { totalPoints: 0, members: new Set() };
            clubMap.set(cname, acc);
          }
          acc.totalPoints += score.team2Points * weight;
          acc.members.add(pid);
        }

        roundTotalPoints += score.team1Points + score.team2Points;
        roundPlayersScored += match.team1.length + match.team2.length;
      }

      // Sit-out compensation for clubs
      if (roundPlayersScored > 0 && round.sitOuts && round.sitOuts.length > 0) {
        const avgPoints = roundTotalPoints / roundPlayersScored;
        for (const pid of round.sitOuts) {
          const cname = playerClubName.get(pid);
          if (!cname) continue;
          let acc = clubMap.get(cname);
          if (!acc) {
            acc = { totalPoints: 0, members: new Set() };
            clubMap.set(cname, acc);
          }
          acc.totalPoints += Math.round(avgPoints) * weight;
        }
      }
    }
  }

  const entries: EventClubStandingEntry[] = Array.from(clubMap.entries()).map(([name, acc]) => ({
    clubName: name,
    totalPoints: Math.round(acc.totalPoints * 100) / 100,
    memberCount: acc.members.size,
    rank: 0,
  }));

  entries.sort((a, b) => b.totalPoints - a.totalPoints);

  for (let i = 0; i < entries.length; i++) {
    if (i === 0) {
      entries[i].rank = 1;
    } else {
      const prev = entries[i - 1];
      entries[i].rank = entries[i].totalPoints === prev.totalPoints ? prev.rank : i + 1;
    }
  }

  return entries;
}
