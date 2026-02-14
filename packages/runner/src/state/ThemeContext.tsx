import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useTheme, type Theme } from '@padel/common';
import { saveTheme, loadTheme } from './persistence';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeCtx = createContext<ThemeContextValue>({ theme: 'dark', toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const initial = loadTheme();
  const { theme, toggleTheme: rawToggle } = useTheme(initial);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    rawToggle();
    saveTheme(next);
  }, [theme, rawToggle]);

  return (
    <ThemeCtx.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useRunnerTheme() {
  return useContext(ThemeCtx);
}
