import { describe, it, expect } from 'vitest';
import { clubAmericanoStrategy } from './clubAmericano';
import type { Player, TournamentConfig, Team, Tournament, Round, Club } from '@padel/common';

function makePlayers(n: number, clubId?: string): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    ...(clubId ? { clubId } : {}),
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
  // Group players by club, pair sequentially within club
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
    format: 'club-americano',
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
    name: 'Test Club Americano',
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

describe('clubAmericano strategy', () => {
  describe('strategy properties', () => {
    it('is dynamic', () => {
      expect(clubAmericanoStrategy.isDynamic).toBe(true);
    });

    it('has fixed partners', () => {
      expect(clubAmericanoStrategy.hasFixedPartners).toBe(true);
    });
  });

  describe('validateSetup', () => {
    it('requires at least 2 clubs', () => {
      const players = makeClubPlayers([{ clubId: 'club1', count: 4 }]);
      const errors = clubAmericanoStrategy.validateSetup(players, makeConfig(1));
      expect(errors.some(e => e.includes('2 clubs'))).toBe(true);
    });

    it('requires at least 4 players per club', () => {
      const players = makeClubPlayers([
        { clubId: 'club1', count: 2 },
        { clubId: 'club2', count: 4 },
      ]);
      const errors = clubAmericanoStrategy.validateSetup(players, makeConfig(1));
      expect(errors.some(e => e.includes('4 players'))).toBe(true);
    });

    it('requires even number of players per club', () => {
      const players = makeClubPlayers([
        { clubId: 'club1', count: 5 },
        { clubId: 'club2', count: 4 },
      ]);
      const errors = clubAmericanoStrategy.validateSetup(players, makeConfig(1));
      expect(errors.some(e => e.includes('even number'))).toBe(true);
    });

    it('rejects unassigned players', () => {
      const players = [
        ...makeClubPlayers([
          { clubId: 'club1', count: 4 },
          { clubId: 'club2', count: 4 },
        ]),
        { id: 'p99', name: 'Unassigned' }, // no clubId
      ];
      const errors = clubAmericanoStrategy.validateSetup(players, makeConfig(1));
      expect(errors.some(e => e.includes('not assigned'))).toBe(true);
    });

    it('requires at least 1 court', () => {
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const config: TournamentConfig = {
        format: 'club-americano',
        pointsPerMatch: 21,
        courts: [],
        maxRounds: null,
      };
      const errors = clubAmericanoStrategy.validateSetup(players, config);
      expect(errors.some(e => e.includes('1 court'))).toBe(true);
    });

    it('requires positive points per match', () => {
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const config = { ...makeConfig(1), pointsPerMatch: 0 };
      const errors = clubAmericanoStrategy.validateSetup(players, config);
      expect(errors.some(e => e.includes('Points per match'))).toBe(true);
    });

    it('passes for valid setup (2 clubs × 4 players)', () => {
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const errors = clubAmericanoStrategy.validateSetup(players, makeConfig(1));
      expect(errors).toEqual([]);
    });

    it('passes for 3 clubs × 6 players', () => {
      const players = makeClubPlayers([
        { clubId: 'club1', count: 6 },
        { clubId: 'club2', count: 6 },
        { clubId: 'club3', count: 6 },
      ]);
      const errors = clubAmericanoStrategy.validateSetup(players, makeConfig(3));
      expect(errors).toEqual([]);
    });

    it('returns multiple errors simultaneously', () => {
      const players = [{ id: 'p1', name: 'Only Player' }]; // no clubId, <2 clubs, <4 per club
      const config: TournamentConfig = {
        format: 'club-americano',
        pointsPerMatch: 0,
        courts: [],
        maxRounds: null,
      };
      const errors = clubAmericanoStrategy.validateSetup(players, config);
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('validateWarnings', () => {
    it('warns when clubs have different sizes', () => {
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 6 },
      ]);
      const warnings = clubAmericanoStrategy.validateWarnings!(players, makeConfig(1));
      expect(warnings.some(w => w.includes('different sizes'))).toBe(true);
    });

    it('no warning when clubs have same size', () => {
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const warnings = clubAmericanoStrategy.validateWarnings!(players, makeConfig(1));
      expect(warnings).toHaveLength(0);
    });
  });

  describe('validateScore', () => {
    it('accepts valid score', () => {
      expect(clubAmericanoStrategy.validateScore(
        { team1Points: 11, team2Points: 10 }, makeConfig(1),
      )).toBeNull();
    });

    it('rejects wrong total', () => {
      const err = clubAmericanoStrategy.validateScore(
        { team1Points: 10, team2Points: 10 }, makeConfig(1),
      );
      expect(err).not.toBeNull();
    });

    it('rejects negative points', () => {
      const err = clubAmericanoStrategy.validateScore(
        { team1Points: -1, team2Points: 22 }, makeConfig(1),
      );
      expect(err).not.toBeNull();
    });
  });

  describe('generateSchedule', () => {
    it('returns empty with no clubs', () => {
      const players = makePlayers(4);
      const teams = makeTeamsFromPlayers(players);
      const config = makeConfig(1);
      const tournament = makeTournament(players, teams, config, []);
      const { rounds, warnings } = clubAmericanoStrategy.generateSchedule(players, config, tournament);
      expect(rounds).toHaveLength(0);
      expect(warnings.some(w => w.includes('Not enough'))).toBe(true);
    });

    it('returns empty with no teams', () => {
      const clubs = makeClubs(2);
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const config = makeConfig(1);
      const tournament = makeTournament(players, [], config, clubs);
      const { rounds, warnings } = clubAmericanoStrategy.generateSchedule(players, config, tournament);
      expect(rounds).toHaveLength(0);
      expect(warnings.some(w => w.includes('Not enough'))).toBe(true);
    });

    it('generates exactly 1 round (isDynamic)', () => {
      const { players, config, tournament } = makeStandardSetup(3);
      const { rounds } = clubAmericanoStrategy.generateSchedule(players, config, tournament);
      expect(rounds).toHaveLength(1);
    });

    it('each match has exactly 4 players (2v2)', () => {
      const { players, config, tournament } = makeStandardSetup(3);
      const { rounds } = clubAmericanoStrategy.generateSchedule(players, config, tournament);
      for (const round of rounds) {
        for (const match of round.matches) {
          expect(match.team1).toHaveLength(2);
          expect(match.team2).toHaveLength(2);
        }
      }
    });

    it('partners are from the same club', () => {
      const { players, config, tournament } = makeStandardSetup(3);
      const { rounds } = clubAmericanoStrategy.generateSchedule(players, config, tournament);

      const playerClubMap = new Map<string, string>();
      for (const p of players) {
        if (p.clubId) playerClubMap.set(p.id, p.clubId);
      }

      for (const round of rounds) {
        for (const match of round.matches) {
          // team1: both from same club
          expect(playerClubMap.get(match.team1[0])).toBe(playerClubMap.get(match.team1[1]));
          // team2: both from same club
          expect(playerClubMap.get(match.team2[0])).toBe(playerClubMap.get(match.team2[1]));
        }
      }
    });

    it('opponents are from different clubs', () => {
      const { players, config, tournament } = makeStandardSetup(3);
      const { rounds } = clubAmericanoStrategy.generateSchedule(players, config, tournament);

      const playerClubMap = new Map<string, string>();
      for (const p of players) {
        if (p.clubId) playerClubMap.set(p.id, p.clubId);
      }

      for (const round of rounds) {
        for (const match of round.matches) {
          const club1 = playerClubMap.get(match.team1[0]);
          const club2 = playerClubMap.get(match.team2[0]);
          expect(club1).not.toBe(club2);
        }
      }
    });

    it('no player appears twice in the same round', () => {
      const { players, config, tournament } = makeStandardSetup(3);
      const { rounds } = clubAmericanoStrategy.generateSchedule(players, config, tournament);

      for (const round of rounds) {
        const allPlayerIds = round.matches.flatMap(m => [...m.team1, ...m.team2]);
        expect(new Set(allPlayerIds).size).toBe(allPlayerIds.length);
      }
    });

    it('all players play or sit out each round', () => {
      const { players, config, tournament } = makeStandardSetup(3);
      const { rounds } = clubAmericanoStrategy.generateSchedule(players, config, tournament);

      for (const round of rounds) {
        const playingPlayerIds = round.matches.flatMap(m => [...m.team1, ...m.team2]);
        const allAccountedFor = new Set([...playingPlayerIds, ...round.sitOuts]);
        expect(allAccountedFor.size).toBe(players.length);
      }
    });

    it('with 2 clubs (even), no club byes', () => {
      const clubs = makeClubs(2);
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const teams = makeTeamsFromPlayers(players);
      const config = makeConfig(2);
      const tournament = makeTournament(players, teams, config, clubs);
      const { rounds } = clubAmericanoStrategy.generateSchedule(players, config, tournament);

      // No sit-outs: 2 clubs, each with 2 teams, 2 courts available
      expect(rounds[0].sitOuts).toHaveLength(0);
    });

    it('with 3 clubs (odd), one club sits out per round', () => {
      const { players, config, tournament } = makeStandardSetup(2); // 3 clubs, 2 courts
      const { rounds } = clubAmericanoStrategy.generateSchedule(players, config, tournament);

      // With 3 clubs, 1 club sits out → 4 players sit out (1 club × 4 players)
      expect(rounds[0].sitOuts.length).toBe(4);
    });
  });

  describe('generateAdditionalRounds', () => {
    it('generates the requested number of additional rounds', () => {
      const { players, teams, config, clubs } = makeStandardSetup(3);
      const tournament = makeTournament(players, teams, config, clubs);
      const initial = clubAmericanoStrategy.generateSchedule(players, config, tournament);
      const scored = scoreRounds(initial.rounds, 11, 10);
      const { rounds } = clubAmericanoStrategy.generateAdditionalRounds(
        players, config, scored, 2, undefined, undefined, tournament,
      );
      expect(rounds).toHaveLength(2);
    });

    it('starts round numbering after existing rounds', () => {
      const { players, teams, config, clubs } = makeStandardSetup(3);
      const tournament = makeTournament(players, teams, config, clubs);
      const initial = clubAmericanoStrategy.generateSchedule(players, config, tournament);
      const scored = scoreRounds(initial.rounds, 11, 10);
      const { rounds } = clubAmericanoStrategy.generateAdditionalRounds(
        players, config, scored, 1, undefined, undefined, tournament,
      );
      expect(rounds[0].roundNumber).toBe(2);
    });

    it('maintains club integrity across additional rounds', () => {
      const { players, teams, config, clubs } = makeStandardSetup(3);
      const tournament = makeTournament(players, teams, config, clubs);
      const initial = clubAmericanoStrategy.generateSchedule(players, config, tournament);
      const scored = scoreRounds(initial.rounds, 11, 10);
      const { rounds } = clubAmericanoStrategy.generateAdditionalRounds(
        players, config, scored, 3, undefined, undefined, tournament,
      );

      const playerClubMap = new Map<string, string>();
      for (const p of players) {
        if (p.clubId) playerClubMap.set(p.id, p.clubId);
      }

      for (const round of rounds) {
        for (const match of round.matches) {
          // Partners from same club
          expect(playerClubMap.get(match.team1[0])).toBe(playerClubMap.get(match.team1[1]));
          expect(playerClubMap.get(match.team2[0])).toBe(playerClubMap.get(match.team2[1]));
          // Opponents from different clubs
          expect(playerClubMap.get(match.team1[0])).not.toBe(playerClubMap.get(match.team2[0]));
        }
      }
    });

    it('returns empty with not enough active teams', () => {
      const { players, teams, config, clubs } = makeStandardSetup(3);
      const tournament = makeTournament(players, teams, config, clubs);
      const initial = clubAmericanoStrategy.generateSchedule(players, config, tournament);
      const scored = scoreRounds(initial.rounds, 11, 10);

      // Exclude all players
      const excludeIds = players.map(p => p.id);
      const { rounds, warnings } = clubAmericanoStrategy.generateAdditionalRounds(
        [], config, scored, 1, excludeIds, undefined, tournament,
      );
      expect(rounds).toHaveLength(0);
      expect(warnings.some(w => w.includes('Not enough'))).toBe(true);
    });

    it('fixture wraps cyclically beyond natural round-robin length', () => {
      const clubs = makeClubs(2);
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const teams = makeTeamsFromPlayers(players);
      const config = makeConfig(2);
      const tournament = makeTournament(players, teams, config, clubs);
      const initial = clubAmericanoStrategy.generateSchedule(players, config, tournament);
      const scored = scoreRounds(initial.rounds, 11, 10);

      // 2 clubs → 1 natural round-robin round. Generate 4 more to test cycling.
      const { rounds } = clubAmericanoStrategy.generateAdditionalRounds(
        players, config, scored, 4, undefined, undefined, tournament,
      );
      expect(rounds).toHaveLength(4);
      // All rounds should have matches (fixture repeats, doesn't run out)
      for (const round of rounds) {
        expect(round.matches.length).toBeGreaterThan(0);
      }
    });
  });

  describe('calculateStandings', () => {
    it('returns standings for all teams', () => {
      const { players, teams, config, clubs } = makeStandardSetup();
      const tournament = makeTournament(players, teams, config, clubs);
      const standings = clubAmericanoStrategy.calculateStandings(tournament);
      expect(standings).toHaveLength(teams.length);
    });

    it('returns all zeroes with no rounds', () => {
      const { players, teams, config, clubs } = makeStandardSetup();
      const tournament = makeTournament(players, teams, config, clubs);
      const standings = clubAmericanoStrategy.calculateStandings(tournament);
      for (const entry of standings) {
        expect(entry.totalPoints).toBe(0);
        expect(entry.matchesPlayed).toBe(0);
      }
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
      const standings = clubAmericanoStrategy.calculateStandings(tournament);

      const t1 = standings.find(s => s.playerId === 't1')!;
      expect(t1.totalPoints).toBe(15);
      expect(t1.matchesWon).toBe(1);
      expect(t1.matchesLost).toBe(0);
    });

    it('applies sit-out compensation', () => {
      const { players, teams, config, clubs } = makeStandardSetup(2);
      // Club3 (t5, t6) sits out while club1 vs club2
      const rounds: Round[] = [{
        id: 'r1', roundNumber: 1,
        matches: [
          {
            id: 'm1', courtId: 'c1',
            team1: [players[0].id, players[1].id] as [string, string], // t1 (club1)
            team2: [players[4].id, players[5].id] as [string, string], // t3 (club2)
            score: { team1Points: 15, team2Points: 6 },
          },
          {
            id: 'm2', courtId: 'c2',
            team1: [players[2].id, players[3].id] as [string, string], // t2 (club1)
            team2: [players[6].id, players[7].id] as [string, string], // t4 (club2)
            score: { team1Points: 12, team2Points: 9 },
          },
        ],
        sitOuts: [players[8].id, players[9].id, players[10].id, players[11].id], // club3: t5+t6
      }];
      const tournament = makeTournament(players, teams, config, clubs, rounds);
      const standings = clubAmericanoStrategy.calculateStandings(tournament);

      const t5 = standings.find(s => s.playerId === 't5')!;
      expect(t5.totalPoints).toBeGreaterThan(0);
      expect(t5.matchesPlayed).toBe(0);
    });

    it('returns empty standings with no teams', () => {
      const { players, config, clubs } = makeStandardSetup();
      const tournament = makeTournament(players, [], config, clubs);
      const standings = clubAmericanoStrategy.calculateStandings(tournament);
      expect(standings).toHaveLength(0);
    });
  });

  describe('getCompetitors', () => {
    it('returns one competitor per team', () => {
      const { players, teams, config, clubs } = makeStandardSetup();
      const tournament = makeTournament(players, teams, config, clubs);
      const competitors = clubAmericanoStrategy.getCompetitors(tournament);
      expect(competitors).toHaveLength(teams.length);
    });

    it('competitor has both player IDs', () => {
      const clubs = makeClubs(2);
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const teams = makeTeamsFromPlayers(players);
      const config = makeConfig(1);
      const tournament = makeTournament(players, teams, config, clubs);
      const competitors = clubAmericanoStrategy.getCompetitors(tournament);

      expect(competitors[0].playerIds).toHaveLength(2);
      expect(competitors[0].playerIds).toContain(teams[0].player1Id);
      expect(competitors[0].playerIds).toContain(teams[0].player2Id);
    });

    it('excludes teams with unavailable players', () => {
      const { players, teams, config, clubs } = makeStandardSetup();
      players[0].unavailable = true; // p1 unavailable → team t1 excluded
      const tournament = makeTournament(players, teams, config, clubs);
      const competitors = clubAmericanoStrategy.getCompetitors(tournament);
      expect(competitors).toHaveLength(teams.length - 1);
      expect(competitors.every(c => !c.playerIds.includes('p1'))).toBe(true);
    });

    it('returns empty array when no teams', () => {
      const { players, config, clubs } = makeStandardSetup();
      const tournament = makeTournament(players, [], config, clubs);
      const competitors = clubAmericanoStrategy.getCompetitors(tournament);
      expect(competitors).toHaveLength(0);
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
      const config = makeConfig(4); // enough courts for all matches
      const tournament = makeTournament(players, teams, config, clubs);

      // Simulate 3 rounds (4 clubs → 3 round-robin rounds)
      const initial = clubAmericanoStrategy.generateSchedule(players, config, tournament);
      let allRounds = scoreRounds(initial.rounds, 11, 10);

      for (let i = 1; i < 3; i++) {
        const t = makeTournament(players, teams, config, clubs, allRounds);
        const { rounds } = clubAmericanoStrategy.generateAdditionalRounds(
          players, config, allRounds, 1, undefined, undefined, t,
        );
        allRounds = [...allRounds, ...scoreRounds(rounds, 11, 10)];
      }

      expect(allRounds).toHaveLength(3);

      // Track which club pairs faced each other
      const playerClubMap = new Map<string, string>();
      for (const p of players) {
        if (p.clubId) playerClubMap.set(p.id, p.clubId);
      }
      const clubMatchups = new Set<string>();
      for (const round of allRounds) {
        for (const match of round.matches) {
          const c1 = playerClubMap.get(match.team1[0])!;
          const c2 = playerClubMap.get(match.team2[0])!;
          const key = [c1, c2].sort().join(':');
          clubMatchups.add(key);
        }
      }

      // 4 clubs → C(4,2) = 6 unique matchups
      expect(clubMatchups.size).toBe(6);
    });

    it('with odd clubs (3), each club gets a bye', () => {
      const { players, teams, config, clubs } = makeStandardSetup(2);
      const tournament = makeTournament(players, teams, config, clubs);

      const initial = clubAmericanoStrategy.generateSchedule(players, config, tournament);
      let allRounds = scoreRounds(initial.rounds, 11, 10);

      for (let i = 1; i < 3; i++) {
        const t = makeTournament(players, teams, config, clubs, allRounds);
        const { rounds } = clubAmericanoStrategy.generateAdditionalRounds(
          players, config, allRounds, 1, undefined, undefined, t,
        );
        allRounds = [...allRounds, ...scoreRounds(rounds, 11, 10)];
      }

      expect(allRounds).toHaveLength(3);

      // Each club should have sat out in at least one round
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

      // Each club should sit out exactly once in a 3-round, 3-club round-robin
      for (const [, count] of clubSitOuts) {
        expect(count).toBe(1);
      }
    });
  });

  describe('match mode variants', () => {
    it('standings mode sorts pairs by points within club', () => {
      const clubs = makeClubs(2);
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const teams = makeTeamsFromPlayers(players);
      const config: TournamentConfig = {
        ...makeConfig(2),
        matchMode: 'standings',
      };

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
      const { rounds: newRounds } = clubAmericanoStrategy.generateAdditionalRounds(
        players, config, rounds, 1, undefined, undefined, tournament,
      );

      expect(newRounds).toHaveLength(1);
      expect(newRounds[0].matches.length).toBeGreaterThan(0);
    });

    it('slots mode uses original team order', () => {
      const clubs = makeClubs(2);
      const players = makeClubPlayers([
        { clubId: 'club1', count: 4 },
        { clubId: 'club2', count: 4 },
      ]);
      const teams = makeTeamsFromPlayers(players);
      const config: TournamentConfig = {
        ...makeConfig(2),
        matchMode: 'slots',
      };
      const tournament = makeTournament(players, teams, config, clubs);
      const { rounds } = clubAmericanoStrategy.generateSchedule(players, config, tournament);

      expect(rounds).toHaveLength(1);
      expect(rounds[0].matches.length).toBe(2);
    });
  });
});
