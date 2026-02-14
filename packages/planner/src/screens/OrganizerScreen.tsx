import { useState, useMemo, useRef, type ClipboardEvent } from 'react';
import { ref, push, set } from 'firebase/database';
import { Button, Card, FeedbackModal, Toast, useToast, useTranslation } from '@padel/common';
import type { TournamentFormat, Court } from '@padel/common';
import { generateId, parsePlayerList } from '@padel/common';
import { usePlanner } from '../state/PlannerContext';
import { db } from '../firebase';
import { launchInRunner, buildRunnerTournament } from '../utils/exportToRunner';
import { getPlayerStatuses } from '../utils/playerStatus';
import styles from './OrganizerScreen.module.css';

export function OrganizerScreen() {
  const { tournament, players, removePlayer, updateTournament, setScreen, userName, addPlayer, bulkAddPlayers, toggleConfirmed, deleteTournament } = usePlanner();
  const { t } = useTranslation();
  const { toastMessage, showToast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const addingPlayer = useRef(false);
  const [showFormatInfo, setShowFormatInfo] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const capacity = tournament ? tournament.courts.length * 4 + (tournament.extraSpots ?? 0) : 0;
  const statuses = useMemo(() => getPlayerStatuses(players, capacity), [players, capacity]);

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

  if (!tournament) return null;

  const confirmedCount = players.filter(p => p.confirmed !== false).length;
  const reserveCount = [...statuses.values()].filter(s => s === 'reserve').length;

  const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME as string | undefined;
  const isTelegram = !!window.Telegram?.WebApp?.initData;
  const shareUrl = isTelegram && botName
    ? `https://t.me/${botName}?startapp=${tournament.code}`
    : `${window.location.origin}/plan?code=${tournament.code}`;

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
    launchInRunner(tournament, players);
  };

  const handleCopyExport = async () => {
    const json = JSON.stringify(buildRunnerTournament(tournament, players), null, 2);
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

  const handleFormatChange = (format: TournamentFormat) => {
    updateTournament({ format });
  };

  const handleAddCourt = async () => {
    const courts: Court[] = [...tournament.courts, { id: generateId(), name: `Court ${tournament.courts.length + 1}` }];
    await updateTournament({ courts });
  };

  const handleRemoveCourt = async (courtId: string) => {
    if (tournament.courts.length <= 1) return;
    const courts = tournament.courts.filter(c => c.id !== courtId);
    await updateTournament({ courts });
  };

  const handleBack = () => {
    setScreen('home');
  };

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

      {/* Share section */}
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

      {/* Player list */}
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
            className={styles.addPlayerInput}
            type="text"
            value={newPlayerName}
            onChange={e => setNewPlayerName(e.target.value)}
            placeholder={t('organizer.playerNamePlaceholder')}
            onKeyDown={async e => {
              if (e.key === 'Enter' && newPlayerName.trim() && !addingPlayer.current) {
                addingPlayer.current = true;
                const name = newPlayerName.trim();
                setNewPlayerName('');
                await addPlayer(name);
                addingPlayer.current = false;
              }
            }}
            onPaste={(e: ClipboardEvent<HTMLInputElement>) => {
              const text = e.clipboardData.getData('text');
              if (!text.includes('\n')) return;
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
            onClick={async () => {
              if (newPlayerName.trim() && !addingPlayer.current) {
                addingPlayer.current = true;
                const name = newPlayerName.trim();
                setNewPlayerName('');
                await addPlayer(name);
                addingPlayer.current = false;
              }
            }}
            disabled={!newPlayerName.trim()}
          >
            {t('organizer.addPlayer')}
          </Button>
        </div>
      </Card>

      {/* Config section */}
      <Card>
        <h2 className={styles.sectionTitle}>{t('organizer.settings')}</h2>
        <div className={styles.configGrid}>
          <label className={styles.configLabel}>{t('organizer.dateTime')}</label>
          <input
            className={styles.configInput}
            type="datetime-local"
            value={tournament.date ?? ''}
            onChange={e => updateTournament({ date: e.target.value || undefined })}
          />

          <label className={styles.configLabel}>{t('organizer.place')}</label>
          <input
            className={styles.configInput}
            type="text"
            value={tournament.place ?? ''}
            onChange={e => updateTournament({ place: e.target.value || undefined })}
            placeholder={t('organizer.placePlaceholder')}
          />

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
          />

          <label className={styles.configLabel}>
            {t('organizer.format')}
            <button
              className={styles.infoBtn}
              onClick={() => setShowFormatInfo(v => !v)}
              type="button"
              aria-label={t('organizer.formatInfo')}
            >
              i
            </button>
          </label>
          <select
            className={styles.select}
            value={tournament.format}
            onChange={e => handleFormatChange(e.target.value as TournamentFormat)}
          >
            <option value="americano">{t('organizer.formatAmericano')}</option>
            <option value="team-americano">{t('organizer.formatTeamAmericano')}</option>
            <option value="mexicano">{t('organizer.formatMexicano')}</option>
          </select>
          {showFormatInfo && (
            <div className={styles.formatInfo}>
              <p><strong>{t('organizer.americanoDesc')}</strong></p>
              <p><strong>{t('organizer.teamAmericanoDesc')}</strong></p>
              <p><strong>{t('organizer.mexicanoDesc')}</strong></p>
            </div>
          )}

          <label className={styles.configLabel}>{t('organizer.duration')}</label>
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
        </div>

        <div className={styles.courtsSection}>
          <div className={styles.courtsHeader}>
            <span>{t('organizer.courts', { count: tournament.courts.length })}</span>
            <Button variant="ghost" size="small" onClick={handleAddCourt}>{t('organizer.addCourt')}</Button>
          </div>
          {tournament.courts.map(court => (
            <div key={court.id} className={styles.courtItem}>
              <input
                className={styles.courtNameInput}
                value={court.name}
                onChange={e => {
                  const courts = tournament.courts.map(c =>
                    c.id === court.id ? { ...c, name: e.target.value } : c
                  );
                  updateTournament({ courts });
                }}
              />
              {tournament.courts.length > 1 && (
                <button
                  className={styles.removeBtn}
                  onClick={() => handleRemoveCourt(court.id)}
                >
                  &times;
                </button>
              )}
            </div>
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
      </Card>

      {/* Export */}
      {confirmedCount > 0 && confirmedCount < capacity && (() => {
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
      <Button fullWidth onClick={handleLaunch} disabled={players.length === 0}>
        {t('organizer.letsPlay')}
      </Button>
      <Button variant="secondary" fullWidth onClick={handleCopyExport} disabled={players.length === 0}>
        {t('organizer.copyForDevice')}
      </Button>

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

      <footer className={styles.supportNudge}>
        {t('organizer.freeOpenSource')} &middot;{' '}
        <button className={styles.supportLink} onClick={() => setScreen('supporters')}>
          {t('organizer.supportUs')}
        </button>
        {' '}&middot;{' '}
        <button className={styles.supportLink} onClick={() => setFeedbackOpen(true)}>
          {t('organizer.sendFeedback')}
        </button>
      </footer>

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
    </div>
  );
}
