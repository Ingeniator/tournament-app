import type { Tournament, TournamentFormat, SkinId } from '@padel/common';
import { isValidSkin, DEFAULT_SKIN } from '@padel/common';
import { deduplicateNames } from '../utils/deduplicateNames';

function migrateClubFormat(tournament: Tournament): Tournament {
  if (tournament.config.format !== ('club-americano' as string)) return tournament;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = tournament.config as any;
  const matchMode = raw.matchMode as string | undefined;
  // Only migrate old tournaments that had a matchMode field.
  // New club-americano tournaments (from planner) have no matchMode and should stay as-is.
  if (!matchMode) return tournament;
  let format: TournamentFormat = 'club-ranked';
  if (matchMode === 'random') format = 'club-team-americano';
  else if (matchMode === 'standings') format = 'club-team-mexicano';
  const { matchMode: _, ...restConfig } = raw;
  return { ...tournament, config: { ...restConfig, format } as Tournament['config'] };
}

const STORAGE_KEY = 'padel-tournament-v1';
const UI_STATE_KEY = 'padel-ui-state-v1';
const SKIN_KEY = 'padel-skin';

export function saveTournament(tournament: Tournament | null): boolean {
  try {
    if (tournament === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament));
    }
    return true;
  } catch {
    console.warn('[persistence] Failed to save tournament — storage may be full or unavailable');
    return false;
  }
}

export function loadTournament(): Tournament | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    const raw = JSON.parse(data) as Tournament;
    const tournament = migrateClubFormat(raw);
    return { ...tournament, players: deduplicateNames(tournament.players) };
  } catch {
    return null;
  }
}

interface UIState {
  activeTab: string;
}

export function saveUIState(uiState: UIState): void {
  try {
    localStorage.setItem(UI_STATE_KEY, JSON.stringify(uiState));
  } catch {
    // silently fail
  }
}

export function loadUIState(): UIState | null {
  try {
    const data = localStorage.getItem(UI_STATE_KEY);
    if (!data) return null;
    return JSON.parse(data) as UIState;
  } catch {
    return null;
  }
}

export function saveSkin(skin: SkinId): void {
  try {
    localStorage.setItem(SKIN_KEY, skin);
  } catch {
    // silently fail
  }
}

const IOS_INSTALL_DISMISSED_KEY = 'padel-ios-install-dismissed';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function isIOSInstallDismissed(): boolean {
  try {
    const ts = localStorage.getItem(IOS_INSTALL_DISMISSED_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < THIRTY_DAYS_MS;
  } catch {
    return false;
  }
}

export function dismissIOSInstall(): void {
  try {
    localStorage.setItem(IOS_INSTALL_DISMISSED_KEY, String(Date.now()));
  } catch {
    // silently fail
  }
}

export function loadSkin(): SkinId {
  try {
    const data = localStorage.getItem(SKIN_KEY);
    if (data && isValidSkin(data)) {
      return data;
    }
    return DEFAULT_SKIN;
  } catch {
    return DEFAULT_SKIN;
  }
}
