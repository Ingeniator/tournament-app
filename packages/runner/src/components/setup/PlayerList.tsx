import type { Player, TournamentFormat } from '@padel/common';
import { useTranslation } from '@padel/common';
import styles from './PlayerList.module.css';

interface PlayerListProps {
  players: Player[];
  onRemove: (id: string) => void;
  format?: TournamentFormat;
  groupLabels?: [string, string];
  onSetGroup?: (playerId: string, group: 'A' | 'B') => void;
}

export function PlayerList({ players, onRemove, format, groupLabels, onSetGroup }: PlayerListProps) {
  const { t } = useTranslation();
  const showGroups = format === 'mixicano' && onSetGroup;
  const labelA = groupLabels?.[0] || t('config.groupLabelAPlaceholder');
  const labelB = groupLabels?.[1] || t('config.groupLabelBPlaceholder');

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
          <div className={styles.right}>
            {showGroups && (
              <div className={styles.groupToggle}>
                <button
                  className={`${styles.groupBtn} ${player.group === 'A' ? styles.groupActive : ''}`}
                  onClick={() => onSetGroup(player.id, 'A')}
                >
                  {labelA}
                </button>
                <button
                  className={`${styles.groupBtn} ${player.group === 'B' ? styles.groupActive : ''}`}
                  onClick={() => onSetGroup(player.id, 'B')}
                >
                  {labelB}
                </button>
              </div>
            )}
            <button
              className={styles.removeBtn}
              onClick={() => onRemove(player.id)}
              aria-label={`Remove ${player.name}`}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
