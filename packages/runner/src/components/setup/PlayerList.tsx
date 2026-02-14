import type { Player } from '@padel/common';
import { useTranslation } from '@padel/common';
import styles from './PlayerList.module.css';

interface PlayerListProps {
  players: Player[];
  onRemove: (id: string) => void;
}

export function PlayerList({ players, onRemove }: PlayerListProps) {
  const { t } = useTranslation();

  if (players.length === 0) {
    return <div className={styles.empty}>{t('playerList.empty')}</div>;
  }

  return (
    <div className={styles.list}>
      {players.map((player, i) => (
        <div key={player.id} className={styles.item}>
          <div className={styles.left}>
            <span className={styles.number}>{i + 1}.</span>
            <span className={styles.name}>{player.name}</span>
          </div>
          <button
            className={styles.removeBtn}
            onClick={() => onRemove(player.id)}
            aria-label={`Remove ${player.name}`}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
