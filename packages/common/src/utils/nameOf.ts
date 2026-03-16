import type { Player } from '../types/player';

export function nameOf(players: Player[], id: string): string {
  return players.find(p => p.id === id)?.name ?? '?';
}
