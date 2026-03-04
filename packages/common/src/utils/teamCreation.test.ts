import { describe, it, expect } from 'vitest';
import { shuffleArray, createTeams, createCrossGroupTeams, createClubTeams } from './teamCreation';
import type { Player } from '../types/player';
import type { Club } from '../types/tournament';

function makePlayers(count: number, group?: 'A' | 'B'): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    ...(group ? { group } : {}),
  }));
}

function makeGroupedPlayers(countA: number, countB: number): Player[] {
  return [
    ...Array.from({ length: countA }, (_, i) => ({ id: `a${i + 1}`, name: `A${i + 1}`, group: 'A' as const })),
    ...Array.from({ length: countB }, (_, i) => ({ id: `b${i + 1}`, name: `B${i + 1}`, group: 'B' as const })),
  ];
}

describe('shuffleArray', () => {
  it('returns a new array with the same elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffleArray(arr);
    expect(result).toHaveLength(arr.length);
    expect(result.sort()).toEqual(arr.sort());
  });

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    shuffleArray(arr);
    expect(arr).toEqual(copy);
  });

  it('handles empty array', () => {
    expect(shuffleArray([])).toEqual([]);
  });

  it('handles single element', () => {
    expect(shuffleArray([42])).toEqual([42]);
  });

  it('produces different orderings over many runs (Fisher-Yates)', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      results.add(shuffleArray(arr).join(','));
    }
    // With 8 elements and 50 runs, we should get multiple distinct orderings
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('createTeams', () => {
  it('creates teams of 2 from even number of players', () => {
    const players = makePlayers(8);
    const teams = createTeams(players);
    expect(teams).toHaveLength(4);
  });

  it('each team has two different player IDs', () => {
    const players = makePlayers(6);
    const teams = createTeams(players);
    for (const team of teams) {
      expect(team.player1Id).not.toBe(team.player2Id);
    }
  });

  it('every player appears in exactly one team', () => {
    const players = makePlayers(8);
    const teams = createTeams(players);
    const allIds = teams.flatMap(t => [t.player1Id, t.player2Id]);
    expect(allIds.sort()).toEqual(players.map(p => p.id).sort());
  });

  it('drops the last player when odd count', () => {
    const players = makePlayers(7);
    const teams = createTeams(players);
    expect(teams).toHaveLength(3); // 6 players paired, 1 left over
    const allIds = teams.flatMap(t => [t.player1Id, t.player2Id]);
    expect(allIds).toHaveLength(6);
  });

  it('each team has a unique id', () => {
    const players = makePlayers(10);
    const teams = createTeams(players);
    const ids = teams.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('handles 2 players (minimum)', () => {
    const players = makePlayers(2);
    const teams = createTeams(players);
    expect(teams).toHaveLength(1);
  });

  it('handles empty array', () => {
    expect(createTeams([])).toEqual([]);
  });
});

describe('createCrossGroupTeams', () => {
  it('pairs one player from group A with one from group B', () => {
    const players = makeGroupedPlayers(4, 4);
    const teams = createCrossGroupTeams(players);
    expect(teams).toHaveLength(4);
    for (const team of teams) {
      const p1 = players.find(p => p.id === team.player1Id)!;
      const p2 = players.find(p => p.id === team.player2Id)!;
      expect(p1.group).toBe('A');
      expect(p2.group).toBe('B');
    }
  });

  it('creates min(groupA, groupB) teams when groups are unequal', () => {
    const players = makeGroupedPlayers(3, 5);
    const teams = createCrossGroupTeams(players);
    expect(teams).toHaveLength(3);
  });

  it('every team has a unique id', () => {
    const players = makeGroupedPlayers(4, 4);
    const teams = createCrossGroupTeams(players);
    const ids = teams.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all group A players appear in teams when groups are equal', () => {
    const players = makeGroupedPlayers(3, 3);
    const teams = createCrossGroupTeams(players);
    const p1Ids = teams.map(t => t.player1Id).sort();
    const groupAIds = players.filter(p => p.group === 'A').map(p => p.id).sort();
    expect(p1Ids).toEqual(groupAIds);
  });

  it('handles empty groups', () => {
    const players = makeGroupedPlayers(0, 4);
    expect(createCrossGroupTeams(players)).toEqual([]);
  });
});

describe('createClubTeams', () => {
  const clubs: Club[] = [
    { id: 'club1', name: 'Club A' },
    { id: 'club2', name: 'Club B' },
  ];

  it('creates teams within each club', () => {
    const players: Player[] = [
      { id: 'p1', name: 'P1', clubId: 'club1' },
      { id: 'p2', name: 'P2', clubId: 'club1' },
      { id: 'p3', name: 'P3', clubId: 'club1' },
      { id: 'p4', name: 'P4', clubId: 'club1' },
      { id: 'p5', name: 'P5', clubId: 'club2' },
      { id: 'p6', name: 'P6', clubId: 'club2' },
    ];
    const teams = createClubTeams(players, clubs);
    // Club A: 4 players = 2 teams, Club B: 2 players = 1 team
    expect(teams).toHaveLength(3);
  });

  it('does not mix players from different clubs', () => {
    const players: Player[] = [
      { id: 'p1', name: 'P1', clubId: 'club1' },
      { id: 'p2', name: 'P2', clubId: 'club1' },
      { id: 'p3', name: 'P3', clubId: 'club2' },
      { id: 'p4', name: 'P4', clubId: 'club2' },
    ];
    const teams = createClubTeams(players, clubs);
    for (const team of teams) {
      const p1 = players.find(p => p.id === team.player1Id)!;
      const p2 = players.find(p => p.id === team.player2Id)!;
      expect(p1.clubId).toBe(p2.clubId);
    }
  });

  it('respects rankSlot ordering when ranks are present', () => {
    const players: Player[] = [
      { id: 'p1', name: 'P1', clubId: 'club1', rankSlot: 3 },
      { id: 'p2', name: 'P2', clubId: 'club1', rankSlot: 1 },
      { id: 'p3', name: 'P3', clubId: 'club1', rankSlot: 2 },
      { id: 'p4', name: 'P4', clubId: 'club1', rankSlot: 4 },
    ];
    const teams = createClubTeams(players, [clubs[0]]);
    // Sorted by rankSlot: p2(1), p3(2), p1(3), p4(4)
    // Team 1: p2 + p3, Team 2: p1 + p4
    expect(teams).toHaveLength(2);
    expect(teams[0].player1Id).toBe('p2');
    expect(teams[0].player2Id).toBe('p3');
    expect(teams[1].player1Id).toBe('p1');
    expect(teams[1].player2Id).toBe('p4');
  });

  it('shuffles unranked players within ranked club', () => {
    const players: Player[] = [
      { id: 'p1', name: 'P1', clubId: 'club1', rankSlot: 1 },
      { id: 'p2', name: 'P2', clubId: 'club1', rankSlot: 2 },
      { id: 'p3', name: 'P3', clubId: 'club1' }, // unranked
      { id: 'p4', name: 'P4', clubId: 'club1' }, // unranked
    ];
    const teams = createClubTeams(players, [clubs[0]]);
    expect(teams).toHaveLength(2);
    // First team is ranked pair: p1 + p2
    expect(teams[0].player1Id).toBe('p1');
    expect(teams[0].player2Id).toBe('p2');
    // Second team is the unranked pair (order may vary due to shuffle)
    const unrankedIds = [teams[1].player1Id, teams[1].player2Id].sort();
    expect(unrankedIds).toEqual(['p3', 'p4']);
  });

  it('handles club with odd number of players (drops last)', () => {
    const players: Player[] = [
      { id: 'p1', name: 'P1', clubId: 'club1' },
      { id: 'p2', name: 'P2', clubId: 'club1' },
      { id: 'p3', name: 'P3', clubId: 'club1' },
    ];
    const teams = createClubTeams(players, [clubs[0]]);
    expect(teams).toHaveLength(1);
  });

  it('each team has a unique id', () => {
    const players: Player[] = [
      { id: 'p1', name: 'P1', clubId: 'club1' },
      { id: 'p2', name: 'P2', clubId: 'club1' },
      { id: 'p3', name: 'P3', clubId: 'club2' },
      { id: 'p4', name: 'P4', clubId: 'club2' },
    ];
    const teams = createClubTeams(players, clubs);
    const ids = teams.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
