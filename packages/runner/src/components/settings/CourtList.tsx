import { useState, type Dispatch } from 'react';
import type { Tournament } from '@padel/common';
import { Button, Card, useTranslation } from '@padel/common';
import type { TournamentAction } from '../../state/actions';
import styles from '../../screens/SettingsScreen.module.css';

interface CourtListProps {
  tournament: Tournament;
  dispatch: Dispatch<TournamentAction>;
}

export function CourtList({ tournament, dispatch }: CourtListProps) {
  const { t } = useTranslation();
  const [editingCourtId, setEditingCourtId] = useState<string | null>(null);
  const [editCourtName, setEditCourtName] = useState('');
  const [replacingCourtId, setReplacingCourtId] = useState<string | null>(null);
  const [replaceCourtName, setReplaceCourtName] = useState('');

  const handleCourtSave = (courtId: string) => {
    const trimmed = editCourtName.trim();
    if (trimmed && trimmed !== tournament.config.courts.find(c => c.id === courtId)?.name) {
      dispatch({ type: 'UPDATE_COURT', payload: { courtId, name: trimmed } });
    }
    setEditingCourtId(null);
  };

  const handleReplaceCourt = (oldCourtId: string) => {
    const trimmed = replaceCourtName.trim();
    if (!trimmed) return;
    dispatch({ type: 'REPLACE_COURT', payload: { oldCourtId, newCourtName: trimmed } });
    setReplacingCourtId(null);
    setReplaceCourtName('');
  };

  return (
    <Card>
      <h3 className={styles.sectionTitle}>{t('settings.courts')}</h3>
      <div className={styles.courtList}>
        {tournament.config.courts.map(court => {
          const isEditingCourt = editingCourtId === court.id;
          const isReplacingCourt = replacingCourtId === court.id;

          return (
            <div key={court.id} className={styles.playerItem}>
              {isEditingCourt ? (
                <div className={styles.playerEditPanel}>
                  <input
                    className={styles.editInput}
                    type="text"
                    value={editCourtName}
                    onChange={e => setEditCourtName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleCourtSave(court.id);
                      if (e.key === 'Escape') setEditingCourtId(null);
                    }}
                    onBlur={() => handleCourtSave(court.id)}
                    autoFocus
                  />
                  {tournament.phase === 'in-progress' && (
                    <>
                      <button
                        className={`${styles.availabilityToggle} ${court.unavailable ? styles.toggleUnavailable : styles.toggleAvailable}`}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => dispatch({
                          type: 'TOGGLE_COURT_AVAILABILITY',
                          payload: { courtId: court.id },
                        })}
                      >
                        {court.unavailable ? t('settings.unavailable') : t('settings.available')}
                      </button>
                      <button
                        className={styles.replaceBtn}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          setEditingCourtId(null);
                          setReplacingCourtId(court.id);
                          setReplaceCourtName('');
                        }}
                      >
                        {t('settings.replaceWith')}
                      </button>
                    </>
                  )}
                </div>
              ) : isReplacingCourt ? (
                <div className={styles.playerEditPanel}>
                  <div className={styles.replaceLabel}>
                    {t('settings.replaceLabel', { name: court.name })}
                  </div>
                  <input
                    className={styles.editInput}
                    type="text"
                    value={replaceCourtName}
                    placeholder={t('settings.newCourtPlaceholder')}
                    onChange={e => setReplaceCourtName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleReplaceCourt(court.id);
                      if (e.key === 'Escape') setReplacingCourtId(null);
                    }}
                    autoFocus
                  />
                  <div className={styles.replaceActions}>
                    <Button size="small" onClick={() => handleReplaceCourt(court.id)} disabled={!replaceCourtName.trim()}>
                      {t('settings.replace')}
                    </Button>
                    <Button size="small" variant="ghost" onClick={() => setReplacingCourtId(null)}>
                      {t('settings.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className={styles.playerNameRow}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setEditCourtName(court.name);
                    setEditingCourtId(court.id);
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditCourtName(court.name); setEditingCourtId(court.id); } }}
                >
                  <span className={`${styles.playerName} ${court.unavailable ? styles.playerInactive : ''}`}>
                    {court.name}
                  </span>
                  {court.unavailable && (
                    <span className={styles.statusBadge}>{t('settings.out')}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {tournament.phase === 'in-progress' && (
        <Button
          variant="secondary"
          size="small"
          fullWidth
          onClick={() => dispatch({ type: 'ADD_COURT_LIVE' })}
          style={{ marginTop: 'var(--space-sm)' }}
        >
          {t('settings.addCourt')}
        </Button>
      )}
    </Card>
  );
}
