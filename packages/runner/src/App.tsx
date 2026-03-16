import { useState, useEffect } from 'react';
import { TournamentProvider } from './state/TournamentContext';
import { ThemeProvider } from './state/ThemeContext';
import { useTournament } from './hooks/useTournament';
import { AppShell } from './components/layout/AppShell';
import { BottomNav, type TabId } from './components/layout/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { PlayScreen } from './screens/PlayScreen';
import { LogScreen } from './screens/LogScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { Button, ErrorBoundary, SkinPicker, I18nProvider, useTranslation } from '@padel/common';
import { useRunnerTheme } from './state/ThemeContext';
import { translations } from './i18n';
import { saveUIState, loadUIState } from './state/persistence';
import { IOSInstallBanner } from './components/IOSInstallBanner';
import { UpdatePrompt } from './components/UpdatePrompt';

function AppContent() {
  const { tournament, dispatch, saveError } = useTournament();
  const { t } = useTranslation();
  const { skin, setSkin } = useRunnerTheme();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const saved = loadUIState();
    const tab = saved?.activeTab as TabId | undefined;
    if (tab === 'play' || tab === 'log' || tab === 'settings') return tab;
    return 'play';
  });
  useEffect(() => {
    saveUIState({ activeTab });
  }, [activeTab]);

  // Update URL hash for Cloudflare Web Analytics virtual pageviews
  const currentScreen = !tournament
    ? 'home'
    : tournament.phase === 'completed'
      ? 'completed'
      : activeTab;

  useEffect(() => {
    history.replaceState(null, '', `#${currentScreen}`);
  }, [currentScreen]);

  // No tournament — show home
  if (!tournament) {
    return <HomeScreen />;
  }

  // In-progress or completed — show tab view
  return (
    <>
      {saveError && (
        <div style={{ background: 'var(--color-warning)', color: '#fff', textAlign: 'center', padding: '6px 12px', fontSize: '13px' }}>
          {t('settings.storageWarning')}
        </div>
      )}
      <AppShell
        title={tournament.name}
        hasBottomNav
        headerRight={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SkinPicker skin={skin} onSelect={setSkin} />
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
          </div>
        }
      >
        {activeTab === 'play' && <PlayScreen />}
        {activeTab === 'log' && (
          <LogScreen onNavigate={setActiveTab} />
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
        <ThemeProvider>
          <TournamentProvider>
            <AppContent />
            <IOSInstallBanner />
            <UpdatePrompt />
          </TournamentProvider>
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
