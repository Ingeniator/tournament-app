import type { Tournament, Competitor } from '@padel/common';
import type { PlayerMatchInfo, CompetitorMatchInfo, ScoredMatch } from './types';

export function buildMatchData(tournament: Tournament) {
  const playerMatches = new Map<string, PlayerMatchInfo[]>();
  for (const p of tournament.players) {
    playerMatches.set(p.id, []);
  }

  const allScored: ScoredMatch[] = [];

  for (const round of tournament.rounds) {
    for (const match of round.matches) {
      if (!match.score) continue;
      const { team1Points: t1, team2Points: t2 } = match.score;
      const margin = Math.abs(t1 - t2);

      allScored.push({
        roundNumber: round.roundNumber,
        team1: match.team1,
        team2: match.team2,
        t1, t2, margin,
        totalPoints: t1 + t2,
      });

      for (const pid of match.team1) {
        playerMatches.get(pid)?.push({
          roundNumber: round.roundNumber,
          pointsScored: t1,
          pointsConceded: t2,
          won: t1 > t2,
          lost: t1 < t2,
          margin: t1 - t2,
        });
      }
      for (const pid of match.team2) {
        playerMatches.get(pid)?.push({
          roundNumber: round.roundNumber,
          pointsScored: t2,
          pointsConceded: t1,
          won: t2 > t1,
          lost: t2 < t1,
          margin: t2 - t1,
        });
      }
    }
  }

  return { playerMatches, allScored };
}

export function buildCompetitorMatchData(
  competitors: Competitor[],
  allScored: ScoredMatch[],
  playerToCompetitor: Map<string, Competitor>,
) {
  const competitorMatches = new Map<string, CompetitorMatchInfo[]>();
  for (const c of competitors) {
    competitorMatches.set(c.id, []);
  }

  for (const match of allScored) {
    const side1Competitors = new Set<string>();
    const side2Competitors = new Set<string>();
    for (const pid of match.team1) {
      const c = playerToCompetitor.get(pid);
      if (c) side1Competitors.add(c.id);
    }
    for (const pid of match.team2) {
      const c = playerToCompetitor.get(pid);
      if (c) side2Competitors.add(c.id);
    }

    for (const cid of side1Competitors) {
      competitorMatches.get(cid)?.push({
        roundNumber: match.roundNumber,
        pointsScored: match.t1,
        pointsConceded: match.t2,
        won: match.t1 > match.t2,
        lost: match.t1 < match.t2,
        margin: match.t1 - match.t2,
      });
    }
    for (const cid of side2Competitors) {
      competitorMatches.get(cid)?.push({
        roundNumber: match.roundNumber,
        pointsScored: match.t2,
        pointsConceded: match.t1,
        won: match.t2 > match.t1,
        lost: match.t2 < match.t1,
        margin: match.t2 - match.t1,
      });
    }
  }

  return competitorMatches;
}
