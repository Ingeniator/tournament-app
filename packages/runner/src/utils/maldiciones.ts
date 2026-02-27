import type { ChaosLevel, MaldicionesHands } from '@padel/common';
import { getCardsForChaosLevel } from '../data/curseCards';

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
  const eligible = getCardsForChaosLevel(chaosLevel);
  const cardsPerTeam = Math.max(1, Math.floor(plannedRounds / 3));

  const hands: MaldicionesHands = {};
  for (const teamId of teamIds) {
    const shuffled = shuffleArray(eligible);
    const dealt = shuffled.slice(0, cardsPerTeam).map(c => c.id);
    hands[teamId] = { cardIds: dealt, hasShield: true };
  }

  return hands;
}
