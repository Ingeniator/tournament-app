import { useEffect } from 'react';
import { firebaseConfigured } from './firebase';
import { PlannerProvider, usePlanner } from './state/PlannerContext';
import { HomeScreen } from './screens/HomeScreen';
import { OrganizerScreen } from './screens/OrganizerScreen';
import { JoinScreen } from './screens/JoinScreen';
import { SupportersScreen } from './screens/SupportersScreen';
import styles from './App.module.css';

function AppContent() {
  const { screen, setScreen, authLoading, loadByCode } = usePlanner();

  // Check URL for ?code=XXXXXX on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
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
  if (!firebaseConfigured) {
    return (
      <div className={styles.setup}>
        <h1>Firebase Setup Required</h1>
        <p>Create a <code>.env</code> file in <code>packages/planner/</code> with your Firebase config.</p>
        <p>See <code>.env.example</code> for the required variables.</p>
      </div>
    );
  }

  return (
    <PlannerProvider>
      <AppContent />
    </PlannerProvider>
  );
}
