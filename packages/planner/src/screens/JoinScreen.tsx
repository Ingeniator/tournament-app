import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Button, Card, Modal, NO_COLOR, getClubColor, getRankColor, shortLabel, Toast, useToast, useTranslation, getPresetByFormat, formatHasGroups, formatHasClubs, formatHasFixedPartners } from '@padel/common';
import type { PlannerRegistration, TournamentFormat, Club } from '@padel/common';
import type { PartnerRejection, PartnerConstraints } from '../utils/partnerLogic';
import { findPartner, wouldBreakPartnerLink } from '../utils/partnerLogic';
import { rejectionMessage } from '../utils/partnerRejectionMessage';
import { usePlanner } from '../state/PlannerContext';
import { getPlayerStatuses, type PlayerStatus } from '../utils/playerStatus';
import { downloadICS } from '../utils/icsExport';
import { exportRunnerTournamentJSON } from '../utils/exportToRunner';
import { restoreFromBackup } from '../utils/restoreFromBackup';
import { useStartGuard } from '../hooks/useStartGuard';
import { StartWarningModal } from '../components/StartWarningModal';
import { validateLaunch } from '../utils/validateLaunch';
import { asyncConfirm } from '../utils/confirm';
import styles from './JoinScreen.module.css';

const NEW_PARTNER = '__new__';

function PartnerEditor({ partnerName, partnerTelegram, onSave, players, currentPlayerId, constraints }: {
  partnerName: string;
  partnerTelegram: string;
  onSave: (name: string | null, telegram: string | null) => Promise<PartnerRejection | null>;
  players: PlannerRegistration[];
  currentPlayerId: string;
  constraints: PartnerConstraints;
}) {
  const { t } = useTranslation();
  const partnerPlayer = players.find(p => p.name === partnerName);
  const [selectVal, setSelectVal] = useState(partnerPlayer?.id || '');
  const [newNameVal, setNewNameVal] = useState('');
  const [newTgVal, setNewTgVal] = useState('');
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPlayer = players.find(p => p.id === currentPlayerId);

  useEffect(() => {
    const match = players.find(p => p.name === partnerName);
    setSelectVal(match?.id || '');
    setNewNameVal('');
    setNewTgVal('');
    setDirty(false);
    setError(null);
  }, [partnerName, partnerTelegram]);

  const handleSave = useCallback(async () => {
    const isNew = selectVal === NEW_PARTNER;
    const selectedPlayer = isNew ? null : players.find(p => p.id === selectVal);
    const pName = isNew ? (newNameVal.trim() || null) : (selectedPlayer?.name.trim() || null);
    const pTg = isNew ? (newTgVal.trim().replace(/^@/, '') || null) : (selectedPlayer?.telegramUsername ?? null);
    const rejection = await onSave(pName, pTg);
    if (rejection) {
      setError(rejectionMessage(rejection, t));
    } else {
      setDirty(false);
      setError(null);
    }
  }, [selectVal, newNameVal, newTgVal, onSave, t, players]);

  return (
    <div className={styles.partnerPicker}>
      <span className={styles.groupPickerLabel}>{t('join.partnerLabel')}</span>
      <select
        className={styles.nameInput}
        value={selectVal === NEW_PARTNER ? NEW_PARTNER : selectVal}
        onChange={e => {
          const val = e.target.value;
          setSelectVal(val);
          if (val !== NEW_PARTNER) setNewNameVal('');
          setDirty(true);
        }}
      >
        <option value="">{t('organizer.partnerName')}</option>
        {players
          .filter(p => {
            if (p.id === currentPlayerId) return false;
            if (p.confirmed === false) return false;
            if (p.partnerName && p.partnerName !== currentPlayer?.name) return false;
            if (constraints.requireSameClub && currentPlayer?.clubId && p.clubId !== currentPlayer.clubId) return false;
            if (constraints.requireSameRank && currentPlayer?.rankSlot != null && p.rankSlot !== currentPlayer.rankSlot) return false;
            if (constraints.requireOppositeGroup && currentPlayer?.group && p.group && p.group === currentPlayer.group) return false;
            return true;
          })
          .map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        <option value={NEW_PARTNER}>{t('organizer.newPlayer')}</option>
      </select>
      {selectVal === NEW_PARTNER && (
        <>
          <input
            className={styles.nameInput}
            type="text"
            value={newNameVal}
            onChange={e => { setNewNameVal(e.target.value); setDirty(true); }}
            placeholder={t('organizer.newPlayerName')}
            autoFocus
          />
          <input
            className={styles.nameInput}
            type="text"
            value={newTgVal}
            onChange={e => { setNewTgVal(e.target.value); setDirty(true); }}
            placeholder={t('organizer.partnerTelegram')}
          />
        </>
      )}
      {error && (
        <span style={{ color: 'var(--color-error, #e53935)', fontSize: 'var(--text-sm)' }}>{error}</span>
      )}
      {dirty && (
        <Button size="small" onClick={handleSave}
          disabled={selectVal === NEW_PARTNER ? !newNameVal.trim() : !selectVal}
        >
          {t('join.save')}
        </Button>
      )}
    </div>
  );
}

function JoinPlayerRow({ player, idx, tournament, onLinkPlayer, onSetRank }: {
  player: PlannerRegistration;
  idx: number;
  tournament: { format: string; groupLabels?: [string, string]; clubs?: { id: string; name: string; color?: string }[]; rankLabels?: string[]; rankColors?: number[] };
  onLinkPlayer?: (player: PlannerRegistration) => void;
  onSetRank?: (playerId: string, rankSlot: number | null) => void;
}) {
  const { t } = useTranslation();
  const isMixicano = formatHasGroups(tournament.format as TournamentFormat);
  const isClubFormat = formatHasClubs(tournament.format as TournamentFormat);
  const clubs = tournament.clubs ?? [];
  const clubIdx = isClubFormat && player.clubId
    ? clubs.findIndex(c => c.id === player.clubId)
    : -1;

  return (
    <div className={styles.playerItem}>
      <span className={styles.playerNum}>{idx + 1}</span>
      <span className={styles.playerName}>
        {player.telegramUsername ? (
          <a href={`https://t.me/${player.telegramUsername}`} target="_blank" rel="noopener noreferrer" className={styles.playerLink}>
            {player.name}
          </a>
        ) : player.name}
      </span>
      {(
        (isMixicano && player.group) ||
        (isClubFormat && clubIdx >= 0) ||
        (tournament.format === 'club-ranked' && (onSetRank || (player.rankSlot != null && tournament.rankLabels?.[player.rankSlot])))
      ) && (
        <div className={styles.playerBadges}>
          {isMixicano && player.group && (
            <span className={styles.groupBadge}>
              {player.group === 'A' ? (tournament.groupLabels?.[0] || 'A') : (tournament.groupLabels?.[1] || 'B')}
            </span>
          )}
          {isClubFormat && clubIdx >= 0 && (
            <span className={styles.clubBadge} style={getClubColor(clubs[clubIdx] as Club, clubIdx) !== NO_COLOR ? { backgroundColor: getClubColor(clubs[clubIdx] as Club, clubIdx), color: 'white' } : undefined}>
              {shortLabel(clubs[clubIdx].name)}
            </span>
          )}
          {tournament.format === 'club-ranked' && onSetRank && tournament.rankLabels && tournament.rankLabels.length > 0 ? (
            <select
              className={styles.rankSelect}
              value={player.rankSlot != null ? String(player.rankSlot) : ''}
              onChange={e => {
                const val = e.target.value ? Number(e.target.value) : null;
                onSetRank(player.id, val);
              }}
              style={player.rankSlot != null ? (() => {
                const rc = getRankColor(player.rankSlot, tournament.rankColors?.[player.rankSlot]);
                return rc.bg !== NO_COLOR ? { backgroundColor: rc.bg, color: rc.text, borderColor: rc.border } as React.CSSProperties : undefined;
              })() : undefined}
            >
              <option value="">{t('organizer.selectRank')}</option>
              {tournament.rankLabels.map((label, i) => (
                <option key={i} value={String(i)}>{shortLabel(label)}</option>
              ))}
            </select>
          ) : tournament.format === 'club-ranked' && player.rankSlot != null && tournament.rankLabels?.[player.rankSlot] && (() => {
            const rc = getRankColor(player.rankSlot, tournament.rankColors?.[player.rankSlot]);
            return (
              <span className={styles.rankBadge} style={rc.bg !== NO_COLOR ? { backgroundColor: rc.bg, color: rc.text, borderColor: rc.border } : undefined}>
                {shortLabel(tournament.rankLabels![player.rankSlot])}
              </span>
            );
          })()}
        </div>
      )}
      {onLinkPlayer && (
        <button
          className={player.telegramUsername ? styles.linkBtnActive : styles.linkBtn}
          onClick={() => onLinkPlayer(player)}
        >
          {'\uD83D\uDD17'}
        </button>
      )}
      <span className={player.confirmed !== false ? styles.statusConfirmed : styles.statusCancelled}>
        {player.confirmed !== false ? '\u2713' : '\u2717'}
      </span>
    </div>
  );
}

function JoinPlayerList({ players, statuses, tournament, capacity, confirmedCount, spotsLeft, reserveCount, t, isCaptainOf, onApprove, onReject, onUpdateTelegram, onUpdatePartner, onSetRank, showToast, captainName }: {
  players: PlannerRegistration[];
  statuses: Map<string, PlayerStatus>;
  tournament: import('@padel/common').PlannerTournament;
  capacity: number;
  confirmedCount: number;
  spotsLeft: number;
  reserveCount: number;
  t: (key: string, params?: Record<string, string | number>) => string;
  isCaptainOf?: string | null;
  onApprove?: (playerId: string) => Promise<void> | void;
  onReject?: (playerId: string) => Promise<void> | void;
  onUpdateTelegram?: (playerId: string, telegramUsername: string | null) => Promise<void>;
  onUpdatePartner?: (playerId: string, partnerName: string | null, partnerTelegram: string | null, constraints?: PartnerConstraints, addedBy?: string) => Promise<PartnerRejection | null>;
  onSetRank?: (playerId: string, rankSlot: number | null) => Promise<void>;
  showToast?: (msg: string) => void;
  captainName?: string;
}) {
  const isPairFormat = formatHasFixedPartners(tournament.format);
  const NEW_PLAYER_VALUE = '__new__';
  const [clubFilter, setClubFilter] = useState<'my-club' | 'all'>('my-club');
  const [linkingPlayer, setLinkingPlayer] = useState<PlannerRegistration | null>(null);
  const [linkDraft, setLinkDraft] = useState('');
  const [partnerNameDraft, setPartnerNameDraft] = useState('');
  const [partnerTelegramDraft, setPartnerTelegramDraft] = useState('');
  const [newPartnerNameDraft, setNewPartnerNameDraft] = useState('');
  const [newPartnerTelegramDraft, setNewPartnerTelegramDraft] = useState('');
  const constraints: PartnerConstraints = {
    requireSameClub: formatHasClubs(tournament.format),
    requireSameRank: tournament.format === 'club-ranked',
    requireOppositeGroup: formatHasGroups(tournament.format),
  };

  const filteredPlayers = isCaptainOf && clubFilter === 'my-club'
    ? players.filter(p => p.clubId === isCaptainOf)
    : players;

  const canLinkPlayer = (p: PlannerRegistration) => isCaptainOf && p.clubId === isCaptainOf && (onUpdateTelegram || onUpdatePartner);

  const canEditRank = (p: PlannerRegistration) =>
    isCaptainOf && p.clubId === isCaptainOf && onSetRank && tournament.format === 'club-ranked';

  const handleRankChange = async (playerId: string, rankSlot: number | null) => {
    if (!onSetRank) return;
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    // If player has a partner, warn and break the link
    if (player.partnerName && onUpdatePartner) {
      const partner = findPartner(player, players);
      if (partner) {
        const reason = wouldBreakPartnerLink({ rankSlot }, partner, constraints);
        if (reason) {
          if (!await asyncConfirm(t('join.changeBreaksLink', { name: partner.name }))) return;
          await onUpdatePartner(player.id, null, null);
        }
      }
    }
    await onSetRank(playerId, rankSlot);
  };

  const openLinkModal = (p: PlannerRegistration) => {
    setLinkingPlayer(p);
    setLinkDraft(p.telegramUsername ? `@${p.telegramUsername}` : '');
    setPartnerNameDraft(p.partnerName ? (players.find(pl => pl.name === p.partnerName)?.id ?? '') : '');
    setPartnerTelegramDraft(p.partnerTelegram ? `@${p.partnerTelegram}` : '');
  };

  const sections = useMemo(() => {
    if (!isPairFormat) return null;
    const sectionMap: Record<PlayerStatus, PlannerRegistration[]> = {
      'playing': [], 'reserve': [], 'registered': [], 'needs-partner': [], 'cancelled': [],
    };
    for (const p of filteredPlayers) {
      const status = statuses.get(p.id) ?? (p.confirmed === false ? 'cancelled' : 'needs-partner');
      sectionMap[status as PlayerStatus].push(p);
    }
    return sectionMap;
  }, [isPairFormat, filteredPlayers, statuses]);

  const renderPairedSection = (sectionPlayers: PlannerRegistration[], captainActions?: 'approve-reject' | 'reject-only') => {
    const rendered = new Set<string>();
    const elements: React.ReactNode[] = [];
    let globalIdx = 0;
    for (const p of sectionPlayers) {
      if (rendered.has(p.id)) continue;
      rendered.add(p.id);
      const partner = findPartner(p, players);
      if (partner && !rendered.has(partner.id) && sectionPlayers.some(sp => sp.id === partner.id)) {
        rendered.add(partner.id);
        const i1 = globalIdx++;
        const i2 = globalIdx++;
        const canAct = captainActions && isCaptainOf && (p.clubId === isCaptainOf || partner.clubId === isCaptainOf);
        elements.push(
          <div key={`pair-${p.id}`} className={styles.pairGroup}>
            <JoinPlayerRow player={p} idx={i1} tournament={tournament} onLinkPlayer={canLinkPlayer(p) ? openLinkModal : undefined} onSetRank={canEditRank(p) ? handleRankChange : undefined} />
            <JoinPlayerRow player={partner} idx={i2} tournament={tournament} onLinkPlayer={canLinkPlayer(partner) ? openLinkModal : undefined} onSetRank={canEditRank(partner) ? handleRankChange : undefined} />
            {canAct && (
              <div className={styles.captainActions} style={{ padding: '4px 8px', justifyContent: 'flex-end' }}>
                {captainActions === 'approve-reject' && onApprove && (
                  <Button size="small" onClick={async () => { await onApprove(p.id); await onApprove(partner.id); }}>
                    {t('join.approve')}
                  </Button>
                )}
                {captainActions === 'reject-only' && onReject && (
                  <Button size="small" variant="secondary" onClick={async () => { await onReject(p.id); await onReject(partner.id); }}>
                    {t('join.reject')}
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      } else {
        elements.push(<JoinPlayerRow key={p.id} player={p} idx={globalIdx++} tournament={tournament} onLinkPlayer={canLinkPlayer(p) ? openLinkModal : undefined} onSetRank={canEditRank(p) ? handleRankChange : undefined} />);
      }
    }
    return elements;
  };

  const sectionDefs: { key: PlayerStatus; labelKey: string; paired: boolean }[] = [
    { key: 'playing', labelKey: 'organizer.sectionPlaying', paired: true },
    { key: 'reserve', labelKey: 'organizer.sectionReserve', paired: true },
    ...(tournament.captainMode ? [{ key: 'registered' as PlayerStatus, labelKey: 'organizer.sectionRegistered', paired: true }] : []),
    { key: 'needs-partner', labelKey: 'organizer.sectionNeedsPartner', paired: false },
  ];

  const [cancelledOpen, setCancelledOpen] = useState(false);
  const pairCapacity = Math.floor(capacity / 2);

  return (
    <Card>
      <h3 className={styles.sectionTitle}>
        {t('join.players', { confirmed: confirmedCount, capacity })}
      </h3>
      {isCaptainOf && (
        <p className={styles.capacityHint}>ℹ️ {t('organizer.captainInstructions')}</p>
      )}
      {isCaptainOf && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div className={styles.groupToggle}>
            <button
              className={clubFilter === 'my-club' ? styles.groupBtnActive : styles.groupBtn}
              onClick={() => setClubFilter('my-club')}
            >
              {t('join.myClub', { name: tournament.clubs?.find(c => c.id === isCaptainOf)?.name ?? '' })}
            </button>
            <button
              className={clubFilter === 'all' ? styles.groupBtnActive : styles.groupBtn}
              onClick={() => setClubFilter('all')}
            >
              {t('join.allPlayers')}
            </button>
          </div>
        </div>
      )}
      <p className={styles.capacityHint}>
        {isPairFormat
          ? t('join.pairSlots', { pairs: pairCapacity })
          : spotsLeft > 0
            ? t('join.spotsLeft', { count: spotsLeft, s: spotsLeft === 1 ? '' : 's' })
            : reserveCount > 0
              ? t('join.fullReserve', { count: reserveCount })
              : t('join.full')}
        {` \u00b7 ${t('join.courtInfo', {
          courts: tournament.courts.length,
          s: tournament.courts.length !== 1 ? 's' : '',
          extra: (tournament.extraSpots ?? 0) > 0 ? ` + ${tournament.extraSpots}` : '',
        })}`}
      </p>
      {filteredPlayers.length === 0 ? (
        <p className={styles.empty}>{t('join.noPlayersYet')}</p>
      ) : isPairFormat && sections ? (
        <>
          {sectionDefs.map(({ key, labelKey, paired }) => {
            const sectionPlayers = sections[key];
            if (sectionPlayers.length === 0) return null;
            return (
              <div key={key} className={styles.statusSection}>
                <div className={styles.statusSectionHeader}>
                  {t(labelKey, { count: sectionPlayers.length })}
                </div>
                <div className={styles.playerList}>
                  {paired ? renderPairedSection(sectionPlayers, key === 'registered' ? 'approve-reject' : (key === 'playing' || key === 'reserve') ? 'reject-only' : undefined) : sectionPlayers.map((p, i) => (
                    <JoinPlayerRow key={p.id} player={p} idx={i} tournament={tournament} onLinkPlayer={canLinkPlayer(p) ? openLinkModal : undefined} onSetRank={canEditRank(p) ? handleRankChange : undefined} />
                  ))}
                </div>
              </div>
            );
          })}
          {sections.cancelled.length > 0 && (
            <div className={styles.statusSection}>
              <div className={styles.statusSectionHeader} style={{ cursor: 'pointer' }} onClick={() => setCancelledOpen(v => !v)}>
                {t('organizer.sectionCancelled', { count: sections.cancelled.length })} {cancelledOpen ? '\u25B2' : '\u25BC'}
              </div>
              {cancelledOpen && (
                <div className={styles.playerList}>
                  {sections.cancelled.map((p, i) => <JoinPlayerRow key={p.id} player={p} idx={i} tournament={tournament} />)}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className={styles.playerList}>
          {filteredPlayers.map((player, i) => <JoinPlayerRow key={player.id} player={player} idx={i} tournament={tournament} onLinkPlayer={canLinkPlayer(player) ? openLinkModal : undefined} onSetRank={canEditRank(player) ? handleRankChange : undefined} />)}
        </div>
      )}

      {/* Captain link modal */}
      <Modal
        open={!!linkingPlayer}
        title={t('organizer.linkProfileTitle', { name: linkingPlayer?.name ?? '' })}
        onClose={() => setLinkingPlayer(null)}
      >
        <div className={styles.linkForm}>
          {onUpdateTelegram && (
            <>
              <label className={styles.linkLabel}>{t('organizer.telegramUsername')}</label>
              <input
                className={styles.linkInput}
                type="text"
                value={linkDraft}
                onChange={e => setLinkDraft(e.target.value)}
                placeholder={t('organizer.telegramPlaceholder')}
                autoFocus
              />
            </>
          )}
          {isPairFormat && onUpdatePartner && (
            <>
              {onUpdateTelegram && <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 'var(--space-xs) 0' }} />}
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
            {onUpdateTelegram && linkingPlayer?.telegramUsername && (
              <Button variant="secondary" size="small" onClick={() => {
                onUpdateTelegram(linkingPlayer.id, null);
                setLinkingPlayer(null);
              }}>
                {t('organizer.removeLink')}
              </Button>
            )}
            {onUpdatePartner && linkingPlayer?.partnerName && (
              <Button variant="secondary" size="small" onClick={() => {
                onUpdatePartner(linkingPlayer.id, null, null);
                setPartnerNameDraft('');
                setPartnerTelegramDraft('');
                setNewPartnerNameDraft('');
                setNewPartnerTelegramDraft('');
                setLinkingPlayer(null);
              }}>
                {t('organizer.removePartner')}
              </Button>
            )}
            <Button
              size="small"
              onClick={async () => {
                if (!linkingPlayer) return;
                if (onUpdateTelegram) {
                  const username = linkDraft.trim().replace(/^@/, '') || null;
                  onUpdateTelegram(linkingPlayer.id, username);
                }
                if (isPairFormat && onUpdatePartner) {
                  const isNew = partnerNameDraft === NEW_PLAYER_VALUE;
                  const selectedPartner = isNew ? null : players.find(p => p.id === partnerNameDraft);
                  const pName = isNew ? (newPartnerNameDraft.trim() || null) : (selectedPartner?.name.trim() || null);
                  const pTg = isNew ? (newPartnerTelegramDraft.trim().replace(/^@/, '') || null) : (partnerTelegramDraft.trim().replace(/^@/, '') || null);
                  const rejection = await onUpdatePartner(linkingPlayer.id, pName, pTg, constraints, isNew ? captainName : undefined);
                  if (rejection) {
                    showToast?.(rejectionMessage(rejection, t));
                    return;
                  }
                }
                setNewPartnerNameDraft('');
                setNewPartnerTelegramDraft('');
                setLinkingPlayer(null);
              }}
              disabled={!linkDraft.trim() && !(isPairFormat && (partnerNameDraft === NEW_PLAYER_VALUE ? newPartnerNameDraft.trim() : partnerNameDraft.trim()))}
            >
              {t('organizer.saveLink')}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

export function JoinScreen() {
  const { tournament, players, uid, registerPlayer, updateConfirmed, updatePlayerName, updatePlayerGroup, updatePlayerClub, updatePlayerRank, updatePlayerPartner, updatePlayerTelegram, updateCaptainApproval, isRegistered, setScreen, organizerName, userName, telegramUser, completedAt, joinReturnScreen } = usePlanner();
  const { startedBy, showWarning, warningReason, handleLaunch: handleGuardedLaunch, proceedAnyway, dismissWarning } = useStartGuard(tournament?.id ?? null, uid, userName);
  const { t } = useTranslation();
  // null = not yet edited by user, derive from external sources
  const [nameInput, setNameInput] = useState<string | null>(null);
  const name = nameInput ?? userName ?? telegramUser?.displayName ?? '';
  const [regGroup, setRegGroup] = useState<'A' | 'B' | null>(null);
  const [regClubId, setRegClubId] = useState<string>('');
  const [regRankSlot, setRegRankSlot] = useState<string>('');
  const [regPartnerName, setRegPartnerName] = useState('');
  const [regNewPartnerName, setRegNewPartnerName] = useState('');
  const [regNewPartnerTelegram, setRegNewPartnerTelegram] = useState('');
  const [registering, setRegistering] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [showCalendarPrompt, setShowCalendarPrompt] = useState(false);
  const [restoreFailed, setRestoreFailed] = useState(false);
  const { toastMessage, showToast } = useToast();
  const registeringRef = useRef(false);

  const capacity = tournament ? tournament.courts.length * 4 + (tournament.extraSpots ?? 0) : 0;
  const statuses = useMemo(() => getPlayerStatuses(players, capacity, {
    format: tournament?.format,
    clubs: tournament?.clubs,
    rankLabels: tournament?.rankLabels,
    captainMode: tournament?.captainMode,
  }), [players, capacity, tournament?.format, tournament?.clubs, tournament?.rankLabels, tournament?.captainMode]);
  const myRegistration = uid ? players.find(p => p.id === uid) : undefined;
  const myStatus = myRegistration ? statuses.get(myRegistration.id) : undefined;

  // Compute reserve position (1-based) for current player
  const myReservePosition = useMemo(() => {
    if (myStatus !== 'reserve' || !myRegistration) return 0;
    // Use statuses map to find all reserve players, then sort by timestamp
    const reservePlayers = players
      .filter(p => statuses.get(p.id) === 'reserve')
      .sort((a, b) => a.timestamp - b.timestamp);
    return reservePlayers.findIndex(p => p.id === myRegistration.id) + 1;
  }, [myStatus, myRegistration, players, statuses]);

  // Auto-restore from Firebase backup when tournament is completed
  useEffect(() => {
    if (!completedAt || restoreFailed || !tournament) return;
    restoreFromBackup(tournament.id).then(ok => {
      if (!ok) setRestoreFailed(true);
    });
  }, [completedAt, tournament?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!tournament) return null;

  if (completedAt) {
    if (!restoreFailed) return null; // loading / redirecting
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={() => setScreen(joinReturnScreen)} aria-label={t('join.back')}>&larr;</button>
          <h1 className={styles.title}>{tournament.name}</h1>
        </header>
        <main>
          {(tournament.date || tournament.place || organizerName) && (
            <Card>
              <div className={styles.detailsList}>
                {tournament.date && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t('join.date')}</span>
                    <span>{new Date(tournament.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                  </div>
                )}
                {tournament.place && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t('join.place')}</span>
                    <span>{tournament.place}</span>
                  </div>
                )}
                {organizerName && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t('join.organizer')}</span>
                    <span>{organizerName}</span>
                  </div>
                )}
              </div>
            </Card>
          )}
          <Card>
            <h2 className={styles.sectionTitle}>{t('join.completed')}</h2>
            <p>{t('join.completedOn', { date: new Date(completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) })}</p>
          </Card>
        </main>
      </div>
    );
  }

  const confirmedCount = players.filter(p => statuses.get(p.id) === 'playing').length;
  const spotsLeft = capacity - confirmedCount;
  const reserveCount = [...statuses.values()].filter(s => s === 'reserve').length;
  const isConfirmed = myRegistration?.confirmed !== false;

  const handleRegister = async () => {
    const trimmed = name.trim();
    if (!trimmed || registeringRef.current) return;

    // Warn if someone with the same name is already registered
    const duplicate = players.find(p => p.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      if (!await asyncConfirm(t('join.duplicateConfirm', { name: duplicate.name }))) {
        return;
      }
    }

    registeringRef.current = true;
    setRegistering(true);
    try {
      const willBeReserve = confirmedCount >= capacity;
      const extras: { group?: 'A' | 'B'; clubId?: string; rankSlot?: number } = {};
      if (regGroup) extras.group = regGroup;
      if (regClubId) extras.clubId = regClubId;
      if (regRankSlot) extras.rankSlot = Number(regRankSlot);
      await registerPlayer(trimmed, Object.keys(extras).length > 0 ? extras : undefined);
      if (uid && (regPartnerName.trim() || regNewPartnerName.trim())) {
        const isNew = regPartnerName === NEW_PARTNER;
        const selectedPartner = isNew ? null : players.find(p => p.id === regPartnerName);
        const pName = isNew ? (regNewPartnerName.trim() || null) : (selectedPartner?.name.trim() || null);
        const pTg = isNew ? (regNewPartnerTelegram.trim().replace(/^@/, '') || null) : (selectedPartner?.telegramUsername ?? null);
        const constraints: PartnerConstraints = {
          requireSameClub: formatHasClubs(tournament.format),
          requireSameRank: tournament.format === 'club-ranked',
          requireOppositeGroup: formatHasGroups(tournament.format),
        };
        const rejection = await updatePlayerPartner(uid, pName, pTg, constraints);
        if (rejection) {
          showToast(rejectionMessage(rejection, t));
        }
      }
      if (willBeReserve) {
        showToast(t('join.reserveToast'));
      } else if (tournament.date) {
        showToast(t('join.inWithCalendar'));
        setShowCalendarPrompt(true);
      } else {
        showToast(t('join.inSimple'));
      }
    } catch {
      showToast(t('join.registerFailed'));
    }
    setRegistering(false);
    registeringRef.current = false;
    setNameInput('');
  };

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || !uid || trimmed === myRegistration?.name) {
      setEditingName(false);
      return;
    }
    await updatePlayerName(uid, trimmed);
    setEditingName(false);
  };

  const handleToggleConfirmed = async () => {
    setUpdating(true);
    try {
      await updateConfirmed(!isConfirmed);
      if (isConfirmed) {
        showToast(t('join.participationCancelled'));
        setShowCalendarPrompt(false);
      } else if (tournament.date) {
        showToast(t('join.welcomeBackCalendar'));
        setShowCalendarPrompt(true);
      } else {
        showToast(t('join.welcomeBack'));
      }
    } catch {
      showToast(t('join.updateFailed'));
    }
    setUpdating(false);
  };

  const handleLaunch = () => {
    const result = validateLaunch(tournament!, players, statuses);
    if (result) { showToast(t(result.key, result.params)); return; }
    handleGuardedLaunch(tournament!, players);
  };

  const handleCopyExport = async () => {
    const json = exportRunnerTournamentJSON(tournament!, players);
    try {
      await navigator.clipboard.writeText(json);
      showToast(t('join.jsonCopied'));
    } catch {
      showToast(t('join.failedCopy'));
    }
  };

  /**
   * Check if a club/rank/group change would break the partner link.
   * If it would, ask the user to confirm and disconnect the link.
   * Returns false if the user cancelled (change should not proceed).
   */
  const guardPartnerLink = async (change: { clubId?: string | null; rankSlot?: number | null; group?: 'A' | 'B' | null }): Promise<boolean> => {
    if (!uid || !myRegistration?.partnerName || !formatHasFixedPartners(tournament.format)) return true;
    const partner = findPartner(myRegistration, players);
    if (!partner) return true;
    const constraints: PartnerConstraints = {
      requireSameClub: formatHasClubs(tournament.format),
      requireSameRank: tournament.format === 'club-ranked',
      requireOppositeGroup: formatHasGroups(tournament.format),
    };
    const reason = wouldBreakPartnerLink(change, partner, constraints);
    if (!reason) return true;
    if (!await asyncConfirm(t('join.changeBreaksLink', { name: partner.name }))) return false;
    await updatePlayerPartner(uid, null, null);
    return true;
  };

  const handleBack = () => {
    setScreen(joinReturnScreen);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={handleBack} aria-label={t('join.back')}>&larr;</button>
        <h1 className={styles.title}>{tournament.name}</h1>
        {uid && tournament.organizerId === uid && (
          <button className={styles.editTournamentBtn} onClick={() => setScreen('organizer')}>
            {t('join.edit')}
          </button>
        )}
      </header>

      <main>

      <Card>
        <div className={styles.detailsList}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('join.format')}</span>
            <span>{(() => {
              const preset = getPresetByFormat(tournament.format);
              return preset ? t(preset.nameKey) : t('organizer.formatMexicano');
            })()}</span>
          </div>
          {tournament.date && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('join.date')}</span>
              <span>{new Date(tournament.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</span>
            </div>
          )}
          {tournament.duration && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('join.duration')}</span>
              <span>{tournament.duration >= 60 ? `${Math.floor(tournament.duration / 60)}h${tournament.duration % 60 ? ` ${tournament.duration % 60}min` : ''}` : `${tournament.duration}min`}</span>
            </div>
          )}
          {tournament.place && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('join.place')}</span>
              <span>{tournament.place}</span>
            </div>
          )}
          {organizerName && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('join.organizer')}</span>
              <span>{organizerName}</span>
            </div>
          )}
          {tournament.chatLink && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{t('join.groupChat')}</span>
                <a href={tournament.chatLink.match(/^https?:\/\//) ? tournament.chatLink : `https://${tournament.chatLink}`} target="_blank" rel="noopener noreferrer" className={styles.chatLink}>
                  {t('join.joinGroupChat')}
                </a>
              </div>
            )}
            {tournament.description && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{t('join.description')}</span>
                <p className={styles.description}>{tournament.description}</p>
              </div>
            )}
          </div>
        </Card>

      <Card>
        {isRegistered ? (
          <div className={styles.registered}>
            {isConfirmed && myStatus === 'needs-partner' ? (
              <>
                <div className={styles.reserveIcon}>&#128101;</div>
                <h3>{t('join.needsPartner')}</h3>
                <p className={styles.hint}>{t(tournament.captainMode ? 'join.needsPartnerHintCaptain' : 'join.needsPartnerHint')}</p>
              </>
            ) : isConfirmed && myStatus === 'registered' ? (() => {
              const myClub = tournament.clubs?.find(c => c.id === myRegistration?.clubId);
              const captainPlayer = myClub?.captainId ? players.find(p => p.id === myClub.captainId) : undefined;
              const captainName = captainPlayer?.name ?? (myClub?.captainTelegram ? `@${myClub.captainTelegram}` : undefined);
              const captainTg = captainPlayer?.telegramUsername ?? myClub?.captainTelegram;
              return (
                <>
                  <div className={styles.reserveIcon}>&#9203;</div>
                  <h3>{t('join.awaitingCaptain')}</h3>
                  <p className={styles.hint}>{t('join.awaitingCaptainHint')}</p>
                  <p className={styles.captainInfo}>
                    {t('join.yourCaptain')}{' '}
                    {captainName
                      ? captainTg
                        ? <a href={`https://t.me/${captainTg}`} target="_blank" rel="noopener noreferrer">{captainName}</a>
                        : <strong>{captainName}</strong>
                      : <span className={styles.hint}>{t('join.captainUnassigned')}</span>
                    }
                  </p>
                </>
              );
            })() : isConfirmed && myStatus === 'reserve' ? (
              <>
                <div className={styles.reserveIcon}>&#9888;</div>
                <h3>{t('join.onReserveList')}</h3>
                <p className={styles.hint}>{t('join.reservePosition', { position: myReservePosition })}</p>
              </>
            ) : isConfirmed ? (
              <>
                <div className={styles.checkmark}>&#10003;</div>
                <h3>{t('join.confirmed')}</h3>
                <p className={styles.hint}>{t('join.confirmedHint')}</p>
              </>
            ) : (
              <>
                <div className={styles.cancelled}>&#10007;</div>
                <h3>{t('join.cancelled')}</h3>
                <p className={styles.hint}>{t('join.cancelledHint')}</p>
              </>
            )}

            {myRegistration && !editingName && (
              <div className={styles.registeredName}>
                <span className={styles.registeredAs}>{t('join.registeredAs')} <strong>{myRegistration.name}</strong></span>
                <button
                  className={styles.editBtn}
                  onClick={() => { setNameDraft(myRegistration.name); setEditingName(true); }}
                  aria-label={t('join.editName')}
                >
                  &#x270E;
                </button>
              </div>
            )}
            {editingName && (
              <div className={styles.editNameRow}>
                <input
                  className={styles.nameInput}
                  type="text"
                  value={nameDraft}
                  onChange={e => setNameDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  autoFocus
                />
                <Button size="small" onClick={handleSaveName} disabled={!nameDraft.trim()}>
                  {t('join.save')}
                </Button>
              </div>
            )}

            {isConfirmed ? (
              <Button
                variant="secondary"
                fullWidth
                onClick={handleToggleConfirmed}
                disabled={updating}
              >
                {updating ? t('join.updating') : t('join.cancelParticipation')}
              </Button>
            ) : (
              <Button
                fullWidth
                onClick={handleToggleConfirmed}
                disabled={updating}
              >
                {updating ? t('join.updating') : t('join.confirmParticipation')}
              </Button>
            )}

            {isConfirmed && tournament.date && (
              <button
                className={showCalendarPrompt ? styles.calendarBtnHighlight : styles.calendarBtn}
                onClick={() => { downloadICS(tournament); setShowCalendarPrompt(false); }}
              >
                &#128197; {t('join.addToCalendar')}
              </button>
            )}

            {isConfirmed && uid && formatHasGroups(tournament.format) && (
              <div className={styles.groupPicker}>
                <span className={styles.groupPickerLabel}>{t('join.selectGroup')}</span>
                <div className={styles.groupToggle}>
                  <button
                    className={myRegistration?.group === 'A' ? styles.groupBtnActive : styles.groupBtn}
                    onClick={async () => {
                      const val = myRegistration?.group === 'A' ? null : 'A';
                      if (!(await guardPartnerLink({ group: val }))) return;
                      updatePlayerGroup(uid, val);
                    }}
                  >
                    {tournament.groupLabels?.[0] || 'A'}
                  </button>
                  <button
                    className={myRegistration?.group === 'B' ? styles.groupBtnActive : styles.groupBtn}
                    onClick={async () => {
                      const val = myRegistration?.group === 'B' ? null : 'B';
                      if (!(await guardPartnerLink({ group: val }))) return;
                      updatePlayerGroup(uid, val);
                    }}
                  >
                    {tournament.groupLabels?.[1] || 'B'}
                  </button>
                </div>
              </div>
            )}

            {isConfirmed && uid && formatHasClubs(tournament.format) && (tournament.clubs ?? []).length > 0 && (() => {
              const clubs = tournament.clubs!;
              const clubIdx = myRegistration?.clubId
                ? clubs.findIndex(c => c.id === myRegistration.clubId)
                : -1;
              return (
                <div className={styles.clubPicker}>
                  <select
                    className={styles.joinSelect}
                    value={myRegistration?.clubId ?? ''}
                    onChange={async e => {
                      const val = e.target.value || null;
                      if (!(await guardPartnerLink({ clubId: val }))) {
                        e.target.value = myRegistration?.clubId ?? '';
                        return;
                      }
                      updatePlayerClub(uid, val);
                    }}
                    style={clubIdx >= 0 && getClubColor(clubs[clubIdx], clubIdx) !== NO_COLOR ? { backgroundColor: getClubColor(clubs[clubIdx], clubIdx), color: 'white', borderColor: 'transparent' } : undefined}
                  >
                    <option value="">{t('join.selectClub')}</option>
                    {clubs.map(club => (
                      <option key={club.id} value={club.id}>{club.name}</option>
                    ))}
                  </select>
                </div>
              );
            })()}

            {isConfirmed && uid && tournament.format === 'club-ranked' && (tournament.rankLabels ?? []).length > 0 && (
              <div className={styles.rankPicker}>
                <select
                  className={styles.joinSelect}
                  value={myRegistration?.rankSlot != null ? String(myRegistration.rankSlot) : ''}
                  onChange={async e => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    if (!(await guardPartnerLink({ rankSlot: val }))) {
                      e.target.value = myRegistration?.rankSlot != null ? String(myRegistration.rankSlot) : '';
                      return;
                    }
                    updatePlayerRank(uid, val);
                  }}
                  style={myRegistration?.rankSlot != null ? (() => {
                    const rc = getRankColor(myRegistration.rankSlot, tournament.rankColors?.[myRegistration.rankSlot]);
                    return rc.bg !== NO_COLOR ? { backgroundColor: rc.bg, color: rc.text, borderColor: rc.border } : undefined;
                  })() : undefined}
                >
                  <option value="">{t('join.selectRank')}</option>
                  {tournament.rankLabels!.map((label, idx) => (
                    <option key={idx} value={String(idx)}>{label}</option>
                  ))}
                </select>
              </div>
            )}

            {isConfirmed && uid && formatHasFixedPartners(tournament.format) && (
              <PartnerEditor
                partnerName={myRegistration?.partnerName ?? ''}
                partnerTelegram={myRegistration?.partnerTelegram ?? ''}
                players={players}
                currentPlayerId={uid}
                constraints={{
                  requireSameClub: formatHasClubs(tournament.format),
                  requireSameRank: tournament.format === 'club-ranked',
                  requireOppositeGroup: formatHasGroups(tournament.format),
                }}
                onSave={(pName, pTg) => updatePlayerPartner(uid, pName, pTg, {
                  requireSameClub: formatHasClubs(tournament.format),
                  requireSameRank: tournament.format === 'club-ranked',
                  requireOppositeGroup: formatHasGroups(tournament.format),
                })}
              />
            )}
          </div>
        ) : (
          <div className={styles.registerForm}>
            <h3 className={styles.formTitle}>{t('join.joinAs')}</h3>
            <input
              className={styles.nameInput}
              type="text"
              value={name}
              onChange={e => setNameInput(e.target.value)}
              placeholder={t('join.enterName')}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              autoFocus
            />

            {formatHasGroups(tournament.format) && (
              <div className={styles.groupPicker}>
                <span className={styles.groupPickerLabel}>{t('join.selectGroup')}</span>
                <div className={styles.groupToggle}>
                  <button
                    type="button"
                    className={regGroup === 'A' ? styles.groupBtnActive : styles.groupBtn}
                    onClick={() => setRegGroup(regGroup === 'A' ? null : 'A')}
                  >
                    {tournament.groupLabels?.[0] || 'A'}
                  </button>
                  <button
                    type="button"
                    className={regGroup === 'B' ? styles.groupBtnActive : styles.groupBtn}
                    onClick={() => setRegGroup(regGroup === 'B' ? null : 'B')}
                  >
                    {tournament.groupLabels?.[1] || 'B'}
                  </button>
                </div>
              </div>
            )}

            {formatHasClubs(tournament.format) && (tournament.clubs ?? []).length > 0 && (
              <div className={styles.clubPicker}>
                <select
                  className={styles.joinSelect}
                  value={regClubId}
                  onChange={e => setRegClubId(e.target.value)}
                  style={(() => {
                    if (!regClubId) return undefined;
                    const clubs = tournament.clubs!;
                    const idx = clubs.findIndex(c => c.id === regClubId);
                    if (idx < 0) return undefined;
                    const color = getClubColor(clubs[idx], idx);
                    return color !== NO_COLOR ? { backgroundColor: color, color: 'white', borderColor: 'transparent' } : undefined;
                  })()}
                >
                  <option value="">{t('join.selectClub')}</option>
                  {tournament.clubs!.map(club => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
              </div>
            )}

            {tournament.format === 'club-ranked' && (tournament.rankLabels ?? []).length > 0 && (
              <div className={styles.rankPicker}>
                <select
                  className={styles.joinSelect}
                  value={regRankSlot}
                  onChange={e => setRegRankSlot(e.target.value)}
                  style={(() => {
                    if (!regRankSlot) return undefined;
                    const rc = getRankColor(Number(regRankSlot), tournament.rankColors?.[Number(regRankSlot)]);
                    return rc.bg !== NO_COLOR ? { backgroundColor: rc.bg, color: rc.text, borderColor: rc.border } : undefined;
                  })()}
                >
                  <option value="">{t('join.selectRank')}</option>
                  {tournament.rankLabels!.map((label, idx) => (
                    <option key={idx} value={String(idx)}>{label}</option>
                  ))}
                </select>
              </div>
            )}

            {formatHasFixedPartners(tournament.format) && (
              <div className={styles.partnerPicker}>
                <span className={styles.groupPickerLabel}>{t('join.partnerLabel')}</span>
                <select
                  className={styles.nameInput}
                  value={regPartnerName === NEW_PARTNER ? NEW_PARTNER : regPartnerName}
                  onChange={e => {
                    const val = e.target.value;
                    setRegPartnerName(val);
                    if (val !== NEW_PARTNER) setRegNewPartnerName('');
                  }}
                >
                  <option value="">{t('organizer.partnerName')}</option>
                  {players
                    .filter(p => {
                      if (p.confirmed === false) return false;
                      if (p.partnerName) return false;
                      if (formatHasClubs(tournament.format) && regClubId && p.clubId !== regClubId) return false;
                      if (tournament.format === 'club-ranked' && regRankSlot && p.rankSlot !== Number(regRankSlot)) return false;
                      if (formatHasGroups(tournament.format) && regGroup && p.group && p.group === regGroup) return false;
                      return true;
                    })
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  <option value={NEW_PARTNER}>{t('organizer.newPlayer')}</option>
                </select>
                {regPartnerName === NEW_PARTNER && (
                  <>
                    <input
                      className={styles.nameInput}
                      type="text"
                      value={regNewPartnerName}
                      onChange={e => setRegNewPartnerName(e.target.value)}
                      placeholder={t('organizer.newPlayerName')}
                      autoFocus
                    />
                    <input
                      className={styles.nameInput}
                      type="text"
                      value={regNewPartnerTelegram}
                      onChange={e => setRegNewPartnerTelegram(e.target.value)}
                      placeholder={t('organizer.partnerTelegram')}
                    />
                  </>
                )}
              </div>
            )}

            <Button
              fullWidth
              onClick={handleRegister}
              disabled={registering || !name.trim()}
            >
              {registering ? t('join.registering') : t('join.register')}
            </Button>
          </div>
        )}
      </Card>

      <JoinPlayerList
        players={players}
        statuses={statuses}
        tournament={tournament}
        capacity={capacity}
        confirmedCount={confirmedCount}
        spotsLeft={spotsLeft}
        reserveCount={reserveCount}
        t={t}
        isCaptainOf={tournament.captainMode
          ? tournament.clubs?.find(c => c.captainId === uid || (telegramUser?.username && c.captainTelegram === telegramUser.username))?.id ?? null
          : null}
        onApprove={pid => updateCaptainApproval(pid, true)}
        onReject={pid => updateCaptainApproval(pid, false)}
        onUpdateTelegram={updatePlayerTelegram}
        onUpdatePartner={updatePlayerPartner}
        onSetRank={updatePlayerRank}
        showToast={showToast}
        captainName={myRegistration?.name}
      />

      {(uid === tournament.organizerId
        || uid === tournament.startDelegateId
        || (telegramUser?.username && telegramUser.username === tournament.startDelegateTelegram)
      ) && (<>
      <Button fullWidth onClick={handleLaunch} disabled={players.length === 0}>
        {t('join.startTournament')}
      </Button>
      <Button variant="secondary" fullWidth onClick={handleCopyExport} disabled={players.length === 0}>
        {t('join.copyForDevice')}
      </Button>
      </>)}
      </main>

      <Toast message={toastMessage} className={styles.toast} />

      <StartWarningModal
        open={showWarning}
        startedBy={startedBy}
        reason={warningReason}
        onProceed={() => proceedAnyway(tournament!, players)}
        onClose={dismissWarning}
      />
    </div>
  );
}
