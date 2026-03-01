import { describe, it, expect } from 'vitest';
import { clubAmericanoStrategy } from './clubAmericano';
import type { Player, Club, TournamentConfig, Tournament, Round } from '@padel/common';
import {
  makeConfig,
  assertRoundInvariants,
} from './simulation-helpers.test-utils';

function makeClubPlayers(clubSizes: { clubId: string; count: number }[]): Player[] {
  const players: Player[] = [];
  let idx = 1;
  for (const { clubId, count } of clubSizes) {
    for (let i = 0; i < count; i++) {
      players.push({ id: `p${idx}`, name: `Player ${idx}`, clubId });
      idx++;
    }
  }
  return players;
}

function makeClubs(n: number): Club[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `club${i + 1}`,
    name: `Club ${i + 1}`,
  }));
}

function makeClubConfig(numCourts: number): TournamentConfig {
  return makeConfig('club-americano', numCourts);
}

function simulateStatic(
  players: Player[],
  config: TournamentConfig,
  numRounds: number,
  opts: { clubs: Club[] },
): Round[] {
  const tournament: Tournament = {
    id: 'sim',
    name: 'Simulation',
    config: { ...config, maxRounds: numRounds },
    phase: 'in-progress',
    players,
    teams: [],
    clubs: opts.clubs,
    rounds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const { rounds } = clubAmericanoStrategy.generateSchedule(players, tournament.config, tournament);
  return rounds;
}

const TRIALS = 5;

describe('clubAmericano (individual) simulation', () => {
  describe('2 clubs × 4p / 2c / 3r', () => {
    const clubs = makeClubs(2);
    const players = makeClubPlayers([
      { clubId: 'club1', count: 4 },
      { clubId: 'club2', count: 4 },
    ]);
    const config = makeClubConfig(2);
    const numRounds = 3;

    it('structural invariants hold', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateStatic(players, config, numRounds, { clubs });
        expect(rounds.length).toBeGreaterThanOrEqual(1);
        assertRoundInvariants(players, rounds);
      }
    });

    it('partners are always intra-club', () => {
      const playerClubMap = new Map<string, string>();
      for (const p of players) {
        if (p.clubId) playerClubMap.set(p.id, p.clubId);
      }
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateStatic(players, config, numRounds, { clubs });
        for (const round of rounds) {
          for (const match of round.matches) {
            expect(playerClubMap.get(match.team1[0])).toBe(playerClubMap.get(match.team1[1]));
            expect(playerClubMap.get(match.team2[0])).toBe(playerClubMap.get(match.team2[1]));
          }
        }
      }
    });

    it('opponents are always inter-club', () => {
      const playerClubMap = new Map<string, string>();
      for (const p of players) {
        if (p.clubId) playerClubMap.set(p.id, p.clubId);
      }
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateStatic(players, config, numRounds, { clubs });
        for (const round of rounds) {
          for (const match of round.matches) {
            expect(playerClubMap.get(match.team1[0])).not.toBe(playerClubMap.get(match.team2[0]));
          }
        }
      }
    });

    it('no sit-outs with even clubs and enough courts', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateStatic(players, config, numRounds, { clubs });
        for (const round of rounds) {
          expect(round.sitOuts).toHaveLength(0);
        }
      }
    });
  });

  describe('3 clubs × 4p / 2c / 3r', () => {
    const clubs = makeClubs(3);
    const players = makeClubPlayers([
      { clubId: 'club1', count: 4 },
      { clubId: 'club2', count: 4 },
      { clubId: 'club3', count: 4 },
    ]);
    const config = makeClubConfig(2);
    const numRounds = 3;

    it('structural invariants hold', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateStatic(players, config, numRounds, { clubs });
        expect(rounds).toHaveLength(numRounds);
        assertRoundInvariants(players, rounds);
      }
    });

    it('with 3 clubs (odd), one club sits out per round', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateStatic(players, config, numRounds, { clubs });
        for (const round of rounds) {
          // One club of 4 players sits out
          expect(round.sitOuts.length).toBe(4);
        }
      }
    });
  });

  describe('4 clubs × 4p / 4c / 5r', () => {
    const clubs = makeClubs(4);
    const players = makeClubPlayers([
      { clubId: 'club1', count: 4 },
      { clubId: 'club2', count: 4 },
      { clubId: 'club3', count: 4 },
      { clubId: 'club4', count: 4 },
    ]);
    const config = makeClubConfig(4);
    const numRounds = 5;

    it('structural invariants hold', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateStatic(players, config, numRounds, { clubs });
        expect(rounds.length).toBeGreaterThanOrEqual(1);
        assertRoundInvariants(players, rounds);
      }
    });

    it('every club pair meets at least once', () => {
      const playerClubMap = new Map<string, string>();
      for (const p of players) {
        if (p.clubId) playerClubMap.set(p.id, p.clubId);
      }

      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateStatic(players, config, numRounds, { clubs });
        const clubMatchups = new Set<string>();
        for (const round of rounds) {
          for (const match of round.matches) {
            const c1 = playerClubMap.get(match.team1[0])!;
            const c2 = playerClubMap.get(match.team2[0])!;
            clubMatchups.add([c1, c2].sort().join(':'));
          }
        }
        expect(clubMatchups.size).toBe(6);
      }
    });
  });
});
