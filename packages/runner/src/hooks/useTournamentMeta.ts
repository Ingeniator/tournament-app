import { useMemo } from 'react';
import type { Tournament } from '@padel/common';
import { getClubColor, formatHasGroups, formatHasClubs, shortLabel, buildRankLabelMap } from '@padel/common';
import type { GroupInfo, RankLabelInfo } from '../components/standings/StandingsTable';
import { buildRankGroups } from '../components/standings/RankResultsCard';

export function useTournamentMeta(tournament: Tournament | null) {
  const plannedGames = useMemo(() => {
    if (!tournament) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const p of tournament.players) map.set(p.id, 0);
    for (const round of tournament.rounds) {
      for (const match of round.matches) {
        if (match.score) continue;
        for (const id of [...match.team1, ...match.team2]) {
          map.set(id, (map.get(id) ?? 0) + 1);
        }
      }
    }
    if (tournament.teams) {
      for (const team of tournament.teams) {
        const count = Math.max(map.get(team.player1Id) ?? 0, map.get(team.player2Id) ?? 0);
        map.set(team.id, count);
      }
    }
    return map;
  }, [tournament]);

  const groupInfo = useMemo<GroupInfo | undefined>(() => {
    if (!tournament || !formatHasGroups(tournament.config.format)) return undefined;
    const map = new Map<string, 'A' | 'B'>();
    for (const p of tournament.players) {
      if (p.group) map.set(p.id, p.group);
    }
    if (map.size === 0) return undefined;
    const labels: [string, string] = [
      tournament.config.groupLabels?.[0] || 'A',
      tournament.config.groupLabels?.[1] || 'B',
    ];
    return { labels, map };
  }, [tournament]);

  const isClubFormat = tournament != null && formatHasClubs(tournament.config.format);

  const clubColorMap = useMemo(() => {
    const map = new Map<string, string>();
    (tournament?.clubs ?? []).forEach((c, i) => map.set(c.id, getClubColor(c, i)));
    return map;
  }, [tournament?.clubs]);

  const clubInfo = useMemo(() => {
    if (!isClubFormat || !tournament?.clubs?.length || !tournament?.teams?.length) return undefined;
    const playerClubMap = new Map<string, string>();
    for (const p of tournament.players) {
      if (p.clubId) playerClubMap.set(p.id, p.clubId);
    }
    const teamClubMap = new Map<string, string>();
    for (const team of tournament.teams) {
      const clubId = playerClubMap.get(team.player1Id) ?? playerClubMap.get(team.player2Id);
      if (clubId) teamClubMap.set(team.id, clubId);
    }
    const clubNameMap = new Map<string, string>();
    for (const club of tournament.clubs) clubNameMap.set(club.id, club.name);
    return { teamClubMap, clubNameMap, clubColorMap };
  }, [tournament, isClubFormat, clubColorMap]);

  const rankLabelInfo = useMemo<RankLabelInfo | undefined>(() => {
    if (!tournament || tournament.config.format !== 'club-ranked') return undefined;
    const rankLabels = tournament.config.rankLabels;
    if (!rankLabels?.length || !tournament.teams?.length || !tournament.clubs?.length) return undefined;
    const labelMap = buildRankLabelMap(
      tournament.teams,
      tournament.clubs,
      rankLabels,
      (id) => tournament.players.find(p => p.id === id)?.rankSlot,
      (id) => tournament.players.find(p => p.id === id)?.clubId,
      shortLabel,
    );
    return labelMap.size > 0 ? { labelMap } : undefined;
  }, [tournament]);

  const rankGroups = useMemo(() => tournament ? buildRankGroups(tournament) : [], [tournament]);

  return { plannedGames, groupInfo, isClubFormat, clubColorMap, clubInfo, rankLabelInfo, rankGroups };
}
