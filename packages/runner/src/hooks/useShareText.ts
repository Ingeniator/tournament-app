import { useMemo } from 'react';
import type { Tournament, StandingsEntry } from '@padel/common';

export function useShareText(tournament: Tournament | null, standings: StandingsEntry[]) {
  const roundResults = useMemo(() => {
    if (!tournament) return '';
    const playerName = (id: string) =>
      tournament.players.find(p => p.id === id)?.name ?? '?';

    const lines: string[] = [`${tournament.name}`, ''];

    for (const round of tournament.rounds) {
      const scoredMatches = round.matches.filter(m => m.score);
      if (scoredMatches.length === 0) continue;

      lines.push(`Round ${round.roundNumber}`);
      const courtName = (courtId: string) =>
        tournament.config.courts.find(c => c.id === courtId)?.name ?? courtId;

      for (const match of scoredMatches) {
        const t1 = `${playerName(match.team1[0])} & ${playerName(match.team1[1])}`;
        const t2 = `${playerName(match.team2[0])} & ${playerName(match.team2[1])}`;
        const s = match.score!;
        lines.push(`  ${courtName(match.courtId)}: ${t1} ${s.team1Points}-${s.team2Points} ${t2}`);
      }
      if (round.sitOuts.length > 0) {
        lines.push(`  Sat out: ${round.sitOuts.map(playerName).join(', ')}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }, [tournament]);

  const standingsText = useMemo(() => {
    if (!tournament || standings.length === 0) return '';
    const lines: string[] = [`${tournament.name} — Standings`, ''];

    const nameWidth = Math.max(...standings.map(s => s.playerName.length), 4);
    lines.push(
      `${'#'.padStart(3)}  ${'Name'.padEnd(nameWidth)}  ${'Pts'.padStart(4)}  ${'W'.padStart(2)}  ${'L'.padStart(2)}  ${'D'.padStart(2)}  ${'Diff'.padStart(5)}`
    );
    lines.push('-'.repeat(3 + 2 + nameWidth + 2 + 4 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 5));

    for (const s of standings) {
      lines.push(
        `${String(s.rank).padStart(3)}  ${s.playerName.padEnd(nameWidth)}  ${String(s.totalPoints).padStart(4)}  ${String(s.matchesWon).padStart(2)}  ${String(s.matchesLost).padStart(2)}  ${String(s.matchesDraw).padStart(2)}  ${(s.pointDiff >= 0 ? '+' : '') + String(s.pointDiff).padStart(4)}`
      );
    }

    return lines.join('\n');
  }, [tournament, standings]);

  const summaryText = useMemo(() => {
    if (!tournament) return '';
    const lines: string[] = [`${tournament.name}`, ''];

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
