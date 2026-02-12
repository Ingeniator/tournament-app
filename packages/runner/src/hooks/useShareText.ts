import { useMemo, useCallback } from 'react';
import type { Tournament, StandingsEntry } from '@padel/common';
import type { Nomination } from './useNominations';

export function useShareText(
  tournament: Tournament | null,
  standings: StandingsEntry[],
  nominations?: Nomination[],
) {
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

  const buildMessengerText = useCallback((includeRounds: boolean) => {
    if (!tournament || standings.length === 0) return '';

    const lines: string[] = [];

    // Title
    lines.push(`🏆 ${tournament.name}`);
    lines.push('');

    // Podium — top 3 simplified
    const podiumNoms = nominations?.filter(n => n.id.startsWith('podium-')) ?? [];
    const otherNoms = nominations?.filter(n => !n.id.startsWith('podium-')) ?? [];

    for (const nom of podiumNoms) {
      lines.push(`${nom.emoji} ${nom.playerNames[0]}`);
    }

    // Standings table
    lines.push('');
    lines.push('📊 Standings');

    const nameW = Math.max(...standings.map(s => s.playerName.length));
    const ptsW = Math.max(...standings.map(s => String(s.totalPoints).length));
    const wtlW = Math.max(...standings.map(s => {
      const wtl = `${s.matchesWon}-${s.matchesDraw}-${s.matchesLost}`;
      return wtl.length;
    }));
    const diffW = Math.max(...standings.map(s => {
      const d = (s.pointDiff >= 0 ? '+' : '') + s.pointDiff;
      return d.length;
    }));

    lines.push('```');
    lines.push(
      `${'#'.padStart(2)}  ${'Name'.padEnd(nameW)}  ${'Pts'.padStart(ptsW)}  ${'W-T-L'.padStart(wtlW)}  ${'+/-'.padStart(diffW)}`
    );
    for (const s of standings) {
      const wtl = `${s.matchesWon}-${s.matchesDraw}-${s.matchesLost}`;
      const diff = (s.pointDiff >= 0 ? '+' : '') + s.pointDiff;
      lines.push(
        `${String(s.rank).padStart(2)}  ${s.playerName.padEnd(nameW)}  ${String(s.totalPoints).padStart(ptsW)}  ${wtl.padStart(wtlW)}  ${diff.padStart(diffW)}`
      );
    }
    lines.push('```');

    // Other awards (non-podium)
    if (otherNoms.length > 0) {
      lines.push('');
      for (const nom of otherNoms) {
        const players = nom.playerNames.join(' & ');
        lines.push(`\`${nom.emoji} ${nom.title}\`  ${players} — ${nom.stat}`);
      }
    }

    // Round results (only if expanded on screen)
    if (includeRounds) {
      const playerName = (id: string) =>
        tournament.players.find(p => p.id === id)?.name ?? '?';

      let maxTeamW = 0;
      let maxPtsW = 0;
      for (const round of tournament.rounds) {
        for (const match of round.matches) {
          if (!match.score) continue;
          for (const team of [match.team1, match.team2]) {
            const t = `${playerName(team[0])} & ${playerName(team[1])}`;
            maxTeamW = Math.max(maxTeamW, t.length);
          }
          maxPtsW = Math.max(maxPtsW, String(match.score.team1Points).length, String(match.score.team2Points).length);
        }
      }

      for (const round of tournament.rounds) {
        const scoredMatches = round.matches.filter(m => m.score);
        if (scoredMatches.length === 0) continue;

        lines.push('');
        lines.push(`Round ${round.roundNumber}`);
        lines.push('```');
        for (const match of scoredMatches) {
          const s = match.score!;
          const t1 = `${playerName(match.team1[0])} & ${playerName(match.team1[1])}`;
          const t2 = `${playerName(match.team2[0])} & ${playerName(match.team2[1])}`;
          lines.push(`${t1.padEnd(maxTeamW)}  ${String(s.team1Points).padStart(maxPtsW)}`);
          lines.push(`${t2.padEnd(maxTeamW)}  ${String(s.team2Points).padStart(maxPtsW)}`);
          lines.push('');
        }
        if (lines[lines.length - 1] === '') lines.pop();
        lines.push('```');
      }
    }

    lines.push('');
    lines.push(`${tournament.rounds.length} rounds · ${tournament.config.pointsPerMatch} pts/match · ${standings.length} players`);

    return lines.join('\n');
  }, [tournament, standings, nominations]);

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

    lines.push(`Format: ${tournament.config.format.charAt(0).toUpperCase() + tournament.config.format.slice(1)} · ${tournament.config.pointsPerMatch} pts/match · ${tournament.rounds.length} rounds`);

    return lines.join('\n');
  }, [tournament]);

  return { roundResults, standingsText, buildMessengerText, summaryText };
}
