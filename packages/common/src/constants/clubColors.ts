import type { Club } from '../types/tournament';

export const CLUB_COLORS = ['#3b82f6', '#ec4899', '#22c55e', '#f59e0b', '#a855f7'];

export function getClubColor(club: Club, index: number): string {
  return club.color ?? CLUB_COLORS[index % CLUB_COLORS.length];
}
