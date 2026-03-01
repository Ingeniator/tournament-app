import { describe, it, expect } from 'vitest';
import type { Tournament, StandingsEntry, Club, Team, Player } from '@padel/common';
import { computeClubAwards } from './club';

// ---- Helpers ----

function makeClubs(n: number): Club[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `club${i + 1}`,
    name: `Club ${i + 1}`,
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

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  const clubs = makeClubs(3);
  const players = makeClubPlayers([
    { clubId: 'club1', count: 4 },
    { clubId: 'club2', count: 4 },
    { clubId: 'club3', count: 4 },
  ]);
  const teams = makeTeamsFromPlayers(players);
  return {
    id: 't1',
    name: 'Test Club Americano',
    config: {
      format: 'club-ranked',
      pointsPerMatch: 21,
      courts: [{ id: 'c1', name: 'Court 1' }, { id: 'c2', name: 'Court 2' }],
      maxRounds: null,
    },
    phase: 'completed',
    players,
    teams,
    clubs,
    rounds: [],
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function makePairStandings(entries: Array<{
  teamId: string;
  name: string;
  totalPoints: number;
  rank?: number;
}>): StandingsEntry[] {
  return entries.map((e, i) => ({
    playerId: e.teamId,
    playerName: e.name,
    totalPoints: e.totalPoints,
    matchesPlayed: 3,
    matchesWon: 2,
    matchesLost: 1,
    matchesDraw: 0,
    pointDiff: e.totalPoints - 20,
    rank: e.rank ?? (i + 1),
  }));
}

function findAward(awards: ReturnType<typeof computeClubAwards>['awards'], id: string) {
  return awards.find(a => a.id === id);
}

// ---- Tests ----

describe('computeClubAwards', () => {
  it('returns empty for non-club format', () => {
    const t = makeTournament({ config: { ...makeTournament().config, format: 'americano' } });
    const standings = makePairStandings([]);
    const result = computeClubAwards(t, standings);
    expect(result.champion).toHaveLength(0);
    expect(result.awards).toHaveLength(0);
  });

  it('returns empty champion when no clubs', () => {
    const t = makeTournament({ clubs: [] });
    const standings = makePairStandings([]);
    const result = computeClubAwards(t, standings);
    expect(result.champion).toHaveLength(0);
  });

  describe('club-champion', () => {
    it('awards club champion to club with most aggregate points', () => {
      const t = makeTournament();
      // t1 (club1): 50pts, t2 (club1): 40pts → club1 = 90
      // t3 (club2): 45pts, t4 (club2): 35pts → club2 = 80
      // t5 (club3): 30pts, t6 (club3): 25pts → club3 = 55
      const standings = makePairStandings([
        { teamId: 't1', name: 'Team 1', totalPoints: 50 },
        { teamId: 't2', name: 'Team 2', totalPoints: 40 },
        { teamId: 't3', name: 'Team 3', totalPoints: 45 },
        { teamId: 't4', name: 'Team 4', totalPoints: 35 },
        { teamId: 't5', name: 'Team 5', totalPoints: 30 },
        { teamId: 't6', name: 'Team 6', totalPoints: 25 },
      ]);
      const result = computeClubAwards(t, standings);
      expect(result.champion).toHaveLength(1);
      expect(result.champion[0].id).toBe('club-champion');
      expect(result.champion[0].playerNames).toContain('Club 1');
      expect(result.champion[0].stat).toContain('90');
    });

    it('does not award club champion when winner has 0 points', () => {
      const t = makeTournament();
      const standings = makePairStandings([
        { teamId: 't1', name: 'Team 1', totalPoints: 0 },
        { teamId: 't2', name: 'Team 2', totalPoints: 0 },
        { teamId: 't3', name: 'Team 3', totalPoints: 0 },
        { teamId: 't4', name: 'Team 4', totalPoints: 0 },
        { teamId: 't5', name: 'Team 5', totalPoints: 0 },
        { teamId: 't6', name: 'Team 6', totalPoints: 0 },
      ]);
      const result = computeClubAwards(t, standings);
      expect(result.champion).toHaveLength(0);
    });
  });

  describe('club-rivalry', () => {
    it('awards rivalry when two clubs have close totals', () => {
      const t = makeTournament();
      // club1 = 90, club2 = 88 → gap 2 (within 10% of 90 = 9)
      const standings = makePairStandings([
        { teamId: 't1', name: 'Team 1', totalPoints: 50 },
        { teamId: 't2', name: 'Team 2', totalPoints: 40 },
        { teamId: 't3', name: 'Team 3', totalPoints: 48 },
        { teamId: 't4', name: 'Team 4', totalPoints: 40 },
        { teamId: 't5', name: 'Team 5', totalPoints: 20 },
        { teamId: 't6', name: 'Team 6', totalPoints: 15 },
      ]);
      const result = computeClubAwards(t, standings);
      const rivalry = findAward(result.awards, 'club-rivalry');
      expect(rivalry).toBeTruthy();
      expect(rivalry!.playerNames).toHaveLength(2);
      expect(rivalry!.stat).toContain('2 pts apart');
    });

    it('awards rivalry with tied clubs', () => {
      const t = makeTournament();
      // club1 = 80, club2 = 80
      const standings = makePairStandings([
        { teamId: 't1', name: 'Team 1', totalPoints: 40 },
        { teamId: 't2', name: 'Team 2', totalPoints: 40 },
        { teamId: 't3', name: 'Team 3', totalPoints: 40 },
        { teamId: 't4', name: 'Team 4', totalPoints: 40 },
        { teamId: 't5', name: 'Team 5', totalPoints: 20 },
        { teamId: 't6', name: 'Team 6', totalPoints: 15 },
      ]);
      const result = computeClubAwards(t, standings);
      const rivalry = findAward(result.awards, 'club-rivalry');
      expect(rivalry).toBeTruthy();
      expect(rivalry!.stat).toBe('Tied!');
    });

    it('does not award rivalry when gap is too large', () => {
      const t = makeTournament();
      // club1 = 100, club2 = 50, club3 = 30
      // Smallest gap = 20 between club2 and club3. max(10, 10% of 50) = 10. 20 > 10 → no rivalry
      const standings = makePairStandings([
        { teamId: 't1', name: 'Team 1', totalPoints: 60 },
        { teamId: 't2', name: 'Team 2', totalPoints: 40 },
        { teamId: 't3', name: 'Team 3', totalPoints: 30 },
        { teamId: 't4', name: 'Team 4', totalPoints: 20 },
        { teamId: 't5', name: 'Team 5', totalPoints: 18 },
        { teamId: 't6', name: 'Team 6', totalPoints: 12 },
      ]);
      const result = computeClubAwards(t, standings);
      const rivalry = findAward(result.awards, 'club-rivalry');
      expect(rivalry).toBeUndefined();
    });
  });

  describe('club-mvp', () => {
    it('awards MVP to pair with highest percentage of club points', () => {
      const t = makeTournament();
      // club1: t1=70, t2=10 → t1 has 70/80 = 87.5%
      // club2: t3=40, t4=40 → 50%
      // club3: t5=30, t6=30 → 50%
      const standings = makePairStandings([
        { teamId: 't1', name: 'Team 1', totalPoints: 70 },
        { teamId: 't2', name: 'Team 2', totalPoints: 10 },
        { teamId: 't3', name: 'Team 3', totalPoints: 40 },
        { teamId: 't4', name: 'Team 4', totalPoints: 40 },
        { teamId: 't5', name: 'Team 5', totalPoints: 30 },
        { teamId: 't6', name: 'Team 6', totalPoints: 30 },
      ]);
      const result = computeClubAwards(t, standings);
      const mvp = findAward(result.awards, 'club-mvp');
      expect(mvp).toBeTruthy();
      expect(mvp!.playerNames).toContain('Team 1');
      expect(mvp!.stat).toContain('88%'); // 70/80 = 87.5% → rounded to 88%
    });

    it('does not award MVP for club with only 1 pair', () => {
      const clubs = makeClubs(2);
      const players = makeClubPlayers([
        { clubId: 'club1', count: 2 }, // only 1 pair
        { clubId: 'club2', count: 4 },
      ]);
      const teams = makeTeamsFromPlayers(players);
      const t = makeTournament({ clubs, players, teams });
      // club1 has only 1 pair → should not be eligible for MVP
      const standings = makePairStandings([
        { teamId: 't1', name: 'Team 1', totalPoints: 50 },
        { teamId: 't2', name: 'Team 2', totalPoints: 30 },
        { teamId: 't3', name: 'Team 3', totalPoints: 20 },
      ]);
      const result = computeClubAwards(t, standings);
      const mvp = findAward(result.awards, 'club-mvp');
      // MVP should only come from club2 (2 pairs)
      if (mvp) {
        expect(mvp.playerNames[0]).not.toBe('Team 1');
      }
    });
  });

  describe('club-solidarity', () => {
    it('awards solidarity to club with smallest points spread', () => {
      const t = makeTournament();
      // club1: t1=50, t2=10 → spread 40
      // club2: t3=35, t4=33 → spread 2
      // club3: t5=28, t6=25 → spread 3
      const standings = makePairStandings([
        { teamId: 't1', name: 'Team 1', totalPoints: 50 },
        { teamId: 't2', name: 'Team 2', totalPoints: 10 },
        { teamId: 't3', name: 'Team 3', totalPoints: 35 },
        { teamId: 't4', name: 'Team 4', totalPoints: 33 },
        { teamId: 't5', name: 'Team 5', totalPoints: 28 },
        { teamId: 't6', name: 'Team 6', totalPoints: 25 },
      ]);
      const result = computeClubAwards(t, standings);
      const solidarity = findAward(result.awards, 'club-solidarity');
      expect(solidarity).toBeTruthy();
      expect(solidarity!.playerNames).toContain('Club 2');
      expect(solidarity!.stat).toContain('2 pts spread');
    });

    it('awards solidarity with perfectly equal pairs', () => {
      const t = makeTournament();
      // club1: t1=40, t2=40 → spread 0
      const standings = makePairStandings([
        { teamId: 't1', name: 'Team 1', totalPoints: 40 },
        { teamId: 't2', name: 'Team 2', totalPoints: 40 },
        { teamId: 't3', name: 'Team 3', totalPoints: 35 },
        { teamId: 't4', name: 'Team 4', totalPoints: 30 },
        { teamId: 't5', name: 'Team 5', totalPoints: 25 },
        { teamId: 't6', name: 'Team 6', totalPoints: 20 },
      ]);
      const result = computeClubAwards(t, standings);
      const solidarity = findAward(result.awards, 'club-solidarity');
      expect(solidarity).toBeTruthy();
      expect(solidarity!.playerNames).toContain('Club 1');
      expect(solidarity!.stat).toContain('All pairs scored equally');
    });

    it('does not award solidarity when club has only 1 pair', () => {
      const clubs = makeClubs(2);
      const players = makeClubPlayers([
        { clubId: 'club1', count: 2 }, // 1 pair
        { clubId: 'club2', count: 4 }, // 2 pairs
      ]);
      const teams = makeTeamsFromPlayers(players);
      const t = makeTournament({ clubs, players, teams });
      const standings = makePairStandings([
        { teamId: 't1', name: 'Team 1', totalPoints: 50 },
        { teamId: 't2', name: 'Team 2', totalPoints: 40 },
        { teamId: 't3', name: 'Team 3', totalPoints: 35 },
      ]);
      const result = computeClubAwards(t, standings);
      const solidarity = findAward(result.awards, 'club-solidarity');
      // Solidarity should only consider club2 (needs 2+ pairs)
      if (solidarity) {
        expect(solidarity.playerNames).toContain('Club 2');
      }
    });
  });

  describe('all awards together', () => {
    it('generates champion + up to 3 non-podium awards for a typical tournament', () => {
      const t = makeTournament();
      const standings = makePairStandings([
        { teamId: 't1', name: 'Team 1', totalPoints: 50 },
        { teamId: 't2', name: 'Team 2', totalPoints: 48 },
        { teamId: 't3', name: 'Team 3', totalPoints: 49 },
        { teamId: 't4', name: 'Team 4', totalPoints: 47 },
        { teamId: 't5', name: 'Team 5', totalPoints: 30 },
        { teamId: 't6', name: 'Team 6', totalPoints: 25 },
      ]);
      const result = computeClubAwards(t, standings);

      // Champion should always be present when clubs exist and have points
      expect(result.champion).toHaveLength(1);
      expect(result.champion[0].id).toBe('club-champion');

      // At least some non-podium awards should qualify
      expect(result.awards.length).toBeGreaterThanOrEqual(1);
      expect(result.awards.length).toBeLessThanOrEqual(3); // max: rivalry + mvp + solidarity
    });

    it('each award has required fields', () => {
      const t = makeTournament();
      const standings = makePairStandings([
        { teamId: 't1', name: 'Team 1', totalPoints: 50 },
        { teamId: 't2', name: 'Team 2', totalPoints: 40 },
        { teamId: 't3', name: 'Team 3', totalPoints: 48 },
        { teamId: 't4', name: 'Team 4', totalPoints: 42 },
        { teamId: 't5', name: 'Team 5', totalPoints: 30 },
        { teamId: 't6', name: 'Team 6', totalPoints: 25 },
      ]);
      const result = computeClubAwards(t, standings);

      for (const award of [...result.champion, ...result.awards]) {
        expect(award.id).toBeTruthy();
        expect(award.title).toBeTruthy();
        expect(award.emoji).toBeTruthy();
        expect(award.description).toBeTruthy();
        expect(award.playerNames.length).toBeGreaterThanOrEqual(1);
        expect(award.stat).toBeTruthy();
      }
    });
  });
});
