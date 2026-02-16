import { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Card, Toast, useToast, useTranslation } from '@padel/common';
import { usePlanner } from '../state/PlannerContext';
import { getPlayerStatuses } from '../utils/playerStatus';
import { downloadICS } from '../utils/icsExport';
import { launchInRunner, exportRunnerJson } from '../utils/exportToRunner';
import styles from './JoinScreen.module.css';

export function JoinScreen() {
  const { tournament, players, uid, registerPlayer, updateConfirmed, updatePlayerName, isRegistered, setScreen, organizerName, userName, telegramUser } = usePlanner();
  const { t } = useTranslation();
  const [name, setName] = useState(userName ?? telegramUser?.displayName ?? '');
  const [registering, setRegistering] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [showCalendarPrompt, setShowCalendarPrompt] = useState(false);
  const { toastMessage, showToast } = useToast();
  const registeringRef = useRef(false);

  // Pre-fill name from profile or Telegram when it loads
  useEffect(() => {
    if (!name) {
      const prefill = userName ?? telegramUser?.displayName;
      if (prefill) queueMicrotask(() => setName(prefill));
    }
  }, [userName, telegramUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const capacity = tournament ? tournament.courts.length * 4 + (tournament.extraSpots ?? 0) : 0;
  const statuses = useMemo(() => getPlayerStatuses(players, capacity), [players, capacity]);
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

  if (!tournament) return null;

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
    setName('');
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
    launchInRunner(tournament!, players);
  };

  const handleCopyExport = async () => {
    const json = exportRunnerJson(tournament!, players);
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

      {(tournament.date || tournament.place || organizerName || tournament.chatLink || tournament.description) && (
        <Card>
          <div className={styles.detailsList}>
            {tournament.date && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{t('join.date')}</span>
                <span>{new Date(tournament.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
            {tournament.duration && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Duration</span>
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
      )}

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
          </div>
        ) : (
          <div className={styles.registerForm}>
            <h3 className={styles.formTitle}>{t('join.joinAs')}</h3>
            <input
              className={styles.nameInput}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
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
                    <span className={styles.reserveBadge}>{t('join.reserve')}</span>
                  )}
                </span>
                <span className={player.confirmed !== false ? styles.statusConfirmed : styles.statusCancelled}>
                  {player.confirmed !== false ? '\u2713' : '\u2717'}
                </span>
              </div>
            ))}
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
    </div>
  );
}
