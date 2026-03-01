import { describe, it, expect } from 'vitest';
import { clubTeamMexicanoStrategy } from './clubTeamMexicano';
import type { Player, Team, Club, TournamentConfig } from '@padel/common';
import {
  makeConfig,
  assertRoundInvariants,
  assertTeamIntegrity,
  analyzeTeamSchedule,
  simulateDynamic,
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

function makeTeamsFromPlayers(players: Player[]): Team[] {
  const byClub = new Map<string, Player[]>();
  for (const p of players) {
    const cid = p.clubId ?? 'none';
    if (!byClub.has(cid)) byClub.set(cid, []);
    byClub.get(cid)!.push(p);
  }
  const teams: Team[] = [];
  let teamNum = 1;
  for (const [, clubPlayers] of byClub) {
    for (let i = 0; i < clubPlayers.length - 1; i += 2) {
      teams.push({
        id: `t${teamNum}`,
        player1Id: clubPlayers[i].id,
        player2Id: clubPlayers[i + 1].id,
        name: `Team ${teamNum}`,
      });
      teamNum++;
    }
  }
  return teams;
}

function makeClubConfig(numCourts: number): TournamentConfig {
  return makeConfig('club-team-mexicano', numCourts);
}

const TRIALS = 5;

describe('clubTeamMexicano simulation', () => {
  describe('2 clubs × 4p / 2c / 5r', () => {
    const clubs = makeClubs(2);
    const players = makeClubPlayers([
      { clubId: 'club1', count: 4 },
      { clubId: 'club2', count: 4 },
    ]);
    const teams = makeTeamsFromPlayers(players);
    const config = makeClubConfig(2);
    const numRounds = 5;

    it('structural invariants hold', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(
          clubTeamMexicanoStrategy, players, config, numRounds,
          { teams, clubs },
        );
        expect(rounds.length).toBeGreaterThanOrEqual(1);
        assertRoundInvariants(players, rounds);
        assertTeamIntegrity(teams, rounds);
      }
    });

    it('no sit-outs with even clubs and enough courts', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(
          clubTeamMexicanoStrategy, players, config, numRounds,
          { teams, clubs },
        );
        const stats = analyzeTeamSchedule(teams, rounds);
        expect(stats.sitMin).toBe(0);
        expect(stats.sitMax).toBe(0);
      }
    });

    it('all teams play every round', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(
          clubTeamMexicanoStrategy, players, config, numRounds,
          { teams, clubs },
        );
        const stats = analyzeTeamSchedule(teams, rounds);
        expect(stats.gamesMin).toBe(rounds.length);
        expect(stats.gamesMax).toBe(rounds.length);
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
    const teams = makeTeamsFromPlayers(players);
    const config = makeClubConfig(2);
    const numRounds = 3;

    it('structural invariants hold', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(
          clubTeamMexicanoStrategy, players, config, numRounds,
          { teams, clubs },
        );
        expect(rounds).toHaveLength(numRounds);
        assertRoundInvariants(players, rounds);
        assertTeamIntegrity(teams, rounds);
      }
    });

    it('sit-out spread ≤ 1 across teams', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(
          clubTeamMexicanoStrategy, players, config, numRounds,
          { teams, clubs },
        );
        const stats = analyzeTeamSchedule(teams, rounds);
        expect(stats.sitMax - stats.sitMin).toBeLessThanOrEqual(1);
      }
    });

    it('partners are always intra-club', () => {
      const playerClubMap = new Map<string, string>();
      for (const p of players) {
        if (p.clubId) playerClubMap.set(p.id, p.clubId);
      }

      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(
          clubTeamMexicanoStrategy, players, config, numRounds,
          { teams, clubs },
        );
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
        const rounds = simulateDynamic(
          clubTeamMexicanoStrategy, players, config, numRounds,
          { teams, clubs },
        );
        for (const round of rounds) {
          for (const match of round.matches) {
            expect(playerClubMap.get(match.team1[0])).not.toBe(playerClubMap.get(match.team2[0]));
          }
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
    const teams = makeTeamsFromPlayers(players);
    const config = makeClubConfig(4);
    const numRounds = 5;

    it('structural invariants hold', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(
          clubTeamMexicanoStrategy, players, config, numRounds,
          { teams, clubs },
        );
        expect(rounds.length).toBeGreaterThanOrEqual(1);
        assertRoundInvariants(players, rounds);
        assertTeamIntegrity(teams, rounds);
      }
    });

    it('no sit-outs with even number of clubs and enough courts', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(
          clubTeamMexicanoStrategy, players, config, numRounds,
          { teams, clubs },
        );
        const stats = analyzeTeamSchedule(teams, rounds);
        expect(stats.sitMin).toBe(0);
        expect(stats.sitMax).toBe(0);
      }
    });

    it('every club pair meets at least once across full round-robin', () => {
      const playerClubMap = new Map<string, string>();
      for (const p of players) {
        if (p.clubId) playerClubMap.set(p.id, p.clubId);
      }

      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(
          clubTeamMexicanoStrategy, players, config, numRounds,
          { teams, clubs },
        );
        const clubMatchups = new Set<string>();
        for (const round of rounds) {
          for (const match of round.matches) {
            const c1 = playerClubMap.get(match.team1[0])!;
            const c2 = playerClubMap.get(match.team2[0])!;
            clubMatchups.add([c1, c2].sort().join(':'));
          }
        }
        // C(4,2) = 6 unique club pairings
        expect(clubMatchups.size).toBe(6);
      }
    });
  });

  describe('3 clubs × 6p / 3c / 6r (larger clubs)', () => {
    const clubs = makeClubs(3);
    const players = makeClubPlayers([
      { clubId: 'club1', count: 6 },
      { clubId: 'club2', count: 6 },
      { clubId: 'club3', count: 6 },
    ]);
    const teams = makeTeamsFromPlayers(players);
    const config = makeClubConfig(3);
    const numRounds = 6;

    it('structural invariants hold', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(
          clubTeamMexicanoStrategy, players, config, numRounds,
          { teams, clubs },
        );
        expect(rounds).toHaveLength(numRounds);
        assertRoundInvariants(players, rounds);
        assertTeamIntegrity(teams, rounds);
      }
    });

    it('game spread is reasonable', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(
          clubTeamMexicanoStrategy, players, config, numRounds,
          { teams, clubs },
        );
        const stats = analyzeTeamSchedule(teams, rounds);
        expect(stats.gamesMax - stats.gamesMin).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('5 clubs × 4p / 4c / 5r (odd, 5 clubs)', () => {
    const clubs = makeClubs(5);
    const players = makeClubPlayers([
      { clubId: 'club1', count: 4 },
      { clubId: 'club2', count: 4 },
      { clubId: 'club3', count: 4 },
      { clubId: 'club4', count: 4 },
      { clubId: 'club5', count: 4 },
    ]);
    const teams = makeTeamsFromPlayers(players);
    const config = makeClubConfig(4);
    const numRounds = 5;

    it('structural invariants hold', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(
          clubTeamMexicanoStrategy, players, config, numRounds,
          { teams, clubs },
        );
        expect(rounds).toHaveLength(numRounds);
        assertRoundInvariants(players, rounds);
        assertTeamIntegrity(teams, rounds);
      }
    });

    it('sit-out spread ≤ 1', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(
          clubTeamMexicanoStrategy, players, config, numRounds,
          { teams, clubs },
        );
        const stats = analyzeTeamSchedule(teams, rounds);
        expect(stats.sitMax - stats.sitMin).toBeLessThanOrEqual(1);
      }
    });
  });
});
