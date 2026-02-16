import { useMemo } from 'react';
import type { Tournament, StandingsEntry, Competitor } from '@padel/common';
import { getStrategy } from '../strategies';

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

    const strategy = getStrategy(tournament.config.format);
    const competitors = strategy.getCompetitors(tournament);
    const competitorCount = competitors.length;
    const MAX_AWARDS = Math.min(7, Math.max(3, Math.floor(competitorCount / 2)));

    // Build competitor match data
    // Map player IDs to their competitor
    const playerToCompetitor = new Map<string, Competitor>();
    for (const c of competitors) {
      for (const pid of c.playerIds) {
        playerToCompetitor.set(pid, c);
      }
    }

    interface CompetitorMatchInfo {
      roundNumber: number;
      pointsScored: number;
      pointsConceded: number;
      won: boolean;
      lost: boolean;
      margin: number;
    }
    const competitorMatches = new Map<string, CompetitorMatchInfo[]>();
    for (const c of competitors) {
      competitorMatches.set(c.id, []);
    }

    for (const match of allScored) {
      // Determine unique competitor IDs per side (avoids double-counting for teams)
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

    const competitorNameOf = (id: string) => competitors.find(c => c.id === id)?.name ?? '?';
    const podium: Nomination[] = [];
    const awards: Nomination[] = [];
    const rankOf = (id: string) => standings.find(s => s.playerId === id)?.rank ?? 999;

    // PODIUM - Top 3 places
    const MEDALS: Array<{ emoji: string; title: string; description: string }> = [
      { emoji: '🥇', title: 'Champion', description: 'Tournament winner' },
      { emoji: '🥈', title: 'Runner-up', description: 'Second place' },
      { emoji: '🥉', title: 'Third Place', description: 'Bronze medal finish' },
    ];
    for (let i = 0; i < Math.min(3, standings.length); i++) {
      const entry = standings[i];
      if (entry.rank !== i + 1) continue; // skip if rank doesn't match (ties)
      const medal = MEDALS[i];
      const diff = entry.pointDiff >= 0 ? `+${entry.pointDiff}` : String(entry.pointDiff);
      const wtl = `${entry.matchesWon}W-${entry.matchesDraw}T-${entry.matchesLost}L`;
      podium.push({
        id: `podium-${i + 1}`,
        title: medal.title,
        emoji: medal.emoji,
        description: medal.description,
        playerNames: [entry.playerName],
        stat: `${entry.totalPoints} pts · ${wtl} · ${diff}`,
      });
    }

    // Competitor awards — work for both individual and team formats
    // 1. UNDEFEATED - Won every match
    for (const entry of standings) {
      if (entry.matchesPlayed >= 2 && entry.matchesWon === entry.matchesPlayed) {
        awards.push({
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

    // 2. GIANT SLAYER - Lowest-ranked competitor who beat #1
    const topPlayer = standings[0];
    const topCompMatches = competitorMatches.get(topPlayer.playerId) ?? [];
    const topLosses = topCompMatches.filter(m => m.lost);
    if (topLosses.length > 0) {
      const slayerIds = new Set<string>();
      for (const match of allScored) {
        const side1Comps = new Set<string>();
        const side2Comps = new Set<string>();
        for (const pid of match.team1) { const c = playerToCompetitor.get(pid); if (c) side1Comps.add(c.id); }
        for (const pid of match.team2) { const c = playerToCompetitor.get(pid); if (c) side2Comps.add(c.id); }

        const topInSide1 = side1Comps.has(topPlayer.playerId);
        const topInSide2 = side2Comps.has(topPlayer.playerId);
        if (topInSide1 && match.t2 > match.t1) {
          side2Comps.forEach(id => slayerIds.add(id));
        } else if (topInSide2 && match.t1 > match.t2) {
          side1Comps.forEach(id => slayerIds.add(id));
        }
      }
      const slayers = [...slayerIds].sort((a, b) => rankOf(b) - rankOf(a));
      const bestSlayer = slayers[0];
      if (bestSlayer && rankOf(bestSlayer) > 3) {
        awards.push({
          id: 'giant-slayer',
          title: 'Giant Slayer',
          emoji: '⚔️',
          description: `Took down #1 ${topPlayer.playerName}`,
          playerNames: [competitorNameOf(bestSlayer)],
          stat: `Ranked #${rankOf(bestSlayer)}`,
        });
      }
    }

    // 3. POINT MACHINE - Most total points scored (only if != rank 1)
    let bestPointsCompetitor: { id: string; total: number } | null = null;
    for (const [cid, matches] of competitorMatches) {
      if (matches.length === 0) continue;
      const total = matches.reduce((sum, m) => sum + m.pointsScored, 0);
      if (!bestPointsCompetitor || total > bestPointsCompetitor.total) {
        bestPointsCompetitor = { id: cid, total };
      }
    }
    if (bestPointsCompetitor && bestPointsCompetitor.id !== topPlayer.playerId) {
      awards.push({
        id: 'point-machine',
        title: 'Point Machine',
        emoji: '💥',
        description: 'Racked up the most points overall',
        playerNames: [competitorNameOf(bestPointsCompetitor.id)],
        stat: `${bestPointsCompetitor.total} total points`,
      });
    }

    // 4. IRON WALL - Lowest avg points conceded
    let bestWall: { id: string; avg: number; total: number; games: number } | null = null;
    for (const [cid, matches] of competitorMatches) {
      if (matches.length < 2) continue;
      const totalConceded = matches.reduce((sum, m) => sum + m.pointsConceded, 0);
      const avg = totalConceded / matches.length;
      if (!bestWall || avg < bestWall.avg) {
        bestWall = { id: cid, avg, total: totalConceded, games: matches.length };
      }
    }
    if (bestWall) {
      awards.push({
        id: 'iron-wall',
        title: 'Iron Wall',
        emoji: '🛡️',
        description: 'Fewest points conceded per game',
        playerNames: [competitorNameOf(bestWall.id)],
        stat: `${bestWall.avg.toFixed(1)} avg per game`,
      });
    }

    // 5. QUICK STRIKE - Largest single-game victory margin
    const biggestWin = [...allScored].sort((a, b) => b.margin - a.margin)[0];
    if (biggestWin && biggestWin.margin > 0) {
      const winningSide = biggestWin.t1 > biggestWin.t2 ? biggestWin.team1 : biggestWin.team2;
      const winnerComps = new Set<string>();
      for (const pid of winningSide) { const c = playerToCompetitor.get(pid); if (c) winnerComps.add(c.id); }
      const winScore = Math.max(biggestWin.t1, biggestWin.t2);
      const loseScore = Math.min(biggestWin.t1, biggestWin.t2);
      awards.push({
        id: 'quick-strike',
        title: 'Quick Strike',
        emoji: '⚡',
        description: 'Most dominant victory',
        playerNames: [...winnerComps].map(competitorNameOf),
        stat: `${winScore}–${loseScore}`,
      });
    }

    // 6. CONSISTENCY CHAMPION - Smallest score variance (only among non-negative avg margin)
    let bestConsistency: { id: string; stdDev: number } | null = null;
    for (const [cid, matches] of competitorMatches) {
      if (matches.length < 3) continue;
      const margins = matches.map(m => m.margin);
      const mean = margins.reduce((a, b) => a + b, 0) / margins.length;
      if (mean < 0) continue; // skip competitors with negative avg margin
      const variance = margins.reduce((sum, m) => sum + (m - mean) ** 2, 0) / margins.length;
      const stdDev = Math.sqrt(variance);
      if (!bestConsistency || stdDev < bestConsistency.stdDev) {
        bestConsistency = { id: cid, stdDev };
      }
    }
    if (bestConsistency) {
      const matches = competitorMatches.get(bestConsistency.id)!;
      const avgMargin = matches.reduce((s, m) => s + m.margin, 0) / matches.length;
      awards.push({
        id: 'consistency-champion',
        title: 'Consistency Champion',
        emoji: '🎯',
        description: 'Most steady performance all tournament',
        playerNames: [competitorNameOf(bestConsistency.id)],
        stat: `${avgMargin >= 0 ? '+' : ''}${avgMargin.toFixed(1)} avg margin`,
      });
    }

    // 7. COMEBACK KING - Biggest improvement first half → second half
    let bestComeback: { id: string; firstW: number; firstL: number; secondW: number; secondL: number } | null = null;
    let bestImprov = 0;
    for (const [cid, matches] of competitorMatches) {
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
          id: cid,
          firstW: first.filter(m => m.won).length,
          firstL: first.filter(m => m.lost).length,
          secondW: second.filter(m => m.won).length,
          secondL: second.filter(m => m.lost).length,
        };
      }
    }
    if (bestComeback) {
      awards.push({
        id: 'comeback-king',
        title: 'Comeback King',
        emoji: '👑',
        description: 'Strongest finish after a rough start',
        playerNames: [competitorNameOf(bestComeback.id)],
        stat: `${bestComeback.firstW}W/${bestComeback.firstL}L → ${bestComeback.secondW}W/${bestComeback.secondL}L`,
      });
    }

    // 8. CLUTCH PLAYER - Best win rate in close games (margin <= closeThreshold)
    let bestClutch: { id: string; won: number; total: number } | null = null;
    for (const [cid, matches] of competitorMatches) {
      const closeGames = matches.filter(m => Math.abs(m.margin) <= closeThreshold);
      if (closeGames.length < 2) continue;
      const closeWins = closeGames.filter(m => m.won).length;
      const winRate = closeWins / closeGames.length;
      if (!bestClutch || winRate > bestClutch.won / bestClutch.total ||
          (winRate === bestClutch.won / bestClutch.total && closeGames.length > bestClutch.total)) {
        bestClutch = { id: cid, won: closeWins, total: closeGames.length };
      }
    }
    if (bestClutch && bestClutch.won > 0) {
      awards.push({
        id: 'clutch-player',
        title: 'Clutch Player',
        emoji: '🧊',
        description: 'Wins when it matters most',
        playerNames: [competitorNameOf(bestClutch.id)],
        stat: `${bestClutch.won}/${bestClutch.total} close games won`,
      });
    }

    // 9. SEE-SAW SPECIALIST - Most close games played
    let bestSeeSaw: { id: string; count: number } | null = null;
    for (const [cid, matches] of competitorMatches) {
      const closeCount = matches.filter(m => Math.abs(m.margin) <= closeThreshold).length;
      if (closeCount >= 2 && (!bestSeeSaw || closeCount > bestSeeSaw.count)) {
        bestSeeSaw = { id: cid, count: closeCount };
      }
    }
    if (bestSeeSaw) {
      awards.push({
        id: 'see-saw',
        title: 'See-Saw Specialist',
        emoji: '⚖️',
        description: 'Thrives in nail-biting matches',
        playerNames: [competitorNameOf(bestSeeSaw.id)],
        stat: `${bestSeeSaw.count} close games`,
      });
    }

    // 10. MOST COMPETITIVE GAME - Closest match score
    const closestGame = [...allScored].sort((a, b) => a.margin - b.margin)[0];
    if (closestGame && closestGame.margin <= closeThreshold) {
      const allCompIds = new Set<string>();
      for (const pid of [...closestGame.team1, ...closestGame.team2]) {
        const c = playerToCompetitor.get(pid);
        if (c) allCompIds.add(c.id);
      }
      awards.push({
        id: 'competitive-game',
        title: 'Instant Classic',
        emoji: '🔥',
        description: `Closest game of the tournament (Round ${closestGame.roundNumber})`,
        playerNames: [...allCompIds].map(competitorNameOf),
        stat: `${closestGame.t1}–${closestGame.t2}`,
      });
    }

    // 11. NEARLY THERE - Runner-up (only if gap is tight: ≤10 pts or ≤5% of leader's total)
    const runnerUp = standings.find(s => s.rank === 2);
    if (runnerUp) {
      const gap = topPlayer.totalPoints - runnerUp.totalPoints;
      const maxGap = Math.min(10, Math.ceil(topPlayer.totalPoints * 0.05));
      if (gap <= maxGap) {
        awards.push({
          id: 'nearly-there',
          title: 'Nearly There',
          emoji: '🥈',
          description: 'So close to the top',
          playerNames: [runnerUp.playerName],
          stat: gap > 0 ? `${gap} point${gap !== 1 ? 's' : ''} behind #1` : 'Tied on points with #1',
        });
      }
    }

    // 12. BATTLE TESTED - Most close games lost (reframed positively)
    let bestBattle: { id: string; count: number } | null = null;
    for (const [cid, matches] of competitorMatches) {
      const closeLosses = matches.filter(m => m.lost && Math.abs(m.margin) <= closeThreshold).length;
      if (closeLosses >= 2 && (!bestBattle || closeLosses > bestBattle.count)) {
        bestBattle = { id: cid, count: closeLosses };
      }
    }
    if (bestBattle) {
      awards.push({
        id: 'battle-tested',
        title: 'Battle Tested',
        emoji: '🫡',
        description: 'Every game was a fight to the finish',
        playerNames: [competitorNameOf(bestBattle.id)],
        stat: `${bestBattle.count} games decided by ≤${closeThreshold} pts`,
      });
    }

    // 13. WARRIOR - Most games played (only if there's variation)
    const gamesPlayed = standings.map(s => s.matchesPlayed);
    const maxGames = Math.max(...gamesPlayed);
    const minGames = Math.min(...gamesPlayed);
    if (maxGames > minGames) {
      const warriors = standings.filter(s => s.matchesPlayed === maxGames);
      if (warriors.length <= 2) {
        awards.push({
          id: 'warrior',
          title: 'Warrior',
          emoji: '💪',
          description: 'Never missed a beat',
          playerNames: warriors.map(w => w.playerName),
          stat: `${maxGames} games played`,
        });
      }
    }

    // 14. DOMINATOR - Longest winning streak
    let bestStreak: { id: string; streak: number } | null = null;
    for (const [cid, matches] of competitorMatches) {
      if (matches.length < 3) continue;
      const sorted = [...matches].sort((a, b) => a.roundNumber - b.roundNumber);
      let streak = 0;
      let maxStreak = 0;
      for (const m of sorted) {
        if (m.won) {
          streak++;
          maxStreak = Math.max(maxStreak, streak);
        } else {
          streak = 0;
        }
      }
      if (maxStreak >= 3 && (!bestStreak || maxStreak > bestStreak.streak)) {
        bestStreak = { id: cid, streak: maxStreak };
      }
    }
    if (bestStreak) {
      awards.push({
        id: 'dominator',
        title: 'Dominator',
        emoji: '🔥',
        description: 'Longest winning streak',
        playerNames: [competitorNameOf(bestStreak.id)],
        stat: `${bestStreak.streak} wins in a row`,
      });
    }

    // 15. OFFENSIVE POWERHOUSE - Highest avg points scored per game (if != #1 and != Iron Wall)
    let bestOffense: { id: string; avg: number; games: number } | null = null;
    for (const [cid, matches] of competitorMatches) {
      if (matches.length < 2) continue;
      const avg = matches.reduce((sum, m) => sum + m.pointsScored, 0) / matches.length;
      if (!bestOffense || avg > bestOffense.avg) {
        bestOffense = { id: cid, avg, games: matches.length };
      }
    }
    if (bestOffense && bestOffense.id !== topPlayer.playerId && bestOffense.id !== bestWall?.id) {
      awards.push({
        id: 'offensive-powerhouse',
        title: 'Offensive Powerhouse',
        emoji: '💣',
        description: 'Highest scoring average per game',
        playerNames: [competitorNameOf(bestOffense.id)],
        stat: `${bestOffense.avg.toFixed(1)} avg per game`,
      });
    }

    // Pair/duo awards — only make sense when partners rotate
    if (!strategy.hasFixedPartners) {
    // 16. TEAM STATS - Build pair data for team awards
    const pairStats = new Map<string, {
      ids: [string, string]; wins: number; losses: number; total: number;
      scored: number; conceded: number; streak: number; maxStreak: number;
      closeLosses: number;
    }>();
    for (const match of allScored) {
      const t1Key = [...match.team1].sort().join('+');
      const t2Key = [...match.team2].sort().join('+');
      if (!pairStats.has(t1Key)) pairStats.set(t1Key, { ids: [...match.team1].sort() as [string, string], wins: 0, losses: 0, total: 0, scored: 0, conceded: 0, streak: 0, maxStreak: 0, closeLosses: 0 });
      if (!pairStats.has(t2Key)) pairStats.set(t2Key, { ids: [...match.team2].sort() as [string, string], wins: 0, losses: 0, total: 0, scored: 0, conceded: 0, streak: 0, maxStreak: 0, closeLosses: 0 });
      const p1 = pairStats.get(t1Key)!;
      const p2 = pairStats.get(t2Key)!;
      p1.total++; p1.scored += match.t1; p1.conceded += match.t2;
      p2.total++; p2.scored += match.t2; p2.conceded += match.t1;
      if (match.t1 > match.t2) {
        p1.wins++; p1.streak++; p1.maxStreak = Math.max(p1.maxStreak, p1.streak);
        p2.losses++; p2.streak = 0;
        if (match.margin <= closeThreshold) p2.closeLosses++;
      } else if (match.t2 > match.t1) {
        p2.wins++; p2.streak++; p2.maxStreak = Math.max(p2.maxStreak, p2.streak);
        p1.losses++; p1.streak = 0;
        if (match.margin <= closeThreshold) p1.closeLosses++;
      }
    }

    // BEST DUO - Pair with highest win % (min 2 games together)
    let bestDuo: { key: string; ids: [string, string]; wins: number; total: number; rate: number } | null = null;
    for (const [key, pair] of pairStats) {
      if (pair.total < 2) continue;
      const rate = pair.wins / pair.total;
      if (!bestDuo || rate > bestDuo.rate || (rate === bestDuo.rate && pair.total > bestDuo.total)) {
        bestDuo = { key, ids: pair.ids, wins: pair.wins, total: pair.total, rate };
      }
    }
    if (bestDuo && bestDuo.wins > 0) {
      awards.push({
        id: 'best-duo',
        title: 'Best Duo',
        emoji: '🤝',
        description: 'Unstoppable together',
        playerNames: bestDuo.ids.map(nameOf),
        stat: `${bestDuo.wins}/${bestDuo.total} wins together`,
      });
    }

    // OFFENSIVE DUO - Pair with highest avg points scored (min 2 games, != Best Duo)
    let bestOffDuo: { ids: [string, string]; avg: number; total: number } | null = null;
    for (const [key, pair] of pairStats) {
      if (pair.total < 2 || key === bestDuo?.key) continue;
      const avg = pair.scored / pair.total;
      if (!bestOffDuo || avg > bestOffDuo.avg) {
        bestOffDuo = { ids: pair.ids, avg, total: pair.total };
      }
    }
    if (bestOffDuo) {
      awards.push({
        id: 'offensive-duo',
        title: 'Offensive Duo',
        emoji: '🚀',
        description: 'Highest scoring pair per game',
        playerNames: bestOffDuo.ids.map(nameOf),
        stat: `${bestOffDuo.avg.toFixed(1)} avg per game`,
      });
    }

    // WALL PAIR - Pair with lowest avg points conceded (min 2 games)
    let bestWallPair: { ids: [string, string]; avg: number; total: number } | null = null;
    for (const pair of pairStats.values()) {
      if (pair.total < 2) continue;
      const avg = pair.conceded / pair.total;
      if (!bestWallPair || avg < bestWallPair.avg) {
        bestWallPair = { ids: pair.ids, avg, total: pair.total };
      }
    }
    if (bestWallPair) {
      awards.push({
        id: 'wall-pair',
        title: 'Defensive Duo',
        emoji: '🏰',
        description: 'Tightest defense as a pair',
        playerNames: bestWallPair.ids.map(nameOf),
        stat: `${bestWallPair.avg.toFixed(1)} avg conceded`,
      });
    }

    // HOT STREAK DUO - Pair with longest winning streak (min 3)
    let bestStreakDuo: { ids: [string, string]; streak: number } | null = null;
    for (const pair of pairStats.values()) {
      if (pair.maxStreak >= 3 && (!bestStreakDuo || pair.maxStreak > bestStreakDuo.streak)) {
        bestStreakDuo = { ids: pair.ids, streak: pair.maxStreak };
      }
    }
    if (bestStreakDuo) {
      awards.push({
        id: 'hot-streak-duo',
        title: 'Hot Streak Duo',
        emoji: '🔥',
        description: 'Longest winning run as a pair',
        playerNames: bestStreakDuo.ids.map(nameOf),
        stat: `${bestStreakDuo.streak} wins in a row`,
      });
    }

    // 17. NEMESIS - Player who beat the same opponent the most times
    const vsRecord = new Map<string, Map<string, { wins: number; losses: number }>>();
    for (const match of allScored) {
      const t1Won = match.t1 > match.t2;
      const t2Won = match.t2 > match.t1;
      for (const a of match.team1) {
        for (const b of match.team2) {
          if (!vsRecord.has(a)) vsRecord.set(a, new Map());
          if (!vsRecord.has(b)) vsRecord.set(b, new Map());
          const aVsB = vsRecord.get(a)!;
          const bVsA = vsRecord.get(b)!;
          if (!aVsB.has(b)) aVsB.set(b, { wins: 0, losses: 0 });
          if (!bVsA.has(a)) bVsA.set(a, { wins: 0, losses: 0 });
          if (t1Won) {
            aVsB.get(b)!.wins++;
            bVsA.get(a)!.losses++;
          } else if (t2Won) {
            aVsB.get(b)!.losses++;
            bVsA.get(a)!.wins++;
          }
        }
      }
    }
    let bestNemesis: { winner: string; loser: string; wins: number } | null = null;
    for (const [pid, opponents] of vsRecord) {
      for (const [opp, record] of opponents) {
        if (record.wins >= 3 && record.losses === 0 && (!bestNemesis || record.wins > bestNemesis.wins)) {
          bestNemesis = { winner: pid, loser: opp, wins: record.wins };
        }
      }
    }
    if (bestNemesis) {
      awards.push({
        id: 'nemesis',
        title: 'Nemesis',
        emoji: '😈',
        description: `Owned ${nameOf(bestNemesis.loser)} all tournament`,
        playerNames: [nameOf(bestNemesis.winner)],
        stat: `${bestNemesis.wins}-0 vs ${nameOf(bestNemesis.loser)}`,
      });
    }

    // 18. RUBBER MATCH - Same team pair played multiple times with split results
    const teamMatchups = new Map<string, { team1: [string, string]; team2: [string, string]; t1Wins: number; t2Wins: number; total: number }>();
    for (const match of allScored) {
      const k1 = [...match.team1].sort().join('+');
      const k2 = [...match.team2].sort().join('+');
      const key = [k1, k2].sort().join(' vs ');
      if (!teamMatchups.has(key)) {
        teamMatchups.set(key, {
          team1: [...match.team1].sort() as [string, string],
          team2: [...match.team2].sort() as [string, string],
          t1Wins: 0, t2Wins: 0, total: 0,
        });
      }
      const m = teamMatchups.get(key)!;
      m.total++;
      const aKey = [...match.team1].sort().join('+');
      if (match.t1 > match.t2) {
        if (aKey === k1) m.t1Wins++; else m.t2Wins++;
      } else if (match.t2 > match.t1) {
        if (aKey === k1) m.t2Wins++; else m.t1Wins++;
      }
    }
    let bestRubber: { team1: [string, string]; team2: [string, string]; t1Wins: number; t2Wins: number; total: number } | null = null;
    for (const matchup of teamMatchups.values()) {
      if (matchup.total >= 2 && matchup.t1Wins > 0 && matchup.t2Wins > 0) {
        if (!bestRubber || matchup.total > bestRubber.total) {
          bestRubber = matchup;
        }
      }
    }
    if (bestRubber) {
      awards.push({
        id: 'rubber-match',
        title: 'Rubber Match',
        emoji: '🔄',
        description: 'Split results — who really wins?',
        playerNames: [...bestRubber.team1, ...bestRubber.team2].map(nameOf),
        stat: `${bestRubber.t1Wins}-${bestRubber.t2Wins} in ${bestRubber.total} meetings`,
      });
    }

    // 19. GATEKEEPER - Beat all lower-ranked, lost to all higher-ranked (min 3 games)
    for (const entry of standings) {
      const matches = playerMatches.get(entry.playerId);
      if (!matches || matches.length < 3) continue;
      const myRank = entry.rank;
      if (myRank <= 1 || myRank >= standings.length) continue;

      let beatLower = 0;
      let lostToHigher = 0;
      let totalLower = 0;
      let totalHigher = 0;

      for (const match of allScored) {
        const inT1 = match.team1.includes(entry.playerId);
        const inT2 = match.team2.includes(entry.playerId);
        if (!inT1 && !inT2) continue;

        const opponents = inT1 ? match.team2 : match.team1;
        const won = inT1 ? match.t1 > match.t2 : match.t2 > match.t1;
        const lost = inT1 ? match.t2 > match.t1 : match.t1 > match.t2;

        const oppBestRank = Math.min(...opponents.map(rankOf));

        if (oppBestRank > myRank) {
          totalLower++;
          if (won) beatLower++;
        } else if (oppBestRank < myRank) {
          totalHigher++;
          if (lost) lostToHigher++;
        }
      }

      if (totalLower >= 2 && totalHigher >= 1 && beatLower === totalLower && lostToHigher === totalHigher) {
        awards.push({
          id: 'gatekeeper',
          title: 'Gatekeeper',
          emoji: '🚧',
          description: 'Beat everyone below, fell to those above',
          playerNames: [entry.playerName],
          stat: `${beatLower}W vs lower, ${lostToHigher}L vs higher`,
        });
        break;
      }
    }
    } // end if (!strategy.hasFixedPartners) for pair/duo/nemesis/rubber/gatekeeper

    // LUCKY ONE - Random competitor, seeded by tournament ID for consistency
    const lucky: Nomination[] = [];
    const seed = tournament.rounds.reduce((h, r) => {
      for (const m of r.matches) {
        for (const ch of m.id) h = ((h << 5) - h + ch.charCodeAt(0)) | 0;
      }
      return h;
    }, 0);

    if (competitors.length > 0) {
      const pick = competitors[Math.abs(seed) % competitors.length];
      lucky.push({
        id: 'lucky',
        title: strategy.hasFixedPartners ? 'Lucky Ones' : 'Lucky One',
        emoji: '🍀',
        description: 'Randomly chosen — fortune favors the bold!',
        playerNames: [pick.name],
        stat: strategy.hasFixedPartners ? 'Lucky team of the tournament' : 'Lucky player of the tournament',
      });
    }

    // Shuffle awards using seeded PRNG so every qualifying award has a fair
    // chance of being shown, but results stay stable for a given tournament.
    const seededShuffle = <T>(arr: T[], s: number): T[] => {
      const copy = [...arr];
      let h = Math.abs(s) | 1;
      for (let i = copy.length - 1; i > 0; i--) {
        h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
        h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
        h = h ^ (h >>> 16);
        const j = ((h >>> 0) % (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const shuffledAwards = seededShuffle(awards, seed);

    // Combine: podium (always) + capped shuffled awards + lucky (always)
    return [...podium, ...shuffledAwards.slice(0, MAX_AWARDS), ...lucky];
  }, [tournament, standings]);
}
