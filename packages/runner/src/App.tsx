import { useState, useEffect, useRef } from 'react';
import { TournamentProvider } from './state/TournamentContext';
import { useTournament } from './hooks/useTournament';
import { AppShell } from './components/layout/AppShell';
import { BottomNav, type TabId } from './components/layout/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { SetupScreen } from './screens/SetupScreen';
import { TeamPairingScreen } from './screens/TeamPairingScreen';
import { PlayScreen } from './screens/PlayScreen';
import { LogScreen } from './screens/LogScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { Button, ErrorBoundary, I18nProvider, useTranslation } from '@padel/common';
import { translations } from './i18n';
import { saveUIState, loadUIState } from './state/persistence';

function AppContent() {
  const { tournament, dispatch, saveError } = useTournament();
  const { t } = useTranslation();
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
      : tournament.phase === 'team-pairing'
        ? 'team-pairing'
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

    if ((prevPhase === 'setup' || prevPhase === 'team-pairing') && curPhase === 'in-progress') {
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

  // Team pairing phase
  if (tournament.phase === 'team-pairing') {
    return <TeamPairingScreen />;
  }

  // In-progress or completed — show tab view
  return (
    <>
      {saveError && (
        <div style={{ background: '#d97706', color: '#fff', textAlign: 'center', padding: '6px 12px', fontSize: '13px' }}>
          {t('settings.storageWarning')}
        </div>
      )}
      <AppShell
        title={tournament.name}
        hasBottomNav
        headerRight={
          <Button
            variant="ghost"
            size="small"
            onClick={() => {
              if (confirm(t('play.newConfirm'))) {
                dispatch({ type: 'RESET_TOURNAMENT' });
              }
            }}
          >
            {t('play.new')}
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
    <ErrorBoundary>
      <I18nProvider translations={translations}>
        <TournamentProvider>
          <AppContent />
        </TournamentProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
