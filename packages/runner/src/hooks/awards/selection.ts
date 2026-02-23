import type { AwardTier, Nomination } from './types';
import { AWARD_TIERS } from './types';

export function assignTiers(awards: Nomination[]): void {
  for (const award of awards) {
    award.tier = AWARD_TIERS[award.id] ?? 'common';
  }
}

function seededShuffle<T>(arr: T[], s: number): T[] {
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
}

export function selectAwards(
  awards: Nomination[],
  maxAwards: number,
  seed: number,
): Nomination[] {
  const legendary = seededShuffle(awards.filter(a => a.tier === 'legendary'), seed);
  const rare = seededShuffle(awards.filter(a => a.tier === 'rare'), seed + 1);
  const common = seededShuffle(awards.filter(a => a.tier === 'common'), seed + 2);

  const tierQueues = { legendary: [...legendary], rare: [...rare], common: [...common] };

  // Seeded random number generator (0-1 range)
  let h = Math.abs(seed + 7) | 1;
  const nextRand = () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = h ^ (h >>> 16);
    return (h >>> 0) / 0x100000000;
  };

  // Soft cap: max 2 non-podium awards per player name
  const MAX_PER_PLAYER = 2;
  const playerAwardCount = new Map<string, number>();

  const isWithinCap = (award: Nomination): boolean =>
    award.playerNames.every(name => (playerAwardCount.get(name) ?? 0) < MAX_PER_PLAYER);

  const recordSelection = (award: Nomination): void => {
    for (const name of award.playerNames) {
      playerAwardCount.set(name, (playerAwardCount.get(name) ?? 0) + 1);
    }
  };

  const pickFromTier = (preferred: AwardTier, respectCap: boolean): Nomination | undefined => {
    const tryOrder: AwardTier[] =
      preferred === 'legendary' ? ['legendary', 'rare', 'common'] :
      preferred === 'rare' ? ['rare', 'common', 'legendary'] :
      ['common', 'rare', 'legendary'];
    for (const t of tryOrder) {
      const queue = tierQueues[t];
      const idx = respectCap ? queue.findIndex(isWithinCap) : 0;
      if (idx !== -1 && idx < queue.length) {
        const [picked] = queue.splice(idx, 1);
        recordSelection(picked);
        return picked;
      }
    }
    return undefined;
  };

  // Primary pass - respect the per-player cap
  const selected: Nomination[] = [];
  for (let i = 0; i < maxAwards; i++) {
    const roll = nextRand();
    // Weights: 15% legendary, 30% rare, 55% common
    const tier: AwardTier = roll < 0.15 ? 'legendary' : roll < 0.45 ? 'rare' : 'common';
    const picked = pickFromTier(tier, true);
    if (picked) selected.push(picked);
  }

  // Soft relaxation - if slots remain unfilled, ignore the cap
  if (selected.length < maxAwards) {
    const remaining = seededShuffle(
      [...tierQueues.legendary, ...tierQueues.rare, ...tierQueues.common],
      seed + 4,
    );
    for (const award of remaining) {
      if (selected.length >= maxAwards) break;
      selected.push(award);
    }
  }

  // Final shuffle so tiers are interleaved
  return seededShuffle(selected, seed + 3);
}
