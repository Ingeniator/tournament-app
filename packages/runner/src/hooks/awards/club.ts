import type { Tournament, Nomination, StandingsEntry, ClubStandingsEntry } from '@padel/common';
import { formatHasClubs } from '@padel/common';
import { buildClubStandings, buildClubMaps } from '../../utils/clubStandings';

/**
 * Club-specific awards for club formats.
 * Called only when the tournament uses a club format.
 */

interface ClubAwardContext {
  clubStandings: ClubStandingsEntry[];
  pairStandings: StandingsEntry[];
  tournament: Tournament;
  teamClubMap: Map<string, string>;
}

export function computeClubChampion(ctx: ClubAwardContext): Nomination[] {
  const { clubStandings } = ctx;
  if (clubStandings.length === 0) return [];

  const winner = clubStandings[0];
  if (winner.totalPoints === 0) return [];

  return [{
    id: 'club-champion',
    title: 'Club Champion',
    emoji: '\uD83C\uDFC6',
    description: 'Winning club',
    playerNames: [winner.clubName],
    stat: `${winner.totalPoints} pts \u00b7 ${winner.memberCount} pairs`,
  }];
}

export function computeClubAwards(tournament: Tournament, pairStandings: StandingsEntry[]): { champion: Nomination[]; awards: Nomination[] } {
  if (!formatHasClubs(tournament.config.format)) {
    return { champion: [], awards: [] };
  }

  const clubStandings = buildClubStandings(tournament, pairStandings);
  const { teamClubMap } = buildClubMaps(tournament.players, tournament.teams ?? []);
  const ctx: ClubAwardContext = { clubStandings, pairStandings, tournament, teamClubMap };

  const champion = computeClubChampion(ctx);
  const awards: Nomination[] = [];

  // CLUB RIVALRY — Two clubs with closest total points
  if (clubStandings.length >= 2) {
    let minGap = Infinity;
    let rivalA: ClubStandingsEntry | null = null;
    let rivalB: ClubStandingsEntry | null = null;
    for (let i = 0; i < clubStandings.length; i++) {
      for (let j = i + 1; j < clubStandings.length; j++) {
        const gap = Math.abs(clubStandings[i].totalPoints - clubStandings[j].totalPoints);
        if (gap < minGap) {
          minGap = gap;
          rivalA = clubStandings[i];
          rivalB = clubStandings[j];
        }
      }
    }
    if (rivalA && rivalB && minGap <= Math.max(10, Math.ceil(rivalA.totalPoints * 0.1))) {
      awards.push({
        id: 'club-rivalry',
        title: 'Club Rivalry',
        emoji: '\u2694\uFE0F',
        description: 'Closest battle between clubs',
        playerNames: [rivalA.clubName, rivalB.clubName],
        stat: minGap === 0 ? 'Tied!' : `${minGap} pts apart`,
      });
    }
  }

  // CLUB MVP — Pair that scored highest % of their club's total points
  if (clubStandings.length > 0) {
    const clubs = tournament.clubs ?? [];

    const clubTotals = new Map<string, number>();
    for (const cs of clubStandings) clubTotals.set(cs.clubId, cs.totalPoints);

    let bestMvp: { entry: StandingsEntry; clubName: string; pct: number } | null = null;
    for (const entry of pairStandings) {
      const clubId = teamClubMap.get(entry.playerId);
      if (!clubId) continue;
      const clubTotal = clubTotals.get(clubId) ?? 0;
      if (clubTotal === 0) continue;
      const clubPairCount = clubStandings.find(c => c.clubId === clubId)?.memberCount ?? 0;
      if (clubPairCount < 2) continue;
      const pct = entry.totalPoints / clubTotal;
      if (!bestMvp || pct > bestMvp.pct) {
        const clubName = clubs.find(c => c.id === clubId)?.name ?? '?';
        bestMvp = { entry, clubName, pct };
      }
    }
    if (bestMvp && bestMvp.pct > 0) {
      awards.push({
        id: 'club-mvp',
        title: 'Club MVP',
        emoji: '\uD83C\uDF1F',
        description: `Top contributor for ${bestMvp.clubName}`,
        playerNames: [bestMvp.entry.playerName],
        stat: `${Math.round(bestMvp.pct * 100)}% of club points`,
      });
    }
  }

  // CLUB SOLIDARITY — Club with smallest points spread between pairs
  if (clubStandings.length > 0) {
    const clubs = tournament.clubs ?? [];

    let bestSolidarity: { clubId: string; clubName: string; spread: number; pairCount: number } | null = null;
    for (const club of clubs) {
      const pairPoints = pairStandings
        .filter(e => teamClubMap.get(e.playerId) === club.id)
        .map(e => e.totalPoints);
      if (pairPoints.length < 2) continue;
      const spread = Math.max(...pairPoints) - Math.min(...pairPoints);
      if (!bestSolidarity || spread < bestSolidarity.spread) {
        bestSolidarity = { clubId: club.id, clubName: club.name, spread, pairCount: pairPoints.length };
      }
    }
    if (bestSolidarity) {
      awards.push({
        id: 'club-solidarity',
        title: 'Club Solidarity',
        emoji: '\uD83E\uDD1D',
        description: 'Most balanced contributions across pairs',
        playerNames: [bestSolidarity.clubName],
        stat: bestSolidarity.spread === 0
          ? 'All pairs scored equally!'
          : `${bestSolidarity.spread} pts spread across ${bestSolidarity.pairCount} pairs`,
      });
    }
  }

  return { champion, awards };
}
