import type { ChaosLevel, MaldicionesHands } from '@padel/common';
import { CURSE_CARDS } from '../data/curseCards';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dealMaldicionesHands(
  teamIds: string[],
  chaosLevel: ChaosLevel,
  plannedRounds: number,
): MaldicionesHands {
  const cardsPerTeam = Math.max(1, Math.floor(plannedRounds / 3));

  // Build tier sequence based on chaos level
  // Each team gets 1 card from each available tier, cycling
  const tiers: string[] =
    chaosLevel === 'lite' ? ['green'] :
    chaosLevel === 'medium' ? ['green', 'yellow'] :
    ['green', 'yellow', 'red'];

  const hands: MaldicionesHands = {};
  for (const teamId of teamIds) {
    const dealt: string[] = [];
    const used = new Set<string>();

    for (let i = 0; i < cardsPerTeam; i++) {
      const tier = tiers[i % tiers.length];
      const pool = CURSE_CARDS.filter(c => c.tier === tier && !used.has(c.id));
      if (pool.length === 0) continue;
      const shuffled = shuffleArray(pool);
      dealt.push(shuffled[0].id);
      used.add(shuffled[0].id);
    }

    hands[teamId] = { cardIds: dealt, hasShield: true };
  }

  return hands;
}
