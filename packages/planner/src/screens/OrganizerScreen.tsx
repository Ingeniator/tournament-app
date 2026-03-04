import { useState, useMemo, useEffect, useRef, type ReactNode } from 'react';
import { ref, push, set } from 'firebase/database';
import { Button, Card, NO_COLOR, CLUB_COLORS, getClubColor, RANK_COLORS, getRankColor, cycleColor, Modal, FeedbackModal, AppFooter, Toast, useToast, useTranslation, FormatPicker, getPresetByFormat, formatHasGroups, formatHasClubs, formatHasFixedPartners, resolveConfigDefaults, computeSitOutInfo, MINUTES_PER_POINT, MINUTES_PER_GAME, MINUTES_PER_SET, CHANGEOVER_MINUTES } from '@padel/common';
import type { Court, Club, ChaosLevel, Team } from '@padel/common';
import { generateId } from '@padel/common';
import { usePlanner } from '../state/PlannerContext';
import { auth, db } from '../firebase';
import { exportRunnerTournamentJSON } from '../utils/exportToRunner';
import { restoreFromBackup } from '../utils/restoreFromBackup';
import { useStartGuard } from '../hooks/useStartGuard';
import { StartWarningModal } from '../components/StartWarningModal';
import { TeamPairingModal } from '../components/TeamPairingModal';
import { PlayerList } from '../components/organizer/PlayerList';
import { ClubPanel } from '../components/organizer/ClubPanel';
import { EditableItem } from '../components/organizer/EditableItem';
import { getPlayerStatuses } from '../utils/playerStatus';
import { validateLaunch as validateLaunchUtil } from '../utils/validateLaunch';
import styles from './OrganizerScreen.module.css';

function CollapsibleSection({ title, summary, defaultOpen, children }: {
  title: string;
  summary?: string;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.collapsible}>
      <div className={styles.collapsibleHeader} onClick={() => setOpen(v => !v)}>
        <div>
          <div className={styles.collapsibleTitle}>{title}</div>
          {!open && summary && <div className={styles.collapsibleSummary}>{summary}</div>}
        </div>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>&#x25BC;</span>
      </div>
      {open && <div className={styles.collapsibleBody}>{children}</div>}
    </div>
  );
}

const DEFAULT_DURATION_MINUTES = 120;

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

type PlayerMode = 'quick' | 'share';

export function OrganizerScreen() {
  const { tournament, players, removePlayer, updateTournament, setScreen, userName, addPlayer, bulkAddPlayers, toggleConfirmed, updatePlayerTelegram, updatePlayerPartner, updatePlayerGroup, updatePlayerClub, updatePlayerRank, deleteTournament, completedAt, undoComplete, uid } = usePlanner();
  const { startedBy, showWarning, warningReason, handleLaunch: handleGuardedLaunch, proceedAnyway, dismissWarning } = useStartGuard(tournament?.id ?? null, uid, userName);
  const { t, locale } = useTranslation();
  const { toastMessage, showToast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const lastAutoSwitchRef = useRef(false);
  const tournamentRef = useRef(tournament);
  tournamentRef.current = tournament;
  const playersRef = useRef(players);
  playersRef.current = players;

  const hasSelfRegistered = players.some(p => p.id !== uid && p.confirmed === undefined);
  const [playerMode, setPlayerMode] = useState<PlayerMode>('quick');

  // Auto-switch to 'share' once Firebase data loads and self-registered players exist
  useEffect(() => {
    if (hasSelfRegistered) setPlayerMode('share');
  }, [hasSelfRegistered]);

  const capacity = tournament ? tournament.courts.length * 4 + (tournament.extraSpots ?? 0) : 0;
  const statuses = useMemo(() => getPlayerStatuses(players, capacity, {
    format: tournament?.format,
    clubs: tournament?.clubs,
    rankLabels: tournament?.rankLabels,
    captainMode: tournament?.captainMode,
  }), [players, capacity, tournament?.format, tournament?.clubs, tournament?.rankLabels, tournament?.captainMode]);

  // Auto-trim rankLabels/rankColors and clear player rankSlots when maxRanks decreases
  useEffect(() => {
    const t = tournamentRef.current;
    if (!t || t.format !== 'club-ranked') return;
    const clubs = t.clubs ?? [];
    if (clubs.length < 2) return;
    const slotsPerClub = Math.floor(capacity / clubs.length);
    const maxRanks = Math.max(2, Math.floor(slotsPerClub / 2));
    const tournamentUpdates: Record<string, unknown> = {};
    if (t.rankLabels && t.rankLabels.length > maxRanks) {
      tournamentUpdates.rankLabels = t.rankLabels.slice(0, maxRanks);
    }
    if (t.rankColors && t.rankColors.length > maxRanks) {
      tournamentUpdates.rankColors = t.rankColors.slice(0, maxRanks);
    }
    if (Object.keys(tournamentUpdates).length > 0) {
      updateTournament(tournamentUpdates);
      // Clear rankSlot from players whose rank was removed
      for (const p of playersRef.current) {
        if (p.rankSlot != null && p.rankSlot >= maxRanks) {
          updatePlayerRank(p.id, null);
        }
      }
    }
  }, [capacity, tournament?.clubs?.length, tournament?.format, updateTournament, updatePlayerRank]);

  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showTeamPairing, setShowTeamPairing] = useState(false);
  const [delegateMode, setDelegateMode] = useState<string>(
    tournament?.startDelegateId
      ? `player:${tournament.startDelegateId}`
      : tournament?.startDelegateTelegram !== undefined
        ? 'telegram'
        : 'me'
  );
  const [tgDelegateInput, setTgDelegateInput] = useState(tournament?.startDelegateTelegram ?? '');

  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of players) {
      if (p.confirmed === false) continue;
      const lower = p.name.trim().toLowerCase();
      counts.set(lower, (counts.get(lower) ?? 0) + 1);
    }
    const dupes: string[] = [];
    for (const [name, count] of counts) {
      if (count > 1) dupes.push(players.find(p => p.name.trim().toLowerCase() === name)!.name);
    }
    return dupes;
  }, [players]);

  // Filter to playing-only registrations for team pairing and validation
  const playingPlayers = useMemo(() =>
    players.filter(p => statuses.get(p.id) === 'playing'),
    [players, statuses]
  );

  if (!tournament) return null;

  if (completedAt) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={() => setScreen('home')} aria-label={t('organizer.back')}>&larr;</button>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>{tournament.name}</h1>
          </div>
        </header>
        <main>
          <Card>
            <h2 className={styles.sectionTitle}>{t('organizer.completed')}</h2>
            <p>{t('organizer.completedOn', { date: new Date(completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) })}</p>
            <Button fullWidth onClick={async () => {
              const ok = await restoreFromBackup(tournament.id);
              if (!ok) showToast(t('organizer.noBackupData'));
            }}>
              {t('organizer.viewResults')}
            </Button>
            <div className={styles.reopenGap} />
            <Button variant="secondary" fullWidth onClick={() => setShowReopenModal(true)}>
              {t('organizer.undoComplete')}
            </Button>
          </Card>
          <button
            className={styles.deleteBtn}
            onClick={async () => {
              if (window.confirm(t('organizer.deleteConfirm'))) {
                await deleteTournament();
              }
            }}
          >
            {t('organizer.deleteTournament')}
          </button>
        </main>

        <Modal
          open={showReopenModal}
          title={t('organizer.reopenTitle')}
          onClose={() => setShowReopenModal(false)}
        >
          <div className={styles.reopenModal}>
            <p className={styles.reopenWarning}>{t('organizer.reopenWarning')}</p>
            <div className={styles.reopenActions}>
              <Button variant="secondary" fullWidth onClick={() => setShowReopenModal(false)}>
                {t('home.cancel')}
              </Button>
              <Button fullWidth onClick={async () => {
                setShowReopenModal(false);
                await undoComplete();
              }}>
                {t('organizer.reopenConfirm')}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  const confirmedCount = players.filter(p => p.confirmed !== false).length;

  const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME as string | undefined;
  const isTelegram = !!window.Telegram?.WebApp?.initData;
  const shareUrl = isTelegram && botName
    ? `https://t.me/${botName}?startapp=${tournament.code}`
    : `${window.location.origin}/plan?code=${tournament.code}&lang=${locale}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast(t('organizer.linkCopied'));
    } catch {
      showToast(t('organizer.failedCopy'));
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(tournament.code);
      showToast(t('organizer.codeCopied'));
    } catch {
      showToast(t('organizer.failedCopy'));
    }
  };

  const handleLaunch = () => {
    const result = validateLaunchUtil(tournament!, players, statuses);
    if (result) { showToast(t(result.key, result.params)); return; }
    if (formatHasFixedPartners(tournament!.format)) {
      setShowTeamPairing(true);
      return;
    }
    handleGuardedLaunch(tournament!, players);
  };

  const handleTeamStart = (teams: Team[], aliases: Map<string, string>) => {
    setShowTeamPairing(false);
    handleGuardedLaunch(tournament!, players, teams, aliases);
  };

  const handleCopyExport = async () => {
    const json = exportRunnerTournamentJSON(tournament, players);
    try {
      await navigator.clipboard.writeText(json);
      showToast(t('organizer.jsonCopied'));
    } catch {
      showToast(t('organizer.failedCopy'));
    }
  };

  const handleNameSave = async () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== tournament.name) {
      await updateTournament({ name: trimmed });
    }
    setEditingName(false);
  };

  const playerCount = confirmedCount || capacity;

  const handleAddCourt = async () => {
    const newIndex = tournament.courts.length;
    const courts: Court[] = [...tournament.courts, { id: generateId(), name: `Court ${newIndex + 1}` }];
    await updateTournament({ courts });
  };

  const isKOTC = tournament.format === 'king-of-the-court';

  const handleRemoveCourt = async (courtId: string) => {
    if (tournament.courts.length <= 1) return;
    if (isKOTC && tournament.courts.length <= 2) return;
    const courts = tournament.courts.filter(c => c.id !== courtId);
    await updateTournament({ courts });
  };

  const handleBack = () => {
    setScreen('home');
  };

  // Determine which settings groups have values (for auto-collapse)
  const hasWhenWhere = !!(tournament.date || tournament.place);
  const hasCourtsConfig = tournament.courts.length > 1 || (tournament.extraSpots ?? 0) > 0;
  const hasDetails = !!(tournament.chatLink || tournament.description);

  // Build summaries for collapsed state
  const whenWhereParts: string[] = [];
  if (tournament.date) {
    const datePart = tournament.date.split('T')[0];
    const timePart = tournament.date.split('T')[1];
    if (datePart) whenWhereParts.push(datePart);
    if (timePart) whenWhereParts.push(timePart);
  }
  if (tournament.duration) whenWhereParts.push(`${tournament.duration} min`);
  if (tournament.place) whenWhereParts.push(tournament.place);
  const whenWhereSummary = whenWhereParts.join(' \u00b7 ');

  const courtsSummary = `${t('organizer.courts', { count: tournament.courts.length })} \u00b7 ${tournament.courts.length * 4 + (tournament.extraSpots ?? 0)} spots`;

  const formatPreset = getPresetByFormat(tournament.format);
  const formatLabel = formatPreset ? t(formatPreset.nameKey) : t('organizer.formatMexicano');

  const detailsParts: string[] = [];
  if (tournament.chatLink) detailsParts.push(t('organizer.groupChat'));
  if (tournament.description) {
    const desc = tournament.description.length > 30
      ? tournament.description.slice(0, 30) + '...'
      : tournament.description;
    detailsParts.push(desc);
  }
  const detailsSummary = detailsParts.join(' \u00b7 ');

  // Match Settings: resolve config defaults
  const clubCount = formatHasClubs(tournament.format) ? (tournament.clubs?.length ?? 0) : undefined;
  const resolved = resolveConfigDefaults({
    format: tournament.format,
    pointsPerMatch: tournament.pointsPerMatch ?? 0,
    courts: tournament.courts,
    maxRounds: tournament.maxRounds ?? null,
    targetDuration: tournament.duration,
    scoringMode: tournament.scoringMode,
    minutesPerRound: tournament.minutesPerRound,
  }, playerCount, clubCount);
  const isGamesMode = resolved.scoringMode === 'games';
  const isSetsMode = resolved.scoringMode === 'sets';
  const isTimedMode = resolved.scoringMode === 'timed';
  const minutesPer = isSetsMode ? MINUTES_PER_SET : isGamesMode ? MINUTES_PER_GAME : MINUTES_PER_POINT;
  const effectivePoints = resolved.pointsPerMatch;
  const effectiveRounds = resolved.maxRounds ?? 1;

  // Track auto-switch to games mode
  const autoSwitchedToGames = tournament.scoringMode === undefined && isGamesMode;
  lastAutoSwitchRef.current = autoSwitchedToGames;

  // Per-field suggestions
  const suggestedRoundsConfig = resolveConfigDefaults({ ...resolved, maxRounds: null, pointsPerMatch: tournament.pointsPerMatch ?? 0 }, playerCount, clubCount);
  const suggestedPointsConfig = resolveConfigDefaults({ ...resolved, pointsPerMatch: 0, maxRounds: tournament.maxRounds ?? null }, playerCount, clubCount);
  const suggestedRounds = suggestedRoundsConfig.maxRounds ?? 1;
  const suggestedMinutes = suggestedRoundsConfig.minutesPerRound ?? 20;
  const suggestedPoints = suggestedPointsConfig.pointsPerMatch;

  const clubFixedRounds = clubCount && clubCount >= 2
    ? (clubCount % 2 === 0 ? clubCount - 1 : clubCount)
    : null;

  const timedRoundDuration = resolved.minutesPerRound ?? 20;
  const roundDuration = isTimedMode ? timedRoundDuration : Math.round(effectivePoints * minutesPer + CHANGEOVER_MINUTES);
  const estimatedMinutes = effectiveRounds * roundDuration;
  const estimatedH = Math.floor(estimatedMinutes / 60);
  const estimatedM = Math.round(estimatedMinutes % 60);
  const estimatedStr = estimatedH > 0
    ? (estimatedM > 0 ? `~${estimatedH}h ${estimatedM}min` : `~${estimatedH}h`)
    : `~${estimatedM}min`;

  const matchSettingsSummary = isTimedMode
    ? `${effectiveRounds} rounds \u00b7 ${timedRoundDuration} min \u00b7 ${estimatedStr}`
    : `${effectiveRounds} rounds \u00b7 ${effectivePoints} ${isSetsMode ? 'sets' : isGamesMode ? 'games' : 'pts'} \u00b7 ${estimatedStr}`;

  // Duration warning
  const durationLimit = tournament.duration ?? DEFAULT_DURATION_MINUTES;
  const exceedsLimit = estimatedMinutes > durationLimit;

  // Some players won't play warning
  const playersPerRound = Math.min(tournament.courts.length * 4, playerCount);
  const minRoundsForAll = playersPerRound > 0 ? Math.ceil(playerCount / playersPerRound) : 0;
  const somePlayersExcluded = playersPerRound < playerCount && effectiveRounds < minRoundsForAll;

  // Sit-out fairness
  const sitOutInfo = computeSitOutInfo(playerCount, tournament.courts.length, effectiveRounds);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={handleBack} aria-label={t('organizer.back')}>&larr;</button>
        {editingName ? (
          <input
            className={styles.nameInput}
            value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleNameSave();
              if (e.key === 'Escape') setEditingName(false);
            }}
            onBlur={handleNameSave}
            autoFocus
          />
        ) : (
          <div className={styles.nameRow}>
            <h1 className={styles.name}>{tournament.name}</h1>
            <button
              className={styles.editNameBtn}
              onClick={() => { setNameDraft(tournament.name); setEditingName(true); }}
              aria-label={t('organizer.renameTournament')}
            >
              &#x270E;
            </button>
          </div>
        )}
      </header>
      <main>
      {userName && (
        <span className={styles.organizerLabel}>{t('organizer.by', { name: userName })}</span>
      )}

      {/* Player mode toggle */}
      <div className={styles.modeToggle}>
        <button
          className={playerMode === 'quick' ? styles.modeBtnActive : styles.modeBtn}
          onClick={() => setPlayerMode('quick')}
        >
          {t('organizer.modeQuickPlay')}
        </button>
        <button
          className={playerMode === 'share' ? styles.modeBtnActive : styles.modeBtn}
          onClick={() => setPlayerMode('share')}
        >
          {t('organizer.modeShare')}
        </button>
      </div>

      {/* When & Where — only in share mode */}
      {playerMode === 'share' && (
      <CollapsibleSection
        title={t('organizer.whenWhere')}
        summary={whenWhereSummary}
        defaultOpen={!hasWhenWhere}
      >
        <div className={styles.configGrid}>
          <label className={styles.configLabel}>{t('organizer.date')}</label>
          <input
            className={styles.configInput}
            type="date"
            value={tournament.date?.split('T')[0] ?? ''}
            onChange={e => {
              const date = e.target.value;
              if (!date) { updateTournament({ date: undefined }); return; }
              const time = tournament.date?.split('T')[1] ?? '12:00';
              updateTournament({ date: `${date}T${time}` });
            }}
          />

          <label className={styles.configLabel}>{t('organizer.time')}</label>
          <input
            className={styles.configInput}
            type="time"
            lang="en-GB"
            value={tournament.date?.split('T')[1] ?? ''}
            onChange={e => {
              const time = e.target.value;
              const date = tournament.date?.split('T')[0] ?? '';
              if (!date) return;
              updateTournament({ date: time ? `${date}T${time}` : `${date}T12:00` });
            }}
          />

          <label className={styles.configLabel}>{t('organizer.durationMin')}</label>
          <input
            className={styles.configInput}
            type="number"
            value={tournament.duration ?? ''}
            onChange={e => {
              const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
              updateTournament({ duration: v && v > 0 ? v : undefined });
            }}
            min={1}
            placeholder={t('organizer.durationPlaceholder')}
          />

          <label className={styles.configLabel}>{t('organizer.place')}</label>
          <input
            className={styles.configInput}
            type="text"
            value={tournament.place ?? ''}
            onChange={e => updateTournament({ place: e.target.value || undefined })}
            placeholder={t('organizer.placePlaceholder')}
          />
        </div>
      </CollapsibleSection>
      )}

      {/* Details — only in share mode */}
      {playerMode === 'share' && (
      <CollapsibleSection
        title={t('organizer.details')}
        summary={detailsSummary}
        defaultOpen={!hasDetails}
      >
        <div className={styles.configGrid}>
          <label className={styles.configLabel}>{t('organizer.groupChat')}</label>
          <input
            className={styles.configInput}
            type="url"
            value={tournament.chatLink ?? ''}
            onChange={e => updateTournament({ chatLink: e.target.value || undefined })}
            placeholder={t('organizer.groupChatPlaceholder')}
          />

          <label className={styles.configLabel}>{t('organizer.description')}</label>
          <textarea
            className={styles.configTextarea}
            value={tournament.description ?? ''}
            onChange={e => updateTournament({ description: e.target.value || undefined })}
            placeholder={t('organizer.descriptionPlaceholder')}
            rows={3}
            maxLength={2000}
          />
        </div>
      </CollapsibleSection>
      )}

      {/* Share section — only in share mode */}
      {playerMode === 'share' && (
      <Card>
        <h2 className={styles.sectionTitle}>{t('organizer.shareWithPlayers')}</h2>
        <div className={styles.codeDisplay}>
          <span className={styles.code} onClick={handleCopyCode}>{tournament.code}</span>
        </div>
        <p className={styles.hint}>{t('organizer.playersEnterCode')}</p>
        <Button variant="secondary" fullWidth onClick={handleCopyLink}>
          {t('organizer.copyLink')}
        </Button>
      </Card>
      )}

      {/* Who can start — only in share mode */}
      {playerMode === 'share' && (
      <Card>
        <h2 className={styles.sectionTitle}>{t('organizer.startDelegate')}</h2>
        <select
          className={styles.select}
          value={delegateMode}
          onChange={e => {
            const val = e.target.value;
            setDelegateMode(val);
            if (val === 'me') {
              updateTournament({ startDelegateId: undefined, startDelegateTelegram: undefined });
              setTgDelegateInput('');
            } else if (val === 'telegram') {
              updateTournament({ startDelegateId: undefined, startDelegateTelegram: tgDelegateInput || undefined });
            } else if (val.startsWith('player:')) {
              const playerId = val.slice('player:'.length);
              updateTournament({ startDelegateId: playerId, startDelegateTelegram: undefined });
              setTgDelegateInput('');
            }
          }}
        >
          <option value="me">{t('organizer.startDelegateOnlyMe')}</option>
          {players.filter(p => p.id !== uid).map(p => (
            <option key={p.id} value={`player:${p.id}`}>{p.name}</option>
          ))}
          <option value="telegram">{t('organizer.startDelegateTelegram')}</option>
        </select>
        {delegateMode === 'telegram' && (
          <input
            className={styles.configInput}
            type="text"
            value={tgDelegateInput}
            onChange={e => {
              const raw = e.target.value.replace(/^@/, '');
              setTgDelegateInput(raw);
              updateTournament({ startDelegateTelegram: raw || undefined });
            }}
            placeholder={t('organizer.startDelegateTelegramPlaceholder')}
            style={{ marginTop: 'var(--space-sm)' }}
          />
        )}
      </Card>
      )}


      {/* Courts section */}
      <CollapsibleSection
        title={t('organizer.courts_section')}
        summary={courtsSummary}
        defaultOpen={!hasCourtsConfig}
      >
        <div className={styles.courtsSection}>
          <div className={styles.courtsHeader}>
            <span>{t('organizer.courts', { count: tournament.courts.length })}</span>
            <Button variant="ghost" size="small" onClick={handleAddCourt}>{t('organizer.addCourt')}</Button>
          </div>
          {tournament.courts.map((court, courtIdx) => (
            <EditableItem
              key={court.id}
              name={court.name}
              onChange={name => {
                const courts = tournament.courts.map(c =>
                  c.id === court.id ? { ...c, name } : c
                );
                updateTournament({ courts });
              }}
              onRemove={
                tournament.courts.length > 1 && !(isKOTC && tournament.courts.length <= 2)
                  ? () => handleRemoveCourt(court.id)
                  : undefined
              }
              subtitle={isKOTC ? (
                <span className={styles.courtBonusLabel}>
                  +{tournament.courts.length - 1 - courtIdx} {t('organizer.courtBonusAuto')}
                </span>
              ) : undefined}
            />
          ))}
        </div>

        <div className={styles.capacitySection}>
          <label className={styles.configLabel}>{t('organizer.extraSpots')}</label>
          <input
            className={styles.configInput}
            type="number"
            value={tournament.extraSpots || ''}
            onChange={e => {
              const v = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
              updateTournament({ extraSpots: isNaN(v) ? 0 : Math.max(0, v) });
            }}
            min={0}
            placeholder="0"
          />
          <span className={styles.capacityTotal}>
            {t('organizer.totalSpots', {
              total: tournament.courts.length * 4 + (tournament.extraSpots ?? 0),
              courts: tournament.courts.length,
              extra: (tournament.extraSpots ?? 0) > 0 ? t('organizer.extraSuffix', { count: tournament.extraSpots ?? 0 }) : '',
            })}
          </span>
        </div>
      </CollapsibleSection>

      {/* Format section */}
      <CollapsibleSection
        title={t('organizer.formatSection')}
        summary={formatLabel}
        defaultOpen={false}
      >
        <div className={styles.configGrid}>
          <div className={styles.configFullWidth}>
          <label className={styles.configLabel}>
            {t('organizer.format')}
          </label>
          <FormatPicker
            format={tournament.format}
            onChange={(format) => {
              updateTournament({ format });
            }}
            t={t}
          />
          </div>
        </div>

        {formatHasGroups(tournament.format) && (
          <div className={styles.groupLabelsSection}>
            <span className={styles.groupLabelsTitle}>{t('organizer.groupLabels')}</span>
            <div className={styles.groupLabelsRow}>
              <input
                className={styles.groupLabelInput}
                type="text"
                value={tournament.groupLabels?.[0] ?? ''}
                onChange={e => {
                  const labels: [string, string] = [e.target.value, tournament.groupLabels?.[1] ?? ''];
                  updateTournament({ groupLabels: labels[0] || labels[1] ? labels : undefined });
                }}
                placeholder={t('organizer.groupLabelAPlaceholder')}
              />
              <input
                className={styles.groupLabelInput}
                type="text"
                value={tournament.groupLabels?.[1] ?? ''}
                onChange={e => {
                  const labels: [string, string] = [tournament.groupLabels?.[0] ?? '', e.target.value];
                  updateTournament({ groupLabels: labels[0] || labels[1] ? labels : undefined });
                }}
                placeholder={t('organizer.groupLabelBPlaceholder')}
              />
            </div>
          </div>
        )}

        {formatHasClubs(tournament.format) && (() => {
          const clubs = tournament.clubs ?? [];
          return (
            <div className={styles.clubsSection}>
              <div className={styles.courtsHeader}>
                <span>{t('organizer.clubs', { count: clubs.length })}</span>
                <Button variant="ghost" size="small" onClick={() => {
                  const usedColors = new Set(clubs.map((c, i) => getClubColor(c, i)));
                  const freeColor = CLUB_COLORS.find(c => c !== NO_COLOR && !usedColors.has(c)) ?? CLUB_COLORS[clubs.length % (CLUB_COLORS.length - 1)];
                  const newClubs: Club[] = [...clubs, { id: generateId(), name: `Club ${clubs.length + 1}`, color: freeColor }];
                  updateTournament({ clubs: newClubs });
                }}>{t('organizer.addClub')}</Button>
              </div>
              {clubs.map((club, idx) => {
                const currentClubIdx = CLUB_COLORS.indexOf(getClubColor(club, idx));
                const usedClubIndices = new Set(
                  clubs.map((c, i) => i !== idx ? CLUB_COLORS.indexOf(getClubColor(c, i)) : -1).filter(i => i >= 0)
                );
                return (
                <EditableItem
                  key={club.id}
                  name={club.name}
                  onChange={name => {
                    const updated = clubs.map(c =>
                      c.id === club.id ? { ...c, name } : c
                    );
                    updateTournament({ clubs: updated });
                  }}
                  onRemove={clubs.length > 2 ? () => {
                    const updated = clubs.filter(c => c.id !== club.id);
                    updateTournament({ clubs: updated });
                  } : undefined}
                  icon={
                    <button
                      className={`${styles.clubDot} ${getClubColor(club, idx) === NO_COLOR ? styles.noColorDot : ''}`}
                      style={getClubColor(club, idx) !== NO_COLOR ? { backgroundColor: getClubColor(club, idx) } : undefined}
                      onClick={() => {
                        const nextIdx = cycleColor(CLUB_COLORS, currentClubIdx >= 0 ? currentClubIdx : idx, usedClubIndices);
                        const updated = clubs.map(c =>
                          c.id === club.id ? { ...c, color: CLUB_COLORS[nextIdx] } : c
                        );
                        updateTournament({ clubs: updated });
                      }}
                    />
                  }
                  subtitle={tournament.captainMode ? (
                    <div className={styles.captainRow}>
                      <span className={styles.captainLabel}>{t('organizer.clubCaptain')}:</span>
                      <select
                        className={styles.captainSelect}
                        value={club.captainId ? `player:${club.captainId}` : club.captainTelegram !== undefined ? 'telegram' : 'none'}
                        onChange={e => {
                          const val = e.target.value;
                          const updatedClubs = [...clubs];
                          if (val === 'none') {
                            const { captainId: _, captainTelegram: __, ...rest } = club;
                            updatedClubs[idx] = rest;
                          } else if (val === 'telegram') {
                            const { captainId: _, ...rest } = club;
                            updatedClubs[idx] = { ...rest, captainTelegram: club.captainTelegram ?? '' };
                          } else if (val.startsWith('player:')) {
                            const playerId = val.slice('player:'.length);
                            const { captainTelegram: _, ...rest } = club;
                            updatedClubs[idx] = { ...rest, captainId: playerId };
                          }
                          updateTournament({ clubs: updatedClubs });
                        }}
                      >
                        <option value="none">{t('organizer.setCaptain')}</option>
                        {players.filter(p => p.clubId === club.id).map(p => (
                          <option key={p.id} value={`player:${p.id}`}>{p.name}</option>
                        ))}
                        <option value="telegram">{t('organizer.startDelegateTelegram')}</option>
                      </select>
                      {(club.captainId ? false : (club.captainTelegram !== undefined)) && (
                        <input
                          className={styles.captainTgInput}
                          type="text"
                          value={club.captainTelegram ? `@${club.captainTelegram}` : ''}
                          onChange={e => {
                            const raw = e.target.value.replace(/^@/, '');
                            const updatedClubs = [...clubs];
                            const { captainTelegram: _, ...rest } = club;
                            updatedClubs[idx] = raw ? { ...rest, captainTelegram: raw } : rest;
                            updateTournament({ clubs: updatedClubs });
                          }}
                          placeholder={t('organizer.startDelegateTelegramPlaceholder')}
                        />
                      )}
                    </div>
                  ) : undefined}
                />
                );
              })}
              {clubs.length === 0 && (
                <p className={styles.empty}>{t('organizer.noClub')}</p>
              )}
              {tournament.format === 'club-ranked' && clubs.length >= 2 && (() => {
                const slotsPerClub = Math.floor(capacity / clubs.length);
                const maxRanks = Math.max(2, Math.floor(slotsPerClub / 2));
                return (
                  <div className={styles.rankLabelsSection}>
                    <span className={styles.rankLabelsTitle}>{t('organizer.rankLabels')}</span>
                    <div className={styles.rankLabelsColumn}>
                      {Array.from({ length: maxRanks }, (_, i) => {
                        const customIdx = tournament.rankColors?.[i];
                        const rc = getRankColor(i, customIdx);
                        return (
                          <div key={i} className={styles.rankLabelRow}>
                            <button
                              type="button"
                              className={`${styles.rankDot} ${rc.bg === NO_COLOR ? styles.noColorDot : ''}`}
                              style={rc.bg !== NO_COLOR ? { backgroundColor: rc.bg, borderColor: rc.border } : undefined}
                              onClick={() => {
                                const colors = [...(tournament.rankColors ?? Array.from({ length: maxRanks }, (__, j) => j))];
                                const current = colors[i] ?? i;
                                const usedByOthers = new Set(
                                  colors.map((c, j) => j !== i ? c : -1).filter(c => c >= 0)
                                );
                                colors[i] = cycleColor(RANK_COLORS, current, usedByOthers);
                                updateTournament({ rankColors: colors });
                              }}
                            />
                            <input
                              className={styles.rankLabelInput}
                              type="text"
                              value={tournament.rankLabels?.[i] ?? ''}
                              onChange={e => {
                                const labels = [...(tournament.rankLabels ?? [])];
                                labels[i] = e.target.value;
                                // Trim trailing empty strings
                                while (labels.length > 0 && !labels[labels.length - 1]) labels.pop();
                                updateTournament({ rankLabels: labels.length > 0 ? labels : undefined });
                              }}
                              placeholder={t('organizer.rankLabelPlaceholder', { num: i + 1 })}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* Modes subsection */}
        {formatHasFixedPartners(tournament.format) && (
          <>
            <div className={styles.modesSubtitle}>{t('organizer.modesSubtitle')}</div>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={tournament.maldiciones?.enabled ?? false}
                onChange={e => {
                  updateTournament({
                    maldiciones: e.target.checked
                      ? { enabled: true, chaosLevel: tournament.maldiciones?.chaosLevel ?? 'medium' }
                      : undefined,
                  });
                }}
              />
              <span>{t('organizer.maldicionesEnabled')}</span>
            </label>
            <span className={styles.hint}>{t('organizer.maldicionesHint')}</span>
            {tournament.maldiciones?.enabled && (
              <div className={styles.configGrid}>
                <label className={styles.configLabel}>{t('organizer.chaosLevel')}</label>
                <select
                  className={styles.select}
                  value={tournament.maldiciones.chaosLevel}
                  onChange={e => updateTournament({
                    maldiciones: { enabled: true, chaosLevel: e.target.value as ChaosLevel },
                  })}
                >
                  <option value="lite">{t('organizer.chaosLite')}</option>
                  <option value="medium">{t('organizer.chaosMedium')}</option>
                  <option value="hardcore">{t('organizer.chaosHardcore')}</option>
                </select>
              </div>
            )}
          </>
        )}
        {formatHasClubs(tournament.format) && (
          <>
            {!formatHasFixedPartners(tournament.format) && <div className={styles.modesSubtitle}>{t('organizer.modesSubtitle')}</div>}
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={tournament.captainMode ?? false}
                onChange={e => updateTournament({ captainMode: e.target.checked || undefined })}
              />
              <span>{t('organizer.captainMode')}</span>
            </label>
            <span className={styles.hint}>{t('organizer.captainModeHint')}</span>
          </>
        )}
        {tournament.format === 'club-ranked' && (() => {
          const clubCount = (tournament.clubs ?? []).length;
          const minCapacity = clubCount * 2 * 2; // clubs × min 2 ranks × 2 per pair
          if (clubCount >= 2 && capacity < minCapacity) {
            return (
              <div className={styles.matchWarning}>
                <div className={styles.matchWarningTitle}>{t('organizer.rankCapacityWarningTitle')}</div>
                <div className={styles.matchWarningBody}>
                  {t('organizer.rankCapacityWarningBody', { capacity, minCapacity, courts: Math.ceil(minCapacity / 4) })}
                </div>
              </div>
            );
          }
          return null;
        })()}
      </CollapsibleSection>

      {/* Match Settings section */}
      <CollapsibleSection
        title={t('organizer.matchSettings')}
        summary={matchSettingsSummary}
        defaultOpen={false}
      >
        <div className={styles.configGrid}>
          <label className={styles.configLabel}>{t('organizer.scoringMode')}</label>
          <select
            className={styles.select}
            value={isTimedMode ? 'timed' : isSetsMode ? 'sets' : isGamesMode ? 'games' : 'points'}
            onChange={e => {
              const mode = e.target.value as 'points' | 'games' | 'sets' | 'timed';
              if (mode === 'points' && lastAutoSwitchRef.current) {
                showToast(t('organizer.gamesModeSuggestion', { rounds: effectiveRounds }));
              }
              if (mode === 'timed') {
                updateTournament({ scoringMode: 'timed', pointsPerMatch: undefined });
              } else {
                // Clear explicit pointsPerMatch so it recalculates for new mode
                updateTournament({ scoringMode: mode, pointsPerMatch: undefined, minutesPerRound: undefined });
              }
            }}
          >
            <option value="points">{t('organizer.scoringPoints')}</option>
            <option value="games">{t('organizer.scoringGames')}</option>
            <option value="sets">{t('organizer.scoringSets')}</option>
            <option value="timed">{t('organizer.scoringTimed')}</option>
          </select>
        </div>

        <div className={styles.configGrid}>
          <label className={styles.configLabel}>{t('organizer.numberOfRounds')}</label>
          <input
            className={styles.configInput}
            type="number"
            min={1}
            value={tournament.maxRounds ?? ''}
            placeholder={String(suggestedRounds)}
            onChange={e => {
              const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
              updateTournament({ maxRounds: val && val > 0 ? val : undefined });
            }}
          />
        </div>
        <span className={styles.hint}>
          {clubFixedRounds && !isTimedMode
            ? t('organizer.clubFixedRounds', { rounds: clubFixedRounds, clubs: clubCount! })
            : isTimedMode
              ? t('organizer.recommendedTimedPair', { rounds: suggestedRounds, minutes: suggestedMinutes })
              : t('organizer.recommendedRounds', { rounds: suggestedRounds, players: confirmedCount || capacity, courts: tournament.courts.length })}
        </span>

        {isTimedMode ? (
          <>
            <div className={styles.configGrid}>
              <label className={styles.configLabel}>{t('organizer.minutesPerRound')}</label>
              <input
                className={styles.configInput}
                type="number"
                min={1}
                value={tournament.minutesPerRound || ''}
                placeholder={String(resolved.minutesPerRound ?? 20)}
                onChange={e => {
                  const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                  updateTournament({ minutesPerRound: v && v > 0 ? v : undefined });
                }}
              />
            </div>
          </>
        ) : (
          <>
            <div className={styles.configGrid}>
              <label className={styles.configLabel}>
                {isSetsMode ? t('organizer.setsPerMatch') : isGamesMode ? t('organizer.gamesPerMatch') : t('organizer.pointsPerMatch')}
              </label>
              <input
                className={styles.configInput}
                type="number"
                min={1}
                value={tournament.pointsPerMatch || ''}
                placeholder={String(suggestedPoints)}
                onChange={e => {
                  const v = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                  updateTournament({ pointsPerMatch: isNaN(v) ? 0 : Math.max(0, v) });
                }}
              />
            </div>
            <span className={styles.hint}>
              {isSetsMode
                ? t('organizer.recommendedSets', { sets: suggestedPoints })
                : isGamesMode
                  ? t('organizer.recommendedGames', { games: suggestedPoints })
                  : t('organizer.recommendedPoints', { points: suggestedPoints })}
            </span>
          </>
        )}

        <div className={styles.estimate}>
          {t('organizer.estimatedDuration')}<strong>{estimatedStr}</strong>
          <span className={styles.estimateBreakdown}>
            {t('organizer.estimateBreakdown', { rounds: effectiveRounds, minutes: roundDuration })}
          </span>
        </div>

        {somePlayersExcluded && (
          <div className={styles.matchWarning}>
            <div className={styles.matchWarningTitle}>{t('organizer.somePlayersWontPlay')}</div>
            <div className={styles.matchWarningBody}>
              {t('organizer.playersPerRound', { playing: playersPerRound, total: playerCount, minRounds: minRoundsForAll })}
            </div>
          </div>
        )}

        {exceedsLimit && (
          <div className={styles.matchWarning}>
            <div className={styles.matchWarningTitle}>{t('organizer.mayExceed', { duration: formatDuration(durationLimit) })}</div>
            <div className={styles.matchWarningBody}>
              {t('organizer.fitWithin', { duration: formatDuration(durationLimit) })}{' '}
              {isTimedMode ? (
                <strong>{t('organizer.timedSuggestion', { rounds: suggestedRounds, minutes: suggestedMinutes })}</strong>
              ) : (
                <>
                  {suggestedPoints !== effectivePoints && (
                    <><strong>{isSetsMode
                      ? t('organizer.setsSuggestion', { sets: suggestedPoints })
                      : isGamesMode
                        ? t('organizer.gamesSuggestion', { games: suggestedPoints })
                        : t('organizer.pointsSuggestion', { points: suggestedPoints })}</strong></>
                  )}
                  <strong>{t('organizer.roundsSuggestion', { rounds: suggestedRounds })}</strong>
                </>
              )}.
            </div>
          </div>
        )}

        {!sitOutInfo.isEqual && sitOutInfo.sitOutsPerRound > 0 && (
          <div className={styles.matchWarning}>
            <div className={styles.matchWarningTitle}>{t('organizer.unequalSitOuts')}</div>
            <div className={styles.matchWarningBody}>
              {t('organizer.sitOutBody', { rounds: effectiveRounds, sitOuts: sitOutInfo.sitOutsPerRound, players: playerCount })}
              {sitOutInfo.nearestFairBelow && sitOutInfo.nearestFairAbove && sitOutInfo.nearestFairBelow !== sitOutInfo.nearestFairAbove ? (
                <> {t('organizer.trySitOut', { below: sitOutInfo.nearestFairBelow, above: sitOutInfo.nearestFairAbove })}</>
              ) : sitOutInfo.nearestFairAbove ? (
                <> {t('organizer.trySitOutSingle', { rounds: sitOutInfo.nearestFairAbove })}</>
              ) : sitOutInfo.nearestFairBelow ? (
                <> {t('organizer.trySitOutSingle', { rounds: sitOutInfo.nearestFairBelow })}</>
              ) : null}
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Player list */}
      <PlayerList
        players={players}
        capacity={capacity}
        addPlayer={addPlayer}
        bulkAddPlayers={bulkAddPlayers}
        removePlayer={removePlayer}
        toggleConfirmed={toggleConfirmed}
        updatePlayerTelegram={updatePlayerTelegram}
        updatePlayerPartner={updatePlayerPartner}
        statuses={statuses}
        format={tournament.format}
        clubs={tournament.clubs}
        groupLabels={tournament.groupLabels}
        rankLabels={tournament.rankLabels}
        rankColors={tournament.rankColors}
        onSetGroup={updatePlayerGroup}
        onSetClub={updatePlayerClub}
        onSetRank={updatePlayerRank}
        simplified={playerMode === 'quick'}
        captainMode={tournament.captainMode}
        showToast={showToast}
      />

      {/* Club panel — visual overview of club assignments */}
      {formatHasClubs(tournament.format) && (tournament.clubs?.length ?? 0) >= 2 && (
        <Card>
          <ClubPanel
            clubs={tournament.clubs!}
            players={players}
            onSetClub={updatePlayerClub}
          />
        </Card>
      )}

      {/* Warnings & actions */}
      {playerMode === 'share' && confirmedCount > 0 && confirmedCount < capacity && (() => {
        const courtsNeeded = tournament.courts.length * 4;
        const fillsCourts = confirmedCount >= courtsNeeded;
        return (
          <div className={styles.warning}>
            {t('organizer.spotsFilled', { confirmed: confirmedCount, capacity })}
            {fillsCourts
              ? t('organizer.fillsCourts', {
                  remaining: capacity - confirmedCount,
                  courts: tournament.courts.length === 1 ? t('organizer.courtsSingle') : t('organizer.courtsMultiple', { count: tournament.courts.length }),
                })
              : t('organizer.notFullGames')}
          </div>
        );
      })()}
      {duplicateNames.length > 0 && (
        <div className={styles.warning}>
          {t('organizer.duplicateNames', { names: duplicateNames.join(', ') })}
        </div>
      )}
      {formatHasGroups(tournament.format) && (() => {
        const unassigned = playingPlayers.filter(p => !p.group).length;
        return unassigned > 0 ? (
          <div className={styles.warning}>
            {t('organizer.unassignedGroups', { count: unassigned })}
          </div>
        ) : null;
      })()}
      {tournament.captainMode && (() => {
        const unapproved = players.filter(p => p.confirmed !== false && statuses.get(p.id) === 'registered').length;
        return unapproved > 0 ? (
          <div className={styles.warning}>
            {t('organizer.captainUnapproved', { count: unapproved })}
          </div>
        ) : null;
      })()}
      <Button fullWidth onClick={handleLaunch} disabled={players.length === 0}>
        {t('organizer.letsPlay')}
      </Button>
      {playerMode === 'share' && (
      <Button variant="secondary" fullWidth onClick={handleCopyExport} disabled={players.length === 0}>
        {t('organizer.copyForDevice')}
      </Button>
      )}

      <button
        className={styles.deleteBtn}
        onClick={async () => {
          if (window.confirm(t('organizer.deleteConfirm'))) {
            await deleteTournament();
          }
        }}
      >
        {t('organizer.deleteTournament')}
      </button>

      </main>

      <AppFooter
        onFeedbackClick={() => setFeedbackOpen(true)}
        auth={auth}
      />

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={async (message) => {
          if (!db) return;
          const feedbackRef = push(ref(db, 'feedback'));
          await set(feedbackRef, { message, source: 'planner', createdAt: Date.now() });
        }}
      />

      <Toast message={toastMessage} className={styles.toast} />

      <TeamPairingModal
        open={showTeamPairing}
        players={playingPlayers}
        format={tournament.format}
        clubs={tournament.clubs}
        rankLabels={tournament.rankLabels}
        onStart={handleTeamStart}
        onClose={() => setShowTeamPairing(false)}
      />

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
