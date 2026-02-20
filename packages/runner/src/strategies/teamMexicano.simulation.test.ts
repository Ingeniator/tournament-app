import { describe, it, expect } from 'vitest';
import { teamMexicanoStrategy } from './teamMexicano';
import { makePlayers, makeTeams, makeConfig, simulateDynamic, analyzeTeamSchedule, assertRoundInvariants, assertTeamIntegrity } from './simulation-helpers';

const TRIALS = 10;

describe('team-mexicano simulation', () => {
  describe('4 teams / 2c / 7r', () => {
    const players = makePlayers(8);
    const teams = makeTeams(players);
    const config = makeConfig('team-mexicano', 2);
    const numRounds = 7;

    it('all teams play every round, team integrity maintained', () => {
      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(
          teamMexicanoStrategy, players, config, numRounds, { teams },
        );
        expect(rounds).toHaveLength(numRounds);
        assertRoundInvariants(players, rounds);
        assertTeamIntegrity(teams, rounds);

        const stats = analyzeTeamSchedule(teams, rounds);
        expect(stats.gamesMin).toBe(7);
        expect(stats.gamesMax).toBe(7);
        expect(stats.sitMin).toBe(0);
        expect(stats.sitMax).toBe(0);
      }
    });
  });

  describe('3 teams / 1c / 5r', () => {
    const players = makePlayers(6);
    const teams = makeTeams(players);
    const config = makeConfig('team-mexicano', 1);
    const numRounds = 5;

    it('team sit-outs spread ≤ 1, team integrity maintained', () => {
      let worstSitSpread = 0;

      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(
          teamMexicanoStrategy, players, config, numRounds, { teams },
        );
        expect(rounds).toHaveLength(numRounds);
        assertRoundInvariants(players, rounds);
        assertTeamIntegrity(teams, rounds);

        const stats = analyzeTeamSchedule(teams, rounds);
        worstSitSpread = Math.max(worstSitSpread, stats.sitMax - stats.sitMin);
      }

      expect(worstSitSpread).toBeLessThanOrEqual(1);
    });
  });

  describe('6 teams / 2c / 5r', () => {
    const players = makePlayers(12);
    const teams = makeTeams(players);
    const config = makeConfig('team-mexicano', 2);
    const numRounds = 5;

    it('games spread ≤ 1, sit-outs spread ≤ 1, team integrity maintained', () => {
      let worstGameSpread = 0;
      let worstSitSpread = 0;

      for (let t = 0; t < TRIALS; t++) {
        const rounds = simulateDynamic(
          teamMexicanoStrategy, players, config, numRounds, { teams },
        );
        expect(rounds).toHaveLength(numRounds);
        assertRoundInvariants(players, rounds);
        assertTeamIntegrity(teams, rounds);

        const stats = analyzeTeamSchedule(teams, rounds);
        worstGameSpread = Math.max(worstGameSpread, stats.gamesMax - stats.gamesMin);
        worstSitSpread = Math.max(worstSitSpread, stats.sitMax - stats.sitMin);
      }

      expect(worstGameSpread).toBeLessThanOrEqual(1);
      expect(worstSitSpread).toBeLessThanOrEqual(1);
    });
  });
});
