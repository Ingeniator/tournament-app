import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, set } from 'firebase/database';
import { useTheme, isValidSkin, type SkinId } from '@padel/common';
import { saveSkin, loadSkin } from './persistence';
import { auth, db, signIn, firebaseConfigured } from '../firebase';

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
  const [uid, setUid] = useState<string | null>(null);

  // Auth
  useEffect(() => {
    if (!firebaseConfigured || !auth) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
      } else {
        signIn().catch(() => {});
      }
    });
    return unsub;
  }, []);

  // Read skin from Firebase (source of truth)
  useEffect(() => {
    if (!uid || !db) return;
    const unsub = onValue(ref(db, `users/${uid}/skin`), (snapshot) => {
      const val = snapshot.val() as string | null;
      if (val && isValidSkin(val)) {
        rawSetSkin(val);
        saveSkin(val);
      }
    });
    return unsub;
  }, [uid, rawSetSkin]);

  const setSkin = useCallback((s: SkinId) => {
    rawSetSkin(s);
    saveSkin(s);
    if (uid && db) {
      set(ref(db, `users/${uid}/skin`), s).catch(() => {});
    }
  }, [rawSetSkin, uid]);

  return (
    <ThemeCtx.Provider value={{ skin, setSkin }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useRunnerTheme() {
  return useContext(ThemeCtx);
}
