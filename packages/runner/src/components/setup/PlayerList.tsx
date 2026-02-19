import type { Player, TournamentFormat } from '@padel/common';
import { useTranslation } from '@padel/common';
import styles from './PlayerList.module.css';

interface PlayerListProps {
  players: Player[];
  format?: TournamentFormat;
  onRemove: (id: string) => void;
  onGroupChange?: (playerId: string, group: string) => void;
}

export function PlayerList({ players, format, onRemove, onGroupChange }: PlayerListProps) {
  const { t } = useTranslation();
  const showGroups = format === 'mixicano';

  // Collect existing group names from players
  const existingGroups = showGroups
    ? [...new Set(players.map(p => p.group).filter(Boolean))].sort() as string[]
    : [];

  // Default group names if none assigned yet
  const groupNames = existingGroups.length >= 2 ? existingGroups : ['A', 'B'];

  if (players.length === 0) {
    return <div className={styles.empty}>{t('playerList.empty')}</div>;
  }

  return (
    <div className={styles.list}>
      {showGroups && players.length > 0 && (
        <div className={styles.groupHeader}>
          <span className={styles.groupHeaderLabel}>{t('playerList.groupAssignment')}</span>
          {(() => {
            const counts = new Map<string, number>();
            for (const p of players) {
              const g = p.group || groupNames[0];
              counts.set(g, (counts.get(g) ?? 0) + 1);
            }
            const entries = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
            const isUnequal = entries.length >= 2 && !entries.every(([, c]) => c === entries[0][1]);
            return (
              <>
                <span className={styles.groupCounts}>
                  {entries.map(([g, c]) => `${g}: ${c}`).join(' / ')}
                </span>
                {isUnequal && (
                  <span className={styles.groupWarning}>
                    {t('playerList.unequalGroups')}
                  </span>
                )}
              </>
            );
          })()}
        </div>
      )}
      {players.map((player, i) => (
        <div key={player.id} className={styles.item}>
          <div className={styles.left}>
            <span className={styles.number}>{i + 1}.</span>
            <span className={styles.name}>{player.name}</span>
            {showGroups && (
              <div className={styles.groupSelector}>
                {groupNames.map(g => (
                  <button
                    key={g}
                    className={`${styles.groupBtn} ${(player.group || groupNames[0]) === g ? styles.groupBtnActive : ''}`}
                    onClick={() => onGroupChange?.(player.id, g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
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
