import { useMemo } from 'react';
import type { Tournament, StandingsEntry } from '@padel/common';

export function useShareText(tournament: Tournament | null, standings: StandingsEntry[]) {
  const roundResults = useMemo(() => {
    if (!tournament) return '';
    const playerName = (id: string) =>
      tournament.players.find(p => p.id === id)?.name ?? '?';
    const courtName = (courtId: string) =>
      tournament.config.courts.find(c => c.id === courtId)?.name ?? courtId;

    // Pre-compute max widths for aligned columns
    let maxCourtW = 0;
    let maxT1W = 0;
    let maxScoreW = 0;

    for (const round of tournament.rounds) {
      for (const match of round.matches) {
        if (!match.score) continue;
        maxCourtW = Math.max(maxCourtW, courtName(match.courtId).length);
        const t1 = `${playerName(match.team1[0])} & ${playerName(match.team1[1])}`;
        maxT1W = Math.max(maxT1W, t1.length);
        const score = `${match.score.team1Points}:${match.score.team2Points}`;
        maxScoreW = Math.max(maxScoreW, score.length);
      }
    }

    const lines: string[] = [];

    for (const round of tournament.rounds) {
      const scoredMatches = round.matches.filter(m => m.score);
      if (scoredMatches.length === 0) continue;

      lines.push(`Round ${round.roundNumber}`);
      for (const match of scoredMatches) {
        const t1 = `${playerName(match.team1[0])} & ${playerName(match.team1[1])}`;
        const t2 = `${playerName(match.team2[0])} & ${playerName(match.team2[1])}`;
        const s = match.score!;
        const score = `${s.team1Points}:${s.team2Points}`;
        lines.push(
          `  ${courtName(match.courtId).padEnd(maxCourtW)}  ${t1.padEnd(maxT1W)}  ${score.padStart(maxScoreW)}  ${t2}`
        );
      }
      if (round.sitOuts.length > 0) {
        lines.push(`  Sat out: ${round.sitOuts.map(playerName).join(', ')}`);
      }
      lines.push('');
    }

    return lines.join('\n').trimEnd();
  }, [tournament]);

  const standingsText = useMemo(() => {
    if (!tournament || standings.length === 0) return '';
    const nameW = Math.max(...standings.map(s => s.playerName.length), 4);
    const ptsW = Math.max(...standings.map(s => String(s.totalPoints).length), 3);
    const diffW = Math.max(...standings.map(s => String(Math.abs(s.pointDiff)).length + 1), 4);

    const header = `${'#'.padStart(3)}  ${'Name'.padEnd(nameW)}  ${'Pts'.padStart(ptsW)}  ${'W-L'.padStart(5)}  ${'Diff'.padStart(diffW)}`;
    const sep = '-'.repeat(header.length);

    const lines: string[] = [tournament.name, '', header, sep];

    for (const s of standings) {
      const diff = (s.pointDiff >= 0 ? '+' : '-') + String(Math.abs(s.pointDiff));
      const wl = `${s.matchesWon}-${s.matchesLost}${s.matchesDraw > 0 ? `-${s.matchesDraw}` : ''}`;
      lines.push(
        `${String(s.rank).padStart(3)}  ${s.playerName.padEnd(nameW)}  ${String(s.totalPoints).padStart(ptsW)}  ${wl.padStart(5)}  ${diff.padStart(diffW)}`
      );
    }

    return lines.join('\n');
  }, [tournament, standings]);

  const summaryText = useMemo(() => {
    if (!tournament) return '';
    const lines: string[] = [`${tournament.name} - Logs`, ''];

    lines.push('Players');
    tournament.players.forEach((p, i) => {
      const suffix = p.unavailable ? ' (out)' : '';
      lines.push(`  ${i + 1}. ${p.name}${suffix}`);
    });
    lines.push('');

    lines.push('Courts');
    tournament.config.courts.forEach(c => {
      lines.push(`  ${c.name}`);
    });
    lines.push('');

    lines.push(`Format: Americano · ${tournament.config.pointsPerMatch} pts/match · ${tournament.rounds.length} rounds`);

    return lines.join('\n');
  }, [tournament]);

  return { roundResults, standingsText, summaryText };
}
