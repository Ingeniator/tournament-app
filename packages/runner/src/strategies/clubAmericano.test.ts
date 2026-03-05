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

    it('passes for valid setup with 4 per club', () => {
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const errors = clubAmericanoStrategy.validateSetup(players, makeConfig(1));
      expect(errors).toEqual([]);
    });

    it('passes for 2 players per club (individual format, not team)', () => {
      const players = makeClubPlayers([
        { clubId: 'club1', count: 2 },
        { clubId: 'club2', count: 2 },
      ]);
      const errors = clubAmericanoStrategy.validateSetup(players, makeConfig(1));
      expect(errors).toEqual([]);
    });

    it('rejects 1 player per club', () => {
      const players = makeClubPlayers([
        { clubId: 'club1', count: 1 },
        { clubId: 'club2', count: 1 },
      ]);
      const errors = clubAmericanoStrategy.validateSetup(players, makeConfig(1));
      expect(errors.some(e => e.includes('at least 2'))).toBe(true);
    });

    it('rejects odd number per club', () => {
      const players = makeClubPlayers([
        { clubId: 'club1', count: 3 },
        { clubId: 'club2', count: 3 },
      ]);
      const errors = clubAmericanoStrategy.validateSetup(players, makeConfig(1));
      expect(errors.some(e => e.includes('even'))).toBe(true);
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

  describe('e2e: 2 players per club (minimal setup)', () => {
    function makeMinimalSetup() {
      const clubs = makeClubs(2);
      const players = makeClubPlayers([
        { clubId: 'club1', count: 2 },
        { clubId: 'club2', count: 2 },
      ]);
      const config = makeConfig(1); // 1 court for 4 players
      const tournament = makeTournament(players, config, clubs);
      return { clubs, players, config, tournament };
    }

    it('validates setup with 2 per club', () => {
      const { players, config } = makeMinimalSetup();
      const errors = clubAmericanoStrategy.validateSetup(players, config);
      expect(errors).toEqual([]);
    });

    it('generates initial schedule', () => {
      const { players, config, tournament } = makeMinimalSetup();
      const { rounds } = clubAmericanoStrategy.generateSchedule(players, config, tournament);
      expect(rounds.length).toBeGreaterThanOrEqual(1);
      // 1 court, 2v2 → 1 match per round
      expect(rounds[0].matches).toHaveLength(1);
      // All 4 players in the match
      const allIds = [...rounds[0].matches[0].team1, ...rounds[0].matches[0].team2];
      expect(allIds).toHaveLength(4);
    });

    it('partners from same club, opponents from different club', () => {
      const { players, config, tournament } = makeMinimalSetup();
      const { rounds } = clubAmericanoStrategy.generateSchedule(players, config, tournament);
      const clubOf = new Map(players.map(p => [p.id, p.clubId]));

      for (const round of rounds) {
        for (const match of round.matches) {
          // Partners: same club
          expect(clubOf.get(match.team1[0])).toBe(clubOf.get(match.team1[1]));
          expect(clubOf.get(match.team2[0])).toBe(clubOf.get(match.team2[1]));
          // Opponents: different clubs
          expect(clubOf.get(match.team1[0])).not.toBe(clubOf.get(match.team2[0]));
        }
      }
    });

    it('full round trip: generate → score → add round → standings', () => {
      const { players, config, clubs } = makeMinimalSetup();
      const tournament = makeTournament(players, config, clubs);

      // Generate initial schedule
      const { rounds } = clubAmericanoStrategy.generateSchedule(players, config, tournament);
      expect(rounds.length).toBeGreaterThanOrEqual(1);

      // Score all matches
      const scored = scoreRounds(rounds, 12, 9);
      const tournamentWithRounds = makeTournament(players, config, clubs, scored);

      // Standings after round 1
      const standings = clubAmericanoStrategy.calculateStandings(tournamentWithRounds);
      expect(standings).toHaveLength(4);
      expect(standings.every(s => s.matchesPlayed === 1)).toBe(true);
      // Winners get more points than losers
      const winners = standings.filter(s => s.matchesWon === 1);
      const losers = standings.filter(s => s.matchesLost === 1);
      expect(winners).toHaveLength(2);
      expect(losers).toHaveLength(2);
      expect(winners[0].totalPoints).toBeGreaterThan(losers[0].totalPoints);

      // Add another round
      const { rounds: extraRounds } = clubAmericanoStrategy.generateAdditionalRounds(
        players, config, scored, 1, undefined, undefined, tournamentWithRounds,
      );
      expect(extraRounds).toHaveLength(1);
      expect(extraRounds[0].matches).toHaveLength(1);
    });
  });

  describe('e2e: planner export → runner play (2 per club)', () => {
    /**
     * Simulates what the planner's buildRunnerTournament does:
     * maps planner registrations to runner players with new IDs.
     */
    function simulatePlannerExport() {
      const clubs = makeClubs(2);
      // Planner registrations: 2 per club, with planner-style IDs
      const plannerRegs = [
        { id: 'reg1', name: 'Alice', clubId: 'club1' },
        { id: 'reg2', name: 'Bob', clubId: 'club1' },
        { id: 'reg3', name: 'Carol', clubId: 'club2' },
        { id: 'reg4', name: 'Dave', clubId: 'club2' },
      ];

      // Planner generates new runner IDs (like buildRunnerTournament does)
      const players: Player[] = plannerRegs.map((r, i) => ({
        id: `runner-${i + 1}`,
        name: r.name,
        clubId: r.clubId,
      }));

      const config = makeConfig(1, 1); // 1 court, 1 round
      const tournament = makeTournament(players, config, clubs);
      return { players, config, clubs, tournament };
    }

    it('validates exported players', () => {
      const { players, config } = simulatePlannerExport();
      const errors = clubAmericanoStrategy.validateSetup(players, config);
      expect(errors).toEqual([]);
    });

    it('generates schedule, scores, computes standings, adds round', () => {
      const { players, config, clubs, tournament } = simulatePlannerExport();

      // Step 1: Generate schedule
      const { rounds } = clubAmericanoStrategy.generateSchedule(players, config, tournament);
      expect(rounds).toHaveLength(1);
      expect(rounds[0].matches).toHaveLength(1);
      expect(rounds[0].sitOuts).toHaveLength(0);

      // Verify club constraints
      const clubOf = new Map(players.map(p => [p.id, p.clubId]));
      const m = rounds[0].matches[0];
      expect(clubOf.get(m.team1[0])).toBe(clubOf.get(m.team1[1])); // partners same club
      expect(clubOf.get(m.team2[0])).toBe(clubOf.get(m.team2[1]));
      expect(clubOf.get(m.team1[0])).not.toBe(clubOf.get(m.team2[0])); // opponents diff club

      // Step 2: Score
      const scored = scoreRounds(rounds, 10, 6);

      // Step 3: Standings
      const withRounds = makeTournament(players, config, clubs, scored);
      const standings = clubAmericanoStrategy.calculateStandings(withRounds);
      expect(standings).toHaveLength(4);
      expect(standings.every(s => s.matchesPlayed === 1)).toBe(true);
      expect(standings.filter(s => s.matchesWon === 1)).toHaveLength(2);
      expect(standings.filter(s => s.matchesLost === 1)).toHaveLength(2);

      // Step 4: Add another round
      const { rounds: round2 } = clubAmericanoStrategy.generateAdditionalRounds(
        players, config, scored, 1, undefined, undefined, withRounds,
      );
      expect(round2).toHaveLength(1);
      expect(round2[0].matches).toHaveLength(1);

      // Score round 2 and verify cumulative standings
      const scored2 = scoreRounds(round2, 8, 8); // draw
      const allRounds = [...scored, ...scored2];
      const final = makeTournament(players, config, clubs, allRounds);
      const finalStandings = clubAmericanoStrategy.calculateStandings(final);
      expect(finalStandings).toHaveLength(4);
      expect(finalStandings.every(s => s.matchesPlayed === 2)).toBe(true);
    });
  });
});
