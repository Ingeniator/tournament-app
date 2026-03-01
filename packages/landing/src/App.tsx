import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, push, set, onValue } from 'firebase/database';
import { ErrorBoundary, I18nProvider, useTheme, isValidSkin, DEFAULT_SKIN } from '@padel/common';
import type { SkinId } from '@padel/common';
import { translations } from './i18n';
import { auth, db, signIn, firebaseConfigured } from './firebase';
import { LandingPage } from './pages/LandingPage';
import { FormatsPage } from './pages/FormatsPage';
import { AmericanoPage } from './pages/AmericanoPage';
import { MexicanoPage } from './pages/MexicanoPage';
import { AwardsPage } from './pages/AwardsPage';
import { MaldicionesPage } from './pages/MaldicionesPage';
import { ClubPage } from './pages/ClubPage';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        initDataUnsafe?: {
          user?: {
            first_name: string;
            last_name?: string;
          };
        };
      };
    };
  }
}

const SKIN_KEY = 'padel-skin';

function loadLocalSkin(): SkinId {
  try {
    const data = localStorage.getItem(SKIN_KEY);
    if (data && isValidSkin(data)) return data;
    return DEFAULT_SKIN;
  } catch {
    return DEFAULT_SKIN;
  }
}

const initialSkin = loadLocalSkin();

function getPage(): string {
  return window.location.pathname.replace(/\/$/, '') || '/';
}

function AppContent() {
  const { skin, setSkin: rawSetSkin } = useTheme(initialSkin);
  const [uid, setUid] = useState<string | null>(null);
  const [page] = useState(getPage);

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
        try { localStorage.setItem(SKIN_KEY, val); } catch {}
      }
    });
    return unsub;
  }, [uid, rawSetSkin]);

  const setSkin = useCallback((s: SkinId) => {
    rawSetSkin(s);
    try { localStorage.setItem(SKIN_KEY, s); } catch {}
    if (uid && db) {
      set(ref(db, `users/${uid}/skin`), s).catch(() => {});
    }
  }, [rawSetSkin, uid]);

  const [telegramName, setTelegramName] = useState<string | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    tg.ready();
    const user = tg.initDataUnsafe?.user;
    if (user) {
      setTelegramName(user.first_name + (user.last_name ? ' ' + user.last_name : ''));
    }
  }, []);

  const handleFeedback = async (message: string) => {
    if (!db) return;
    const feedbackRef = push(ref(db, 'feedback'));
    await set(feedbackRef, { message, source: 'landing', createdAt: Date.now() });
  };

  // Route to SEO pages
  switch (page) {
    case '/formats':
      return <FormatsPage onFeedback={handleFeedback} />;
    case '/americano':
      return <AmericanoPage onFeedback={handleFeedback} />;
    case '/mexicano':
      return <MexicanoPage onFeedback={handleFeedback} />;
    case '/awards':
      return <AwardsPage onFeedback={handleFeedback} />;
    case '/maldiciones':
      return <MaldicionesPage onFeedback={handleFeedback} />;
    case '/club':
      return <ClubPage onFeedback={handleFeedback} />;
    default:
      return (
        <LandingPage
          skin={skin}
          setSkin={setSkin}
          telegramName={telegramName}
          onFeedback={handleFeedback}
        />
      );
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <I18nProvider translations={translations}>
        <AppContent />
      </I18nProvider>
    </ErrorBoundary>
  );
}
