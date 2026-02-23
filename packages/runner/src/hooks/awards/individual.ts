import type { Tournament, Nomination } from '@padel/common';
import type { AwardContext } from './types';

export function computeIndividualAwards(ctx: AwardContext, tournament: Tournament): Nomination[] {
  const { allScored, competitorMatches, playerToCompetitor, competitors, standings, closeThreshold, competitorNameOf, rankOf, nameOf } = ctx;
  const competitorCount = competitors.length;
  const topPlayer = standings[0];
  const awards: Nomination[] = [];

  // UNDEFEATED - Won every match
  for (const entry of standings) {
    if (entry.matchesPlayed >= 2 && entry.matchesWon === entry.matchesPlayed) {
      awards.push({
        id: 'undefeated',
        title: 'Undefeated',
        emoji: '\u2B50',
        description: 'Won every single match',
        playerNames: [entry.playerName],
        stat: `${entry.matchesWon}W \u2013 0L`,
      });
      break;
    }
  }

  // GIANT SLAYER - Lowest-ranked competitor who beat #1
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
        emoji: '\u2694\uFE0F',
        description: `Took down #1 ${topPlayer.playerName}`,
        playerNames: [competitorNameOf(bestSlayer)],
        stat: `Ranked #${rankOf(bestSlayer)}`,
      });
    }
  }

  // UNDERDOG - Bottom-half competitor with highest win rate
  {
    const halfPoint = Math.ceil(competitorCount / 2);
    let bestUnderdog: { id: string; rank: number; winRate: number; wins: number; total: number } | null = null;
    for (const [cid, matches] of competitorMatches) {
      const rank = rankOf(cid);
      if (rank <= halfPoint || matches.length < 2) continue;
      const wins = matches.filter(m => m.won).length;
      const winRate = wins / matches.length;
      if (winRate > 0.5 && (!bestUnderdog || winRate > bestUnderdog.winRate ||
          (winRate === bestUnderdog.winRate && matches.length > bestUnderdog.total))) {
        bestUnderdog = { id: cid, rank, winRate, wins, total: matches.length };
      }
    }
    if (bestUnderdog) {
      awards.push({
        id: 'underdog',
        title: 'Underdog',
        emoji: '\uD83D\uDC3A',
        description: 'Bottom half of standings, top half in wins',
        playerNames: [competitorNameOf(bestUnderdog.id)],
        stat: `Rank #${bestUnderdog.rank} \u00b7 ${bestUnderdog.wins}/${bestUnderdog.total} wins`,
      });
    }
  }

  // POINT MACHINE - Most total points scored (only if != rank 1)
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
      emoji: '\uD83D\uDCA5',
      description: 'Racked up the most points overall',
      playerNames: [competitorNameOf(bestPointsCompetitor.id)],
      stat: `${bestPointsCompetitor.total} total points`,
    });
  }

  // IRON WALL - Lowest avg points conceded
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
      emoji: '\uD83D\uDEE1\uFE0F',
      description: 'Fewest points conceded per game',
      playerNames: [competitorNameOf(bestWall.id)],
      stat: `${bestWall.avg.toFixed(1)} avg per game`,
    });
  }

  // QUICK STRIKE - Largest single-game victory margin
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
      emoji: '\u26A1',
      description: 'Most dominant victory',
      playerNames: [...winnerComps].map(competitorNameOf),
      stat: `${winScore}\u2013${loseScore}`,
    });
  }

  // CONSISTENCY CHAMPION - Smallest score variance
  let bestConsistency: { id: string; stdDev: number } | null = null;
  for (const [cid, matches] of competitorMatches) {
    if (matches.length < 3) continue;
    const margins = matches.map(m => m.margin);
    const mean = margins.reduce((a, b) => a + b, 0) / margins.length;
    if (mean < 0) continue;
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
      emoji: '\uD83C\uDFAF',
      description: 'Most steady performance all tournament',
      playerNames: [competitorNameOf(bestConsistency.id)],
      stat: `${avgMargin >= 0 ? '+' : ''}${avgMargin.toFixed(1)} avg margin`,
    });
  }

  // COMEBACK KING - Biggest improvement first half -> second half
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
      emoji: '\uD83D\uDC51',
      description: 'Strongest finish after a rough start',
      playerNames: [competitorNameOf(bestComeback.id)],
      stat: `${bestComeback.firstW}W/${bestComeback.firstL}L \u2192 ${bestComeback.secondW}W/${bestComeback.secondL}L`,
    });
  }

  // CLUTCH PLAYER - Best win rate in close games
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
      emoji: '\uD83E\uDDCA',
      description: 'Wins when it matters most',
      playerNames: [competitorNameOf(bestClutch.id)],
      stat: `${bestClutch.won}/${bestClutch.total} close games won`,
    });
  }

  // SEE-SAW SPECIALIST - Most close games played
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
      emoji: '\u2696\uFE0F',
      description: 'Thrives in nail-biting matches',
      playerNames: [competitorNameOf(bestSeeSaw.id)],
      stat: `${bestSeeSaw.count} close games`,
    });
  }

  // INSTANT CLASSIC - Closest match score
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
      emoji: '\uD83D\uDD25',
      description: `Closest game of the tournament (Round ${closestGame.roundNumber})`,
      playerNames: [...allCompIds].map(competitorNameOf),
      stat: `${closestGame.t1}\u2013${closestGame.t2}`,
    });
  }

  // NEARLY THERE - Runner-up with tight gap
  const runnerUp = standings.find(s => s.rank === 2);
  if (runnerUp) {
    const gap = topPlayer.totalPoints - runnerUp.totalPoints;
    const maxGap = Math.min(10, Math.ceil(topPlayer.totalPoints * 0.05));
    if (gap <= maxGap) {
      awards.push({
        id: 'nearly-there',
        title: 'Nearly There',
        emoji: '\uD83E\uDD48',
        description: 'So close to the top',
        playerNames: [runnerUp.playerName],
        stat: gap > 0 ? `${gap} point${gap !== 1 ? 's' : ''} behind #1` : 'Tied on points with #1',
      });
    }
  }

  // BATTLE TESTED - Most close games lost
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
      emoji: '\uD83E\uDEE1',
      description: 'Every game was a fight to the finish',
      playerNames: [competitorNameOf(bestBattle.id)],
      stat: `${bestBattle.count} games decided by \u2264${closeThreshold} pts`,
    });
  }

  // WARRIOR - Most games played (only if there's variation)
  const gamesPlayed = standings.map(s => s.matchesPlayed);
  const maxGames = Math.max(...gamesPlayed);
  const minGames = Math.min(...gamesPlayed);
  if (maxGames > minGames) {
    const warriors = standings.filter(s => s.matchesPlayed === maxGames);
    if (warriors.length <= 2) {
      awards.push({
        id: 'warrior',
        title: 'Warrior',
        emoji: '\uD83D\uDCAA',
        description: 'Never missed a beat',
        playerNames: warriors.map(w => w.playerName),
        stat: `${maxGames} games played`,
      });
    }
  }

  // DOMINATOR - Longest winning streak
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
      emoji: '\uD83D\uDD25',
      description: 'Longest winning streak',
      playerNames: [competitorNameOf(bestStreak.id)],
      stat: `${bestStreak.streak} wins in a row`,
    });
  }

  // OFFENSIVE POWERHOUSE - Highest avg points scored per game
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
      emoji: '\uD83D\uDCA3',
      description: 'Highest scoring average per game',
      playerNames: [competitorNameOf(bestOffense.id)],
      stat: `${bestOffense.avg.toFixed(1)} avg per game`,
    });
  }

  // PEACEMAKER - Most drawn matches
  let maxDraws = 0;
  for (const entry of standings) {
    if (entry.matchesDraw > maxDraws) maxDraws = entry.matchesDraw;
  }
  if (maxDraws >= 2) {
    const drawLeaders = standings.filter(s =>
      s.matchesDraw === maxDraws &&
      (s.matchesPlayed < 4 || s.matchesDraw / s.matchesPlayed > 0.45),
    );
    if (drawLeaders.length >= 1 && drawLeaders.length <= 2) {
      awards.push({
        id: 'peacemaker',
        title: 'Peacemaker',
        emoji: '\uD83D\uDD4A\uFE0F',
        description: 'Nobody wins, nobody loses',
        playerNames: drawLeaders.map(d => d.playerName),
        stat: `${maxDraws} drawn matches`,
      });
    }
  }

  // COURT CLIMBER (KOTC only)
  if (tournament.config.format === 'king-of-the-court') {
    const availableCourts = tournament.config.courts.filter(c => !c.unavailable);
    const courtIndexMap = new Map<string, number>();
    availableCourts.forEach((c, i) => courtIndexMap.set(c.id, i));

    const playerCourtHistory = new Map<string, Array<{ roundNumber: number; courtIndex: number }>>();
    for (const round of tournament.rounds) {
      for (const match of round.matches) {
        if (!match.score) continue;
        const courtIdx = courtIndexMap.get(match.courtId) ?? -1;
        if (courtIdx < 0) continue;
        for (const pid of [...match.team1, ...match.team2]) {
          if (!playerCourtHistory.has(pid)) playerCourtHistory.set(pid, []);
          playerCourtHistory.get(pid)!.push({ roundNumber: round.roundNumber, courtIndex: courtIdx });
        }
      }
    }

    let bestClimber: { id: string; promotions: number } | null = null;
    for (const [pid, history] of playerCourtHistory) {
      if (history.length < 3) continue;
      const sorted = [...history].sort((a, b) => a.roundNumber - b.roundNumber);
      let promotions = 0;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].courtIndex < sorted[i - 1].courtIndex) {
          promotions++;
        }
      }
      if (promotions >= 2 && (!bestClimber || promotions > bestClimber.promotions)) {
        bestClimber = { id: pid, promotions };
      }
    }

    if (bestClimber) {
      awards.push({
        id: 'court-climber',
        title: 'Court Climber',
        emoji: '\uD83E\uDDD7',
        description: 'Most promotions to higher courts',
        playerNames: [nameOf(bestClimber.id)],
        stat: `${bestClimber.promotions} promotions`,
      });
    }
  }

  return awards;
}
