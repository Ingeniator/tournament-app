import { describe, it, expect } from 'vitest';
import { dealMaldicionesHands } from './maldiciones';
import { getCardsForChaosLevel } from '../data/curseCards';

describe('dealMaldicionesHands', () => {
  const teamIds = ['team1', 'team2', 'team3'];

  // Derive pool sizes from actual card data
  const greenPool = getCardsForChaosLevel('lite').length;
  const hardcorePool = getCardsForChaosLevel('hardcore').length;
  const allValidIds = getCardsForChaosLevel('hardcore').map(c => c.id);
  const greenIds = getCardsForChaosLevel('lite').map(c => c.id);
  const yellowIds = getCardsForChaosLevel('hardcore')
    .filter(c => c.tier === 'yellow')
    .map(c => c.id);
  const redIds = getCardsForChaosLevel('hardcore')
    .filter(c => c.tier === 'red')
    .map(c => c.id);

  it('deals cards to all teams', () => {
    const hands = dealMaldicionesHands(teamIds, 'medium', 6);
    for (const id of teamIds) {
      expect(hands[id]).toBeDefined();
      expect(hands[id].cardIds.length).toBeGreaterThan(0);
    }
  });

  it('every team starts with a shield', () => {
    const hands = dealMaldicionesHands(teamIds, 'medium', 6);
    for (const id of teamIds) {
      expect(hands[id].hasShield).toBe(true);
    }
  });

  it('cards per team = max(1, floor(plannedRounds / 3))', () => {
    // 3 rounds → 1 card
    const h3 = dealMaldicionesHands(teamIds, 'medium', 3);
    expect(h3.team1.cardIds.length).toBe(1);

    // 6 rounds → 2 cards
    const h6 = dealMaldicionesHands(teamIds, 'medium', 6);
    expect(h6.team1.cardIds.length).toBe(2);

    // 9 rounds → 3 cards
    const h9 = dealMaldicionesHands(teamIds, 'medium', 9);
    expect(h9.team1.cardIds.length).toBe(3);

    // 1 round → 1 card (min 1)
    const h1 = dealMaldicionesHands(teamIds, 'medium', 1);
    expect(h1.team1.cardIds.length).toBe(1);
  });

  it('lite chaos level only deals green cards', () => {
    const hands = dealMaldicionesHands(teamIds, 'lite', 9);
    for (const id of teamIds) {
      for (const cardId of hands[id].cardIds) {
        expect(greenIds).toContain(cardId);
      }
    }
  });

  it('medium chaos level deals green + yellow cards, no red', () => {
    const hands = dealMaldicionesHands(teamIds, 'medium', 9);
    for (const id of teamIds) {
      for (const cardId of hands[id].cardIds) {
        expect(redIds).not.toContain(cardId);
        expect([...greenIds, ...yellowIds]).toContain(cardId);
      }
    }
  });

  it('hardcore chaos level deals one card from each tier', () => {
    // With 9 rounds = 3 cards per team, hardcore gets 1 green + 1 yellow + 1 red
    const hands = dealMaldicionesHands(teamIds, 'hardcore', 9);
    for (const id of teamIds) {
      const cards = hands[id].cardIds;
      expect(cards.length).toBe(3);
      expect(greenIds).toContain(cards[0]);
      expect(yellowIds).toContain(cards[1]);
      expect(redIds).toContain(cards[2]);
    }
  });

  it('card IDs are valid curse card IDs', () => {
    const hands = dealMaldicionesHands(teamIds, 'hardcore', 9);
    for (const id of teamIds) {
      for (const cardId of hands[id].cardIds) {
        expect(allValidIds).toContain(cardId);
      }
    }
  });

  it('deals no cards to empty team list', () => {
    const hands = dealMaldicionesHands([], 'medium', 6);
    expect(Object.keys(hands)).toHaveLength(0);
  });

  it('cards dealt — lite chaos deals fewer cards per team', () => {
    // When cardsPerTeam exceeds the pool size, hands are capped at pool size.
    const bigRounds = 60; // cardsPerTeam = floor(60/3) = 20
    const liteHands = dealMaldicionesHands(teamIds, 'lite', bigRounds);
    const mediumHands = dealMaldicionesHands(teamIds, 'medium', bigRounds);

    for (const id of teamIds) {
      expect(liteHands[id].cardIds.length).toBeLessThanOrEqual(greenPool);
      expect(mediumHands[id].cardIds.length).toBeGreaterThan(liteHands[id].cardIds.length);
    }
  });

  it('cards dealt — hardcore chaos deals more cards per team', () => {
    const bigRounds = 60; // cardsPerTeam = floor(60/3) = 20
    const liteHands = dealMaldicionesHands(teamIds, 'lite', bigRounds);
    const hardcoreHands = dealMaldicionesHands(teamIds, 'hardcore', bigRounds);

    for (const id of teamIds) {
      expect(hardcoreHands[id].cardIds.length).toBeLessThanOrEqual(hardcorePool);
      expect(hardcoreHands[id].cardIds.length).toBeGreaterThan(liteHands[id].cardIds.length);
    }
  });

  it('card hands are unique — no duplicate card IDs within a single hand', () => {
    for (let run = 0; run < 10; run++) {
      const hands = dealMaldicionesHands(teamIds, 'hardcore', 9);
      for (const id of teamIds) {
        const ids = hands[id].cardIds;
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });

  it('each team gets a hand — all team IDs get entries in the result', () => {
    const fiveTeams = ['alpha', 'bravo', 'charlie', 'delta', 'echo'];
    const hands = dealMaldicionesHands(fiveTeams, 'medium', 6);

    expect(Object.keys(hands).length).toBe(fiveTeams.length);
    for (const id of fiveTeams) {
      expect(hands[id]).toBeDefined();
      expect(hands[id].cardIds).toBeInstanceOf(Array);
      expect(hands[id].cardIds.length).toBeGreaterThan(0);
      expect(hands[id].hasShield).toBe(true);
    }
  });
});
