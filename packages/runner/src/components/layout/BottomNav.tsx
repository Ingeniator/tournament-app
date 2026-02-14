import { useTranslation } from '@padel/common';
import styles from './BottomNav.module.css';

export type TabId = 'play' | 'log' | 'settings';

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabIcons: Record<TabId, string> = {
  play: '\u25B6',
  log: '\u2630',
  settings: '\u2699',
};

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { t } = useTranslation();

  const tabKeys: Record<TabId, string> = {
    play: 'nav.play',
    log: 'nav.log',
    settings: 'nav.settings',
  };

  return (
    <nav className={styles.nav}>
      {(['play', 'log', 'settings'] as TabId[]).map(id => (
        <button
          key={id}
          className={`${styles.tab} ${activeTab === id ? styles.active : ''}`}
          onClick={() => onTabChange(id)}
        >
          <span className={styles.icon}>{tabIcons[id]}</span>
          <span>{t(tabKeys[id])}</span>
        </button>
      ))}
    </nav>
  );
}
