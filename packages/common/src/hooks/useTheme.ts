import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light';

function applyTheme(theme: Theme) {
  const el = document.documentElement;
  if (theme === 'light') {
    el.setAttribute('data-theme', 'light');
  } else {
    el.removeAttribute('data-theme');
  }
}

export function useTheme(initialTheme?: Theme) {
  const [theme, setThemeState] = useState<Theme>(initialTheme ?? 'dark');

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Sync when initialTheme changes (e.g. loaded from Firebase)
  useEffect(() => {
    if (initialTheme) {
      setThemeState(initialTheme);
    }
  }, [initialTheme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggleTheme };
}
