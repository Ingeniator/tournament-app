import { useState, useRef, useMemo, useEffect, useCallback, type ClipboardEvent, type ReactNode } from 'react';
import { Button, Card, NO_COLOR, getClubColor, getRankColor, shortLabel, Modal, useTranslation, formatHasGroups, formatHasClubs, formatHasFixedPartners } from '@padel/common';
import type { PlannerRegistration, TournamentFormat, Club } from '@padel/common';
import { parsePlayerList } from '@padel/common';
import type { PartnerRejection, PartnerConstraints } from '../../utils/partnerLogic';
import { findPartner, wouldBreakPartnerLink } from '../../utils/partnerLogic';
import { rejectionMessage } from '../../utils/partnerRejectionMessage';
import { asyncConfirm } from '../../utils/confirm';
import type { PlayerStatus } from '../../utils/playerStatus';
import styles from '../../screens/OrganizerScreen.module.css';

interface PlayerListProps {
  players: PlannerRegistration[];
  capacity: number;
  addPlayer: (name: string) => Promise<void>;
  bulkAddPlayers: (names: string[]) => Promise<void>;
  removePlayer: (playerId: string) => Promise<void>;
  toggleConfirmed: (playerId: string, currentConfirmed: boolean) => Promise<void>;
  updatePlayerAlias: (playerId: string, alias: string | null) => Promise<void>;
  updatePlayerTelegram: (playerId: string, telegramUsername: string | null) => Promise<void>;
  updatePlayerPartner?: (playerId: string, partnerName: string | null, partnerTelegram: string | null, constraints?: PartnerConstraints, addedBy?: string) => Promise<PartnerRejection | null>;
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
  captainMode?: boolean;
  showToast?: (msg: string) => void;
  /** Name of the organizer / captain performing the action */
  operatorName?: string;
  onApprove?: (playerId: string) => Promise<void>;
  onReject?: (playerId: string) => Promise<void>;
}

export function PlayerList({ players, capacity, addPlayer, bulkAddPlayers, removePlayer, toggleConfirmed, updatePlayerAlias, updatePlayerTelegram, updatePlayerPartner, statuses, format, clubs, groupLabels, rankLabels, rankColors, onSetGroup, onSetClub, onSetRank, simplified, captainMode, showToast, operatorName, onApprove, onReject }: PlayerListProps) {
  const { t } = useTranslation();
  const [newPlayerName, setNewPlayerName] = useState('');
  const addingPlayer = useRef(false);
  const addPlayerInputRef = useRef<HTMLInputElement>(null);
  const [linkingPlayer, setLinkingPlayer] = useState<{ id: string; name: string; alias?: string; telegramUsername?: string; partnerName?: string; partnerTelegram?: string; clubId?: string; rankSlot?: number; group?: 'A' | 'B' } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setOpenMenuId(null), []);

  useEffect(() => {
    if (!openMenuId) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenuId, closeMenu]);
  const NEW_PLAYER_VALUE = '__new__';
  const [aliasDraft, setAliasDraft] = useState('');
  const [linkDraft, setLinkDraft] = useState('');
  const [partnerNameDraft, setPartnerNameDraft] = useState('');
  const [partnerTelegramDraft, setPartnerTelegramDraft] = useState('');
  const [newPartnerNameDraft, setNewPartnerNameDraft] = useState('');
  const [newPartnerTelegramDraft, setNewPartnerTelegramDraft] = useState('');
  const showPartner = format ? formatHasFixedPartners(format) : false;
  const isPairFormat = format ? formatHasFixedPartners(format) : false;
  const [cancelledOpen, setCancelledOpen] = useState(false);

  const constraints: PartnerConstraints = {
    requireSameClub: format ? formatHasClubs(format) : false,
    requireSameRank: format === 'club-ranked',
    requireOppositeGroup: format ? formatHasGroups(format) : false,
  };

  /** Confirm + disconnect partner link if a change would break constraints. */
  const guardPartnerLink = async (
    p: PlannerRegistration,
    change: { clubId?: string | null; rankSlot?: number | null; group?: 'A' | 'B' | null },
  ): Promise<boolean> => {
    if (!p.partnerName || !showPartner || !updatePlayerPartner) return true;
    const partner = findPartner(p, players);
    if (!partner) return true;
    const reason = wouldBreakPartnerLink(change, partner, constraints);
    if (!reason) return true;
    if (!await asyncConfirm(t('join.changeBreaksLink', { name: partner.name }))) return false;
    await updatePlayerPartner(p.id, null, null);
    return true;
  };

  const confirmedCount = players.filter(p => statuses.get(p.id) === 'playing').length;
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

  const renderPlayerRow = (player: PlannerRegistration, idx: number) => (
    <div key={player.id} className={styles.playerItem}>
      <span className={styles.playerNum}>{idx + 1}</span>
      <span className={styles.playerName}>
        <span>
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
          {!isPairFormat && statuses.get(player.id) === 'reserve' && (
            <span className={styles.reserveBadge}>{t('organizer.reserve')}</span>
          )}
        </span>
        {player.alias && (
          <span className={styles.addedByHint}>{player.alias}</span>
        )}
        {player.addedByPartner && (
          <span className={styles.addedByHint}>
            {t('organizer.addedBy', { name: typeof player.addedByPartner === 'string' ? player.addedByPartner : '?' })}
          </span>
        )}
      </span>
      {(
        (format && formatHasGroups(format) && onSetGroup) ||
        (format && formatHasClubs(format) && onSetClub && clubs && clubs.length > 0) ||
        (format === 'club-ranked' && onSetRank && rankLabels && rankLabels.length > 0) ||
        (showPartner && player.partnerName)
      ) && (
        <div className={styles.playerControls}>
          {format && formatHasGroups(format) && onSetGroup && (
            <div className={styles.groupToggle}>
              <button
                className={player.group === 'A' ? styles.groupBtnActive : styles.groupBtn}
                onClick={async () => {
                  const val = player.group === 'A' ? null : 'A';
                  if (!(await guardPartnerLink(player, { group: val }))) return;
                  onSetGroup(player.id, val);
                }}
              >
                {groupLabels?.[0] || 'A'}
              </button>
              <button
                className={player.group === 'B' ? styles.groupBtnActive : styles.groupBtn}
                onClick={async () => {
                  const val = player.group === 'B' ? null : 'B';
                  if (!(await guardPartnerLink(player, { group: val }))) return;
                  onSetGroup(player.id, val);
                }}
              >
                {groupLabels?.[1] || 'B'}
              </button>
            </div>
          )}
          {format && formatHasClubs(format) && onSetClub && clubs && clubs.length > 0 && (
            <select
              className={styles.clubSelect}
              value={player.clubId ?? ''}
              onChange={async e => {
                const val = e.target.value || null;
                if (!(await guardPartnerLink(player, { clubId: val }))) {
                  e.target.value = player.clubId ?? '';
                  return;
                }
                onSetClub(player.id, val);
              }}
              style={player.clubId ? (() => {
                const idx2 = clubs.findIndex(c => c.id === player.clubId);
                if (idx2 < 0) return undefined;
                const cc = getClubColor(clubs[idx2], idx2);
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
              onChange={async e => {
                const val = e.target.value ? Number(e.target.value) : null;
                if (!(await guardPartnerLink(player, { rankSlot: val }))) {
                  e.target.value = player.rankSlot != null ? String(player.rankSlot) : '';
                  return;
                }
                onSetRank(player.id, val);
              }}
              style={player.rankSlot != null ? (() => {
                const rc = getRankColor(player.rankSlot, rankColors?.[player.rankSlot]);
                return rc.bg !== NO_COLOR ? { backgroundColor: rc.bg, color: rc.text, borderColor: rc.border } as React.CSSProperties : undefined;
              })() : undefined}
            >
              <option value="">{t('organizer.selectRank')}</option>
              {rankLabels.map((label, idx2) => (
                <option key={idx2} value={String(idx2)}>
                  {shortLabel(label)}
                </option>
              ))}
            </select>
          )}
          {showPartner && !isPairFormat && player.partnerName && (
            <span className={styles.reserveBadge}>{'\uD83E\uDD1D'} {player.partnerName}</span>
          )}
        </div>
      )}
      {captainMode && !isPairFormat && statuses.get(player.id) === 'registered' && onApprove && (
        <Button size="small" onClick={() => onApprove(player.id)}>
          {t('join.approve')}
        </Button>
      )}
      {captainMode && !isPairFormat && player.captainApproved === true && onReject && (
        <Button size="small" variant="secondary" onClick={() => onReject(player.id)}>
          {t('join.reject')}
        </Button>
      )}
      <div className={styles.dotsMenuWrap} ref={openMenuId === player.id ? menuRef : undefined}>
        <button
          className={styles.dotsBtn}
          onClick={() => setOpenMenuId(openMenuId === player.id ? null : player.id)}
          aria-label={t('organizer.actions')}
        >
          {'\u22EF'}
        </button>
        {openMenuId === player.id && (
          <div className={styles.dotsMenu}>
            <button
              className={styles.dotsMenuItem}
              onClick={() => {
                setLinkingPlayer({ id: player.id, name: player.name, alias: player.alias, telegramUsername: player.telegramUsername, partnerName: player.partnerName, partnerTelegram: player.partnerTelegram, clubId: player.clubId, rankSlot: player.rankSlot, group: player.group });
                setAliasDraft(player.alias ?? '');
                setLinkDraft(player.telegramUsername ? `@${player.telegramUsername}` : '');
                setPartnerNameDraft(player.partnerName ? (players.find(pl => pl.name === player.partnerName)?.id ?? '') : '');
                setPartnerTelegramDraft(player.partnerTelegram ? `@${player.partnerTelegram}` : '');
                closeMenu();
              }}
            >
              <span>&#x1F517;</span> {t('organizer.linkProfile')}
            </button>
            {!simplified && (
              <button
                className={styles.dotsMenuItem}
                onClick={() => {
                  toggleConfirmed(player.id, player.confirmed !== false);
                  closeMenu();
                }}
              >
                <span className={player.confirmed !== false ? styles.statusConfirmed : styles.statusCancelled}>
                  {player.confirmed !== false ? '\u2713' : '\u2717'}
                </span>
                {player.confirmed !== false ? t('organizer.markCancelled') : t('organizer.markConfirmed')}
              </button>
            )}
            <button
              className={`${styles.dotsMenuItem} ${styles.dotsMenuDanger}`}
              onClick={() => {
                removePlayer(player.id);
                closeMenu();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              {t('organizer.removePlayer')}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Group players by status sections for pair formats
  const sections = useMemo(() => {
    if (!isPairFormat) return null;

    const sectionMap: Record<PlayerStatus, PlannerRegistration[]> = {
      'playing': [],
      'reserve': [],
      'registered': [],
      'needs-partner': [],
      'cancelled': [],
    };

    for (const p of players) {
      const status = statuses.get(p.id) ?? (p.confirmed === false ? 'cancelled' : 'needs-partner');
      sectionMap[status as PlayerStatus].push(p);
    }

    return sectionMap;
  }, [isPairFormat, players, statuses]);

  /** Render players in pairs: partner rows adjacent, wrapped in pairGroup */
  const renderPairedSection = (sectionPlayers: PlannerRegistration[], captainActions?: 'approve-reject' | 'reject-only') => {
    const rendered = new Set<string>();
    const elements: ReactNode[] = [];
    let globalIdx = 0;

    for (const p of sectionPlayers) {
      if (rendered.has(p.id)) continue;
      rendered.add(p.id);

      const partner = findPartner(p, players);
      if (partner && !rendered.has(partner.id) && sectionPlayers.some(sp => sp.id === partner.id)) {
        rendered.add(partner.id);
        const i1 = globalIdx++;
        const i2 = globalIdx++;
        elements.push(
          <div key={`pair-${p.id}`} className={styles.pairGroup}>
            {renderPlayerRow(p, i1)}
            {renderPlayerRow(partner, i2)}
            {captainActions && (
              <div className={styles.captainActions} style={{ padding: '4px 8px', justifyContent: 'flex-end' }}>
                {captainActions === 'approve-reject' && onApprove && (
                  <Button size="small" onClick={async () => { await onApprove(p.id); await onApprove(partner.id); }}>
                    {t('join.approve')}
                  </Button>
                )}
                {onReject && (
                  <Button size="small" variant="secondary" onClick={async () => { await onReject(p.id); await onReject(partner.id); }}>
                    {t('join.reject')}
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      } else {
        elements.push(renderPlayerRow(p, globalIdx++));
      }
    }

    return elements;
  };

  const renderSectionedList = () => {
    if (!sections) return null;

    const sectionDefs: { key: PlayerStatus; labelKey: string; paired: boolean }[] = [
      { key: 'playing', labelKey: 'organizer.sectionPlaying', paired: true },
      { key: 'reserve', labelKey: 'organizer.sectionReserve', paired: true },
      ...(captainMode ? [{ key: 'registered' as PlayerStatus, labelKey: 'organizer.sectionRegistered', paired: true }] : []),
      { key: 'needs-partner', labelKey: 'organizer.sectionNeedsPartner', paired: false },
    ];

    return (
      <>
        {sectionDefs.map(({ key, labelKey, paired }) => {
          const sectionPlayers = sections[key];
          if (sectionPlayers.length === 0) return null;
          const captainActions = captainMode && (onApprove || onReject)
            ? (key === 'registered' ? 'approve-reject' as const : (key === 'playing' || key === 'reserve') ? 'reject-only' as const : undefined)
            : undefined;
          return (
            <div key={key} className={styles.statusSection}>
              <div className={styles.statusSectionHeader}>
                {t(labelKey, { count: sectionPlayers.length })}
              </div>
              <div className={styles.playerList}>
                {paired ? renderPairedSection(sectionPlayers, captainActions) : sectionPlayers.map((p, i) => renderPlayerRow(p, i))}
              </div>
            </div>
          );
        })}
        {sections.cancelled.length > 0 && (
          <div className={styles.statusSection}>
            <div
              className={styles.statusSectionHeader}
              style={{ cursor: 'pointer' }}
              onClick={() => setCancelledOpen(v => !v)}
            >
              {t('organizer.sectionCancelled', { count: sections.cancelled.length })} {cancelledOpen ? '\u25B2' : '\u25BC'}
            </div>
            {cancelledOpen && (
              <div className={styles.playerList}>
                {sections.cancelled.map((p, i) => renderPlayerRow(p, i))}
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  const exportPlayers = () => {
    const rl = rankLabels ?? [];
    const cl = clubs ?? [];
    const lines: string[] = [];
    const renderPlayer = (p: PlannerRegistration) =>
      p.telegramUsername ? `${p.name} (@${p.telegramUsername})` : p.name;

    const renderPairs = (group: PlannerRegistration[], indent: string) => {
      const rendered = new Set<string>();
      for (const p of group) {
        if (rendered.has(p.id)) continue;
        rendered.add(p.id);
        const partner = findPartner(p, players);
        if (partner && !rendered.has(partner.id) && group.some(g => g.id === partner.id)) {
          rendered.add(partner.id);
          lines.push(`${indent}· ${renderPlayer(p)}`);
          lines.push(`${indent}  ${renderPlayer(partner)}`);
        } else {
          lines.push(`${indent}· ${renderPlayer(p)}`);
        }
      }
    };

    const renderGrouped = (sectionPlayers: PlannerRegistration[]) => {
      if (format === 'club-ranked' && rl.length > 0) {
        const byRank = new Map<number | undefined, PlannerRegistration[]>();
        for (const p of sectionPlayers) {
          const key = p.rankSlot ?? undefined;
          if (!byRank.has(key)) byRank.set(key, []);
          byRank.get(key)!.push(p);
        }
        for (const [rankKey, rankGroup] of [...byRank.entries()].sort((a, b) => (a[0] ?? 999) - (b[0] ?? 999))) {
          const label = rankKey != null && rl[rankKey] ? rl[rankKey] : (rankKey != null ? `Rank ${rankKey + 1}` : '');
          if (label) lines.push(`  ${label}`);
          const byClub = new Map<string | undefined, PlannerRegistration[]>();
          for (const p of rankGroup) {
            const key = p.clubId ?? undefined;
            if (!byClub.has(key)) byClub.set(key, []);
            byClub.get(key)!.push(p);
          }
          for (const [clubId, clubGroup] of byClub) {
            const club = clubId ? cl.find(c => c.id === clubId) : undefined;
            if (club) lines.push(`    ${club.name}`);
            renderPairs(clubGroup, club ? '      ' : '    ');
          }
        }
      } else {
        renderPairs(sectionPlayers, '  ');
      }
    };

    if (isPairFormat && sections) {
      const sectionDefs: { key: PlayerStatus; labelKey: string }[] = [
        { key: 'playing', labelKey: 'organizer.sectionPlaying' },
        { key: 'reserve', labelKey: 'organizer.sectionReserve' },
        ...(captainMode ? [{ key: 'registered' as PlayerStatus, labelKey: 'organizer.sectionRegistered' }] : []),
        { key: 'needs-partner', labelKey: 'organizer.sectionNeedsPartner' },
        { key: 'cancelled', labelKey: 'organizer.sectionCancelled' },
      ];
      for (const { key, labelKey } of sectionDefs) {
        const sectionPlayers = sections[key];
        if (sectionPlayers.length === 0) continue;
        lines.push(t(labelKey, { count: sectionPlayers.length }));
        renderGrouped(sectionPlayers);
      }
    } else {
      renderGrouped(players);
    }

    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(
      () => showToast?.(t('join.copied')),
      () => showToast?.(t('join.failedCopy')),
    );
  };

  return (
    <>
      <Card>
        <h2 className={styles.sectionTitle}>
          {simplified
            ? t('organizer.playersSimple', { confirmed: confirmedCount, capacity })
            : t('organizer.players', {
                confirmed: confirmedCount,
                capacity,
                reserve: reserveCount > 0 ? t('organizer.reserveSuffix', { count: reserveCount }) : '',
              })
          }
          {players.length > 0 && (
            <Button size="small" variant="ghost" onClick={exportPlayers}>
              {t('join.exportPairs')}
            </Button>
          )}
        </h2>
        {players.length === 0 ? (
          <p className={styles.empty}>{t('organizer.noPlayersYet')}</p>
        ) : isPairFormat ? (
          renderSectionedList()
        ) : (
          <div className={styles.playerList}>
            {players.map((player, i) => renderPlayerRow(player, i))}
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
          <label className={styles.linkLabel}>{t('organizer.aliasLabel')}</label>
          <input
            className={styles.linkInput}
            type="text"
            value={aliasDraft}
            onChange={e => setAliasDraft(e.target.value)}
            placeholder={t('organizer.aliasPlaceholder')}
            autoFocus
          />
          <label className={styles.linkLabel}>{t('organizer.telegramUsername')}</label>
          <input
            className={styles.linkInput}
            type="text"
            value={linkDraft}
            onChange={e => setLinkDraft(e.target.value)}
            placeholder={t('organizer.telegramPlaceholder')}
          />
          {showPartner && updatePlayerPartner && (
            <>
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 'var(--space-xs) 0' }} />
              <label className={styles.linkLabel}>{t('organizer.partnerSection')}</label>
              <select
                className={styles.linkInput}
                value={partnerNameDraft === NEW_PLAYER_VALUE ? NEW_PLAYER_VALUE : partnerNameDraft}
                onChange={e => {
                  const val = e.target.value;
                  if (val === NEW_PLAYER_VALUE) {
                    setPartnerNameDraft(NEW_PLAYER_VALUE);
                    setPartnerTelegramDraft('');
                  } else {
                    setPartnerNameDraft(val);
                    const selected = players.find(p => p.id === val);
                    setPartnerTelegramDraft(selected?.telegramUsername ?? '');
                  }
                }}
              >
                <option value="">{t('organizer.partnerName')}</option>
                {players
                  .filter(p => {
                    if (!linkingPlayer) return false;
                    if (p.id === linkingPlayer.id) return false;
                    if (p.confirmed === false) return false;
                    if (p.partnerName && p.partnerName !== linkingPlayer.name) return false;
                    if (constraints.requireSameClub && linkingPlayer.clubId && p.clubId !== linkingPlayer.clubId) return false;
                    if (constraints.requireSameRank && linkingPlayer.rankSlot != null && p.rankSlot !== linkingPlayer.rankSlot) return false;
                    if (constraints.requireOppositeGroup && linkingPlayer.group && p.group && p.group === linkingPlayer.group) return false;
                    return true;
                  })
                  .map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                <option value={NEW_PLAYER_VALUE}>{t('organizer.newPlayer')}</option>
              </select>
              {partnerNameDraft === NEW_PLAYER_VALUE && (
                <>
                  <input
                    className={styles.linkInput}
                    type="text"
                    value={newPartnerNameDraft}
                    onChange={e => setNewPartnerNameDraft(e.target.value)}
                    placeholder={t('organizer.newPlayerName')}
                    autoFocus
                  />
                  <input
                    className={styles.linkInput}
                    type="text"
                    value={newPartnerTelegramDraft}
                    onChange={e => setNewPartnerTelegramDraft(e.target.value)}
                    placeholder={t('organizer.partnerTelegram')}
                  />
                </>
              )}
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
                  setNewPartnerNameDraft('');
                  setNewPartnerTelegramDraft('');
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
                const alias = aliasDraft.trim() || null;
                updatePlayerAlias(linkingPlayer.id, alias);
                const username = linkDraft.trim().replace(/^@/, '') || null;
                updatePlayerTelegram(linkingPlayer.id, username);
                if (showPartner && updatePlayerPartner) {
                  const isNew = partnerNameDraft === NEW_PLAYER_VALUE;
                  const selectedPartner = isNew ? null : players.find(p => p.id === partnerNameDraft);
                  const pName = isNew ? (newPartnerNameDraft.trim() || null) : (selectedPartner?.name.trim() || null);
                  const pTg = isNew ? (newPartnerTelegramDraft.trim().replace(/^@/, '') || null) : (partnerTelegramDraft.trim().replace(/^@/, '') || null);
                  const c: PartnerConstraints = {
                    requireSameClub: format ? formatHasClubs(format) : false,
                    requireSameRank: format === 'club-ranked',
                    requireOppositeGroup: format ? formatHasGroups(format) : false,
                  };
                  const rejection = await updatePlayerPartner(linkingPlayer.id, pName, pTg, c, isNew ? operatorName : undefined);
                  if (rejection) {
                    showToast?.(rejectionMessage(rejection, t));
                    return;
                  }
                }
                setNewPartnerNameDraft('');
                setNewPartnerTelegramDraft('');
                setLinkingPlayer(null);
              }}
              disabled={!aliasDraft.trim() && !linkDraft.trim() && !(showPartner && (partnerNameDraft === NEW_PLAYER_VALUE ? newPartnerNameDraft.trim() : partnerNameDraft.trim()))}
            >
              {t('organizer.saveLink')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
