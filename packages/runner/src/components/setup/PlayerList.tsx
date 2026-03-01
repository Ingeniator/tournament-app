import { useState } from 'react';
import type { Player, TournamentFormat, Club } from '@padel/common';
import { useTranslation, getClubColor, formatHasClubs } from '@padel/common';
import styles from './PlayerList.module.css';

interface PlayerListProps {
  players: Player[];
  onRemove: (id: string) => void;
  onRename?: (playerId: string, name: string) => void;
  format?: TournamentFormat;
  groupLabels?: [string, string];
  onSetGroup?: (playerId: string, group: 'A' | 'B' | null) => void;
  clubs?: Club[];
  onSetClub?: (playerId: string, clubId: string | null) => void;
}

export function PlayerList({ players, onRemove, onRename, format, groupLabels, onSetGroup, clubs, onSetClub }: PlayerListProps) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const showGroups = format === 'mixicano' && onSetGroup;
  const showClubs = format && formatHasClubs(format) && onSetClub && clubs && clubs.length > 0;
  const labelA = groupLabels?.[0] || t('config.groupLabelAPlaceholder');
  const labelB = groupLabels?.[1] || t('config.groupLabelBPlaceholder');

  const startEditing = (player: Player) => {
    setEditingId(player.id);
    setEditName(player.name);
  };

  const commitEdit = (playerId: string) => {
    const trimmed = editName.trim();
    if (trimmed && onRename) {
      const player = players.find(p => p.id === playerId);
      if (player && trimmed !== player.name) {
        onRename(playerId, trimmed);
      }
    }
    setEditingId(null);
  };

  if (players.length === 0) {
    return <div className={styles.empty}>{t('playerList.empty')}</div>;
  }

  return (
    <div className={styles.list}>
      {players.map((player, i) => (
        <div key={player.id} className={styles.item}>
          <div className={styles.left}>
            <span className={styles.number}>{i + 1}</span>
            {editingId === player.id ? (
              <input
                className={styles.editInput}
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitEdit(player.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onBlur={() => commitEdit(player.id)}
                autoFocus
              />
            ) : (
              <span
                className={`${styles.name} ${onRename ? styles.nameEditable : ''}`}
                onClick={onRename ? () => startEditing(player) : undefined}
              >
                {player.name}
              </span>
            )}
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
                  return idx >= 0 ? { backgroundColor: getClubColor(clubs[idx], idx), color: 'white', borderColor: 'transparent' } as React.CSSProperties : undefined;
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
