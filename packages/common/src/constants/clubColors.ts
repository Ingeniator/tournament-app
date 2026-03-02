import type { Club } from '../types/tournament';

/** Sentinel value for "no color" — renders as an outlined dot */
export const NO_COLOR = 'transparent';

// Club colors: 10 distinct hues, avoid overlap with rank palette (white/blue/yellow/green/black/purple)
// Last entry is NO_COLOR (transparent) — used for cycling but never auto-assigned.
export const CLUB_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#ec4899', // pink
  '#14b8a6', // teal
  '#a16207', // brown
  '#dc2626', // crimson
  '#0891b2', // cyan
  '#d946ef', // magenta
  '#84cc16', // lime
  '#f43f5e', // rose
  NO_COLOR,
];

/** Number of real (non-transparent) club colors in the palette */
const CLUB_REAL_COUNT = CLUB_COLORS.length - 1;

export function getClubColor(club: Club, index: number): string {
  return club.color ?? CLUB_COLORS[index % CLUB_REAL_COUNT];
}

// Rank colors: white, blue, yellow, green, black, purple + no-color
// Last entry is NO_COLOR — used for cycling but never auto-assigned.
export const RANK_COLORS = [
  { bg: '#ffffff', text: '#111', border: '#ccc' },
  { bg: '#3b82f6', text: '#fff', border: 'transparent' },
  { bg: '#eab308', text: '#111', border: 'transparent' },
  { bg: '#22c55e', text: '#fff', border: 'transparent' },
  { bg: '#111827', text: '#fff', border: 'transparent' },
  { bg: '#a855f7', text: '#fff', border: 'transparent' },
  { bg: NO_COLOR, text: '#111', border: '#ccc' },
];

/** Number of real (non-transparent) rank colors in the palette */
const RANK_REAL_COUNT = RANK_COLORS.length - 1;

export function getRankColor(index: number, customColorIndex?: number): { bg: string; text: string; border: string } {
  const ci = customColorIndex ?? index;
  // When no custom override, cycle through real colors only
  if (customColorIndex == null) {
    return RANK_COLORS[ci % RANK_REAL_COUNT];
  }
  return RANK_COLORS[ci % RANK_COLORS.length];
}

/** Cycle to next color in a palette, skipping colors used by others.
 *  The last palette entry (NO_COLOR) is never skipped — multiple items can share it. */
export function cycleColor<T>(palette: T[], current: number, usedByOthers: Set<number>): number {
  const noColorIdx = palette.length - 1;
  const available = Array.from({ length: palette.length }, (_, i) => i)
    .filter(i => i === noColorIdx || !usedByOthers.has(i));
  const pool = available.length > 0 ? available : Array.from({ length: palette.length }, (_, i) => i);
  const idx = pool.indexOf(current);
  if (idx < 0) return pool[0];
  return pool[(idx + 1) % pool.length];
}

/** "Middle: Some description" → "Middle"; also truncates long names */
export function shortLabel(label: string, maxLength = 12): string {
  const idx = label.indexOf(':');
  const short = idx >= 0 ? label.slice(0, idx).trim() : label;
  return short.length > maxLength ? short.slice(0, maxLength).trimEnd() + '…' : short;
}

/** @deprecated Use shortLabel instead */
export const shortRankLabel = shortLabel;
