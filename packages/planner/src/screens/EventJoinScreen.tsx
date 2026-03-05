import { useMemo, useState } from 'react';
import { Button, Card, getPresetByFormat, useTranslation, type TournamentFormat } from '@padel/common';
import { useEvent } from '../hooks/useEvent';
import { useEventTournaments } from '../hooks/useEventTournaments';
import { computeEventStandings, computeEventClubStandings } from '../utils/eventStandings';
import { computeBreakdown } from '../utils/tournamentBreakdown';
import { TournamentBreakdownView } from '../components/TournamentBreakdown';
import { StandingsCard, ClubStandingsCard } from '../components/EventStandingsCards';
import styles from './EventJoinScreen.module.css';

interface EventJoinScreenProps {
  eventId: string;
  uid: string | null;
  onJoinTournament: (tournamentId: string) => void;
  onBack: () => void;
  onEdit: () => void;
}

export function EventJoinScreen({ eventId, uid, onJoinTournament, onBack, onEdit }: EventJoinScreenProps) {
  const { event, loading } = useEvent(eventId);
  const { t, locale } = useTranslation();

  const tournamentLinks = useMemo(() => event?.tournaments ?? [], [event?.tournaments]);
  const { tournamentData, tournamentInfos, status } = useEventTournaments(tournamentLinks);

  const standings = useMemo(() => {
    if (!event || tournamentData.size === 0) return [];
    return computeEventStandings(event.tournaments, tournamentData);
  }, [event, tournamentData]);

  const clubStandings = useMemo(() => {
    if (!event || tournamentData.size === 0) return [];
    return computeEventClubStandings(event.tournaments, tournamentData);
  }, [event, tournamentData]);

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

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2000); };

  const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME as string | undefined;
  const isTelegram = !!window.Telegram?.WebApp?.initData;
  const eventShareUrl = event.code
    ? (isTelegram && botName
      ? `https://t.me/${botName}?startapp=event_${event.code}`
      : `${window.location.origin}/plan?event=${event.code}&lang=${locale}`)
    : null;

  const handleCopyLink = async () => {
    if (!eventShareUrl) return;
    try {
      await navigator.clipboard.writeText(eventShareUrl);
      showToast(t('event.linkCopied'));
    } catch { /* silent */ }
  };

  const handleCopyCode = async () => {
    if (!event.code) return;
    try {
      await navigator.clipboard.writeText(event.code);
      showToast(t('event.codeCopied'));
    } catch { /* silent */ }
  };

  const statusClass =
    status === 'active' ? styles.statusActive :
    status === 'completed' ? styles.statusCompleted :
    styles.statusDraft;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label={t('event.back')}>&larr;</button>
        <div className={styles.nameRow}>
          <h1 className={styles.name}>{event.name}</h1>
        </div>
        {event.organizerId === uid && (
          <button className={styles.editEventBtn} onClick={onEdit}>
            {t('eventJoin.edit')}
          </button>
        )}
      </header>
      <main>
        {/* Metadata */}
        <div className={styles.meta}>
          <span>{event.date}</span>
          <span className={`${styles.statusBadge} ${statusClass}`}>
            {t(`event.status.${status}`)}
          </span>
        </div>

        {/* Description */}
        {event.description && (
          <p className={styles.description}>{event.description}</p>
        )}

        {/* Share block */}
        {event.code && (status === 'active' || status === 'draft') && (
          <Card>
            <h2 className={styles.sectionTitle}>{t('event.shareWithPlayers')}</h2>
            <div className={styles.codeDisplay}>
              <span className={styles.code} onClick={handleCopyCode}>{event.code}</span>
            </div>
            <p className={styles.shareHint}>{t('event.shareHint')}</p>
            <Button variant="secondary" fullWidth onClick={handleCopyLink}>
              {t('event.copyLink')}
            </Button>
          </Card>
        )}

        {toast && <div className={styles.toast}>{toast}</div>}

        {/* Tournament list with join buttons */}
        <Card>
          <h2 className={styles.sectionTitle}>
            {t('event.tournaments', { count: tournamentInfos.length })}
          </h2>
          {tournamentInfos.length === 0 ? (
            <p className={styles.empty}>{t('event.noTournaments')}</p>
          ) : (
            <div className={styles.tournamentList}>
              {tournamentInfos.map(ti => {
                const preset = ti.format ? getPresetByFormat(ti.format as TournamentFormat) : null;
                const formatLabel = preset ? t(preset.nameKey) : null;
                const isDraft = !ti.isCompleted && !ti.hasStarted;
                const breakdown = isDraft ? computeBreakdown(ti.raw, ti.capacity) : null;
                return (
                  <div key={ti.id} className={styles.tournamentItem}>
                    <div className={styles.tournamentName}>
                      <button className={styles.tournamentLink} onClick={() => onJoinTournament(ti.id)}>{ti.name}</button>
                    </div>
                    <div className={styles.tournamentMeta}>
                      {formatLabel && <span>{formatLabel}</span>}
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
                    {breakdown && (
                      <TournamentBreakdownView
                        breakdown={breakdown}
                        approvedCount={ti.approvedCount}
                        action={
                          <Button size="small" onClick={() => onJoinTournament(ti.id)}>
                            {t('eventJoin.join')}
                          </Button>
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Combined standings */}
        {(status === 'active' || status === 'completed') && (
          <>
            {clubStandings.length > 0 && (
              <ClubStandingsCard clubStandings={clubStandings} status={status} t={t} />
            )}
            {standings.length > 0 && (
              <StandingsCard standings={standings} status={status} t={t} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
