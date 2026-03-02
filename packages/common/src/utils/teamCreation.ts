import type { Player } from '../types/player';
import type { Team, Club } from '../types/tournament';
import { generateId } from './id';

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createTeams(players: Player[]): Team[] {
  const shuffled = shuffleArray(players);
  const teams: Team[] = [];
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    teams.push({
      id: generateId(),
      player1Id: shuffled[i].id,
      player2Id: shuffled[i + 1].id,
    });
  }
  return teams;
}

export function createCrossGroupTeams(players: Player[]): Team[] {
  const groupA = shuffleArray(players.filter(p => p.group === 'A'));
  const groupB = shuffleArray(players.filter(p => p.group === 'B'));
  const teams: Team[] = [];
  for (let i = 0; i < Math.min(groupA.length, groupB.length); i++) {
    teams.push({
      id: generateId(),
      player1Id: groupA[i].id,
      player2Id: groupB[i].id,
    });
  }
  return teams;
}

export function createClubTeams(players: Player[], clubs: Club[]): Team[] {
  const teams: Team[] = [];
  const hasRanks = players.some(p => p.rankSlot != null);
  for (const club of clubs) {
    const raw = players.filter(p => p.clubId === club.id);
    let clubPlayers: Player[];
    if (hasRanks) {
      const ranked = raw.filter(p => p.rankSlot != null).sort((a, b) => a.rankSlot! - b.rankSlot!);
      const unranked = shuffleArray(raw.filter(p => p.rankSlot == null));
      clubPlayers = [...ranked, ...unranked];
    } else {
      clubPlayers = shuffleArray(raw);
    }
    for (let i = 0; i < clubPlayers.length - 1; i += 2) {
      teams.push({
        id: generateId(),
        player1Id: clubPlayers[i].id,
        player2Id: clubPlayers[i + 1].id,
      });
    }
  }
  return teams;
}
