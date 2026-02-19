import type { Player } from '@padel/common';
import { useTranslation } from '@padel/common';
import { GroupBadge } from '../GroupBadge';
import styles from './PlayerList.module.css';

interface PlayerListProps {
  players: Player[];
  onRemove: (id: string) => void;
  showGroups?: boolean;
  onSetGroup?: (playerId: string, group: string | undefined) => void;
}

export function PlayerList({ players, onRemove, showGroups, onSetGroup }: PlayerListProps) {
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
            {player.group && !showGroups && <GroupBadge group={player.group} />}
          </div>
          <div className={styles.right}>
            {showGroups && onSetGroup && (
              <div className={styles.groupButtons}>
                <button
                  className={`${styles.groupBtn} ${player.group === 'A' ? styles.groupBtnActiveA : ''}`}
                  onClick={() => onSetGroup(player.id, player.group === 'A' ? undefined : 'A')}
                >
                  A
                </button>
                <button
                  className={`${styles.groupBtn} ${player.group === 'B' ? styles.groupBtnActiveB : ''}`}
                  onClick={() => onSetGroup(player.id, player.group === 'B' ? undefined : 'B')}
                >
                  B
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
