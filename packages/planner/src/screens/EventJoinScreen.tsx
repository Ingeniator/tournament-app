import { useMemo } from 'react';
import { Button, Card, getPresetByFormat, useTranslation, type TournamentFormat } from '@padel/common';
import { useEvent } from '../hooks/useEvent';
import { useEventTournaments } from '../hooks/useEventTournaments';
import { computeEventStandings, computeEventClubStandings } from '../utils/eventStandings';
import { StandingsCard, ClubStandingsCard } from '../components/EventStandingsCards';
import styles from './EventJoinScreen.module.css';

interface EventJoinScreenProps {
  eventId: string;
  onJoinTournament: (tournamentId: string) => void;
  onBack: () => void;
}

export function EventJoinScreen({ eventId, onJoinTournament, onBack }: EventJoinScreenProps) {
  const { event, loading } = useEvent(eventId);
  const { t } = useTranslation();

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
      </header>
      <main>
        {/* Metadata */}
        <div className={styles.meta}>
          <span>{event.date}</span>
          <span className={`${styles.statusBadge} ${statusClass}`}>
            {t(`event.status.${status}`)}
          </span>
        </div>

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
                return (
                  <div key={ti.id} className={styles.tournamentItem}>
                    <div className={styles.tournamentDetails}>
                      <div className={styles.tournamentName}>{ti.name}</div>
                      <div className={styles.tournamentMeta}>
                        {formatLabel && <span>{formatLabel}</span>}
                        {ti.date && <span>{ti.date}</span>}
                        {ti.place && <span>{ti.place}</span>}
                        <span>{ti.playerCount}/{ti.capacity} {t('event.players')}</span>
                        {ti.isCompleted ? (
                          <span className={styles.tournamentCompleted}>{t('event.status.completed')}</span>
                        ) : ti.hasStarted ? (
                          <span className={styles.tournamentActive}>{t('event.status.active')}</span>
                        ) : (
                          <span>{t('event.spotsOpen', { count: Math.max(0, ti.capacity - ti.playerCount) })}</span>
                        )}
                      </div>
                    </div>
                    {!ti.isCompleted && !ti.hasStarted && (
                      <Button size="small" onClick={() => onJoinTournament(ti.id)}>
                        {t('eventJoin.join')}
                      </Button>
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
