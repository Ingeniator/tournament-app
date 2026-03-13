import { useState, useMemo, useEffect, useRef } from 'react';
import { Button, Card, Toast, useToast, useTranslation } from '@padel/common';
import { useEvent } from '../hooks/useEvent';
import { useEventTournaments } from '../hooks/useEventTournaments';
import type { EventTournamentInfo } from '../hooks/useEventTournaments';
import { usePlanner } from '../state/PlannerContext';
import { computeEventStandings, computeEventClubStandings } from '../utils/eventStandings';
import { exportPlannerEvent } from '../utils/plannerExport';
import { computeBreakdown } from '../utils/tournamentBreakdown';
import { TournamentBreakdownView } from '../components/TournamentBreakdown';
import { StandingsCard, ClubStandingsCard } from '../components/EventStandingsCards';
import styles from './EventScreen.module.css';

interface EventScreenProps {
  eventId: string;
  uid: string | null;
  onBack: () => void;
  onOpenTournament: (tournamentId: string) => void;
}

export function EventScreen({ eventId, uid, onBack, onOpenTournament }: EventScreenProps) {
  const { event, loading, updateEvent, linkTournament, unlinkTournament, updateTournamentWeight, deleteEvent } = useEvent(eventId);
  const { t, locale } = useTranslation();
  const { toastMessage, showToast } = useToast();
  const { myTournaments } = usePlanner();
  const [linkCode, setLinkCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const tournamentLinks = useMemo(() => event?.tournaments ?? [], [event?.tournaments]);
  const { tournamentData, tournamentInfos, status } = useEventTournaments(tournamentLinks);

  const linkedIds = useMemo(() => new Set(tournamentLinks.map(tl => tl.tournamentId)), [tournamentLinks]);
  const availableOwnTournaments = useMemo(
    () => myTournaments.filter(mt => !linkedIds.has(mt.id)),
    [myTournaments, linkedIds],
  );

  const standings = useMemo(() => {
    if (!event || tournamentData.size === 0) return [];
    return computeEventStandings(event.tournaments, tournamentData);
  }, [event, tournamentData]);

  const clubStandings = useMemo(() => {
    if (!event || tournamentData.size === 0) return [];
    return computeEventClubStandings(event.tournaments, tournamentData);
  }, [event, tournamentData]);

  // Export hooks — must be before early returns to satisfy rules of hooks
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [exportOpen]);

  if (loading || !event) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={onBack} aria-label={t('event.back')}>&larr;</button>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>{loading ? '...' : t('event.notFound')}</h1>
          </div>
        </header>
      </div>
    );
  }

  const isOwner = uid === event.organizerId;

  const statusClass =
    status === 'active' ? styles.statusActive :
    status === 'completed' ? styles.statusCompleted :
    styles.statusDraft;

  const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME as string | undefined;
  const isTelegram = !!window.Telegram?.WebApp?.initData;
  const eventShareUrl = isTelegram && botName
    ? `https://t.me/${botName}?startapp=event_${event.code}`
    : `${window.location.origin}/plan?event=${event.code}&lang=${locale}`;

  const handleCopyEventLink = async () => {
    if (!event.code) return;
    const url = eventShareUrl;
    try {
      await navigator.clipboard.writeText(url);
      showToast(t('event.linkCopied'));
    } catch {
      showToast(t('organizer.failedCopy'));
    }
  };

  const handleCopyEventCode = async () => {
    if (!event.code) return;
    try {
      await navigator.clipboard.writeText(event.code);
      showToast(t('event.codeCopied'));
    } catch {
      showToast(t('organizer.failedCopy'));
    }
  };

  const handleLinkOwn = async (tournamentId: string) => {
    setLinking(true);
    try {
      await linkTournament(tournamentId);
      showToast(t('event.tournamentLinked'));
    } catch {
      showToast(t('event.linkFailed'));
    }
    setLinking(false);
  };

  const handleLinkByCode = async () => {
    const code = linkCode.trim().toUpperCase();
    if (code.length !== 6) {
      setLinkError(t('home.codeMustBe6'));
      return;
    }
    setLinking(true);
    setLinkError(null);
    try {
      const { ref, get } = await import('firebase/database');
      const { db } = await import('../firebase');
      if (!db) throw new Error('Firebase not configured');
      const codeSnap = await get(ref(db, `codes/${code}`));
      if (!codeSnap.exists()) {
        setLinkError(t('home.tournamentNotFound'));
        setLinking(false);
        return;
      }
      const tournamentId = codeSnap.val() as string;
      if (event.tournaments.some(t => t.tournamentId === tournamentId)) {
        setLinkError(t('event.alreadyLinked'));
        setLinking(false);
        return;
      }
      await linkTournament(tournamentId);
      setLinkCode('');
      showToast(t('event.tournamentLinked'));
    } catch {
      setLinkError(t('event.linkFailed'));
    }
    setLinking(false);
  };

  const handleUnlink = async (tid: string) => {
    if (window.confirm(t('event.unlinkConfirm'))) {
      await unlinkTournament(tid);
    }
  };

  const handleDelete = async () => {
    if (!uid) return;
    if (window.confirm(t('event.deleteConfirm'))) {
      await deleteEvent(uid);
      onBack();
    }
  };

  const handleExportCopy = async () => {
    try {
      const text = await exportPlannerEvent(event);
      await navigator.clipboard.writeText(text);
      showToast(t('event.exportCopied'));
    } catch {
      showToast(t('organizer.failedCopy'));
    }
  };

  const handleExportFile = async () => {
    try {
      const text = await exportPlannerEvent(event);
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast(t('organizer.failedCopy'));
    }
  };


  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label={t('event.back')}>&larr;</button>
        <div className={styles.nameRow}>
          <h1 className={styles.name}>{event.name}</h1>
        </div>
      </header>
      <main>
        {/* Metadata */}
        <div className={styles.meta}>
          <span>{event.date}</span>
          <span className={`${styles.statusBadge} ${statusClass}`}>
            {t(`event.status.${status}`)}
          </span>
        </div>

        {/* Description (owner only) */}
        {isOwner && (
          <Card>
            <label className={styles.configLabel}>{t('event.description')}</label>
            <textarea
              className={styles.configTextarea}
              value={event.description ?? ''}
              onChange={e => updateEvent({ description: e.target.value || undefined })}
              placeholder={t('event.descriptionPlaceholder')}
              rows={3}
              maxLength={2000}
            />
          </Card>
        )}

        {/* FOCUS SWITCHING based on computed status */}
        {status === 'active' || status === 'completed' ? (
          <>
            {/* Active/Completed: Standings first */}
            {clubStandings.length > 0 && (
              <ClubStandingsCard clubStandings={clubStandings} status={status} t={t} />
            )}
            <StandingsCard standings={standings} status={status} t={t} />
            <TournamentListCard
              infos={tournamentInfos}
              isOwner={isOwner}
              onUnlink={handleUnlink}
              onWeightChange={updateTournamentWeight}
              onOpen={isOwner ? onOpenTournament : undefined}
              t={t}
            />
          </>
        ) : (
          <>
            {/* Draft: Tournament list first (player drafting focus) */}
            <TournamentListCard
              infos={tournamentInfos}
              isOwner={isOwner}
              onUnlink={handleUnlink}
              onWeightChange={updateTournamentWeight}
              onOpen={isOwner ? onOpenTournament : undefined}
              t={t}
            />
            {standings.length > 0 && (
              <>
                {clubStandings.length > 0 && (
                  <ClubStandingsCard clubStandings={clubStandings} status={status} t={t} />
                )}
                <StandingsCard standings={standings} status={status} t={t} />
              </>
            )}
          </>
        )}

        {/* Link tournament by code (owner only) */}
        {isOwner && (
          <Card>
            <h2 className={styles.sectionTitle}>{t('event.addTournament')}</h2>

            {/* Own tournaments quick-pick */}
            {availableOwnTournaments.length > 0 && (
              <div className={styles.ownTournaments}>
                <label className={styles.ownLabel}>{t('event.myTournaments')}</label>
                {availableOwnTournaments.map(mt => (
                  <button
                    key={mt.id}
                    className={styles.ownItem}
                    onClick={() => handleLinkOwn(mt.id)}
                    disabled={linking}
                  >
                    <span className={styles.ownName}>{mt.name}</span>
                    {mt.date && <span className={styles.ownDate}>{mt.date}</span>}
                    <span className={styles.ownAdd}>+</span>
                  </button>
                ))}
              </div>
            )}

            {/* Link by code (for other organizers' tournaments) */}
            <label className={styles.ownLabel}>{t('event.linkByCode')}</label>
            <div className={styles.linkRow}>
              <input
                className={styles.linkInput}
                type="text"
                value={linkCode}
                onChange={e => { setLinkCode(e.target.value.toUpperCase().slice(0, 6)); setLinkError(null); }}
                placeholder={t('event.linkPlaceholder')}
                maxLength={6}
                onKeyDown={e => e.key === 'Enter' && handleLinkByCode()}
              />
              <Button size="small" onClick={handleLinkByCode} disabled={linking || linkCode.length !== 6}>
                {linking ? '...' : t('event.link')}
              </Button>
            </div>
            {linkError && (
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-danger)', marginTop: '8px' }}>{linkError}</div>
            )}
          </Card>
        )}

        {/* Share card (owner only) */}
        {isOwner && event.code && (
          <Card>
            <h2 className={styles.sectionTitle}>{t('event.shareWithPlayers')}</h2>
            <div className={styles.codeDisplay}>
              <span className={styles.code} onClick={handleCopyEventCode}>{event.code}</span>
            </div>
            <p className={styles.shareHint}>{t('event.shareHint')}</p>
            <Button variant="secondary" fullWidth onClick={handleCopyEventLink}>
              {t('event.copyLink')}
            </Button>
          </Card>
        )}

        {/* Export / Import / Delete (owner only) */}
        {isOwner && (
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <div className={styles.dropdown} ref={exportRef}>
              <Button variant="ghost" fullWidth onClick={() => setExportOpen(v => !v)}>
                {t('event.export')} <span className={styles.dropdownArrow}>{exportOpen ? '\u25B2' : '\u25BC'}</span>
              </Button>
              {exportOpen && (
                <div className={styles.dropdownMenu}>
                  <button className={styles.dropdownItem} onClick={() => { setExportOpen(false); handleExportCopy(); }}>
                    {t('organizer.copyData')}
                  </button>
                  <button className={styles.dropdownItem} onClick={() => { setExportOpen(false); handleExportFile(); }}>
                    {t('organizer.exportFile')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {isOwner && (
          <button className={styles.deleteBtn} onClick={handleDelete}>
            {t('event.delete')}
          </button>
        )}
      </main>

      <Toast message={toastMessage} className={styles.toast} />
    </div>
  );
}

/* --- Sub-components --- */

function TournamentListCard({
  infos,
  isOwner,
  onUnlink,
  onWeightChange,
  onOpen,
  t,
}: {
  infos: EventTournamentInfo[];
  isOwner: boolean;
  onUnlink: (tid: string) => void;
  onWeightChange: (tid: string, weight: number) => void;
  onOpen?: (tid: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <Card>
      <h2 className={styles.sectionTitle}>
        {t('event.tournaments', { count: infos.length })}
      </h2>
      {infos.length === 0 ? (
        <p className={styles.empty}>{t('event.noTournaments')}</p>
      ) : (
        <div className={styles.tournamentList}>
          {infos.map(ti => {
            const isDraft = !ti.isCompleted && !ti.hasStarted;
            return (
              <div key={ti.id} className={styles.tournamentItem}>
                <div className={styles.tournamentTopRow}>
                  <div className={styles.tournamentDetails}>
                    <div className={styles.tournamentName}>
                      {onOpen ? (
                        <button className={styles.tournamentLink} onClick={() => onOpen(ti.id)}>{ti.name}</button>
                      ) : ti.name}
                    </div>
                    <div className={styles.tournamentMeta}>
                      {ti.date && <span>{ti.date}</span>}
                      {ti.place && <span>{ti.place}</span>}
                      {ti.raw.captainMode && <span>{t('breakdown.captainMode')}</span>}
                      {ti.raw.maldiciones && <span>{t('breakdown.maldiciones')}</span>}
                      {ti.registeredCount > 0 && <span>{t('event.registered', { count: ti.registeredCount })}</span>}
                    </div>
                    {ti.isCompleted ? (
                      <div className={styles.tournamentMeta}>
                        <span>{ti.playerCount}/{ti.capacity} {t('event.players')}</span>
                        <span className={styles.tournamentCompleted}>{t('event.status.completed')}</span>
                      </div>
                    ) : ti.hasStarted ? (
                      <div className={styles.tournamentMeta}>
                        <span>{ti.playerCount}/{ti.capacity} {t('event.players')}</span>
                        <span className={styles.tournamentActive}>{t('event.status.active')}</span>
                      </div>
                    ) : null}
                    {isOwner && (
                      <div className={styles.weightRow}>
                        <span className={styles.weightLabel}>{t('event.weight')}:</span>
                        <input
                          className={styles.weightInput}
                          type="number"
                          value={ti.weight}
                          onChange={e => onWeightChange(ti.id, parseFloat(e.target.value) || 1)}
                          min={0.1}
                          step={0.1}
                        />
                      </div>
                    )}
                  </div>
                  {isOwner && (
                    <button
                      className={styles.unlinkBtn}
                      onClick={() => onUnlink(ti.id)}
                      aria-label={t('event.unlink')}
                    >
                      &times;
                    </button>
                  )}
                </div>
                {isDraft && (
                  <TournamentBreakdownView breakdown={computeBreakdown(ti.raw, ti.capacity)} approvedCount={ti.approvedCount} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
