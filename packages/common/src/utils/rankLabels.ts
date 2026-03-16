import type { Team, Club } from '../types/tournament';

/**
 * Build a map from teamId → display label for club-ranked formats.
 * When the same rank appears multiple times in a club, adds [1], [2] suffix.
 */
export function buildRankLabelMap(
  teams: Team[],
  clubs: Club[],
  rankLabels: string[],
  playerRankOf: (id: string) => number | undefined,
  playerClubOf: (id: string) => string | undefined,
  shortLabelFn: (label: string) => string,
): Map<string, string> {
  // Group teams by club
  const teamsByClub = new Map<string, Team[]>();
  for (const club of clubs) teamsByClub.set(club.id, []);
  for (const team of teams) {
    const cid = playerClubOf(team.player1Id) ?? playerClubOf(team.player2Id);
    if (cid && teamsByClub.has(cid)) teamsByClub.get(cid)!.push(team);
  }

  // Count occurrences of each rank per club
  const clubRankCount = new Map<string, Map<number, number>>();
  for (const club of clubs) {
    const rankCounts = new Map<number, number>();
    clubRankCount.set(club.id, rankCounts);
    for (const team of teamsByClub.get(club.id) ?? []) {
      const rank = playerRankOf(team.player1Id) ?? playerRankOf(team.player2Id);
      if (rank != null) rankCounts.set(rank, (rankCounts.get(rank) ?? 0) + 1);
    }
  }

  // Assign labels with suffix when rank appears more than once in a club
  const labelMap = new Map<string, string>();
  for (const club of clubs) {
    const seen = new Map<number, number>();
    for (const team of teamsByClub.get(club.id) ?? []) {
      const rank = playerRankOf(team.player1Id) ?? playerRankOf(team.player2Id);
      if (rank != null && rankLabels[rank]) {
        const base = shortLabelFn(rankLabels[rank]);
        const totalForRank = clubRankCount.get(club.id)?.get(rank) ?? 1;
        const idx = (seen.get(rank) ?? 0) + 1;
        seen.set(rank, idx);
        labelMap.set(team.id, totalForRank > 1 ? `${base} [${idx}]` : base);
      }
    }
  }
  return labelMap;
}
