import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useTheme, type Theme, type AccentColor } from '@padel/common';
import { saveTheme, loadTheme, saveAccent, loadAccent } from './persistence';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
}

const ThemeCtx = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  accent: 'crimson',
  setAccent: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const initialTheme = loadTheme();
  const initialAccent = loadAccent();
  const { theme, toggleTheme: rawToggle, accent, setAccent: rawSetAccent } = useTheme(initialTheme, initialAccent);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    rawToggle();
    saveTheme(next);
  }, [theme, rawToggle]);

  const setAccent = useCallback((a: AccentColor) => {
    rawSetAccent(a);
    saveAccent(a);
  }, [rawSetAccent]);

  return (
    <ThemeCtx.Provider value={{ theme, toggleTheme, accent, setAccent }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useRunnerTheme() {
  return useContext(ThemeCtx);
}
