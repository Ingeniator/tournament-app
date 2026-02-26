import { useMemo } from 'react';
import type { Tournament, StandingsEntry, ClubStandingsEntry } from '@padel/common';

export function useClubStandings(
  tournament: Tournament | null,
  standings: StandingsEntry[],
): ClubStandingsEntry[] {
  return useMemo(() => {
    if (!tournament || !tournament.clubs?.length || !tournament.teams?.length) return [];

    // Build teamId → clubId mapping
    const teamClubMap = new Map<string, string>();
    const playerClubMap = new Map<string, string>();
    for (const p of tournament.players) {
      if (p.clubId) playerClubMap.set(p.id, p.clubId);
    }
    for (const team of tournament.teams) {
      const clubId = playerClubMap.get(team.player1Id) ?? playerClubMap.get(team.player2Id);
      if (clubId) teamClubMap.set(team.id, clubId);
    }

    // Aggregate points per club
    const clubPoints = new Map<string, number>();
    const clubMembers = new Map<string, number>();
    for (const club of tournament.clubs) {
      clubPoints.set(club.id, 0);
      clubMembers.set(club.id, 0);
    }

    for (const entry of standings) {
      // standings entries use team IDs as playerId for team formats
      const clubId = teamClubMap.get(entry.playerId);
      if (clubId) {
        clubPoints.set(clubId, (clubPoints.get(clubId) ?? 0) + entry.totalPoints);
        clubMembers.set(clubId, (clubMembers.get(clubId) ?? 0) + 1);
      }
    }

    const entries: ClubStandingsEntry[] = tournament.clubs.map(club => ({
      clubId: club.id,
      clubName: club.name,
      totalPoints: clubPoints.get(club.id) ?? 0,
      memberCount: clubMembers.get(club.id) ?? 0,
      rank: 0,
    }));

    entries.sort((a, b) => b.totalPoints - a.totalPoints);
    entries.forEach((entry, i) => {
      if (i === 0) {
        entry.rank = 1;
      } else {
        const prev = entries[i - 1];
        entry.rank = entry.totalPoints === prev.totalPoints ? prev.rank : i + 1;
      }
    });

    return entries;
  }, [tournament, standings]);
}
