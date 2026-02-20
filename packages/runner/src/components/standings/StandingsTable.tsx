import type { StandingsEntry } from '@padel/common';
import { useTranslation } from '@padel/common';
import styles from './StandingsTable.module.css';

export interface GroupInfo {
  labels: [string, string];
  map: Map<string, 'A' | 'B'>;
}

interface StandingsTableProps {
  standings: StandingsEntry[];
  plannedGames?: Map<string, number>;
  groupInfo?: GroupInfo;
}

export function StandingsTable({ standings, plannedGames, groupInfo }: StandingsTableProps) {
  const { t } = useTranslation();

  if (standings.length === 0) {
    return <div className={styles.empty}>{t('standings.empty')}</div>;
  }

  return (
    <div className={styles.wrapper}>
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.rank}>#</th>
          <th>{t('standings.name')}</th>
          <th className={`${styles.right} ${styles.numCol}`}>{t('standings.pts')}</th>
          {plannedGames && <th className={`${styles.right} ${styles.numCol}`}>{t('standings.gp')}</th>}
          <th className={`${styles.right} ${styles.wtlCol}`}>{t('standings.wtl')}</th>
          <th className={`${styles.right} ${styles.diff}`}>{t('standings.diff')}</th>
        </tr>
      </thead>
      <tbody>
        {standings.map(entry => {
          const rankClass =
            entry.rank === 1
              ? styles.rank1
              : entry.rank === 2
              ? styles.rank2
              : entry.rank === 3
              ? styles.rank3
              : '';
          const diffClass =
            entry.pointDiff > 0
              ? styles.positive
              : entry.pointDiff < 0
              ? styles.negative
              : '';
          const planned = plannedGames?.get(entry.playerId) ?? 0;

          return (
            <tr key={entry.playerId}>
              <td className={`${styles.rank} ${rankClass}`}>{entry.rank}</td>
              <td className={styles.name}>
                {entry.playerName}
                {groupInfo && groupInfo.map.has(entry.playerId) && (
                  <span className={`${styles.groupBadge} ${groupInfo.map.get(entry.playerId) === 'A' ? styles.groupA : styles.groupB}`}>
                    {groupInfo.map.get(entry.playerId) === 'A' ? groupInfo.labels[0] : groupInfo.labels[1]}
                  </span>
                )}
              </td>
              <td className={`${styles.right} ${styles.points}`}>{entry.totalPoints}</td>
              {plannedGames && (
                <td className={`${styles.right} ${styles.gamesCol} ${planned === 0 ? styles.noPlanned : ''}`}>
                  {entry.matchesPlayed}
                  <span className={styles.plannedPart}>+{planned}</span>
                </td>
              )}
              <td className={styles.right}>{entry.matchesWon}-{entry.matchesDraw}-{entry.matchesLost}</td>
              <td className={`${styles.right} ${styles.diff} ${diffClass}`}>
                {entry.pointDiff > 0 ? '+' : ''}
                {entry.pointDiff}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}
