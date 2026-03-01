import { describe, it, expect } from 'vitest';
import { clubTeamAmericanoStrategy } from './clubTeamAmericano';
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
    format: 'club-team-americano',
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
    name: 'Test Club Team Americano',
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

function makeStandardSetup(numCourts = 3) {
  const clubs = makeClubs(3);
  const players = makeClubPlayers([
    { clubId: 'club1', count: 4 },
    { clubId: 'club2', count: 4 },
    { clubId: 'club3', count: 4 },
  ]);
  const teams = makeTeamsFromPlayers(players);
  const config = makeConfig(numCourts);
  const tournament = makeTournament(players, teams, config, clubs);
  return { clubs, players, teams, config, tournament };
}

describe('clubTeamAmericano strategy', () => {
  describe('strategy properties', () => {
    it('is static (not dynamic)', () => {
      expect(clubTeamAmericanoStrategy.isDynamic).toBe(false);
    });

    it('has fixed partners', () => {
      expect(clubTeamAmericanoStrategy.hasFixedPartners).toBe(true);
    });
  });

  describe('generateSchedule', () => {
    it('generates all rounds upfront (static)', () => {
      const { players, config, tournament } = makeStandardSetup(3);
      const { rounds } = clubTeamAmericanoStrategy.generateSchedule(players, config, tournament);
      expect(rounds).toHaveLength(3);
    });

    it('uses random opponent matching', () => {
      const clubs = makeClubs(2);
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const teams = makeTeamsFromPlayers(players);
      const config = makeConfig(2);
      const tournament = makeTournament(players, teams, config, clubs);
      const { rounds } = clubTeamAmericanoStrategy.generateSchedule(players, config, tournament);

      expect(rounds).toHaveLength(1);
      expect(rounds[0].matches.length).toBe(2);
    });

    it('partners are from the same club', () => {
      const { players, config, tournament } = makeStandardSetup(3);
      const { rounds } = clubTeamAmericanoStrategy.generateSchedule(players, config, tournament);

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
      const { rounds } = clubTeamAmericanoStrategy.generateSchedule(players, config, tournament);

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

    it('returns empty with no clubs', () => {
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const teams = makeTeamsFromPlayers(players);
      const config = makeConfig(1);
      const tournament = makeTournament(players, teams, config, []);
      const { rounds, warnings } = clubTeamAmericanoStrategy.generateSchedule(players, config, tournament);
      expect(rounds).toHaveLength(0);
      expect(warnings.some(w => w.includes('Not enough'))).toBe(true);
    });
  });

  describe('generateAdditionalRounds', () => {
    it('generates additional rounds', () => {
      const { players, teams, config, clubs } = makeStandardSetup(3);
      const tournament = makeTournament(players, teams, config, clubs);
      const initial = clubTeamAmericanoStrategy.generateSchedule(players, config, tournament);
      const scored = scoreRounds(initial.rounds, 11, 10);
      const { rounds } = clubTeamAmericanoStrategy.generateAdditionalRounds(
        players, config, scored, 2, undefined, undefined, tournament,
      );
      expect(rounds).toHaveLength(2);
    });
  });

  describe('calculateStandings', () => {
    it('returns standings for all teams', () => {
      const { players, teams, config, clubs } = makeStandardSetup();
      const tournament = makeTournament(players, teams, config, clubs);
      const standings = clubTeamAmericanoStrategy.calculateStandings(tournament);
      expect(standings).toHaveLength(teams.length);
    });
  });
});
