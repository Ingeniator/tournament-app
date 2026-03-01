import { Card } from '@padel/common';
import type { EventStandingEntry, EventClubStandingEntry } from '@padel/common';
import styles from './EventStandingsCards.module.css';

export function StandingsCard({
  standings,
  status,
  t,
}: {
  standings: EventStandingEntry[];
  status: string;
  t: (key: string) => string;
}) {
  return (
    <Card>
      <h2 className={styles.sectionTitle}>
        {status === 'completed' ? t('event.finalStandings') : t('event.liveStandings')}
      </h2>
      {standings.length === 0 ? (
        <p className={styles.empty}>{t('event.noStandings')}</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.rank}>#</th>
                <th>{t('event.col.name')}</th>
                <th className={styles.right}>{t('event.col.pts')}</th>
                <th className={styles.right}>{t('event.col.mp')}</th>
                <th className={styles.right}>{t('event.col.w')}</th>
                <th className={`${styles.right} ${styles.diff}`}>{t('event.col.diff')}</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((entry) => {
                const rankClass =
                  entry.rank === 1 ? styles.rank1 :
                  entry.rank === 2 ? styles.rank2 :
                  entry.rank === 3 ? styles.rank3 : '';
                const diffClass =
                  entry.pointDiff > 0 ? styles.positive :
                  entry.pointDiff < 0 ? styles.negative : '';

                return (
                  <tr key={entry.playerName}>
                    <td className={`${styles.rank} ${rankClass}`}>{entry.rank}</td>
                    <td className={styles.playerName}>{entry.playerName}</td>
                    <td className={`${styles.right} ${styles.points}`}>{entry.totalPoints}</td>
                    <td className={styles.right}>{entry.matchesPlayed}</td>
                    <td className={styles.right}>{entry.matchesWon}</td>
                    <td className={`${styles.right} ${styles.diff} ${diffClass}`}>
                      {entry.pointDiff > 0 ? '+' : ''}{entry.pointDiff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function ClubStandingsCard({
  clubStandings,
  status,
  t,
}: {
  clubStandings: EventClubStandingEntry[];
  status: string;
  t: (key: string) => string;
}) {
  return (
    <Card>
      <h2 className={styles.sectionTitle}>
        {status === 'completed' ? t('event.finalClubStandings') : t('event.liveClubStandings')}
      </h2>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.rank}>#</th>
              <th>{t('event.col.club')}</th>
              <th className={styles.right}>{t('event.col.pts')}</th>
              <th className={styles.right}>{t('event.col.members')}</th>
            </tr>
          </thead>
          <tbody>
            {clubStandings.map((entry) => {
              const rankClass =
                entry.rank === 1 ? styles.rank1 :
                entry.rank === 2 ? styles.rank2 :
                entry.rank === 3 ? styles.rank3 : '';

              return (
                <tr key={entry.clubName}>
                  <td className={`${styles.rank} ${rankClass}`}>{entry.rank}</td>
                  <td className={styles.playerName}>{entry.clubName}</td>
                  <td className={`${styles.right} ${styles.points}`}>{entry.totalPoints}</td>
                  <td className={styles.right}>{entry.memberCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
