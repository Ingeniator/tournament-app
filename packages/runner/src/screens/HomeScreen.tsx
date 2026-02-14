import { useState } from 'react';
import { ref, push, set } from 'firebase/database';
import { useTournament } from '../hooks/useTournament';
import { validateImport } from '../utils/importExport';
import { randomTournamentName } from '../utils/tournamentNames';
import { db, firebaseConfigured } from '../firebase';
import { Button, FeedbackModal, generateId } from '@padel/common';
import styles from './HomeScreen.module.css';

export function HomeScreen() {
  const { tournament, dispatch } = useTournament();
  const [importMode, setImportMode] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleNew = () => {
    dispatch({
      type: 'CREATE_TOURNAMENT',
      payload: {
        name: randomTournamentName(),
        config: {
          format: 'americano',
          pointsPerMatch: 0,
          courts: [{ id: generateId(), name: 'Court 1' }],
          maxRounds: 1,
        },
      },
    });
  };

  const handleResume = () => {
    // Tournament already in state, navigation handled by App
  };

  const handleDelete = () => {
    if (confirm('Delete this tournament? This cannot be undone.')) {
      dispatch({ type: 'RESET_TOURNAMENT' });
    }
  };

  const handleImport = () => {
    const result = validateImport(importText);
    if (result.error || !result.tournament) {
      setImportError(result.error ?? 'Unknown error');
      return;
    }
    dispatch({ type: 'LOAD_TOURNAMENT', payload: result.tournament });
    setImportMode(false);
    setImportText('');
    setImportError(null);
  };

  const handleFeedback = async (message: string) => {
    if (!db) return;
    const feedbackRef = push(ref(db, 'feedback'));
    await set(feedbackRef, { message, source: 'runner', createdAt: Date.now() });
  };

  const hasSaved = tournament !== null;

  return (
    <main className={styles.container}>
      <div className={styles.logo}>
        <svg viewBox="0 0 100 100" width="48" height="48" aria-hidden="true">
          <defs>
            <radialGradient id="ball" cx="40%" cy="38%" r="50%">
              <stop offset="0%" stopColor="#d4e142"/>
              <stop offset="100%" stopColor="#b8c230"/>
            </radialGradient>
            <clipPath id="bc"><circle cx="50" cy="50" r="24"/></clipPath>
          </defs>
          <circle cx="50" cy="50" r="24" fill="url(#ball)"/>
          <g clipPath="url(#bc)">
            <path d="M38 23 C26 38, 26 62, 38 77" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M62 23 C74 38, 74 62, 62 77" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round"/>
          </g>
        </svg>
      </div>
      <h1 className={styles.title}>Tournament Manager</h1>
      <p className={styles.subtitle}>Organize tournaments at the court</p>

      <div className={styles.actions}>
        {hasSaved && (
          <div className={styles.resumeCard}>
            <div className={styles.resumeTitle}>{tournament.name}</div>
            <div className={styles.resumeMeta}>
              {tournament.players.length} players · {tournament.phase}
            </div>
            <div className={styles.resumeActions}>
              <Button onClick={handleResume} fullWidth>
                Continue
              </Button>
              <Button variant="danger" onClick={handleDelete} size="small">
                Delete
              </Button>
            </div>
          </div>
        )}

        {!hasSaved && (
          <>
            <Button onClick={handleNew} fullWidth>
              New Play
            </Button>
            <a href="/plan" className={styles.planLink}>
              <Button variant="secondary" fullWidth>
                Plan & Share New Tournament
              </Button>
            </a>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setImportMode(!importMode);
                setImportError(null);
                setImportText('');
              }}
            >
              {importMode ? 'Cancel' : 'Import from Clipboard'}
            </Button>

            {importMode && (
              <div className={styles.importSection}>
                <textarea
                  className={styles.importArea}
                  value={importText}
                  onChange={e => {
                    setImportText(e.target.value);
                    setImportError(null);
                  }}
                  placeholder="Paste tournament JSON here..."
                  rows={6}
                  autoFocus
                />
                {importError && <div className={styles.importError}>{importError}</div>}
                <Button
                  fullWidth
                  onClick={handleImport}
                  disabled={!importText.trim()}
                >
                  Import
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {firebaseConfigured && (
        <footer className={styles.footer}>
          <button className={styles.footerLink} onClick={() => setFeedbackOpen(true)}>
            Send feedback
          </button>
        </footer>
      )}

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={handleFeedback}
      />
    </main>
  );
}
