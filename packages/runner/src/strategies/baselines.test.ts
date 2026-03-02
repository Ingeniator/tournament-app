import { describe, it, expect } from 'vitest';
import { getBaseline, instantiateBaseline } from './baselines';
import { scoreSchedule, partnerKey } from './shared';

function makePlayers(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
}

describe('baselines', () => {
  describe('getBaseline', () => {
    it.each([
      { p: 10, c: 2, rounds: 9 },
      { p: 14, c: 3, rounds: 14 },
      { p: 16, c: 4, rounds: 15 },
      { p: 20, c: 4, rounds: 19 },
    ])('returns template for $p:$c', ({ p, c, rounds }) => {
      const t = getBaseline(p, c);
      expect(t).not.toBeNull();
      expect(t!.players).toBe(p);
      expect(t!.courts).toBe(c);
      expect(t!.rounds).toHaveLength(rounds);
    });

    it('returns null for unknown configs', () => {
      expect(getBaseline(7, 1)).toBeNull();
      expect(getBaseline(99, 10)).toBeNull();
    });
  });

  describe('instantiateBaseline', () => {
    const template = getBaseline(16, 4)!;
    const players = makePlayers(16);
    const courtIds = ['c1', 'c2', 'c3', 'c4'];

    it('maps indices to real player IDs and court IDs', () => {
      const rounds = instantiateBaseline(template, players, courtIds, 15, 1)!;
      expect(rounds).toHaveLength(15);

      for (const round of rounds) {
        expect(round.matches).toHaveLength(4);
        // All players in each round should be valid player IDs
        const playerIdsInRound = new Set<string>();
        for (const match of round.matches) {
          for (const pid of [...match.team1, ...match.team2]) {
            expect(players.some(p => p.id === pid)).toBe(true);
            playerIdsInRound.add(pid);
          }
          // Court IDs should be valid
          expect(courtIds).toContain(match.courtId);
        }
        // All 16 players play each round (no sit-outs in 16:4)
        expect(playerIdsInRound.size).toBe(16);
      }
    });

    it('assigns correct round numbers', () => {
      const rounds = instantiateBaseline(template, players, courtIds, 5, 3)!;
      expect(rounds).toHaveLength(5);
      expect(rounds[0].roundNumber).toBe(3);
      expect(rounds[4].roundNumber).toBe(7);
    });

    it('returns null for mismatched player count', () => {
      const tooFew = makePlayers(12);
      expect(instantiateBaseline(template, tooFew, courtIds, 15, 1)).toBeNull();
    });

    it('returns null for mismatched court count', () => {
      expect(instantiateBaseline(template, players, ['c1', 'c2'], 15, 1)).toBeNull();
    });

    it('returns null when requesting more rounds than template has', () => {
      expect(instantiateBaseline(template, players, courtIds, 20, 1)).toBeNull();
    });
  });

  describe.each([
    { p: 10, c: 2, rounds: 9,  maxOppSpread: 2 },
    { p: 14, c: 3, rounds: 14, maxOppSpread: 3 },
    { p: 16, c: 4, rounds: 15, maxOppSpread: 4 },
    { p: 20, c: 4, rounds: 19, maxOppSpread: 3 },
  ])('$p:$c baseline quality', ({ p, c, rounds, maxOppSpread }) => {
    const template = getBaseline(p, c)!;
    const players = makePlayers(p);
    const courtIds = Array.from({ length: c }, (_, i) => `c${i + 1}`);

    it('has 0 partner repeats', () => {
      const instantiated = instantiateBaseline(template, players, courtIds, rounds, 1)!;
      const pc = new Map<string, number>();
      for (const round of instantiated) {
        for (const match of round.matches) {
          const k1 = partnerKey(match.team1[0], match.team1[1]);
          const k2 = partnerKey(match.team2[0], match.team2[1]);
          pc.set(k1, (pc.get(k1) ?? 0) + 1);
          pc.set(k2, (pc.get(k2) ?? 0) + 1);
        }
      }
      let repeats = 0;
      for (const v of pc.values()) if (v > 1) repeats += v - 1;
      expect(repeats).toBe(0);
    });

    it(`has opponent spread ≤ ${maxOppSpread}`, () => {
      const instantiated = instantiateBaseline(template, players, courtIds, rounds, 1)!;
      const score = scoreSchedule(instantiated);
      expect(score[1]).toBeLessThanOrEqual(maxOppSpread);
    });

    it('score matches stored score', () => {
      const instantiated = instantiateBaseline(template, players, courtIds, rounds, 1)!;
      const score = scoreSchedule(instantiated);
      expect(score).toEqual(template.score);
    });
  });
});
