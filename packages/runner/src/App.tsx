import { useState, useEffect, useRef } from 'react';
import { TournamentProvider } from './state/TournamentContext';
import { useTournament } from './hooks/useTournament';
import { AppShell } from './components/layout/AppShell';
import { BottomNav, type TabId } from './components/layout/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { SetupScreen } from './screens/SetupScreen';
import { PlayScreen } from './screens/PlayScreen';
import { LogScreen } from './screens/LogScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { Button } from '@padel/common';
import { saveUIState, loadUIState } from './state/persistence';

function AppContent() {
  const { tournament, dispatch } = useTournament();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const saved = loadUIState();
    const tab = saved?.activeTab as TabId | undefined;
    if (tab === 'play' || tab === 'log' || tab === 'settings') return tab;
    return 'play';
  });
  const [showStatsOnMount, setShowStatsOnMount] = useState(false);
  const prevPhaseRef = useRef(tournament?.phase);

  useEffect(() => {
    saveUIState({ activeTab });
  }, [activeTab]);

  // Update URL hash for Cloudflare Web Analytics virtual pageviews
  const currentScreen = !tournament
    ? 'home'
    : tournament.phase === 'setup'
      ? 'setup'
      : tournament.phase === 'completed'
        ? 'completed'
        : activeTab;

  useEffect(() => {
    history.replaceState(null, '', `#${currentScreen}`);
  }, [currentScreen]);

  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    const curPhase = tournament?.phase;
    prevPhaseRef.current = curPhase;

    if (prevPhase === 'setup' && curPhase === 'in-progress') {
      setActiveTab('log');
      setShowStatsOnMount(true);
    }
  }, [tournament?.phase]);

  // No tournament — show home
  if (!tournament) {
    return <HomeScreen />;
  }

  // Setup phase
  if (tournament.phase === 'setup') {
    return <SetupScreen />;
  }

  // In-progress or completed — show tab view
  return (
    <>
      <AppShell
        title={tournament.name}
        hasBottomNav
        headerRight={
          <Button
            variant="ghost"
            size="small"
            onClick={() => {
              if (confirm('Start a new tournament? Current one will be deleted.')) {
                dispatch({ type: 'RESET_TOURNAMENT' });
              }
            }}
          >
            New
          </Button>
        }
      >
        {activeTab === 'play' && <PlayScreen />}
        {activeTab === 'log' && (
          <LogScreen
            onNavigate={setActiveTab}
            autoShowStats={showStatsOnMount}
            onStatsShown={() => setShowStatsOnMount(false)}
          />
        )}
        {activeTab === 'settings' && <SettingsScreen />}
      </AppShell>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );
}

export function App() {
  return (
    <TournamentProvider>
      <AppContent />
    </TournamentProvider>
  );
}
