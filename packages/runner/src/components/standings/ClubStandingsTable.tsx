import type { ClubStandingsEntry } from '@padel/common';
import { useTranslation } from '@padel/common';
import styles from './ClubStandingsTable.module.css';

const CLUB_COLORS = ['#3b82f6', '#ec4899', '#22c55e', '#f59e0b', '#a855f7'];

interface ClubStandingsTableProps {
  standings: ClubStandingsEntry[];
  clubColorMap?: Map<string, string>;
}

export function ClubStandingsTable({ standings, clubColorMap }: ClubStandingsTableProps) {
  const { t } = useTranslation();

  if (standings.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.rank}>#</th>
            <th>{t('play.clubStandings')}</th>
            <th className={`${styles.right}`}>{t('standings.pts')}</th>
            <th className={`${styles.right} ${styles.pairs}`}>{t('play.pairStandings')}</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((entry, idx) => {
            const color = clubColorMap?.get(entry.clubId) ?? CLUB_COLORS[idx % CLUB_COLORS.length];
            const rankClass =
              entry.rank === 1 ? styles.rank1
              : entry.rank === 2 ? styles.rank2
              : entry.rank === 3 ? styles.rank3
              : '';
            return (
              <tr key={entry.clubId}>
                <td className={`${styles.rank} ${rankClass}`}>{entry.rank}</td>
                <td className={styles.name}>
                  <span className={styles.clubDot} style={{ backgroundColor: color }} />
                  {entry.clubName}
                </td>
                <td className={`${styles.right} ${styles.points}`}>{entry.totalPoints}</td>
                <td className={`${styles.right} ${styles.pairs}`}>{entry.memberCount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
