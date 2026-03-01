import { describe, it, expect } from 'vitest';
import { clubTeamMexicanoStrategy } from './clubTeamMexicano';
import type { Player, TournamentConfig, Team, Tournament, Round, Club } from '@padel/common';

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
    format: 'club-team-mexicano',
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
    name: 'Test Club Team Mexicano',
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

// Standard setup: 3 clubs × 4 players each = 12 players, 6 teams
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

describe('clubTeamMexicano strategy', () => {
  describe('strategy properties', () => {
    it('is dynamic', () => {
      expect(clubTeamMexicanoStrategy.isDynamic).toBe(true);
    });

    it('has fixed partners', () => {
      expect(clubTeamMexicanoStrategy.hasFixedPartners).toBe(true);
    });
  });

  describe('generateSchedule', () => {
    it('returns empty with no clubs', () => {
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const teams = makeTeamsFromPlayers(players);
      const config = makeConfig(1);
      const tournament = makeTournament(players, teams, config, []);
      const { rounds, warnings } = clubTeamMexicanoStrategy.generateSchedule(players, config, tournament);
      expect(rounds).toHaveLength(0);
      expect(warnings.some(w => w.includes('Not enough'))).toBe(true);
    });

    it('generates exactly 1 round (dynamic)', () => {
      const { players, config, tournament } = makeStandardSetup(3);
      const { rounds } = clubTeamMexicanoStrategy.generateSchedule(players, config, tournament);
      expect(rounds).toHaveLength(1);
    });

    it('first round has correct structure', () => {
      const { players, config, tournament } = makeStandardSetup(3);
      const { rounds } = clubTeamMexicanoStrategy.generateSchedule(players, config, tournament);
      const round = rounds[0];

      expect(round.roundNumber).toBe(1);
      for (const match of round.matches) {
        expect(match.team1).toHaveLength(2);
        expect(match.team2).toHaveLength(2);
      }
    });

    it('partners are from the same club', () => {
      const { players, config, tournament } = makeStandardSetup(3);
      const { rounds } = clubTeamMexicanoStrategy.generateSchedule(players, config, tournament);

      const playerClubMap = new Map<string, string>();
      for (const p of players) {
        if (p.clubId) playerClubMap.set(p.id, p.clubId);
      }

      for (const match of rounds[0].matches) {
        expect(playerClubMap.get(match.team1[0])).toBe(playerClubMap.get(match.team1[1]));
        expect(playerClubMap.get(match.team2[0])).toBe(playerClubMap.get(match.team2[1]));
      }
    });

    it('opponents are from different clubs', () => {
      const { players, config, tournament } = makeStandardSetup(3);
      const { rounds } = clubTeamMexicanoStrategy.generateSchedule(players, config, tournament);

      const playerClubMap = new Map<string, string>();
      for (const p of players) {
        if (p.clubId) playerClubMap.set(p.id, p.clubId);
      }

      for (const match of rounds[0].matches) {
        expect(playerClubMap.get(match.team1[0])).not.toBe(playerClubMap.get(match.team2[0]));
      }
    });
  });

  describe('generateAdditionalRounds', () => {
    it('starts round numbering after existing rounds', () => {
      const { players, teams, config, clubs } = makeStandardSetup(3);
      const tournament = makeTournament(players, teams, config, clubs);
      const initial = clubTeamMexicanoStrategy.generateSchedule(players, config, tournament);
      const scored = scoreRounds(initial.rounds, 11, 10);
      const { rounds } = clubTeamMexicanoStrategy.generateAdditionalRounds(
        players, config, scored, 1, undefined, undefined, tournament,
      );
      expect(rounds[0].roundNumber).toBe(2);
    });

    it('generates round-by-round (dynamic scheduling)', () => {
      const { players, teams, config, clubs } = makeStandardSetup(2);
      const tournament = makeTournament(players, teams, config, clubs);

      const initial = clubTeamMexicanoStrategy.generateSchedule(players, config, tournament);
      let allRounds = scoreRounds(initial.rounds, 11, 10);

      for (let i = 1; i < 3; i++) {
        const t = makeTournament(players, teams, config, clubs, allRounds);
        const { rounds } = clubTeamMexicanoStrategy.generateAdditionalRounds(
          players, config, allRounds, 1, undefined, undefined, t,
        );
        allRounds = [...allRounds, ...scoreRounds(rounds, 11, 10)];
      }

      expect(allRounds).toHaveLength(3);
    });

    it('sorts pairs by standings (best vs best)', () => {
      const clubs = makeClubs(2);
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const teams = makeTeamsFromPlayers(players);
      const config = makeConfig(2);

      // Seed round with different scores so teams have different points
      const rounds: Round[] = [{
        id: 'r1', roundNumber: 1,
        matches: [
          {
            id: 'm1', courtId: 'c1',
            team1: [players[0].id, players[1].id],
            team2: [players[4].id, players[5].id],
            score: { team1Points: 18, team2Points: 3 },
          },
          {
            id: 'm2', courtId: 'c2',
            team1: [players[2].id, players[3].id],
            team2: [players[6].id, players[7].id],
            score: { team1Points: 5, team2Points: 16 },
          },
        ],
        sitOuts: [],
      }];

      const tournament = makeTournament(players, teams, config, clubs, rounds);
      const { rounds: newRounds } = clubTeamMexicanoStrategy.generateAdditionalRounds(
        players, config, rounds, 1, undefined, undefined, tournament,
      );

      expect(newRounds).toHaveLength(1);
      expect(newRounds[0].matches.length).toBeGreaterThan(0);
    });

    it('returns empty with not enough active teams', () => {
      const { players, teams, config, clubs } = makeStandardSetup(3);
      const tournament = makeTournament(players, teams, config, clubs);
      const initial = clubTeamMexicanoStrategy.generateSchedule(players, config, tournament);
      const scored = scoreRounds(initial.rounds, 11, 10);

      const excludeIds = players.map(p => p.id);
      const { rounds, warnings } = clubTeamMexicanoStrategy.generateAdditionalRounds(
        [], config, scored, 1, excludeIds, undefined, tournament,
      );
      expect(rounds).toHaveLength(0);
      expect(warnings.some(w => w.includes('Not enough'))).toBe(true);
    });

    it('maintains club integrity across additional rounds', () => {
      const { players, teams, config, clubs } = makeStandardSetup(3);
      const tournament = makeTournament(players, teams, config, clubs);
      const initial = clubTeamMexicanoStrategy.generateSchedule(players, config, tournament);
      let allRounds = scoreRounds(initial.rounds, 11, 10);

      for (let i = 1; i < 3; i++) {
        const t = makeTournament(players, teams, config, clubs, allRounds);
        const { rounds } = clubTeamMexicanoStrategy.generateAdditionalRounds(
          players, config, allRounds, 1, undefined, undefined, t,
        );
        allRounds = [...allRounds, ...scoreRounds(rounds, 11, 10)];
      }

      const playerClubMap = new Map<string, string>();
      for (const p of players) {
        if (p.clubId) playerClubMap.set(p.id, p.clubId);
      }

      for (const round of allRounds) {
        for (const match of round.matches) {
          expect(playerClubMap.get(match.team1[0])).toBe(playerClubMap.get(match.team1[1]));
          expect(playerClubMap.get(match.team2[0])).toBe(playerClubMap.get(match.team2[1]));
          expect(playerClubMap.get(match.team1[0])).not.toBe(playerClubMap.get(match.team2[0]));
        }
      }
    });
  });

  describe('calculateStandings', () => {
    it('returns standings for all teams', () => {
      const { players, teams, config, clubs } = makeStandardSetup();
      const tournament = makeTournament(players, teams, config, clubs);
      const standings = clubTeamMexicanoStrategy.calculateStandings(tournament);
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
      const standings = clubTeamMexicanoStrategy.calculateStandings(tournament);

      const t1 = standings.find(s => s.playerId === 't1')!;
      expect(t1.totalPoints).toBe(15);
      expect(t1.matchesWon).toBe(1);
    });
  });

  describe('getCompetitors', () => {
    it('returns one competitor per team', () => {
      const { players, teams, config, clubs } = makeStandardSetup();
      const tournament = makeTournament(players, teams, config, clubs);
      const competitors = clubTeamMexicanoStrategy.getCompetitors(tournament);
      expect(competitors).toHaveLength(teams.length);
    });

    it('excludes teams with unavailable players', () => {
      const { players, teams, config, clubs } = makeStandardSetup();
      players[0].unavailable = true;
      const tournament = makeTournament(players, teams, config, clubs);
      const competitors = clubTeamMexicanoStrategy.getCompetitors(tournament);
      expect(competitors).toHaveLength(teams.length - 1);
    });
  });
});
