import type { Player, TournamentFormat, Club } from '@padel/common';
import { useTranslation, CLUB_COLORS } from '@padel/common';
import styles from './PlayerList.module.css';

interface PlayerListProps {
  players: Player[];
  onRemove: (id: string) => void;
  format?: TournamentFormat;
  groupLabels?: [string, string];
  onSetGroup?: (playerId: string, group: 'A' | 'B' | null) => void;
  clubs?: Club[];
  onSetClub?: (playerId: string, clubId: string | null) => void;
}

export function PlayerList({ players, onRemove, format, groupLabels, onSetGroup, clubs, onSetClub }: PlayerListProps) {
  const { t } = useTranslation();
  const showGroups = format === 'mixicano' && onSetGroup;
  const showClubs = format === 'club-americano' && onSetClub && clubs && clubs.length > 0;
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
                  onClick={() => onSetGroup(player.id, player.group === 'A' ? null : 'A')}
                >
                  {labelA}
                </button>
                <button
                  className={`${styles.groupBtn} ${player.group === 'B' ? styles.groupActive : ''}`}
                  onClick={() => onSetGroup(player.id, player.group === 'B' ? null : 'B')}
                >
                  {labelB}
                </button>
              </div>
            )}
            {showClubs && (
              <select
                className={styles.clubSelect}
                value={player.clubId ?? ''}
                onChange={e => onSetClub(player.id, e.target.value || null)}
                style={player.clubId ? (() => {
                  const idx = clubs.findIndex(c => c.id === player.clubId);
                  return idx >= 0 ? { '--club-color': CLUB_COLORS[idx % CLUB_COLORS.length] } as React.CSSProperties : undefined;
                })() : undefined}
              >
                <option value="">—</option>
                {clubs.map(club => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
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
