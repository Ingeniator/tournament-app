import { useState, useRef, type ClipboardEvent } from 'react';
import { Button, Card, getClubColor, Modal, useTranslation, formatHasClubs } from '@padel/common';
import type { PlannerRegistration, TournamentFormat, Club } from '@padel/common';
import { parsePlayerList } from '@padel/common';
import styles from '../../screens/OrganizerScreen.module.css';

interface PlayerListProps {
  players: PlannerRegistration[];
  capacity: number;
  addPlayer: (name: string) => Promise<void>;
  bulkAddPlayers: (names: string[]) => Promise<void>;
  removePlayer: (playerId: string) => Promise<void>;
  toggleConfirmed: (playerId: string, currentConfirmed: boolean) => Promise<void>;
  updatePlayerTelegram: (playerId: string, telegramUsername: string | null) => Promise<void>;
  statuses: Map<string, string>;
  format?: TournamentFormat;
  clubs?: Club[];
  groupLabels?: [string, string];
  rankLabels?: string[];
  onSetGroup?: (playerId: string, group: 'A' | 'B' | null) => Promise<void>;
  onSetClub?: (playerId: string, clubId: string | null) => Promise<void>;
  onSetRank?: (playerId: string, rankSlot: number | null) => Promise<void>;
}

export function PlayerList({ players, capacity, addPlayer, bulkAddPlayers, removePlayer, toggleConfirmed, updatePlayerTelegram, statuses, format, clubs, groupLabels, rankLabels, onSetGroup, onSetClub, onSetRank }: PlayerListProps) {
  const { t } = useTranslation();
  const [newPlayerName, setNewPlayerName] = useState('');
  const addingPlayer = useRef(false);
  const addPlayerInputRef = useRef<HTMLInputElement>(null);
  const [linkingPlayer, setLinkingPlayer] = useState<{ id: string; name: string; telegramUsername?: string } | null>(null);
  const [linkDraft, setLinkDraft] = useState('');

  const confirmedCount = players.filter(p => p.confirmed !== false).length;
  const reserveCount = [...statuses.values()].filter(s => s === 'reserve').length;

  const handleAdd = async () => {
    if (newPlayerName.trim() && !addingPlayer.current) {
      addingPlayer.current = true;
      const trimmed = newPlayerName.trim();
      setNewPlayerName('');
      if (trimmed.includes(',')) {
        const names = parsePlayerList(trimmed);
        if (names.length > 0) {
          await bulkAddPlayers(names);
        }
      } else {
        await addPlayer(trimmed);
      }
      addingPlayer.current = false;
      addPlayerInputRef.current?.focus();
    }
  };

  return (
    <>
      <Card>
        <h2 className={styles.sectionTitle}>
          {t('organizer.players', {
            confirmed: confirmedCount,
            capacity,
            reserve: reserveCount > 0 ? t('organizer.reserveSuffix', { count: reserveCount }) : '',
          })}
        </h2>
        {players.length === 0 ? (
          <p className={styles.empty}>{t('organizer.noPlayersYet')}</p>
        ) : (
          <div className={styles.playerList}>
            {players.map((player, i) => (
              <div key={player.id} className={styles.playerItem}>
                <span className={styles.playerNum}>{i + 1}</span>
                <span className={styles.playerName}>
                  {player.telegramUsername ? (
                    <a
                      href={`https://t.me/${player.telegramUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.playerLink}
                    >
                      {player.name}
                    </a>
                  ) : (
                    player.name
                  )}
                  {statuses.get(player.id) === 'reserve' && (
                    <span className={styles.reserveBadge}>{t('organizer.reserve')}</span>
                  )}
                </span>
                {format === 'mixicano' && onSetGroup && (
                  <div className={styles.groupToggle}>
                    <button
                      className={player.group === 'A' ? styles.groupBtnActive : styles.groupBtn}
                      onClick={() => onSetGroup(player.id, player.group === 'A' ? null : 'A')}
                    >
                      {groupLabels?.[0] || 'A'}
                    </button>
                    <button
                      className={player.group === 'B' ? styles.groupBtnActive : styles.groupBtn}
                      onClick={() => onSetGroup(player.id, player.group === 'B' ? null : 'B')}
                    >
                      {groupLabels?.[1] || 'B'}
                    </button>
                  </div>
                )}
                {format && formatHasClubs(format) && onSetClub && clubs && clubs.length > 0 && (
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
                {format === 'club-ranked' && onSetRank && rankLabels && rankLabels.length > 0 && (
                  <select
                    className={styles.rankSelect}
                    value={player.rankSlot != null ? String(player.rankSlot) : ''}
                    onChange={e => onSetRank(player.id, e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">—</option>
                    {rankLabels.map((label, idx) => (
                      <option key={idx} value={String(idx)}>
                        {label}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  className={player.telegramUsername ? styles.linkBtnActive : styles.linkBtn}
                  onClick={() => {
                    setLinkingPlayer({ id: player.id, name: player.name, telegramUsername: player.telegramUsername });
                    setLinkDraft(player.telegramUsername ? `@${player.telegramUsername}` : '');
                  }}
                  title={t('organizer.linkProfile')}
                >
                  &#x1F517;
                </button>
                <button
                  className={player.confirmed !== false ? styles.statusConfirmed : styles.statusCancelled}
                  onClick={() => toggleConfirmed(player.id, player.confirmed !== false)}
                  title={player.confirmed !== false ? t('organizer.markCancelled') : t('organizer.markConfirmed')}
                >
                  {player.confirmed !== false ? '\u2713' : '\u2717'}
                </button>
                <button
                  className={styles.removeBtn}
                  onClick={() => removePlayer(player.id)}
                  title={t('organizer.removePlayer')}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
        <div className={styles.addPlayerRow}>
          <input
            ref={addPlayerInputRef}
            className={styles.addPlayerInput}
            type="text"
            value={newPlayerName}
            onChange={e => setNewPlayerName(e.target.value)}
            placeholder={t('organizer.playerNamePlaceholder')}
            onKeyDown={async e => {
              if (e.key === 'Enter' && newPlayerName.trim() && !addingPlayer.current) {
                addingPlayer.current = true;
                const trimmed = newPlayerName.trim();
                setNewPlayerName('');
                if (trimmed.includes(',')) {
                  const names = parsePlayerList(trimmed);
                  if (names.length > 0) {
                    await bulkAddPlayers(names);
                  }
                } else {
                  await addPlayer(trimmed);
                }
                addingPlayer.current = false;
                addPlayerInputRef.current?.focus();
              }
            }}
            onPaste={(e: ClipboardEvent<HTMLInputElement>) => {
              const text = e.clipboardData.getData('text');
              if (!text.includes('\n') && !text.includes(',')) return;
              e.preventDefault();
              const names = parsePlayerList(text);
              if (names.length > 0) {
                bulkAddPlayers(names);
              }
            }}
          />
          <Button
            variant="ghost"
            size="small"
            onClick={handleAdd}
            disabled={!newPlayerName.trim()}
          >
            {t('organizer.addPlayer')}
          </Button>
        </div>
      </Card>

      <Modal
        open={!!linkingPlayer}
        title={t('organizer.linkProfileTitle', { name: linkingPlayer?.name ?? '' })}
        onClose={() => setLinkingPlayer(null)}
      >
        <div className={styles.linkForm}>
          <label className={styles.linkLabel}>{t('organizer.telegramUsername')}</label>
          <input
            className={styles.linkInput}
            type="text"
            value={linkDraft}
            onChange={e => setLinkDraft(e.target.value)}
            placeholder={t('organizer.telegramPlaceholder')}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter' && linkingPlayer) {
                const username = linkDraft.trim().replace(/^@/, '') || null;
                updatePlayerTelegram(linkingPlayer.id, username);
                setLinkingPlayer(null);
              }
            }}
          />
          <div className={styles.linkActions}>
            {linkingPlayer?.telegramUsername && (
              <Button
                variant="secondary"
                size="small"
                onClick={() => {
                  updatePlayerTelegram(linkingPlayer.id, null);
                  setLinkingPlayer(null);
                }}
              >
                {t('organizer.removeLink')}
              </Button>
            )}
            <Button
              size="small"
              onClick={() => {
                if (!linkingPlayer) return;
                const username = linkDraft.trim().replace(/^@/, '') || null;
                updatePlayerTelegram(linkingPlayer.id, username);
                setLinkingPlayer(null);
              }}
              disabled={!linkDraft.trim()}
            >
              {t('organizer.saveLink')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
