import type { Tournament, StandingsEntry, ClubStandingsEntry, Team, Player } from '@padel/common';

export interface ClubMaps {
  playerClubMap: Map<string, string>;
  teamClubMap: Map<string, string>;
}

export function buildClubMaps(players: Player[], teams: Team[]): ClubMaps {
  const playerClubMap = new Map<string, string>();
  for (const p of players) {
    if (p.clubId) playerClubMap.set(p.id, p.clubId);
  }
  const teamClubMap = new Map<string, string>();
  for (const team of teams) {
    const clubId = playerClubMap.get(team.player1Id) ?? playerClubMap.get(team.player2Id);
    if (clubId) teamClubMap.set(team.id, clubId);
  }
  return { playerClubMap, teamClubMap };
}

export function buildClubStandings(tournament: Tournament, pairStandings: StandingsEntry[]): ClubStandingsEntry[] {
  const clubs = tournament.clubs ?? [];
  const teams = tournament.teams ?? [];
  if (clubs.length === 0 || teams.length === 0) return [];

  const { teamClubMap } = buildClubMaps(tournament.players, teams);

  const clubPoints = new Map<string, number>();
  const clubMembers = new Map<string, number>();
  for (const club of clubs) {
    clubPoints.set(club.id, 0);
    clubMembers.set(club.id, 0);
  }

  for (const entry of pairStandings) {
    const clubId = teamClubMap.get(entry.playerId);
    if (clubId) {
      clubPoints.set(clubId, (clubPoints.get(clubId) ?? 0) + entry.totalPoints);
      clubMembers.set(clubId, (clubMembers.get(clubId) ?? 0) + 1);
    }
  }

  const entries: ClubStandingsEntry[] = clubs.map(club => ({
    clubId: club.id,
    clubName: club.name,
    totalPoints: clubPoints.get(club.id) ?? 0,
    memberCount: clubMembers.get(club.id) ?? 0,
    rank: 0,
  }));

  entries.sort((a, b) => b.totalPoints - a.totalPoints);
  entries.forEach((entry, i) => {
    if (i === 0) entry.rank = 1;
    else {
      const prev = entries[i - 1];
      entry.rank = entry.totalPoints === prev.totalPoints ? prev.rank : i + 1;
    }
  });

  return entries;
}
