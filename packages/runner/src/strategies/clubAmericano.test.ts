import { describe, it, expect } from 'vitest';
import { clubAmericanoStrategy } from './clubAmericano';
import type { Player, TournamentConfig, Tournament, Round, Club } from '@padel/common';

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

function makeConfig(numCourts: number, maxRounds: number | null = null): TournamentConfig {
  return {
    format: 'club-americano',
    pointsPerMatch: 21,
    courts: Array.from({ length: numCourts }, (_, i) => ({ id: `c${i + 1}`, name: `Court ${i + 1}` })),
    maxRounds,
  };
}

function makeTournament(
  players: Player[],
  config: TournamentConfig,
  clubs: Club[],
  rounds: Round[] = [],
): Tournament {
  return {
    id: 'test',
    name: 'Test Club Americano',
    config,
    phase: 'in-progress',
    players,
    teams: [],
    clubs,
    rounds,
    createdAt: 0,
    updatedAt: 0,
  };
}

function scoreRounds(rounds: Round[], team1Points: number, team2Points: number): Round[] {
  return rounds.map(r => ({
    ...r,
    matches: r.matches.map(m => ({
      ...m,
      score: m.score ?? { team1Points, team2Points },
    })),
  }));
}

function makeStandardSetup(numCourts = 2) {
  const clubs = makeClubs(2);
  const players = makeClubPlayers([
    { clubId: 'club1', count: 4 },
    { clubId: 'club2', count: 4 },
  ]);
  const config = makeConfig(numCourts);
  const tournament = makeTournament(players, config, clubs);
  return { clubs, players, config, tournament };
}

describe('clubAmericano strategy (individual)', () => {
  describe('strategy properties', () => {
    it('is static (not dynamic)', () => {
      expect(clubAmericanoStrategy.isDynamic).toBe(false);
    });

    it('does NOT have fixed partners', () => {
      expect(clubAmericanoStrategy.hasFixedPartners).toBe(false);
    });
  });

  describe('validateSetup', () => {
    it('requires at least 2 clubs', () => {
      const players = makeClubPlayers([{ clubId: 'club1', count: 4 }]);
      const errors = clubAmericanoStrategy.validateSetup(players, makeConfig(1));
      expect(errors.some(e => e.includes('2 clubs'))).toBe(true);
    });

    it('passes for valid setup', () => {
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const errors = clubAmericanoStrategy.validateSetup(players, makeConfig(1));
      expect(errors).toEqual([]);
    });
  });

  describe('generateSchedule', () => {
    it('generates rounds', () => {
      const { players, config, tournament } = makeStandardSetup(2);
      const { rounds } = clubAmericanoStrategy.generateSchedule(players, config, tournament);
      expect(rounds.length).toBeGreaterThanOrEqual(1);
    });

    it('returns empty with no clubs', () => {
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const config = makeConfig(1);
      const tournament = makeTournament(players, config, []);
      const { rounds } = clubAmericanoStrategy.generateSchedule(players, config, tournament);
      expect(rounds).toHaveLength(0);
    });

    it('partners are from the same club', () => {
      const { players, config, tournament } = makeStandardSetup(2);
      const { rounds } = clubAmericanoStrategy.generateSchedule(players, config, tournament);

      const playerClubMap = new Map<string, string>();
      for (const p of players) {
        if (p.clubId) playerClubMap.set(p.id, p.clubId);
      }

      for (const round of rounds) {
        for (const match of round.matches) {
          expect(playerClubMap.get(match.team1[0])).toBe(playerClubMap.get(match.team1[1]));
          expect(playerClubMap.get(match.team2[0])).toBe(playerClubMap.get(match.team2[1]));
        }
      }
    });

    it('opponents are from different clubs', () => {
      const { players, config, tournament } = makeStandardSetup(2);
      const { rounds } = clubAmericanoStrategy.generateSchedule(players, config, tournament);

      const playerClubMap = new Map<string, string>();
      for (const p of players) {
        if (p.clubId) playerClubMap.set(p.id, p.clubId);
      }

      for (const round of rounds) {
        for (const match of round.matches) {
          expect(playerClubMap.get(match.team1[0])).not.toBe(playerClubMap.get(match.team2[0]));
        }
      }
    });

    it('no player appears twice in the same round', () => {
      const { players, config, tournament } = makeStandardSetup(2);
      const { rounds } = clubAmericanoStrategy.generateSchedule(players, config, tournament);
      for (const round of rounds) {
        const allPlayerIds = round.matches.flatMap(m => [...m.team1, ...m.team2]);
        expect(new Set(allPlayerIds).size).toBe(allPlayerIds.length);
      }
    });
  });

  describe('generateAdditionalRounds', () => {
    it('generates additional rounds', () => {
      const { players, config, clubs } = makeStandardSetup(2);
      const tournament = makeTournament(players, config, clubs);
      const initial = clubAmericanoStrategy.generateSchedule(players, config, tournament);
      const scored = scoreRounds(initial.rounds, 11, 10);
      const { rounds } = clubAmericanoStrategy.generateAdditionalRounds(
        players, config, scored, 2, undefined, undefined, tournament,
      );
      expect(rounds).toHaveLength(2);
    });
  });

  describe('calculateStandings', () => {
    it('returns standings for all players (individual)', () => {
      const { players, config, clubs } = makeStandardSetup(2);
      const tournament = makeTournament(players, config, clubs);
      const standings = clubAmericanoStrategy.calculateStandings(tournament);
      // Individual standings: one entry per player
      expect(standings).toHaveLength(players.length);
    });
  });

  describe('getCompetitors', () => {
    it('returns one competitor per player', () => {
      const { players, config, clubs } = makeStandardSetup();
      const tournament = makeTournament(players, config, clubs);
      const competitors = clubAmericanoStrategy.getCompetitors(tournament);
      expect(competitors).toHaveLength(players.length);
    });
  });
});
