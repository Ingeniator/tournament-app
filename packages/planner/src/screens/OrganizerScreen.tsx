import { useState, useMemo, type ReactNode } from 'react';
import { ref, push, set } from 'firebase/database';
import { Button, Card, CLUB_COLORS, getClubColor, Modal, FeedbackModal, AppFooter, Toast, useToast, useTranslation, FormatPicker, getPresetByFormat, formatHasGroups, formatHasClubs } from '@padel/common';
import type { Court, Club } from '@padel/common';
import { generateId } from '@padel/common';
import { usePlanner } from '../state/PlannerContext';
import { auth, db } from '../firebase';
import { exportRunnerTournamentJSON } from '../utils/exportToRunner';
import { restoreFromBackup } from '../utils/restoreFromBackup';
import { useStartGuard } from '../hooks/useStartGuard';
import { StartWarningModal } from '../components/StartWarningModal';
import { PlayerList } from '../components/organizer/PlayerList';
import { EditableItem } from '../components/organizer/EditableItem';
import { getPlayerStatuses } from '../utils/playerStatus';
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

export function OrganizerScreen() {
  const { tournament, players, removePlayer, updateTournament, setScreen, userName, addPlayer, bulkAddPlayers, toggleConfirmed, updatePlayerTelegram, updatePlayerGroup, updatePlayerClub, updatePlayerRank, deleteTournament, completedAt, undoComplete, uid } = usePlanner();
  const { startedBy, showWarning, warningReason, handleLaunch: handleGuardedLaunch, proceedAnyway, dismissWarning } = useStartGuard(tournament?.id ?? null, uid, userName);
  const { t, locale } = useTranslation();
  const { toastMessage, showToast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const capacity = tournament ? tournament.courts.length * 4 + (tournament.extraSpots ?? 0) : 0;
  const statuses = useMemo(() => getPlayerStatuses(players, capacity, {
    format: tournament?.format,
    clubs: tournament?.clubs,
  }), [players, capacity, tournament?.format, tournament?.clubs]);

  const [showReopenModal, setShowReopenModal] = useState(false);

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
            <p>{t('organizer.completedOn', { date: new Date(completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) })}</p>
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
    handleGuardedLaunch(tournament!, players);
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
  const hasFormatCourts = tournament.courts.length > 1 || (tournament.extraSpots ?? 0) > 0;
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

  const formatPreset = getPresetByFormat(tournament.format);
  const formatLabel = formatPreset ? t(formatPreset.nameKey) : t('organizer.formatMexicano');
  const formatCourtsSummary = `${formatLabel} \u00b7 ${t('organizer.courts', { count: tournament.courts.length })}`;

  const detailsParts: string[] = [];
  if (tournament.chatLink) detailsParts.push(t('organizer.groupChat'));
  if (tournament.description) {
    const desc = tournament.description.length > 30
      ? tournament.description.slice(0, 30) + '...'
      : tournament.description;
    detailsParts.push(desc);
  }
  const detailsSummary = detailsParts.join(' \u00b7 ');

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

      {/* Settings groups — at the top */}
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

      <CollapsibleSection
        title={t('organizer.formatAndCourts')}
        summary={formatCourtsSummary}
        defaultOpen={!hasFormatCourts}
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
                  const freeColor = CLUB_COLORS.find(c => !usedColors.has(c)) ?? CLUB_COLORS[clubs.length % CLUB_COLORS.length];
                  const newClubs: Club[] = [...clubs, { id: generateId(), name: `Club ${clubs.length + 1}`, color: freeColor }];
                  updateTournament({ clubs: newClubs });
                }}>{t('organizer.addClub')}</Button>
              </div>
              {clubs.map((club, idx) => {
                const usedByOthers = new Set(
                  clubs.map((c, i) => i !== idx ? getClubColor(c, i) : null).filter(Boolean)
                );
                const available = CLUB_COLORS.filter(c => !usedByOthers.has(c));
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
                      className={styles.clubDot}
                      style={{ backgroundColor: getClubColor(club, idx) }}
                      onClick={() => {
                        const currentColor = getClubColor(club, idx);
                        const pool = available.length > 0 ? available : CLUB_COLORS;
                        const currentPoolIdx = pool.indexOf(currentColor);
                        const nextColor = currentPoolIdx >= 0
                          ? pool[(currentPoolIdx + 1) % pool.length]
                          : pool[0];
                        const updated = clubs.map(c =>
                          c.id === club.id ? { ...c, color: nextColor } : c
                        );
                        updateTournament({ clubs: updated });
                      }}
                    />
                  }
                />
                );
              })}
              {clubs.length === 0 && (
                <p className={styles.empty}>{t('organizer.noClub')}</p>
              )}
              {tournament.format === 'club-ranked' && clubs.length >= 2 && (() => {
                const slotsPerClub = Math.floor(capacity / clubs.length);
                return slotsPerClub > 0 ? (
                  <div className={styles.rankLabelsSection}>
                    <span className={styles.rankLabelsTitle}>{t('organizer.rankLabels')}</span>
                    <div className={styles.rankLabelsColumn}>
                      {Array.from({ length: slotsPerClub }, (_, i) => (
                        <input
                          key={i}
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
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          );
        })()}

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
          />
        </div>
      </CollapsibleSection>

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
      <PlayerList
        players={players}
        capacity={capacity}
        addPlayer={addPlayer}
        bulkAddPlayers={bulkAddPlayers}
        removePlayer={removePlayer}
        toggleConfirmed={toggleConfirmed}
        updatePlayerTelegram={updatePlayerTelegram}
        statuses={statuses}
        format={tournament.format}
        clubs={tournament.clubs}
        groupLabels={tournament.groupLabels}
        rankLabels={tournament.rankLabels}
        onSetGroup={updatePlayerGroup}
        onSetClub={updatePlayerClub}
        onSetRank={updatePlayerRank}
      />

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
