import type { PlayerStats as PlayerStatsData } from '../../hooks/usePlayerStats';
import styles from './PlayerStats.module.css';

interface Props {
  stats: PlayerStatsData[];
}

export function PlayerStats({ stats }: Props) {
  if (stats.length === 0) {
    return <div className={styles.empty}>No scored matches yet</div>;
  }

  return (
    <div className={styles.list}>
      {stats.map(player => (
        <div key={player.playerId} className={styles.card}>
          <div className={styles.header}>
            <span className={styles.name}>{player.playerName}</span>
            <span className={styles.summary}>
              {player.gamesPlayed} game{player.gamesPlayed !== 1 ? 's' : ''}
              {player.sitOuts > 0 && (
                <> · {player.sitOuts} sit-out{player.sitOuts !== 1 ? 's' : ''}</>
              )}
            </span>
          </div>
          {player.partners.length > 0 && (
            <div className={styles.row}>
              <span className={styles.label}>Partners</span>
              <span className={styles.values}>
                {player.partners.map(p => `${p.name} ×${p.count}`).join(', ')}
              </span>
            </div>
          )}
          {player.opponents.length > 0 && (
            <div className={styles.row}>
              <span className={styles.label}>Opponents</span>
              <span className={styles.values}>
                {player.opponents.map(o => `${o.name} ×${o.count}`).join(', ')}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
