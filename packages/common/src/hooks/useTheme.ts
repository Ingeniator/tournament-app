import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light';
export type AccentColor = 'crimson' | 'indigo' | 'teal' | 'orange' | 'violet';

export const ACCENT_COLORS: AccentColor[] = ['crimson', 'indigo', 'teal', 'orange', 'violet'];

function applyTheme(theme: Theme) {
  const el = document.documentElement;
  if (theme === 'dark') {
    el.classList.add('dark-theme');
    el.classList.remove('light-theme');
  } else {
    el.classList.remove('dark-theme');
    el.classList.add('light-theme');
  }
}

function applyAccent(accent: AccentColor) {
  const el = document.documentElement;
  for (const c of ACCENT_COLORS) {
    el.classList.remove(`accent-${c}`);
  }
  if (accent !== 'crimson') {
    el.classList.add(`accent-${accent}`);
  }
}

export function useTheme(initialTheme?: Theme, initialAccent?: AccentColor) {
  const [theme, setThemeState] = useState<Theme>(initialTheme ?? 'dark');
  const [accent, setAccentState] = useState<AccentColor>(initialAccent ?? 'crimson');

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  // Sync when initialTheme changes (e.g. loaded from Firebase)
  useEffect(() => {
    if (initialTheme) {
      setThemeState(initialTheme);
    }
  }, [initialTheme]);

  useEffect(() => {
    if (initialAccent) {
      setAccentState(initialAccent);
    }
  }, [initialAccent]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setAccent = useCallback((a: AccentColor) => {
    setAccentState(a);
  }, []);

  return { theme, setTheme, toggleTheme, accent, setAccent };
}
