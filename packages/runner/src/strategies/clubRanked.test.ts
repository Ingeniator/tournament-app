import { describe, it, expect } from 'vitest';
import { clubRankedStrategy } from './clubRanked';
import type { Player, TournamentConfig, Team, Tournament, Round, Club } from '@padel/common';

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
  }));
}

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
      });
      teamNum++;
    }
  }
  return teams;
}

function makeConfig(numCourts: number, maxRounds: number | null = null): TournamentConfig {
  return {
    format: 'club-ranked',
    pointsPerMatch: 21,
    courts: Array.from({ length: numCourts }, (_, i) => ({ id: `c${i + 1}`, name: `Court ${i + 1}` })),
    maxRounds,
  };
}

function makeTournament(
  players: Player[],
  teams: Team[],
  config: TournamentConfig,
  clubs: Club[],
  rounds: Round[] = [],
): Tournament {
  return {
    id: 'test',
    name: 'Test Club Ranked',
    config,
    phase: 'in-progress',
    players,
    teams,
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

function makeStandardSetup(numCourts = 3, maxRounds: number | null = null) {
  const clubs = makeClubs(3);
  const players = makeClubPlayers([
    { clubId: 'club1', count: 4 },
    { clubId: 'club2', count: 4 },
    { clubId: 'club3', count: 4 },
  ]);
  const teams = makeTeamsFromPlayers(players);
  const config = makeConfig(numCourts, maxRounds);
  const tournament = makeTournament(players, teams, config, clubs);
  return { clubs, players, teams, config, tournament };
}

describe('clubRanked strategy', () => {
  describe('strategy properties', () => {
    it('is static (not dynamic)', () => {
      expect(clubRankedStrategy.isDynamic).toBe(false);
    });

    it('has fixed partners', () => {
      expect(clubRankedStrategy.hasFixedPartners).toBe(true);
    });
  });

  describe('validateSetup', () => {
    it('requires at least 2 clubs', () => {
      const players = makeClubPlayers([{ clubId: 'club1', count: 4 }]);
      const errors = clubRankedStrategy.validateSetup(players, makeConfig(1));
      expect(errors.some(e => e.includes('2 clubs'))).toBe(true);
    });

    it('requires at least 4 players per club', () => {
      const players = makeClubPlayers([
        { clubId: 'club1', count: 2 },
        { clubId: 'club2', count: 4 },
      ]);
      const errors = clubRankedStrategy.validateSetup(players, makeConfig(1));
      expect(errors.some(e => e.includes('4 players'))).toBe(true);
    });

    it('requires even number of players per club', () => {
      const players = makeClubPlayers([
        { clubId: 'club1', count: 5 },
        { clubId: 'club2', count: 4 },
      ]);
      const errors = clubRankedStrategy.validateSetup(players, makeConfig(1));
      expect(errors.some(e => e.includes('even number'))).toBe(true);
    });

    it('rejects unassigned players', () => {
      const players = [
        ...makeClubPlayers([
          { clubId: 'club1', count: 4 },
          { clubId: 'club2', count: 4 },
        ]),
        { id: 'p99', name: 'Unassigned' },
      ];
      const errors = clubRankedStrategy.validateSetup(players, makeConfig(1));
      expect(errors.some(e => e.includes('not assigned'))).toBe(true);
    });

    it('requires at least 1 court', () => {
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const config: TournamentConfig = {
        format: 'club-ranked',
        pointsPerMatch: 21,
        courts: [],
        maxRounds: null,
      };
      const errors = clubRankedStrategy.validateSetup(players, config);
      expect(errors.some(e => e.includes('1 court'))).toBe(true);
    });

    it('passes for valid setup', () => {
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const errors = clubRankedStrategy.validateSetup(players, makeConfig(1));
      expect(errors).toEqual([]);
    });
  });

  describe('generateSchedule', () => {
    it('returns empty with no clubs', () => {
      const players = makePlayers(4);
      const teams = makeTeamsFromPlayers(players);
      const config = makeConfig(1);
      const tournament = makeTournament(players, teams, config, []);
      const { rounds, warnings } = clubRankedStrategy.generateSchedule(players, config, tournament);
      expect(rounds).toHaveLength(0);
      expect(warnings.some(w => w.includes('Not enough'))).toBe(true);
    });

    it('generates all rounds upfront (static)', () => {
      const { players, config, tournament } = makeStandardSetup(3);
      const { rounds } = clubRankedStrategy.generateSchedule(players, config, tournament);
      expect(rounds).toHaveLength(3);
    });

    it('uses slot-based matching (original team order)', () => {
      const clubs = makeClubs(2);
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const teams = makeTeamsFromPlayers(players);
      const config = makeConfig(2);
      const tournament = makeTournament(players, teams, config, clubs);
      const { rounds } = clubRankedStrategy.generateSchedule(players, config, tournament);

      expect(rounds).toHaveLength(1);
      expect(rounds[0].matches.length).toBe(2);
    });

    it('partners are from the same club', () => {
      const { players, config, tournament } = makeStandardSetup(3);
      const { rounds } = clubRankedStrategy.generateSchedule(players, config, tournament);

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
      const { players, config, tournament } = makeStandardSetup(3);
      const { rounds } = clubRankedStrategy.generateSchedule(players, config, tournament);

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
      const { players, config, tournament } = makeStandardSetup(3);
      const { rounds } = clubRankedStrategy.generateSchedule(players, config, tournament);
      for (const round of rounds) {
        const allPlayerIds = round.matches.flatMap(m => [...m.team1, ...m.team2]);
        expect(new Set(allPlayerIds).size).toBe(allPlayerIds.length);
      }
    });

    it('with 3 clubs (odd), one club sits out per round', () => {
      const { players, config, tournament } = makeStandardSetup(2);
      const { rounds } = clubRankedStrategy.generateSchedule(players, config, tournament);
      expect(rounds[0].sitOuts.length).toBe(4);
    });
  });

  describe('generateAdditionalRounds', () => {
    it('generates the requested number of additional rounds', () => {
      const { players, teams, config, clubs } = makeStandardSetup(3);
      const tournament = makeTournament(players, teams, config, clubs);
      const initial = clubRankedStrategy.generateSchedule(players, config, tournament);
      const scored = scoreRounds(initial.rounds, 11, 10);
      const { rounds } = clubRankedStrategy.generateAdditionalRounds(
        players, config, scored, 2, undefined, undefined, tournament,
      );
      expect(rounds).toHaveLength(2);
    });

    it('starts round numbering after existing rounds', () => {
      const { players, teams, config, clubs } = makeStandardSetup(3);
      const tournament = makeTournament(players, teams, config, clubs);
      const initial = clubRankedStrategy.generateSchedule(players, config, tournament);
      const scored = scoreRounds(initial.rounds, 11, 10);
      const { rounds } = clubRankedStrategy.generateAdditionalRounds(
        players, config, scored, 1, undefined, undefined, tournament,
      );
      expect(rounds[0].roundNumber).toBe(initial.rounds.length + 1);
    });
  });

  describe('club round-robin structure', () => {
    it('with even clubs (4), each club meets every other over 3 rounds', () => {
      const clubs = makeClubs(4);
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
        { clubId: 'club3', count: 4 },
        { clubId: 'club4', count: 4 },
      ]);
      const teams = makeTeamsFromPlayers(players);
      const config = makeConfig(4);
      const tournament = makeTournament(players, teams, config, clubs);
      const { rounds: allRounds } = clubRankedStrategy.generateSchedule(players, config, tournament);

      expect(allRounds).toHaveLength(3);

      const playerClubMap = new Map<string, string>();
      for (const p of players) {
        if (p.clubId) playerClubMap.set(p.id, p.clubId);
      }
      const clubMatchups = new Set<string>();
      for (const round of allRounds) {
        for (const match of round.matches) {
          const c1 = playerClubMap.get(match.team1[0])!;
          const c2 = playerClubMap.get(match.team2[0])!;
          clubMatchups.add([c1, c2].sort().join(':'));
        }
      }
      expect(clubMatchups.size).toBe(6);
    });

    it('with odd clubs (3), each club gets a bye', () => {
      const { players, teams, config, clubs } = makeStandardSetup(2);
      const tournament = makeTournament(players, teams, config, clubs);
      const { rounds: allRounds } = clubRankedStrategy.generateSchedule(players, config, tournament);

      expect(allRounds).toHaveLength(3);

      const playerClubMap = new Map<string, string>();
      for (const p of players) {
        if (p.clubId) playerClubMap.set(p.id, p.clubId);
      }

      const clubSitOuts = new Map<string, number>();
      for (const club of clubs) clubSitOuts.set(club.id, 0);

      for (const round of allRounds) {
        if (round.sitOuts.length > 0) {
          const clubId = playerClubMap.get(round.sitOuts[0]);
          if (clubId) clubSitOuts.set(clubId, (clubSitOuts.get(clubId) ?? 0) + 1);
        }
      }

      for (const [, count] of clubSitOuts) {
        expect(count).toBe(1);
      }
    });
  });

  describe('calculateStandings', () => {
    it('returns standings for all teams', () => {
      const { players, teams, config, clubs } = makeStandardSetup();
      const tournament = makeTournament(players, teams, config, clubs);
      const standings = clubRankedStrategy.calculateStandings(tournament);
      expect(standings).toHaveLength(teams.length);
    });

    it('computes correct points from a single match', () => {
      const clubs = makeClubs(2);
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const teams = makeTeamsFromPlayers(players);
      const config = makeConfig(2);
      const rounds: Round[] = [{
        id: 'r1', roundNumber: 1,
        matches: [{
          id: 'm1', courtId: 'c1',
          team1: [players[0].id, players[1].id] as [string, string],
          team2: [players[4].id, players[5].id] as [string, string],
          score: { team1Points: 15, team2Points: 6 },
        }],
        sitOuts: [],
      }];
      const tournament = makeTournament(players, teams, config, clubs, rounds);
      const standings = clubRankedStrategy.calculateStandings(tournament);

      const t1 = standings.find(s => s.playerId === 't1')!;
      expect(t1.totalPoints).toBe(15);
      expect(t1.matchesWon).toBe(1);
    });

    it('applies sit-out compensation', () => {
      const { players, teams, config, clubs } = makeStandardSetup(2);
      const rounds: Round[] = [{
        id: 'r1', roundNumber: 1,
        matches: [
          {
            id: 'm1', courtId: 'c1',
            team1: [players[0].id, players[1].id] as [string, string],
            team2: [players[4].id, players[5].id] as [string, string],
            score: { team1Points: 15, team2Points: 6 },
          },
          {
            id: 'm2', courtId: 'c2',
            team1: [players[2].id, players[3].id] as [string, string],
            team2: [players[6].id, players[7].id] as [string, string],
            score: { team1Points: 12, team2Points: 9 },
          },
        ],
        sitOuts: [players[8].id, players[9].id, players[10].id, players[11].id],
      }];
      const tournament = makeTournament(players, teams, config, clubs, rounds);
      const standings = clubRankedStrategy.calculateStandings(tournament);

      const t5 = standings.find(s => s.playerId === 't5')!;
      expect(t5.totalPoints).toBeGreaterThan(0);
      expect(t5.matchesPlayed).toBe(0);
    });
  });

  describe('getCompetitors', () => {
    it('returns one competitor per team', () => {
      const { players, teams, config, clubs } = makeStandardSetup();
      const tournament = makeTournament(players, teams, config, clubs);
      const competitors = clubRankedStrategy.getCompetitors(tournament);
      expect(competitors).toHaveLength(teams.length);
    });

    it('excludes teams with unavailable players', () => {
      const { players, teams, config, clubs } = makeStandardSetup();
      players[0].unavailable = true;
      const tournament = makeTournament(players, teams, config, clubs);
      const competitors = clubRankedStrategy.getCompetitors(tournament);
      expect(competitors).toHaveLength(teams.length - 1);
    });
  });
});
