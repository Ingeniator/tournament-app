import { useState } from 'react';
import { useTournament } from '../hooks/useTournament';
import { validateImport } from '../utils/importExport';
import { Button } from '../components/common/Button';
import { generateId } from '@padel/common';
import styles from './HomeScreen.module.css';

export function HomeScreen() {
  const { tournament, dispatch } = useTournament();
  const [importMode, setImportMode] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const handleNew = () => {
    dispatch({
      type: 'CREATE_TOURNAMENT',
      payload: {
        name: 'Tournament',
        config: {
          format: 'americano',
          pointsPerMatch: 24,
          courts: [{ id: generateId(), name: 'Court 1' }],
          maxRounds: null,
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

  const hasSaved = tournament !== null;

  return (
    <div className={styles.container}>
      <div className={styles.logo}>
        <svg viewBox="0 0 100 100" width="48" height="48">
          <circle cx="50" cy="50" r="22" fill="none" stroke="#e94560" strokeWidth="5"/>
          <line x1="50" y1="28" x2="50" y2="72" stroke="#e94560" strokeWidth="3"/>
          <line x1="28" y1="50" x2="72" y2="50" stroke="#e94560" strokeWidth="3"/>
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
              New Tournament
            </Button>
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
    </div>
  );
}
