import { Button, Card, useTranslation } from '@padel/common';
import { usePlanner } from '../state/PlannerContext';
import { useAnalytics } from '../hooks/useAnalytics';
import styles from './AnalyticsScreen.module.css';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function BreakdownList({ items }: { items: Record<string, number> }) {
  const sorted = Object.entries(items).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;
  return (
    <div className={styles.breakdownList}>
      {sorted.map(([name, count]) => (
        <div key={name} className={styles.breakdownItem}>
          <span className={styles.breakdownName}>{name}</span>
          <span className={styles.breakdownCount}>{count}</span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsScreen() {
  const { setScreen } = usePlanner();
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useAnalytics();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => setScreen('home')}>
          {t('analytics.back')}
        </button>
        <h1 className={styles.title}>{t('analytics.title')}</h1>
      </header>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
      )}

      {error && (
        <Card>
          <p className={styles.error}>{error}</p>
          <Button size="small" onClick={refresh}>{t('analytics.retry')}</Button>
        </Card>
      )}

      {!loading && !error && (
        <>
          <div className={styles.statsGrid}>
            <StatCard label={t('analytics.totalTournaments')} value={data.totalTournaments} />
            <StatCard label={t('analytics.totalPlayers')} value={data.totalPlayers} />
            <StatCard label={t('analytics.totalOrganizers')} value={data.totalOrganizers} />
            <StatCard label={t('analytics.avgPlayersPerTournament')} value={data.avgPlayersPerTournament} />
            <StatCard label={t('analytics.avgTournamentsPerOrganizer')} value={data.avgTournamentsPerOrganizer} />
          </div>

          {Object.keys(data.formatBreakdown).length > 0 && (
            <Card>
              <h2 className={styles.sectionTitle}>{t('analytics.byFormat')}</h2>
              <BreakdownList items={data.formatBreakdown} />
            </Card>
          )}

          {Object.keys(data.places).length > 0 && (
            <Card>
              <h2 className={styles.sectionTitle}>{t('analytics.byPlace')}</h2>
              <BreakdownList items={data.places} />
            </Card>
          )}

          <div className={styles.refreshRow}>
            <Button variant="ghost" size="small" onClick={refresh}>
              {t('analytics.refresh')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
