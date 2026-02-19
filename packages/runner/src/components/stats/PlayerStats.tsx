import { useTranslation } from '@padel/common';
import type { PlayerStats as PlayerStatsData } from '../../hooks/usePlayerStats';
import styles from './PlayerStats.module.css';

interface Props {
  stats: PlayerStatsData[];
}

export function PlayerStats({ stats }: Props) {
  const { t } = useTranslation();

  if (stats.length === 0) {
    return <div className={styles.empty}>{t('playerStats.empty')}</div>;
  }

  return (
    <div className={styles.list}>
      {stats.map(player => (
        <div key={player.playerId} className={styles.card}>
          <div className={styles.header}>
            <span className={styles.name}>{player.playerName}</span>
            {player.playerGroup && (
              <span className={styles.group}>{t('playerStats.group', { group: player.playerGroup })}</span>
            )}
            <span className={styles.summary}>
              {t('playerStats.games', { count: player.gamesPlayed, s: player.gamesPlayed !== 1 ? 's' : '' })}
              {player.sitOuts > 0 && (
                <> · {t('playerStats.sitOuts', { count: player.sitOuts, s: player.sitOuts !== 1 ? 's' : '' })}</>
              )}
            </span>
          </div>
          {player.partners.length > 0 && (
            <div className={styles.row}>
              <span className={styles.label}>{t('playerStats.partners')}</span>
              <span className={styles.values}>
                {player.partners.map(p => `${p.name} \u00d7${p.count}`).join(', ')}
              </span>
            </div>
          )}
          {player.opponents.length > 0 && (
            <div className={styles.row}>
              <span className={styles.label}>{t('playerStats.opponents')}</span>
              <span className={styles.values}>
                {player.opponents.map(o => `${o.name} \u00d7${o.count}`).join(', ')}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
