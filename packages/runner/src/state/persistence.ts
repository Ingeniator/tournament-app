import type { Tournament, Theme } from '@padel/common';
import { deduplicateNames } from '../utils/deduplicateNames';

const STORAGE_KEY = 'padel-tournament-v1';
const UI_STATE_KEY = 'padel-ui-state-v1';
const THEME_KEY = 'padel-theme';

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
    const tournament = JSON.parse(data) as Tournament;
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

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // silently fail
  }
}

export function loadTheme(): Theme {
  try {
    const data = localStorage.getItem(THEME_KEY);
    return data === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}
