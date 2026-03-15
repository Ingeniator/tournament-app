import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { ErrorBoundary, I18nProvider, useTranslation, useTheme, isValidSkin, DEFAULT_SKIN } from '@padel/common';
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
const OrganizePage = lazy(() => import('./pages/OrganizePage').then(m => ({ default: m.OrganizePage })));
const WhichFormatPage = lazy(() => import('./pages/WhichFormatPage').then(m => ({ default: m.WhichFormatPage })));
const AmericanoVsMexicanoPage = lazy(() => import('./pages/AmericanoVsMexicanoPage').then(m => ({ default: m.AmericanoVsMexicanoPage })));
const TeamAmericanoPage = lazy(() => import('./pages/TeamAmericanoPage').then(m => ({ default: m.TeamAmericanoPage })));
const KingOfTheCourtPage = lazy(() => import('./pages/KingOfTheCourtPage').then(m => ({ default: m.KingOfTheCourtPage })));
const Mexicano12PlayersPage = lazy(() => import('./pages/Mexicano12PlayersPage').then(m => ({ default: m.Mexicano12PlayersPage })));
const Mexicano16PlayersPage = lazy(() => import('./pages/Mexicano16PlayersPage').then(m => ({ default: m.Mexicano16PlayersPage })));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage').then(m => ({ default: m.FeaturesPage })));
const Americano8PlayersPage = lazy(() => import('./pages/Americano8PlayersPage').then(m => ({ default: m.Americano8PlayersPage })));
const Americano12PlayersPage = lazy(() => import('./pages/Americano12PlayersPage').then(m => ({ default: m.Americano12PlayersPage })));
const Mexicano8PlayersPage = lazy(() => import('./pages/Mexicano8PlayersPage').then(m => ({ default: m.Mexicano8PlayersPage })));
const HowLongPage = lazy(() => import('./pages/HowLongPage').then(m => ({ default: m.HowLongPage })));
const SocialEventsPage = lazy(() => import('./pages/SocialEventsPage').then(m => ({ default: m.SocialEventsPage })));
const InterClubPage = lazy(() => import('./pages/InterClubPage').then(m => ({ default: m.InterClubPage })));
const RoundRobinVsAmericanoPage = lazy(() => import('./pages/RoundRobinVsAmericanoPage').then(m => ({ default: m.RoundRobinVsAmericanoPage })));
const BalancedMatchesPage = lazy(() => import('./pages/BalancedMatchesPage').then(m => ({ default: m.BalancedMatchesPage })));
const BeginnersPage = lazy(() => import('./pages/BeginnersPage').then(m => ({ default: m.BeginnersPage })));
const ScoreTrackerPage = lazy(() => import('./pages/ScoreTrackerPage').then(m => ({ default: m.ScoreTrackerPage })));
const PlannerPage = lazy(() => import('./pages/PlannerPage').then(m => ({ default: m.PlannerPage })));

// Spanish pages
const FormatosPage = lazy(() => import('./pages/es/FormatosPage').then(m => ({ default: m.FormatosPage })));
const AmericanoEsPage = lazy(() => import('./pages/es/AmericanoPage').then(m => ({ default: m.AmericanoEsPage })));
const MexicanoEsPage = lazy(() => import('./pages/es/MexicanoPage').then(m => ({ default: m.MexicanoEsPage })));
const OrganizarPage = lazy(() => import('./pages/es/OrganizarPage').then(m => ({ default: m.OrganizarPage })));

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

  const isLandingPage = page === '/' || page === '/es';
  const isSpanish = page.startsWith('/es');

  // Force Spanish locale for /es/* pages
  const { setLocale } = useTranslation();
  useEffect(() => {
    if (isSpanish) setLocale('es');
  }, [isSpanish, setLocale]);

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
    const unsub = firebase.onValue(
      firebase.ref(firebase.db, `users/${uid}/skin`),
      (snapshot) => {
        const val = snapshot.val() as string | null;
        if (val && isValidSkin(val)) {
          rawSetSkin(val);
          try { localStorage.setItem(SKIN_KEY, val); } catch {}
        }
      },
      (err: Error) => {
        console.warn('Skin listener failed:', err.message);
      },
    );
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
    case '/organize':
      return <Suspense fallback={null}><OrganizePage onFeedback={handleFeedback} /></Suspense>;
    case '/which-format':
      return <Suspense fallback={null}><WhichFormatPage onFeedback={handleFeedback} /></Suspense>;
    case '/americano-vs-mexicano':
      return <Suspense fallback={null}><AmericanoVsMexicanoPage onFeedback={handleFeedback} /></Suspense>;
    case '/team-americano':
      return <Suspense fallback={null}><TeamAmericanoPage onFeedback={handleFeedback} /></Suspense>;
    case '/king-of-the-court':
      return <Suspense fallback={null}><KingOfTheCourtPage onFeedback={handleFeedback} /></Suspense>;
    case '/mexicano-12-players':
      return <Suspense fallback={null}><Mexicano12PlayersPage onFeedback={handleFeedback} /></Suspense>;
    case '/mexicano-16-players':
      return <Suspense fallback={null}><Mexicano16PlayersPage onFeedback={handleFeedback} /></Suspense>;
    case '/features':
      return <Suspense fallback={null}><FeaturesPage onFeedback={handleFeedback} /></Suspense>;
    case '/americano-8-players':
      return <Suspense fallback={null}><Americano8PlayersPage onFeedback={handleFeedback} /></Suspense>;
    case '/americano-12-players':
      return <Suspense fallback={null}><Americano12PlayersPage onFeedback={handleFeedback} /></Suspense>;
    case '/mexicano-8-players':
      return <Suspense fallback={null}><Mexicano8PlayersPage onFeedback={handleFeedback} /></Suspense>;
    case '/how-long-padel-tournament':
      return <Suspense fallback={null}><HowLongPage onFeedback={handleFeedback} /></Suspense>;
    case '/social-padel-events':
      return <Suspense fallback={null}><SocialEventsPage onFeedback={handleFeedback} /></Suspense>;
    case '/inter-club':
      return <Suspense fallback={null}><InterClubPage onFeedback={handleFeedback} /></Suspense>;
    case '/round-robin-vs-americano':
      return <Suspense fallback={null}><RoundRobinVsAmericanoPage onFeedback={handleFeedback} /></Suspense>;
    case '/balanced-matches':
      return <Suspense fallback={null}><BalancedMatchesPage onFeedback={handleFeedback} /></Suspense>;
    case '/beginners':
      return <Suspense fallback={null}><BeginnersPage onFeedback={handleFeedback} /></Suspense>;
    case '/score-tracker':
      return <Suspense fallback={null}><ScoreTrackerPage onFeedback={handleFeedback} /></Suspense>;
    case '/planner':
      return <Suspense fallback={null}><PlannerPage onFeedback={handleFeedback} /></Suspense>;
    // Spanish pages
    case '/es/formatos':
      return <Suspense fallback={null}><FormatosPage onFeedback={handleFeedback} /></Suspense>;
    case '/es/americano':
      return <Suspense fallback={null}><AmericanoEsPage onFeedback={handleFeedback} /></Suspense>;
    case '/es/mexicano':
      return <Suspense fallback={null}><MexicanoEsPage onFeedback={handleFeedback} /></Suspense>;
    case '/es/organizar-torneo-padel':
      return <Suspense fallback={null}><OrganizarPage onFeedback={handleFeedback} /></Suspense>;
    default:
      return (
        <LandingPage
          skin={skin}
          setSkin={setSkin}
          telegramName={telegramName}
          onFeedback={handleFeedback}
          langPrefix={isSpanish ? '/es' : ''}
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
