import type { Tournament, Nomination } from '@padel/common';
import type { AwardContext } from './types';

export function computeDuoAwards(ctx: AwardContext, tournament: Tournament): Nomination[] {
  const { allScored, playerMatches, standings, closeThreshold, nameOf, rankOf } = ctx;
  const awards: Nomination[] = [];

  // Build pair stats
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

  // BEST DUO
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
      emoji: '\uD83E\uDD1D',
      description: 'Unstoppable together',
      playerNames: bestDuo.ids.map(nameOf),
      stat: `${bestDuo.wins}/${bestDuo.total} wins together`,
    });
  }

  // OFFENSIVE DUO
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
      emoji: '\uD83D\uDE80',
      description: 'Highest scoring pair per game',
      playerNames: bestOffDuo.ids.map(nameOf),
      stat: `${bestOffDuo.avg.toFixed(1)} avg per game`,
    });
  }

  // WALL PAIR
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
      emoji: '\uD83C\uDFF0',
      description: 'Tightest defense as a pair',
      playerNames: bestWallPair.ids.map(nameOf),
      stat: `${bestWallPair.avg.toFixed(1)} avg conceded`,
    });
  }

  // HOT STREAK DUO
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
      emoji: '\uD83D\uDD25',
      description: 'Longest winning run as a pair',
      playerNames: bestStreakDuo.ids.map(nameOf),
      stat: `${bestStreakDuo.streak} wins in a row`,
    });
  }

  // SOCIAL BUTTERFLY
  {
    let bestSocial: { id: string; uniquePartners: number } | null = null;
    let minPartners = Infinity;
    for (const pid of tournament.players.filter(p => !p.unavailable).map(p => p.id)) {
      const partners = new Set<string>();
      for (const match of allScored) {
        const inT1 = match.team1.includes(pid);
        const inT2 = match.team2.includes(pid);
        if (inT1) {
          for (const p of match.team1) { if (p !== pid) partners.add(p); }
        } else if (inT2) {
          for (const p of match.team2) { if (p !== pid) partners.add(p); }
        }
      }
      if (partners.size > 0) {
        minPartners = Math.min(minPartners, partners.size);
        if (partners.size >= 3 && (!bestSocial || partners.size > bestSocial.uniquePartners)) {
          bestSocial = { id: pid, uniquePartners: partners.size };
        }
      }
    }
    if (bestSocial && bestSocial.uniquePartners > minPartners) {
      awards.push({
        id: 'social-butterfly',
        title: 'Social Butterfly',
        emoji: '\uD83E\uDD8B',
        description: 'Played with the most different partners',
        playerNames: [nameOf(bestSocial.id)],
        stat: `${bestSocial.uniquePartners} unique partners`,
      });
    }
  }

  // NEMESIS
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
      emoji: '\uD83D\uDE08',
      description: `Owned ${nameOf(bestNemesis.loser)} all tournament`,
      playerNames: [nameOf(bestNemesis.winner)],
      stat: `${bestNemesis.wins}-0 vs ${nameOf(bestNemesis.loser)}`,
    });
  }

  // RUBBER MATCH
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
      emoji: '\uD83D\uDD04',
      description: 'Split results \u2014 who really wins?',
      playerNames: [...bestRubber.team1, ...bestRubber.team2].map(nameOf),
      stat: `${bestRubber.t1Wins}-${bestRubber.t2Wins} in ${bestRubber.total} meetings`,
    });
  }

  // GATEKEEPER
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
        emoji: '\uD83D\uDEA7',
        description: 'Beat everyone below, fell to those above',
        playerNames: [entry.playerName],
        stat: `${beatLower}W vs lower, ${lostToHigher}L vs higher`,
      });
      break;
    }
  }

  return awards;
}
