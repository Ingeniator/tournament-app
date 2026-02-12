import { useMemo } from 'react';
import type { Tournament, StandingsEntry } from '@padel/common';

export interface Nomination {
  id: string;
  title: string;
  emoji: string;
  description: string;
  playerNames: string[];
  stat: string;
}

interface PlayerMatchInfo {
  roundNumber: number;
  pointsScored: number;
  pointsConceded: number;
  won: boolean;
  lost: boolean;
  margin: number;
}

export function useNominations(
  tournament: Tournament | null,
  standings: StandingsEntry[],
): Nomination[] {
  return useMemo(() => {
    if (!tournament || tournament.phase !== 'completed' || standings.length < 2) return [];

    const nameOf = (id: string) => tournament.players.find(p => p.id === id)?.name ?? '?';
    const ppm = tournament.config.pointsPerMatch;
    const closeThreshold = Math.max(2, Math.floor(ppm * 0.15));

    // Build per-player match data
    const playerMatches = new Map<string, PlayerMatchInfo[]>();
    for (const p of tournament.players) {
      playerMatches.set(p.id, []);
    }

    // All scored matches (flat)
    const allScored: Array<{
      roundNumber: number;
      team1: [string, string];
      team2: [string, string];
      t1: number;
      t2: number;
      margin: number;
      totalPoints: number;
    }> = [];

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

    if (allScored.length < 2) return [];

    const nominations: Nomination[] = [];
    const rankOf = (id: string) => standings.find(s => s.playerId === id)?.rank ?? 999;

    // 1. UNDEFEATED - Won every match
    for (const entry of standings) {
      if (entry.matchesPlayed >= 2 && entry.matchesWon === entry.matchesPlayed) {
        nominations.push({
          id: 'undefeated',
          title: 'Undefeated',
          emoji: '⭐',
          description: 'Won every single match',
          playerNames: [entry.playerName],
          stat: `${entry.matchesWon}W – 0L`,
        });
        break;
      }
    }

    // 2. GIANT SLAYER - Lowest-ranked player who beat #1
    const topPlayer = standings[0];
    const topMatches = playerMatches.get(topPlayer.playerId) ?? [];
    const topLosses = topMatches.filter(m => m.lost);
    if (topLosses.length > 0) {
      const slayerIds = new Set<string>();
      for (const round of tournament.rounds) {
        for (const match of round.matches) {
          if (!match.score) continue;
          const { team1Points: t1, team2Points: t2 } = match.score;
          const topInTeam1 = match.team1.includes(topPlayer.playerId);
          const topInTeam2 = match.team2.includes(topPlayer.playerId);
          if (topInTeam1 && t2 > t1) {
            match.team2.forEach(id => slayerIds.add(id));
          } else if (topInTeam2 && t1 > t2) {
            match.team1.forEach(id => slayerIds.add(id));
          }
        }
      }
      const slayers = [...slayerIds].sort((a, b) => rankOf(b) - rankOf(a));
      const bestSlayer = slayers[0];
      if (bestSlayer && rankOf(bestSlayer) > 3) {
        nominations.push({
          id: 'giant-slayer',
          title: 'Giant Slayer',
          emoji: '⚔️',
          description: `Took down #1 ${topPlayer.playerName}`,
          playerNames: [nameOf(bestSlayer)],
          stat: `Ranked #${rankOf(bestSlayer)}`,
        });
      }
    }

    // 3. POINT MACHINE - Most total points scored (only if != rank 1)
    let bestPointsPlayer: { id: string; total: number } | null = null;
    for (const [pid, matches] of playerMatches) {
      if (matches.length === 0) continue;
      const total = matches.reduce((sum, m) => sum + m.pointsScored, 0);
      if (!bestPointsPlayer || total > bestPointsPlayer.total) {
        bestPointsPlayer = { id: pid, total };
      }
    }
    if (bestPointsPlayer && bestPointsPlayer.id !== topPlayer.playerId) {
      nominations.push({
        id: 'point-machine',
        title: 'Point Machine',
        emoji: '💥',
        description: 'Racked up the most points overall',
        playerNames: [nameOf(bestPointsPlayer.id)],
        stat: `${bestPointsPlayer.total} total points`,
      });
    }

    // 4. IRON WALL - Lowest avg points conceded
    let bestWall: { id: string; avg: number; total: number; games: number } | null = null;
    for (const [pid, matches] of playerMatches) {
      if (matches.length < 2) continue;
      const totalConceded = matches.reduce((sum, m) => sum + m.pointsConceded, 0);
      const avg = totalConceded / matches.length;
      if (!bestWall || avg < bestWall.avg) {
        bestWall = { id: pid, avg, total: totalConceded, games: matches.length };
      }
    }
    if (bestWall) {
      nominations.push({
        id: 'iron-wall',
        title: 'Iron Wall',
        emoji: '🛡️',
        description: 'Fewest points conceded per game',
        playerNames: [nameOf(bestWall.id)],
        stat: `${bestWall.avg.toFixed(1)} avg per game`,
      });
    }

    // 5. QUICK STRIKE - Largest single-game victory margin
    const biggestWin = [...allScored].sort((a, b) => b.margin - a.margin)[0];
    if (biggestWin && biggestWin.margin > 0) {
      const winners = biggestWin.t1 > biggestWin.t2 ? biggestWin.team1 : biggestWin.team2;
      const winScore = Math.max(biggestWin.t1, biggestWin.t2);
      const loseScore = Math.min(biggestWin.t1, biggestWin.t2);
      nominations.push({
        id: 'quick-strike',
        title: 'Quick Strike',
        emoji: '⚡',
        description: 'Most dominant victory',
        playerNames: winners.map(nameOf),
        stat: `${winScore}–${loseScore}`,
      });
    }

    // 6. CONSISTENCY CHAMPION - Smallest score variance
    let bestConsistency: { id: string; stdDev: number } | null = null;
    for (const [pid, matches] of playerMatches) {
      if (matches.length < 3) continue;
      const margins = matches.map(m => m.margin);
      const mean = margins.reduce((a, b) => a + b, 0) / margins.length;
      const variance = margins.reduce((sum, m) => sum + (m - mean) ** 2, 0) / margins.length;
      const stdDev = Math.sqrt(variance);
      if (!bestConsistency || stdDev < bestConsistency.stdDev) {
        bestConsistency = { id: pid, stdDev };
      }
    }
    if (bestConsistency) {
      const matches = playerMatches.get(bestConsistency.id)!;
      const avgMargin = matches.reduce((s, m) => s + m.margin, 0) / matches.length;
      nominations.push({
        id: 'consistency-champion',
        title: 'Consistency Champion',
        emoji: '🎯',
        description: 'Most steady performance all tournament',
        playerNames: [nameOf(bestConsistency.id)],
        stat: `${avgMargin >= 0 ? '+' : ''}${avgMargin.toFixed(1)} avg margin`,
      });
    }

    // 7. COMEBACK KING - Biggest improvement first half → second half
    let bestComeback: { id: string; firstW: number; firstL: number; secondW: number; secondL: number } | null = null;
    let bestImprov = 0;
    for (const [pid, matches] of playerMatches) {
      if (matches.length < 4) continue;
      const sorted = [...matches].sort((a, b) => a.roundNumber - b.roundNumber);
      const half = Math.floor(sorted.length / 2);
      const first = sorted.slice(0, half);
      const second = sorted.slice(half);
      const firstWR = first.filter(m => m.won).length / first.length;
      const secondWR = second.filter(m => m.won).length / second.length;
      const improv = secondWR - firstWR;
      if (improv > 0.3 && firstWR < 0.5 && secondWR > 0.5 && improv > bestImprov) {
        bestImprov = improv;
        bestComeback = {
          id: pid,
          firstW: first.filter(m => m.won).length,
          firstL: first.filter(m => m.lost).length,
          secondW: second.filter(m => m.won).length,
          secondL: second.filter(m => m.lost).length,
        };
      }
    }
    if (bestComeback) {
      nominations.push({
        id: 'comeback-king',
        title: 'Comeback King',
        emoji: '👑',
        description: 'Strongest finish after a rough start',
        playerNames: [nameOf(bestComeback.id)],
        stat: `${bestComeback.firstW}W/${bestComeback.firstL}L → ${bestComeback.secondW}W/${bestComeback.secondL}L`,
      });
    }

    // 8. CLUTCH PLAYER - Best win rate in close games (margin <= closeThreshold)
    let bestClutch: { id: string; won: number; total: number } | null = null;
    for (const [pid, matches] of playerMatches) {
      const closeGames = matches.filter(m => Math.abs(m.margin) <= closeThreshold);
      if (closeGames.length < 2) continue;
      const closeWins = closeGames.filter(m => m.won).length;
      const winRate = closeWins / closeGames.length;
      if (!bestClutch || winRate > bestClutch.won / bestClutch.total ||
          (winRate === bestClutch.won / bestClutch.total && closeGames.length > bestClutch.total)) {
        bestClutch = { id: pid, won: closeWins, total: closeGames.length };
      }
    }
    if (bestClutch && bestClutch.won > 0) {
      nominations.push({
        id: 'clutch-player',
        title: 'Clutch Player',
        emoji: '🧊',
        description: 'Wins when it matters most',
        playerNames: [nameOf(bestClutch.id)],
        stat: `${bestClutch.won}/${bestClutch.total} close games won`,
      });
    }

    // 9. SEE-SAW SPECIALIST - Most close games played
    let bestSeeSaw: { id: string; count: number } | null = null;
    for (const [pid, matches] of playerMatches) {
      const closeCount = matches.filter(m => Math.abs(m.margin) <= closeThreshold).length;
      if (closeCount >= 2 && (!bestSeeSaw || closeCount > bestSeeSaw.count)) {
        bestSeeSaw = { id: pid, count: closeCount };
      }
    }
    if (bestSeeSaw) {
      nominations.push({
        id: 'see-saw',
        title: 'See-Saw Specialist',
        emoji: '⚖️',
        description: 'Thrives in nail-biting matches',
        playerNames: [nameOf(bestSeeSaw.id)],
        stat: `${bestSeeSaw.count} close games`,
      });
    }

    // 10. MARATHON MATCH - Game with the highest total points
    // Only interesting if there's variance (some matches score above pointsPerMatch due to draws/bonus)
    // Actually in this system total always = pointsPerMatch, so skip this...
    // BUT we can find the closest game instead.

    // 10. MOST COMPETITIVE GAME - Closest match score
    const closestGame = [...allScored].sort((a, b) => a.margin - b.margin)[0];
    if (closestGame && closestGame.margin <= closeThreshold) {
      const allPlayers = [...closestGame.team1, ...closestGame.team2];
      nominations.push({
        id: 'competitive-game',
        title: 'Instant Classic',
        emoji: '🔥',
        description: `Closest game of the tournament (Round ${closestGame.roundNumber})`,
        playerNames: allPlayers.map(nameOf),
        stat: `${closestGame.t1}–${closestGame.t2}`,
      });
    }

    // 11. NEARLY THERE - Runner-up (only if gap is tight: ≤10 pts or ≤5% of leader's total)
    const runnerUp = standings.find(s => s.rank === 2);
    if (runnerUp) {
      const gap = topPlayer.totalPoints - runnerUp.totalPoints;
      const maxGap = Math.min(10, Math.ceil(topPlayer.totalPoints * 0.05));
      if (gap <= maxGap) {
        nominations.push({
          id: 'nearly-there',
          title: 'Nearly There',
          emoji: '🥈',
          description: 'So close to the top',
          playerNames: [runnerUp.playerName],
          stat: gap > 0 ? `${gap} point${gap !== 1 ? 's' : ''} behind #1` : 'Tied on points with #1',
        });
      }
    }

    // 12. HEARTBREAK AWARD - Most close losses
    let bestHeartbreak: { id: string; count: number } | null = null;
    for (const [pid, matches] of playerMatches) {
      const closeLosses = matches.filter(m => m.lost && Math.abs(m.margin) <= closeThreshold).length;
      if (closeLosses >= 2 && (!bestHeartbreak || closeLosses > bestHeartbreak.count)) {
        bestHeartbreak = { id: pid, count: closeLosses };
      }
    }
    if (bestHeartbreak) {
      nominations.push({
        id: 'heartbreak',
        title: 'Heartbreak Award',
        emoji: '💔',
        description: 'Most close losses',
        playerNames: [nameOf(bestHeartbreak.id)],
        stat: `${bestHeartbreak.count} games lost by ≤${closeThreshold} pts`,
      });
    }

    // 13. WARRIOR - Most games played (only if there's variation)
    const gamesPlayed = standings.map(s => s.matchesPlayed);
    const maxGames = Math.max(...gamesPlayed);
    const minGames = Math.min(...gamesPlayed);
    if (maxGames > minGames) {
      const warriors = standings.filter(s => s.matchesPlayed === maxGames);
      if (warriors.length <= 2) {
        nominations.push({
          id: 'warrior',
          title: 'Warrior',
          emoji: '💪',
          description: 'Never missed a beat',
          playerNames: warriors.map(w => w.playerName),
          stat: `${maxGames} games played`,
        });
      }
    }

    return nominations;
  }, [tournament, standings]);
}
