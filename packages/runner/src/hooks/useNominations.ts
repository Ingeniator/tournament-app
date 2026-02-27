import { useMemo } from 'react';
import type { Tournament, StandingsEntry, Nomination, AwardTier } from '@padel/common';
import { getStrategy } from '../strategies';
import type { AwardContext } from './awards/types';
import { buildMatchData, buildCompetitorMatchData } from './awards/matchData';
import { computeIndividualAwards } from './awards/individual';
import { computeDuoAwards } from './awards/duo';
import { computeClubAwards } from './awards/club';
import { computeMaldicionesAwards } from './awards/maldiciones';
import { assignTiers, selectAwards } from './awards/selection';

export type { AwardTier, Nomination };

export function useNominations(
  tournament: Tournament | null,
  standings: StandingsEntry[],
): Nomination[] {
  return useMemo(() => {
    if (!tournament || tournament.phase !== 'completed' || standings.length < 2) return [];

    // Return stored nominations if ceremony has already been completed
    if (tournament.nominations && tournament.nominations.length > 0) {
      return tournament.nominations;
    }

    const nameOf = (id: string) => tournament.players.find(p => p.id === id)?.name ?? '?';
    const ppm = tournament.config.pointsPerMatch;
    const closeThreshold = Math.max(2, Math.floor(ppm * 0.15));

    // Build match data
    const { playerMatches, allScored } = buildMatchData(tournament);
    if (allScored.length === 0) return [];

    const strategy = getStrategy(tournament.config.format);
    const competitors = strategy.getCompetitors(tournament);
    const competitorCount = competitors.length;
    const MAX_AWARDS = Math.min(7, Math.max(3, Math.floor(competitorCount / 2)));

    // Map player IDs to their competitor
    const playerToCompetitor = new Map<string, typeof competitors[0]>();
    for (const c of competitors) {
      for (const pid of c.playerIds) {
        playerToCompetitor.set(pid, c);
      }
    }

    const competitorMatches = buildCompetitorMatchData(competitors, allScored, playerToCompetitor);
    const competitorNameOf = (id: string) => competitors.find(c => c.id === id)?.name ?? '?';
    const rankOf = (id: string) => standings.find(s => s.playerId === id)?.rank ?? 999;

    const ctx: AwardContext = {
      allScored, playerMatches, competitorMatches, playerToCompetitor,
      competitors, standings, closeThreshold, nameOf, competitorNameOf, rankOf,
    };

    // Podium - Top 3 places
    const podium: Nomination[] = [];
    const isKOTC = tournament.config.format === 'king-of-the-court';
    const MEDALS: Array<{ emoji: string; title: string; description: string }> = [
      { emoji: isKOTC ? '\uD83D\uDC51' : '\uD83E\uDD47', title: isKOTC ? 'King of the Court' : 'Champion', description: 'Tournament winner' },
      { emoji: '\uD83E\uDD48', title: 'Runner-up', description: 'Second place' },
      { emoji: '\uD83E\uDD49', title: 'Third Place', description: 'Bronze medal finish' },
    ];
    for (let rank = 1; rank <= 3; rank++) {
      const entries = standings.filter(s => s.rank === rank);
      if (entries.length === 0) continue;
      const medal = MEDALS[rank - 1];
      entries.forEach((entry, idx) => {
        const diff = entry.pointDiff >= 0 ? `+${entry.pointDiff}` : String(entry.pointDiff);
        const wtl = `${entry.matchesWon}W-${entry.matchesDraw}T-${entry.matchesLost}L`;
        const suffix = idx === 0 ? '' : `-${String.fromCharCode(97 + idx)}`;
        podium.push({
          id: `podium-${rank}${suffix}`,
          title: medal.title,
          emoji: medal.emoji,
          description: medal.description,
          playerNames: [entry.playerName],
          stat: `${entry.totalPoints} pts \u00b7 ${wtl} \u00b7 ${diff}`,
        });
      });
    }

    // Compute awards
    const individualAwards = computeIndividualAwards(ctx, tournament);
    const duoAwards = !strategy.hasFixedPartners ? computeDuoAwards(ctx, tournament) : [];
    const { champion: clubChampion, awards: clubAwards } = computeClubAwards(tournament, standings);
    const maldicionesAwards = computeMaldicionesAwards(tournament);
    const awards = [...individualAwards, ...duoAwards, ...clubAwards, ...maldicionesAwards];

    // Assign tiers and select
    assignTiers(awards);

    const seed = tournament.rounds.reduce((h, r) => {
      for (const m of r.matches) {
        for (const ch of m.id) h = ((h << 5) - h + ch.charCodeAt(0)) | 0;
      }
      return h;
    }, 0);

    const finalAwards = selectAwards(awards, MAX_AWARDS, seed);

    // Lucky one
    const lucky: Nomination[] = [];
    if (competitors.length > 0) {
      const pick = competitors[Math.abs(seed) % competitors.length];
      lucky.push({
        id: 'lucky',
        title: strategy.hasFixedPartners ? 'Lucky Ones' : 'Lucky One',
        emoji: '\uD83C\uDF40',
        description: 'Randomly chosen \u2014 fortune favors the bold!',
        playerNames: [pick.name],
        stat: strategy.hasFixedPartners ? 'Lucky team of the tournament' : 'Lucky player of the tournament',
      });
    }

    const all = [...podium, ...clubChampion, ...finalAwards, ...lucky];
    if (tournament.config.maldiciones?.enabled) {
      return all.map(n => ({ ...n, modeTitle: '🎭 Maldiciones del Padel' }));
    }
    return all;
  }, [tournament, standings]);
}
