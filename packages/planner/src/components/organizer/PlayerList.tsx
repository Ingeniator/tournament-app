import { useState, useRef, type ClipboardEvent } from 'react';
import { Button, Card, NO_COLOR, getClubColor, getRankColor, shortLabel, Modal, useTranslation, formatHasGroups, formatHasClubs, formatHasFixedPartners } from '@padel/common';
import type { PlannerRegistration, TournamentFormat, Club } from '@padel/common';
import { parsePlayerList } from '@padel/common';
import type { PartnerRejection, PartnerConstraints } from '../../utils/partnerLogic';
import { rejectionMessage } from '../../utils/partnerRejectionMessage';
import styles from '../../screens/OrganizerScreen.module.css';

interface PlayerListProps {
  players: PlannerRegistration[];
  capacity: number;
  addPlayer: (name: string) => Promise<void>;
  bulkAddPlayers: (names: string[]) => Promise<void>;
  removePlayer: (playerId: string) => Promise<void>;
  toggleConfirmed: (playerId: string, currentConfirmed: boolean) => Promise<void>;
  updatePlayerTelegram: (playerId: string, telegramUsername: string | null) => Promise<void>;
  updatePlayerPartner?: (playerId: string, partnerName: string | null, partnerTelegram: string | null, constraints?: PartnerConstraints) => Promise<PartnerRejection | null>;
  statuses: Map<string, string>;
  format?: TournamentFormat;
  clubs?: Club[];
  groupLabels?: [string, string];
  rankLabels?: string[];
  rankColors?: number[];
  onSetGroup?: (playerId: string, group: 'A' | 'B' | null) => Promise<void>;
  onSetClub?: (playerId: string, clubId: string | null) => Promise<void>;
  onSetRank?: (playerId: string, rankSlot: number | null) => Promise<void>;
  simplified?: boolean;
}

export function PlayerList({ players, capacity, addPlayer, bulkAddPlayers, removePlayer, toggleConfirmed, updatePlayerTelegram, updatePlayerPartner, statuses, format, clubs, groupLabels, rankLabels, rankColors, onSetGroup, onSetClub, onSetRank, simplified }: PlayerListProps) {
  const { t } = useTranslation();
  const [newPlayerName, setNewPlayerName] = useState('');
  const addingPlayer = useRef(false);
  const addPlayerInputRef = useRef<HTMLInputElement>(null);
  const [linkingPlayer, setLinkingPlayer] = useState<{ id: string; name: string; telegramUsername?: string; partnerName?: string; partnerTelegram?: string } | null>(null);
  const [linkDraft, setLinkDraft] = useState('');
  const [partnerNameDraft, setPartnerNameDraft] = useState('');
  const [partnerTelegramDraft, setPartnerTelegramDraft] = useState('');
  const showPartner = format ? formatHasFixedPartners(format) : false;

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
          {simplified
            ? t('organizer.playersSimple', { count: players.length })
            : t('organizer.players', {
                confirmed: confirmedCount,
                capacity,
                reserve: reserveCount > 0 ? t('organizer.reserveSuffix', { count: reserveCount }) : '',
              })
          }
        </h2>
        {players.length === 0 ? (
          <p className={styles.empty}>{t('organizer.noPlayersYet')}</p>
        ) : (
          <div className={styles.playerList}>
            {players.map((player, i) => (
              <div key={player.id} className={styles.playerItem}>
                <span className={styles.playerNum}>{i + 1}</span>
                <span className={styles.playerName}>
                  {!simplified && player.telegramUsername ? (
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
                  {showPartner && player.partnerName && (
                    <span className={styles.reserveBadge}>{'\uD83E\uDD1D'} {player.partnerName}</span>
                  )}
                </span>
                {(
                  (format && formatHasGroups(format) && onSetGroup) ||
                  (format && formatHasClubs(format) && onSetClub && clubs && clubs.length > 0) ||
                  (format === 'club-ranked' && onSetRank && rankLabels && rankLabels.length > 0)
                ) && (
                  <div className={styles.playerControls}>
                    {format && formatHasGroups(format) && onSetGroup && (
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
                          if (idx < 0) return undefined;
                          const cc = getClubColor(clubs[idx], idx);
                          return cc !== NO_COLOR ? { backgroundColor: cc, color: 'white', borderColor: 'transparent' } as React.CSSProperties : undefined;
                        })() : undefined}
                      >
                        <option value="">{t('organizer.selectClub')}</option>
                        {clubs.map(club => (
                          <option key={club.id} value={club.id}>
                            {shortLabel(club.name)}
                          </option>
                        ))}
                      </select>
                    )}
                    {format === 'club-ranked' && onSetRank && rankLabels && rankLabels.length > 0 && (
                      <select
                        className={styles.rankSelect}
                        value={player.rankSlot != null ? String(player.rankSlot) : ''}
                        onChange={e => onSetRank(player.id, e.target.value ? Number(e.target.value) : null)}
                        style={player.rankSlot != null ? (() => {
                          const rc = getRankColor(player.rankSlot, rankColors?.[player.rankSlot]);
                          return rc.bg !== NO_COLOR ? { backgroundColor: rc.bg, color: rc.text, borderColor: rc.border } as React.CSSProperties : undefined;
                        })() : undefined}
                      >
                        <option value="">{t('organizer.selectRank')}</option>
                        {rankLabels.map((label, idx) => (
                          <option key={idx} value={String(idx)}>
                            {shortLabel(label)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
                {!simplified && (
                  <button
                    className={player.telegramUsername ? styles.linkBtnActive : styles.linkBtn}
                    onClick={() => {
                      setLinkingPlayer({ id: player.id, name: player.name, telegramUsername: player.telegramUsername, partnerName: player.partnerName, partnerTelegram: player.partnerTelegram });
                      setLinkDraft(player.telegramUsername ? `@${player.telegramUsername}` : '');
                      setPartnerNameDraft(player.partnerName ?? '');
                      setPartnerTelegramDraft(player.partnerTelegram ? `@${player.partnerTelegram}` : '');
                    }}
                    title={t('organizer.linkProfile')}
                  >
                    &#x1F517;
                  </button>
                )}
                {!simplified && (
                  <button
                    className={player.confirmed !== false ? styles.statusConfirmed : styles.statusCancelled}
                    onClick={() => toggleConfirmed(player.id, player.confirmed !== false)}
                    title={player.confirmed !== false ? t('organizer.markCancelled') : t('organizer.markConfirmed')}
                  >
                    {player.confirmed !== false ? '\u2713' : '\u2717'}
                  </button>
                )}
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
          />
          {showPartner && updatePlayerPartner && (
            <>
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 'var(--space-xs) 0' }} />
              <label className={styles.linkLabel}>{t('organizer.partnerSection')}</label>
              <input
                className={styles.linkInput}
                type="text"
                value={partnerNameDraft}
                onChange={e => setPartnerNameDraft(e.target.value)}
                placeholder={t('organizer.partnerName')}
              />
              <input
                className={styles.linkInput}
                type="text"
                value={partnerTelegramDraft}
                onChange={e => setPartnerTelegramDraft(e.target.value)}
                placeholder={t('organizer.partnerTelegram')}
              />
            </>
          )}
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
            {showPartner && updatePlayerPartner && linkingPlayer?.partnerName && (
              <Button
                variant="secondary"
                size="small"
                onClick={() => {
                  if (!linkingPlayer) return;
                  updatePlayerPartner(linkingPlayer.id, null, null);
                  setPartnerNameDraft('');
                  setPartnerTelegramDraft('');
                  setLinkingPlayer(null);
                }}
              >
                {t('organizer.removePartner')}
              </Button>
            )}
            <Button
              size="small"
              onClick={async () => {
                if (!linkingPlayer) return;
                const username = linkDraft.trim().replace(/^@/, '') || null;
                updatePlayerTelegram(linkingPlayer.id, username);
                if (showPartner && updatePlayerPartner) {
                  const pName = partnerNameDraft.trim() || null;
                  const pTg = partnerTelegramDraft.trim().replace(/^@/, '') || null;
                  const constraints: PartnerConstraints = {
                    requireSameClub: format ? formatHasClubs(format) : false,
                    requireSameRank: format === 'club-ranked',
                    requireOppositeGroup: format ? formatHasGroups(format) : false,
                  };
                  const rejection = await updatePlayerPartner(linkingPlayer.id, pName, pTg, constraints);
                  if (rejection) {
                    alert(rejectionMessage(rejection, t));
                    return;
                  }
                }
                setLinkingPlayer(null);
              }}
              disabled={!linkDraft.trim() && !(showPartner && partnerNameDraft.trim())}
            >
              {t('organizer.saveLink')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
