import { useState, useMemo } from 'react';
import { Button, Card, Toast, useToast, useTranslation } from '@padel/common';
import type { EventStandingEntry, EventClubStandingEntry } from '@padel/common';
import { useEvent } from '../hooks/useEvent';
import { useEventTournaments } from '../hooks/useEventTournaments';
import type { EventTournamentInfo } from '../hooks/useEventTournaments';
import { computeEventStandings, computeEventClubStandings } from '../utils/eventStandings';
import styles from './EventScreen.module.css';

interface EventScreenProps {
  eventId: string;
  uid: string | null;
  onBack: () => void;
}

export function EventScreen({ eventId, uid, onBack }: EventScreenProps) {
  const { event, loading, linkTournament, unlinkTournament, updateTournamentWeight, deleteEvent } = useEvent(eventId);
  const { t } = useTranslation();
  const { toastMessage, showToast } = useToast();
  const [linkCode, setLinkCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

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

  const isOwner = uid === event.organizerId;

  const statusClass =
    status === 'active' ? styles.statusActive :
    status === 'completed' ? styles.statusCompleted :
    styles.statusDraft;

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

        {/* Delete event (owner only) */}
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

function StandingsCard({
  standings,
  status,
  t,
}: {
  standings: EventStandingEntry[];
  status: string;
  t: (key: string) => string;
}) {
  return (
    <Card>
      <h2 className={styles.sectionTitle}>
        {status === 'completed' ? t('event.finalStandings') : t('event.liveStandings')}
      </h2>
      {standings.length === 0 ? (
        <p className={styles.empty}>{t('event.noStandings')}</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.rank}>#</th>
                <th>{t('event.col.name')}</th>
                <th className={styles.right}>{t('event.col.pts')}</th>
                <th className={styles.right}>{t('event.col.mp')}</th>
                <th className={styles.right}>{t('event.col.w')}</th>
                <th className={`${styles.right} ${styles.diff}`}>{t('event.col.diff')}</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((entry) => {
                const rankClass =
                  entry.rank === 1 ? styles.rank1 :
                  entry.rank === 2 ? styles.rank2 :
                  entry.rank === 3 ? styles.rank3 : '';
                const diffClass =
                  entry.pointDiff > 0 ? styles.positive :
                  entry.pointDiff < 0 ? styles.negative : '';

                return (
                  <tr key={entry.playerName}>
                    <td className={`${styles.rank} ${rankClass}`}>{entry.rank}</td>
                    <td className={styles.playerName}>{entry.playerName}</td>
                    <td className={`${styles.right} ${styles.points}`}>{entry.totalPoints}</td>
                    <td className={styles.right}>{entry.matchesPlayed}</td>
                    <td className={styles.right}>{entry.matchesWon}</td>
                    <td className={`${styles.right} ${styles.diff} ${diffClass}`}>
                      {entry.pointDiff > 0 ? '+' : ''}{entry.pointDiff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function ClubStandingsCard({
  clubStandings,
  status,
  t,
}: {
  clubStandings: EventClubStandingEntry[];
  status: string;
  t: (key: string) => string;
}) {
  return (
    <Card>
      <h2 className={styles.sectionTitle}>
        {status === 'completed' ? t('event.finalClubStandings') : t('event.liveClubStandings')}
      </h2>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.rank}>#</th>
              <th>{t('event.col.club')}</th>
              <th className={styles.right}>{t('event.col.pts')}</th>
              <th className={styles.right}>{t('event.col.members')}</th>
            </tr>
          </thead>
          <tbody>
            {clubStandings.map((entry) => {
              const rankClass =
                entry.rank === 1 ? styles.rank1 :
                entry.rank === 2 ? styles.rank2 :
                entry.rank === 3 ? styles.rank3 : '';

              return (
                <tr key={entry.clubName}>
                  <td className={`${styles.rank} ${rankClass}`}>{entry.rank}</td>
                  <td className={styles.playerName}>{entry.clubName}</td>
                  <td className={`${styles.right} ${styles.points}`}>{entry.totalPoints}</td>
                  <td className={styles.right}>{entry.memberCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TournamentListCard({
  infos,
  isOwner,
  onUnlink,
  onWeightChange,
  t,
}: {
  infos: EventTournamentInfo[];
  isOwner: boolean;
  onUnlink: (tid: string) => void;
  onWeightChange: (tid: string, weight: number) => void;
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
          {infos.map(ti => (
            <div key={ti.id} className={styles.tournamentItem}>
              <div className={styles.tournamentDetails}>
                <div className={styles.tournamentName}>{ti.name}</div>
                <div className={styles.tournamentMeta}>
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
          ))}
        </div>
      )}
    </Card>
  );
}
