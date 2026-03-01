import { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Card, getClubColor, Toast, useToast, useTranslation, getPresetByFormat, formatHasGroups, formatHasClubs } from '@padel/common';
import { usePlanner } from '../state/PlannerContext';
import { getPlayerStatuses } from '../utils/playerStatus';
import { downloadICS } from '../utils/icsExport';
import { exportRunnerTournamentJSON } from '../utils/exportToRunner';
import { restoreFromBackup } from '../utils/restoreFromBackup';
import { useStartGuard } from '../hooks/useStartGuard';
import { StartWarningModal } from '../components/StartWarningModal';
import styles from './JoinScreen.module.css';

export function JoinScreen() {
  const { tournament, players, uid, registerPlayer, updateConfirmed, updatePlayerName, updatePlayerGroup, updatePlayerClub, isRegistered, setScreen, organizerName, userName, telegramUser, completedAt } = usePlanner();
  const { startedBy, showWarning, warningReason, handleLaunch: handleGuardedLaunch, proceedAnyway, dismissWarning } = useStartGuard(tournament?.id ?? null, uid, userName);
  const { t } = useTranslation();
  // null = not yet edited by user, derive from external sources
  const [nameInput, setNameInput] = useState<string | null>(null);
  const name = nameInput ?? userName ?? telegramUser?.displayName ?? '';
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
  }), [players, capacity, tournament?.format, tournament?.clubs]);
  const myRegistration = uid ? players.find(p => p.id === uid) : undefined;
  const myStatus = myRegistration ? statuses.get(myRegistration.id) : undefined;

  // Compute reserve position (1-based) for current player
  const myReservePosition = useMemo(() => {
    if (myStatus !== 'reserve' || !myRegistration) return 0;
    const confirmed = players.filter(p => p.confirmed !== false);
    const sorted = [...confirmed].sort((a, b) => a.timestamp - b.timestamp);
    const reservePlayers = sorted.slice(capacity);
    return reservePlayers.findIndex(p => p.id === myRegistration.id) + 1;
  }, [myStatus, myRegistration, players, capacity]);

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
          <button className={styles.backBtn} onClick={() => setScreen('home')} aria-label={t('join.back')}>&larr;</button>
          <h1 className={styles.title}>{tournament.name}</h1>
        </header>
        <main>
          {(tournament.date || tournament.place || organizerName) && (
            <Card>
              <div className={styles.detailsList}>
                {tournament.date && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t('join.date')}</span>
                    <span>{new Date(tournament.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
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
            <p>{t('join.completedOn', { date: new Date(completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) })}</p>
          </Card>
        </main>
      </div>
    );
  }

  const confirmedCount = players.filter(p => p.confirmed !== false).length;
  const spotsLeft = capacity - confirmedCount;
  const reserveCount = [...statuses.values()].filter(s => s === 'reserve').length;
  const isConfirmed = myRegistration?.confirmed !== false;

  const handleRegister = async () => {
    const trimmed = name.trim();
    if (!trimmed || registeringRef.current) return;

    // Warn if someone with the same name is already registered
    const duplicate = players.find(p => p.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      if (!window.confirm(t('join.duplicateConfirm', { name: duplicate.name }))) {
        return;
      }
    }

    registeringRef.current = true;
    setRegistering(true);
    try {
      const willBeReserve = confirmedCount >= capacity;
      await registerPlayer(trimmed);
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

  const handleBack = () => {
    setScreen('home');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={handleBack} aria-label={t('join.back')}>&larr;</button>
        <h1 className={styles.title}>{tournament.name}</h1>
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
              <span>{new Date(tournament.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
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
            {isConfirmed && myStatus === 'reserve' ? (
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
                    onClick={() => updatePlayerGroup(uid, myRegistration?.group === 'A' ? null : 'A')}
                  >
                    {tournament.groupLabels?.[0] || 'A'}
                  </button>
                  <button
                    className={myRegistration?.group === 'B' ? styles.groupBtnActive : styles.groupBtn}
                    onClick={() => updatePlayerGroup(uid, myRegistration?.group === 'B' ? null : 'B')}
                  >
                    {tournament.groupLabels?.[1] || 'B'}
                  </button>
                </div>
              </div>
            )}

            {isConfirmed && uid && formatHasClubs(tournament.format) && (tournament.clubs ?? []).length > 0 && (() => {
              const clubs = tournament.clubs!;
              return (
                <div className={styles.clubPicker}>
                  <span className={styles.clubPickerLabel}>{t('join.selectClub')}</span>
                  <div className={styles.clubOptions}>
                    {clubs.map((club, idx) => (
                      <button
                        key={club.id}
                        className={myRegistration?.clubId === club.id ? styles.clubOptionActive : styles.clubOption}
                        style={{ '--club-color': getClubColor(club, idx) } as React.CSSProperties}
                        onClick={() => updatePlayerClub(uid, myRegistration?.clubId === club.id ? null : club.id)}
                      >
                        {club.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
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

      <Card>
        <h3 className={styles.sectionTitle}>
          {t('join.players', { confirmed: confirmedCount, capacity })}
        </h3>
        <p className={styles.capacityHint}>
          {spotsLeft > 0
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
        {players.length === 0 ? (
          <p className={styles.empty}>{t('join.noPlayersYet')}</p>
        ) : (
          <div className={styles.playerList}>
            {players.map((player, i) => {
              const isMixicano = formatHasGroups(tournament.format);
              const isClubAmericano = formatHasClubs(tournament.format);
              const clubs = tournament.clubs ?? [];
              const clubIdx = isClubAmericano && player.clubId
                ? clubs.findIndex(c => c.id === player.clubId)
                : -1;
              return (
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
                    <span className={styles.reserveBadge}>{t('join.reserve')}</span>
                  )}
                  {isMixicano && player.group && (
                    <span className={styles.groupBadge}>
                      {player.group === 'A'
                        ? (tournament.groupLabels?.[0] || 'A')
                        : (tournament.groupLabels?.[1] || 'B')}
                    </span>
                  )}
                  {isClubAmericano && clubIdx >= 0 && (
                    <span
                      className={styles.clubBadge}
                      style={{ backgroundColor: getClubColor(clubs[clubIdx], clubIdx) }}
                    >
                      {clubs[clubIdx].name}
                    </span>
                  )}
                </span>
                <span className={player.confirmed !== false ? styles.statusConfirmed : styles.statusCancelled}>
                  {player.confirmed !== false ? '\u2713' : '\u2717'}
                </span>
              </div>
              );
            })}
          </div>
        )}
      </Card>

      <Button fullWidth onClick={handleLaunch} disabled={players.length === 0}>
        {t('join.letsPlay')}
      </Button>
      <Button variant="secondary" fullWidth onClick={handleCopyExport} disabled={players.length === 0}>
        {t('join.copyForDevice')}
      </Button>
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
