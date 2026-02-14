import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useTheme, type SkinId } from '@padel/common';
import { saveSkin, loadSkin } from './persistence';

interface ThemeContextValue {
  skin: SkinId;
  setSkin: (skin: SkinId) => void;
}

const ThemeCtx = createContext<ThemeContextValue>({
  skin: 'midnight',
  setSkin: () => {},
});

const initialSkin = loadSkin();

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { skin, setSkin: rawSetSkin } = useTheme(initialSkin);

  const setSkin = useCallback((s: SkinId) => {
    rawSetSkin(s);
    saveSkin(s);
  }, [rawSetSkin]);

  return (
    <ThemeCtx.Provider value={{ skin, setSkin }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useRunnerTheme() {
  return useContext(ThemeCtx);
}
