import { useEffect } from 'react';
import { firebaseConfigured } from './firebase';
import { ErrorBoundary, I18nProvider, useTranslation, type Locale } from '@padel/common';
import { PlannerProvider } from './state/PlannerContext';
import { usePlanner } from './state/PlannerContext';
import { HomeScreen } from './screens/HomeScreen';
import { OrganizerScreen } from './screens/OrganizerScreen';
import { JoinScreen } from './screens/JoinScreen';
import { EventScreen } from './screens/EventScreen';
import { EventFormScreen } from './screens/EventFormScreen';
import { translations } from './i18n';
import styles from './App.module.css';

const LOCALE_KEY = 'padel-locale';
const SUPPORTED_LOCALES = ['en', 'es', 'it', 'pt', 'sr', 'fr', 'sv'];

function preSeedLocaleFromUrl() {
  try {
    if (localStorage.getItem(LOCALE_KEY)) return;
    const lang = new URLSearchParams(window.location.search).get('lang');
    if (lang && SUPPORTED_LOCALES.includes(lang)) {
      localStorage.setItem(LOCALE_KEY, lang);
    }
  } catch {}
}

preSeedLocaleFromUrl();

function FirebaseSetupMessage() {
  const { t } = useTranslation();
  return (
    <div className={styles.setup}>
      <h1>{t('app.firebaseRequired')}</h1>
      <p>{t('app.firebaseInstructions')}</p>
      <p>{t('app.firebaseSeeExample')}</p>
    </div>
  );
}

function AppContent() {
  const { screen, setScreen, authLoading, authError, loadByCode, tournament, uid, activeEventId, setActiveEventId } = usePlanner();
  const { t, setLocale } = useTranslation();

  // Apply tournament locale for Telegram deep links (no &lang= in URL)
  useEffect(() => {
    if (!tournament?.locale) return;
    try {
      if (!localStorage.getItem(LOCALE_KEY)) {
        setLocale(tournament.locale as Locale);
      }
    } catch {}
  }, [tournament?.locale, setLocale]);

  // Check URL for ?code=XXXXXX or Telegram startapp param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code')
      ?? window.Telegram?.WebApp?.initDataUnsafe?.start_param
      ?? null;
    if (code && code.length === 6) {
      loadByCode(code).then(found => {
        setScreen(found ? 'join' : 'home');
      });
    } else {
      setScreen('home');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update URL hash for Cloudflare Web Analytics virtual pageviews
  useEffect(() => {
    if (screen !== 'loading') {
      history.replaceState(null, '', `#${screen}`);
    }
  }, [screen]);

  if (authLoading || screen === 'loading') {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (authError) {
    return (
      <div className={styles.setup}>
        <h1>{t('app.connectionError')}</h1>
        <p>{authError}</p>
        <button onClick={() => window.location.reload()}>{t('app.retry')}</button>
      </div>
    );
  }

  switch (screen) {
    case 'home':
      return <HomeScreen />;
    case 'organizer':
      return <OrganizerScreen />;
    case 'join':
      return <JoinScreen />;
    case 'event-create':
      return (
        <EventFormScreen
          uid={uid}
          onBack={() => setScreen('home')}
          onCreated={(id) => {
            setActiveEventId(id);
            setScreen('event-detail');
          }}
        />
      );
    case 'event-detail':
      return (
        <EventScreen
          eventId={activeEventId!}
          uid={uid}
          onBack={() => {
            setActiveEventId(null);
            setScreen('home');
          }}
        />
      );
    default:
      return <HomeScreen />;
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <I18nProvider translations={translations}>
        {!firebaseConfigured ? (
          <FirebaseSetupMessage />
        ) : (
          <PlannerProvider>
            <AppContent />
          </PlannerProvider>
        )}
      </I18nProvider>
    </ErrorBoundary>
  );
}
