import { useMemo } from 'react';
import type { Tournament } from '@padel/common';
import { getStrategy } from '../strategies';

export interface DistributionData {
  restBalance: {
    games: { min: number; max: number; idealMin: number; idealMax: number };
    sitOuts: { min: number; max: number; idealMin: number; idealMax: number };
  };
  repeatPartners: { names: [string, string]; count: number }[];
  idealRepeatPartners: number;
  neverPlayed: [string, string][];
  idealNeverPlayed: number;
  opponentSpread: { min: number; max: number } | null;
  idealOpponentSpread: { min: number; max: number };
  courtBalance: {
    courtName: string;
    min: number;
    max: number;
    idealMin: number;
    idealMax: number;
  }[];
  totalPairs: number;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function useDistributionStats(tournament: Tournament | null): DistributionData | null {
  return useMemo(() => {
    if (!tournament || tournament.rounds.length === 0) return null;

    const strategy = getStrategy(tournament.config.format);

    // For dynamic tournaments, only include scored (completed) rounds in statistics
    const rounds = strategy.isDynamic
      ? tournament.rounds.filter(r => r.matches.every(m => m.score !== null))
      : tournament.rounds;

    if (rounds.length === 0) return null;

    const activePlayers = tournament.players.filter(p => !p.unavailable);
    if (activePlayers.length < 4) return null;

    const nameMap = new Map(tournament.players.map(p => [p.id, p.name]));
    const activeIds = new Set(activePlayers.map(p => p.id));

    const partnerCounts = new Map<string, number>();
    const opponentCounts = new Map<string, number>();
    const courtMates = new Set<string>();
    const gamesPerPlayer = new Map<string, number>();
    const sitOutsPerPlayer = new Map<string, number>();
    const courtCountsPerPlayer = new Map<string, Map<string, number>>();
    const courtNameMap = new Map(tournament.config.courts.map(c => [c.id, c.name]));

    for (const id of activeIds) {
      gamesPerPlayer.set(id, 0);
      sitOutsPerPlayer.set(id, 0);
      courtCountsPerPlayer.set(id, new Map());
    }

    for (const round of rounds) {
      for (const id of round.sitOuts) {
        if (activeIds.has(id)) {
          sitOutsPerPlayer.set(id, (sitOutsPerPlayer.get(id) ?? 0) + 1);
        }
      }

      for (const match of round.matches) {
        // Partners
        const pk1 = pairKey(match.team1[0], match.team1[1]);
        partnerCounts.set(pk1, (partnerCounts.get(pk1) ?? 0) + 1);
        courtMates.add(pk1);

        const pk2 = pairKey(match.team2[0], match.team2[1]);
        partnerCounts.set(pk2, (partnerCounts.get(pk2) ?? 0) + 1);
        courtMates.add(pk2);

        // Opponents (all cross-team pairs)
        for (const a of match.team1) {
          for (const b of match.team2) {
            const ok = pairKey(a, b);
            opponentCounts.set(ok, (opponentCounts.get(ok) ?? 0) + 1);
            courtMates.add(ok);
          }
        }

        // Games + court counts per player
        for (const pid of [...match.team1, ...match.team2]) {
          if (activeIds.has(pid)) {
            gamesPerPlayer.set(pid, (gamesPerPlayer.get(pid) ?? 0) + 1);
            const cc = courtCountsPerPlayer.get(pid)!;
            cc.set(match.courtId, (cc.get(match.courtId) ?? 0) + 1);
          }
        }
      }
    }

    // Repeat partners (count > 1, both players still active)
    // For fixed-partner formats, exclude fixed pair repeats — those are expected
    const fixedPairKeys = new Set<string>();
    if (strategy.hasFixedPartners) {
      for (const comp of strategy.getCompetitors(tournament)) {
        if (comp.playerIds.length === 2) {
          fixedPairKeys.add(pairKey(comp.playerIds[0], comp.playerIds[1]));
        }
      }
    }
    const repeatPartners: DistributionData['repeatPartners'] = [];
    for (const [key, count] of partnerCounts) {
      if (count <= 1) continue;
      if (strategy.hasFixedPartners && fixedPairKeys.has(key)) continue; // expected for fixed partners
      const [a, b] = key.split(':');
      if (!activeIds.has(a) || !activeIds.has(b)) continue;
      repeatPartners.push({ names: [nameMap.get(a)!, nameMap.get(b)!], count });
    }
    repeatPartners.sort((a, b) => b.count - a.count);

    // Never played together (never shared a court)
    const neverPlayed: [string, string][] = [];
    const activeList = [...activeIds];
    for (let i = 0; i < activeList.length; i++) {
      for (let j = i + 1; j < activeList.length; j++) {
        const key = pairKey(activeList[i], activeList[j]);
        if (!courtMates.has(key)) {
          neverPlayed.push([nameMap.get(activeList[i])!, nameMap.get(activeList[j])!]);
        }
      }
    }

    // Opponent spread (min/max of opponent counts, excluding pairs that never met)
    let opponentSpread: DistributionData['opponentSpread'] = null;
    if (opponentCounts.size > 0) {
      let min = Infinity;
      let max = -Infinity;
      for (const [key, count] of opponentCounts) {
        const [a, b] = key.split(':');
        if (!activeIds.has(a) || !activeIds.has(b)) continue;
        if (count < min) min = count;
        if (count > max) max = count;
      }
      if (min !== Infinity) {
        opponentSpread = { min, max };
      }
    }

    const totalPairs = (activeList.length * (activeList.length - 1)) / 2;

    // Theoretical ideal: total opponent encounters spread evenly across all pairs
    const totalMatches = rounds.reduce((sum, r) => sum + r.matches.length, 0);
    const totalEncounters = totalMatches * 4; // 4 opponent pairs per match
    const idealAvg = totalPairs > 0 ? totalEncounters / totalPairs : 0;
    const idealOpponentSpread = {
      min: Math.floor(idealAvg),
      max: Math.ceil(idealAvg),
    };

    // Rest balance: games + sit-outs min/max/ideal
    const availableCourts = tournament.config.courts.filter(c => !c.unavailable);
    const numCourts = Math.min(availableCourts.length, Math.floor(activePlayers.length / 4));
    const totalRounds = rounds.length;
    const activePCount = activePlayers.length;
    const sitOutsPerRound = activePCount - numCourts * 4;

    let gamesMin = Infinity, gamesMax = -Infinity;
    let sitMin = Infinity, sitMax = -Infinity;
    for (const id of activeIds) {
      const g = gamesPerPlayer.get(id) ?? 0;
      if (g < gamesMin) gamesMin = g;
      if (g > gamesMax) gamesMax = g;
      const s = sitOutsPerPlayer.get(id) ?? 0;
      if (s < sitMin) sitMin = s;
      if (s > sitMax) sitMax = s;
    }

    const idealGamesAvg = activePCount > 0 ? (numCourts * 4 * totalRounds) / activePCount : 0;
    const idealSitOutsAvg = activePCount > 0 ? (sitOutsPerRound * totalRounds) / activePCount : 0;

    const restBalance = {
      games: { min: gamesMin, max: gamesMax, idealMin: Math.floor(idealGamesAvg), idealMax: Math.ceil(idealGamesAvg) },
      sitOuts: { min: sitMin, max: sitMax, idealMin: Math.floor(idealSitOutsAvg), idealMax: Math.ceil(idealSitOutsAvg) },
    };

    // Court balance: per-court min/max across active players
    const courtIds = availableCourts.slice(0, numCourts).map(c => c.id);
    const courtBalance = courtIds.map(courtId => {
      let cMin = Infinity, cMax = -Infinity;
      const totalMatchesOnCourt = rounds.reduce(
        (sum, r) => sum + r.matches.filter(m => m.courtId === courtId).length, 0
      );
      const idealAvg = activePCount > 0 ? (totalMatchesOnCourt * 4) / activePCount : 0;
      for (const id of activeIds) {
        const count = courtCountsPerPlayer.get(id)?.get(courtId) ?? 0;
        if (count < cMin) cMin = count;
        if (count > cMax) cMax = count;
      }
      return {
        courtName: courtNameMap.get(courtId) ?? courtId,
        min: cMin === Infinity ? 0 : cMin,
        max: cMax === -Infinity ? 0 : cMax,
        idealMin: Math.floor(idealAvg),
        idealMax: Math.ceil(idealAvg),
      };
    });

    // Ideal partner repeats: each match creates 2 partner pairs
    // For fixed-partner formats, fixed partners are expected and already filtered out above
    const totalPartnerSlots = totalMatches * 2;
    const idealRepeatPartners = strategy.hasFixedPartners
      ? 0 // In fixed-partner format, only non-fixed repeats count, and ideally there are none
      : Math.max(0, Math.min(totalPairs, totalPartnerSlots - totalPairs));

    // Ideal never-played: each match creates C(4,2)=6 unique court-mate pair slots
    const maxCoveredPairs = totalRounds * numCourts * 6;
    const idealNeverPlayed = Math.max(0, totalPairs - maxCoveredPairs);

    return { restBalance, repeatPartners, idealRepeatPartners, neverPlayed, idealNeverPlayed, opponentSpread, idealOpponentSpread, courtBalance, totalPairs };
  }, [tournament]);
}
