import { useState, useMemo } from 'react';
import { Button, Card, Toast, useToast, useTranslation } from '@padel/common';
import type { LeagueStandingEntry } from '@padel/common';
import { useLeague } from '../hooks/useLeague';
import { useLeagueTournaments } from '../hooks/useLeagueTournaments';
import { computeLeagueStandings } from '../utils/leagueStandings';
import styles from './LeagueScreen.module.css';

interface LeagueScreenProps {
  leagueId: string;
  uid: string | null;
  onBack: () => void;
}

export function LeagueScreen({ leagueId, uid, onBack }: LeagueScreenProps) {
  const { league, loading, updateLeague, linkTournament, unlinkTournament, deleteLeague } = useLeague(leagueId);
  const { t } = useTranslation();
  const { toastMessage, showToast } = useToast();
  const [linkCode, setLinkCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const tournamentIds = useMemo(() => league?.tournamentIds ?? [], [league?.tournamentIds]);
  const { tournaments, tournamentInfos } = useLeagueTournaments(tournamentIds);

  const standings = useMemo(() => {
    if (!league || tournaments.length === 0) return [];
    return computeLeagueStandings(tournaments, league.rankingRules);
  }, [league, tournaments]);

  if (loading || !league) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={onBack} aria-label={t('league.back')}>&larr;</button>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>{loading ? '...' : t('league.notFound')}</h1>
          </div>
        </header>
      </div>
    );
  }

  const isOwner = uid === league.organizerId;

  const statusClass =
    league.status === 'active' ? styles.statusActive :
    league.status === 'completed' ? styles.statusCompleted :
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
      // Look up tournament by code
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
      if (league.tournamentIds.includes(tournamentId)) {
        setLinkError(t('league.alreadyLinked'));
        setLinking(false);
        return;
      }
      await linkTournament(tournamentId);
      setLinkCode('');
      showToast(t('league.tournamentLinked'));
    } catch {
      setLinkError(t('league.linkFailed'));
    }
    setLinking(false);
  };

  const handleUnlink = async (tid: string) => {
    if (window.confirm(t('league.unlinkConfirm'))) {
      await unlinkTournament(tid);
    }
  };

  const handleStatusChange = async (status: 'draft' | 'active' | 'completed') => {
    await updateLeague({ status });
  };

  const handleDelete = async () => {
    if (!uid) return;
    if (window.confirm(t('league.deleteConfirm'))) {
      await deleteLeague(uid);
      onBack();
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label={t('league.back')}>&larr;</button>
        <div className={styles.nameRow}>
          <h1 className={styles.name}>{league.name}</h1>
        </div>
      </header>
      <main>
        {/* Metadata */}
        <div className={styles.meta}>
          <span>{league.date}</span>
          <span className={`${styles.statusBadge} ${statusClass}`}>
            {t(`league.status.${league.status}`)}
          </span>
        </div>

        {/* Status controls (owner only) */}
        {isOwner && (
          <Card>
            <h2 className={styles.sectionTitle}>{t('league.status.title')}</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['draft', 'active', 'completed'] as const).map(s => (
                <Button
                  key={s}
                  size="small"
                  variant={league.status === s ? 'primary' : 'secondary'}
                  onClick={() => handleStatusChange(s)}
                >
                  {t(`league.status.${s}`)}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {/* Linked Tournaments */}
        <Card>
          <h2 className={styles.sectionTitle}>
            {t('league.tournaments', { count: tournamentInfos.length })}
          </h2>
          {tournamentInfos.length === 0 ? (
            <p className={styles.empty}>{t('league.noTournaments')}</p>
          ) : (
            <div className={styles.tournamentList}>
              {tournamentInfos.map(ti => (
                <div key={ti.id} className={styles.tournamentItem}>
                  <div>
                    <div className={styles.tournamentName}>{ti.name}</div>
                    <div className={styles.tournamentStatus}>
                      {ti.hasRunnerData ? t('league.hasResults') : t('league.noResults')}
                    </div>
                  </div>
                  {isOwner && (
                    <button
                      className={styles.unlinkBtn}
                      onClick={() => handleUnlink(ti.id)}
                      aria-label={t('league.unlink')}
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Link tournament by code */}
          {isOwner && (
            <div className={styles.linkSection}>
              <div className={styles.linkRow}>
                <input
                  className={styles.linkInput}
                  type="text"
                  value={linkCode}
                  onChange={e => { setLinkCode(e.target.value.toUpperCase().slice(0, 6)); setLinkError(null); }}
                  placeholder={t('league.linkPlaceholder')}
                  maxLength={6}
                  onKeyDown={e => e.key === 'Enter' && handleLinkByCode()}
                />
                <Button size="small" onClick={handleLinkByCode} disabled={linking || linkCode.length !== 6}>
                  {linking ? '...' : t('league.link')}
                </Button>
              </div>
              {linkError && (
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>{linkError}</div>
              )}
            </div>
          )}
        </Card>

        {/* Aggregated Standings */}
        <Card>
          <h2 className={styles.sectionTitle}>{t('league.standings')}</h2>
          {standings.length === 0 ? (
            <p className={styles.empty}>{t('league.noStandings')}</p>
          ) : (
            <StandingsTable standings={standings} t={t} />
          )}
        </Card>

        {/* Ranking rules info */}
        <Card>
          <h2 className={styles.sectionTitle}>{t('league.rules')}</h2>
          <div className={styles.configGrid}>
            <span className={styles.configLabel}>{t('league.pointsPerWin')}</span>
            {isOwner ? (
              <input
                className={styles.configInput}
                type="number"
                value={league.rankingRules.pointsPerWin}
                onChange={e => updateLeague({
                  rankingRules: { ...league.rankingRules, pointsPerWin: parseInt(e.target.value, 10) || 0 },
                })}
                min={0}
              />
            ) : (
              <span>{league.rankingRules.pointsPerWin}</span>
            )}

            <span className={styles.configLabel}>{t('league.pointsPerDraw')}</span>
            {isOwner ? (
              <input
                className={styles.configInput}
                type="number"
                value={league.rankingRules.pointsPerDraw}
                onChange={e => updateLeague({
                  rankingRules: { ...league.rankingRules, pointsPerDraw: parseInt(e.target.value, 10) || 0 },
                })}
                min={0}
              />
            ) : (
              <span>{league.rankingRules.pointsPerDraw}</span>
            )}

            <span className={styles.configLabel}>{t('league.pointsPerLoss')}</span>
            {isOwner ? (
              <input
                className={styles.configInput}
                type="number"
                value={league.rankingRules.pointsPerLoss}
                onChange={e => updateLeague({
                  rankingRules: { ...league.rankingRules, pointsPerLoss: parseInt(e.target.value, 10) || 0 },
                })}
                min={0}
              />
            ) : (
              <span>{league.rankingRules.pointsPerLoss}</span>
            )}

            <span className={styles.configLabel}>{t('league.tiebreaker')}</span>
            {isOwner ? (
              <select
                className={styles.select}
                value={league.rankingRules.tiebreaker}
                onChange={e => updateLeague({
                  rankingRules: { ...league.rankingRules, tiebreaker: e.target.value as 'pointDifference' | 'headToHead' | 'gamesWon' },
                })}
              >
                <option value="pointDifference">{t('league.tiebreaker.pointDifference')}</option>
                <option value="headToHead">{t('league.tiebreaker.headToHead')}</option>
                <option value="gamesWon">{t('league.tiebreaker.gamesWon')}</option>
              </select>
            ) : (
              <span>{t(`league.tiebreaker.${league.rankingRules.tiebreaker}`)}</span>
            )}
          </div>
        </Card>

        {/* Delete league (owner only) */}
        {isOwner && (
          <button className={styles.deleteBtn} onClick={handleDelete}>
            {t('league.delete')}
          </button>
        )}
      </main>

      <Toast message={toastMessage} className={styles.toast} />
    </div>
  );
}

// Inline standings table component
function StandingsTable({
  standings,
  t,
}: {
  standings: LeagueStandingEntry[];
  t: (key: string) => string;
}) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.rank}>#</th>
            <th>{t('league.col.name')}</th>
            <th className={styles.right}>{t('league.col.pts')}</th>
            <th className={styles.right}>{t('league.col.mp')}</th>
            <th className={styles.right}>{t('league.col.wdl')}</th>
            <th className={`${styles.right} ${styles.diff}`}>{t('league.col.diff')}</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((entry) => {
            const rankClass =
              entry.rank === 1 ? styles.rank1 :
              entry.rank === 2 ? styles.rank2 :
              entry.rank === 3 ? styles.rank3 : '';
            const diffClass =
              entry.pointDifference > 0 ? styles.positive :
              entry.pointDifference < 0 ? styles.negative : '';

            return (
              <tr key={entry.playerName}>
                <td className={`${styles.rank} ${rankClass}`}>{entry.rank}</td>
                <td className={styles.playerName}>{entry.playerName}</td>
                <td className={`${styles.right} ${styles.points}`}>{entry.points}</td>
                <td className={styles.right}>{entry.matchesPlayed}</td>
                <td className={styles.right}>{entry.wins}-{entry.draws}-{entry.losses}</td>
                <td className={`${styles.right} ${styles.diff} ${diffClass}`}>
                  {entry.pointDifference > 0 ? '+' : ''}{entry.pointDifference}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
