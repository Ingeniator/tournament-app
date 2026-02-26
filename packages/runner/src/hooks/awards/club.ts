import type { Tournament, Nomination, StandingsEntry, ClubStandingsEntry } from '@padel/common';

/**
 * Club-specific awards for club-americano format.
 * Called only when tournament.config.format === 'club-americano'.
 */

interface ClubAwardContext {
  clubStandings: ClubStandingsEntry[];
  pairStandings: StandingsEntry[];
  tournament: Tournament;
}

function buildClubStandings(tournament: Tournament, pairStandings: StandingsEntry[]): ClubStandingsEntry[] {
  const clubs = tournament.clubs ?? [];
  const teams = tournament.teams ?? [];
  if (clubs.length === 0 || teams.length === 0) return [];

  // Build teamId → clubId mapping
  const playerClubMap = new Map<string, string>();
  for (const p of tournament.players) {
    if (p.clubId) playerClubMap.set(p.id, p.clubId);
  }
  const teamClubMap = new Map<string, string>();
  for (const team of teams) {
    const clubId = playerClubMap.get(team.player1Id) ?? playerClubMap.get(team.player2Id);
    if (clubId) teamClubMap.set(team.id, clubId);
  }

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
  if (tournament.config.format !== 'club-americano') {
    return { champion: [], awards: [] };
  }

  const clubStandings = buildClubStandings(tournament, pairStandings);
  const ctx: ClubAwardContext = { clubStandings, pairStandings, tournament };

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
    const teams = tournament.teams ?? [];
    const playerClubMap = new Map<string, string>();
    for (const p of tournament.players) {
      if (p.clubId) playerClubMap.set(p.id, p.clubId);
    }
    const teamClubMap = new Map<string, string>();
    for (const team of teams) {
      const clubId = playerClubMap.get(team.player1Id) ?? playerClubMap.get(team.player2Id);
      if (clubId) teamClubMap.set(team.id, clubId);
    }

    const clubTotals = new Map<string, number>();
    for (const cs of clubStandings) clubTotals.set(cs.clubId, cs.totalPoints);

    let bestMvp: { entry: StandingsEntry; clubName: string; pct: number } | null = null;
    for (const entry of pairStandings) {
      const clubId = teamClubMap.get(entry.playerId);
      if (!clubId) continue;
      const clubTotal = clubTotals.get(clubId) ?? 0;
      if (clubTotal === 0) continue;
      // Only consider clubs with 2+ pairs for MVP to be meaningful
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
    const teams = tournament.teams ?? [];
    const playerClubMap = new Map<string, string>();
    for (const p of tournament.players) {
      if (p.clubId) playerClubMap.set(p.id, p.clubId);
    }
    const teamClubMap = new Map<string, string>();
    for (const team of teams) {
      const clubId = playerClubMap.get(team.player1Id) ?? playerClubMap.get(team.player2Id);
      if (clubId) teamClubMap.set(team.id, clubId);
    }

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
