import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { ErrorBoundary, I18nProvider, useTheme, isValidSkin, DEFAULT_SKIN } from '@padel/common';
import type { SkinId } from '@padel/common';
import { translations } from './i18n';
import { useFirebase } from './useFirebase';
import { LandingPage } from './pages/LandingPage';

const FormatsPage = lazy(() => import('./pages/FormatsPage').then(m => ({ default: m.FormatsPage })));
const AmericanoPage = lazy(() => import('./pages/AmericanoPage').then(m => ({ default: m.AmericanoPage })));
const MexicanoPage = lazy(() => import('./pages/MexicanoPage').then(m => ({ default: m.MexicanoPage })));
const AwardsPage = lazy(() => import('./pages/AwardsPage').then(m => ({ default: m.AwardsPage })));
const MaldicionesPage = lazy(() => import('./pages/MaldicionesPage').then(m => ({ default: m.MaldicionesPage })));
const ClubPage = lazy(() => import('./pages/ClubPage').then(m => ({ default: m.ClubPage })));

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
          start_param?: string;
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
  const { firebase, initFirebase } = useFirebase();

  const isLandingPage = page === '/';

  // Landing page: load Firebase eagerly for skin sync
  useEffect(() => {
    if (isLandingPage) {
      initFirebase();
    }
  }, [isLandingPage, initFirebase]);

  // Auth — only after Firebase is loaded
  useEffect(() => {
    if (!firebase) return;
    const unsub = firebase.onAuthStateChanged(firebase.auth, (user) => {
      if (user) {
        setUid(user.uid);
      } else {
        firebase.signIn().catch(() => {});
      }
    });
    return unsub;
  }, [firebase]);

  // Read skin from Firebase (source of truth)
  useEffect(() => {
    if (!uid || !firebase) return;
    const unsub = firebase.onValue(firebase.ref(firebase.db, `users/${uid}/skin`), (snapshot) => {
      const val = snapshot.val() as string | null;
      if (val && isValidSkin(val)) {
        rawSetSkin(val);
        try { localStorage.setItem(SKIN_KEY, val); } catch {}
      }
    });
    return unsub;
  }, [uid, rawSetSkin, firebase]);

  const setSkin = useCallback((s: SkinId) => {
    rawSetSkin(s);
    try { localStorage.setItem(SKIN_KEY, s); } catch {}
    if (uid && firebase) {
      firebase.set(firebase.ref(firebase.db, `users/${uid}/skin`), s).catch(() => {});
    }
  }, [rawSetSkin, uid, firebase]);

  const [telegramName, setTelegramName] = useState<string | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    tg.ready();

    const startParam = tg.initDataUnsafe?.start_param;
    if (startParam) {
      window.location.href = '/plan';
      return;
    }

    const user = tg.initDataUnsafe?.user;
    if (user) {
      setTelegramName(user.first_name + (user.last_name ? ' ' + user.last_name : ''));
    }
  }, []);

  const handleFeedback = useCallback(async (message: string) => {
    const fb = await initFirebase();
    if (!fb) return;
    const feedbackRef = fb.push(fb.ref(fb.db, 'feedback'));
    await fb.set(feedbackRef, { message, source: 'landing', createdAt: Date.now() });
  }, [initFirebase]);

  switch (page) {
    case '/formats':
      return <Suspense fallback={null}><FormatsPage onFeedback={handleFeedback} /></Suspense>;
    case '/americano':
      return <Suspense fallback={null}><AmericanoPage onFeedback={handleFeedback} /></Suspense>;
    case '/mexicano':
      return <Suspense fallback={null}><MexicanoPage onFeedback={handleFeedback} /></Suspense>;
    case '/awards':
      return <Suspense fallback={null}><AwardsPage onFeedback={handleFeedback} /></Suspense>;
    case '/maldiciones':
      return <Suspense fallback={null}><MaldicionesPage onFeedback={handleFeedback} /></Suspense>;
    case '/club':
      return <Suspense fallback={null}><ClubPage onFeedback={handleFeedback} /></Suspense>;
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
