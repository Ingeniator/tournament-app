import { useEffect } from 'react';
import { firebaseConfigured } from './firebase';
import { ErrorBoundary, I18nProvider, useTranslation } from '@padel/common';
import { PlannerProvider } from './state/PlannerContext';
import { usePlanner } from './state/PlannerContext';
import { HomeScreen } from './screens/HomeScreen';
import { OrganizerScreen } from './screens/OrganizerScreen';
import { JoinScreen } from './screens/JoinScreen';
import { SupportersScreen } from './screens/SupportersScreen';
import { translations } from './i18n';
import styles from './App.module.css';

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
  const { screen, setScreen, authLoading, authError, loadByCode } = usePlanner();
  const { t } = useTranslation();

  // Check URL for ?code=XXXXXX or Telegram startapp param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code')
      ?? window.Telegram?.WebApp?.initDataUnsafe?.start_param
      ?? null;
    const screenParam = params.get('screen');
    if (code && code.length === 6) {
      loadByCode(code).then(found => {
        setScreen(found ? 'join' : 'home');
      });
    } else if (screenParam === 'supporters') {
      setScreen('supporters');
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
    case 'supporters':
      return <SupportersScreen />;
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
