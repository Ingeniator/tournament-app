import { useState, useRef } from 'react';
import { ref, push, set } from 'firebase/database';
import { useTournament } from '../hooks/useTournament';
import { useRunnerTheme } from '../state/ThemeContext';
import { validateImport } from '../utils/importExport';
import { randomTournamentName } from '../utils/tournamentNames';
import { db } from '../firebase';
import { Button, FeedbackModal, AppFooter, generateId, SkinPicker, useTranslation } from '@padel/common';
import styles from './HomeScreen.module.css';

export function HomeScreen() {
  const { tournament, dispatch } = useTournament();
  const { t } = useTranslation();
  const { skin, setSkin } = useRunnerTheme();
  const [importError, setImportError] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNew = () => {
    dispatch({
      type: 'CREATE_TOURNAMENT',
      payload: {
        name: randomTournamentName(),
        config: {
          format: 'americano',
          pointsPerMatch: 0,
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
    if (confirm(t('home.deleteConfirm'))) {
      dispatch({ type: 'RESET_TOURNAMENT' });
    }
  };

  const loadTournament = (text: string) => {
    const result = validateImport(text);
    if (result.error || !result.tournament) {
      setImportError(result.error ? t(result.error.key, result.error.params) : t('import.invalidJson'));
      return;
    }
    setImportError(null);
    dispatch({ type: 'LOAD_TOURNAMENT', payload: result.tournament });
  };

  const handleImportClipboard = async () => {
    setImportError(null);
    try {
      const text = await navigator.clipboard.readText();
      loadTournament(text);
    } catch {
      setImportError(t('home.clipboardError'));
    }
  };

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      loadTournament(reader.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFeedback = async (message: string) => {
    if (!db) return;
    const feedbackRef = push(ref(db, 'feedback'));
    await set(feedbackRef, { message, source: 'runner', createdAt: Date.now() });
  };

  const hasSaved = tournament !== null;

  return (
    <main className={styles.container}>
      <div className={styles.themeToggleWrap}>
        <SkinPicker skin={skin} onSelect={setSkin} />
      </div>
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
      <h1 className={styles.title}>{t('home.title')}</h1>
      <p className={styles.subtitle}>{t('home.subtitle')}</p>

      <div className={styles.actions}>
        {hasSaved && (
          <div className={styles.resumeCard}>
            <div className={styles.resumeTitle}>{tournament.name}</div>
            <div className={styles.resumeMeta}>
              {t('home.playersMeta', { count: tournament.players.length, phase: tournament.phase })}
            </div>
            <div className={styles.resumeActions}>
              <Button onClick={handleResume} fullWidth>
                {t('home.continue')}
              </Button>
              <Button variant="danger" onClick={handleDelete} size="small">
                {t('home.delete')}
              </Button>
            </div>
          </div>
        )}

        {!hasSaved && (
          <>
            <Button onClick={handleNew} fullWidth>
              {t('home.newPlay')}
            </Button>
            <a href="/plan" className={styles.planLink}>
              <Button variant="secondary" fullWidth>
                {t('home.planShare')}
              </Button>
            </a>
            <Button variant="secondary" fullWidth onClick={handleImportClipboard}>
              {t('home.importFromClipboard')}
            </Button>
            <Button variant="secondary" fullWidth onClick={() => fileInputRef.current?.click()}>
              {t('home.loadFile')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileLoad}
              className={styles.fileInput}
            />
            {importError && <div className={styles.importError}>{importError}</div>}
          </>
        )}
      </div>

      <AppFooter
        onFeedbackClick={() => setFeedbackOpen(true)}
      />

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={handleFeedback}
      />
    </main>
  );
}
