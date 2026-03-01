import { useState, useRef, useEffect } from 'react';
import { ref, push, set } from 'firebase/database';
import { useTournament } from '../hooks/useTournament';
import { EditableField } from '../components/settings/EditableField';
import { CourtList } from '../components/settings/CourtList';
import { PlayerList } from '../components/settings/PlayerList';
import { copyToClipboard } from '../utils/clipboard';
import { exportTournament, exportTournamentToFile, validateImport } from '../utils/importExport';
import { auth, db } from '../firebase';
import { computeSitOutInfo } from '../utils/resolveConfigDefaults';
import { Button, Card, FeedbackModal, AppFooter, Toast, useToast, useTranslation } from '@padel/common';
import styles from './SettingsScreen.module.css';

export function SettingsScreen() {
  const { tournament, dispatch } = useTournament();
  const { t } = useTranslation();
  const { toastMessage, showToast } = useToast();
  const [importError, setImportError] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLDivElement>(null);

  if (!tournament) return null;

  const handleCopy = async () => {
    const text = exportTournament(tournament);
    const ok = await copyToClipboard(text);
    showToast(ok ? t('settings.tournamentCopied') : t('settings.failedCopy'));
  };

  const handleExportFile = () => {
    exportTournamentToFile(tournament);
  };

  const loadImport = (text: string) => {
    const result = validateImport(text);
    if (result.error || !result.tournament) {
      setImportError(result.error ? t(result.error.key, result.error.params) : t('import.invalidJson'));
      return;
    }
    if (!confirm(t('settings.replaceImportConfirm'))) {
      return;
    }
    dispatch({ type: 'LOAD_TOURNAMENT', payload: result.tournament });
    setImportError(null);
    showToast(t('settings.tournamentImported'));
  };

  const handleImportClipboard = async () => {
    setImportError(null);
    try {
      const text = await navigator.clipboard.readText();
      loadImport(text);
    } catch {
      setImportError(t('settings.clipboardError'));
    }
  };

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      loadImport(reader.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFeedback = async (message: string) => {
    if (!db) return;
    const feedbackRef = push(ref(db, 'feedback'));
    await set(feedbackRef, { message, source: 'runner', createdAt: Date.now() });
  };

  const handleReset = () => {
    if (confirm(t('settings.deleteConfirm'))) {
      dispatch({ type: 'RESET_TOURNAMENT' });
    }
  };

  useEffect(() => {
    const open = exportOpen || importOpen;
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (exportOpen && exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
      if (importOpen && importRef.current && !importRef.current.contains(e.target as Node)) {
        setImportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [exportOpen, importOpen]);

  return (
    <div className={styles.container}>
      {/* Tournament info */}
      <Card>
        <h3 className={styles.sectionTitle}>{t('settings.tournament')}</h3>
        <EditableField
          label={t('settings.name')}
          value={tournament.name}
          onSave={val => {
            const trimmed = val.trim();
            if (trimmed && trimmed !== tournament.name) {
              dispatch({ type: 'UPDATE_NAME', payload: { name: trimmed } });
            }
          }}
        />
        <div className={styles.chipList}>
          <span className={styles.chip}>{tournament.config.format}</span>
          <span className={styles.chip}>{t('settings.courtCount', { count: tournament.config.courts.filter(c => !c.unavailable).length })}</span>
          {tournament.config.targetDuration && (
            <span className={styles.chip}>{tournament.config.targetDuration >= 60 ? `${Math.floor(tournament.config.targetDuration / 60)}h${tournament.config.targetDuration % 60 ? ` ${tournament.config.targetDuration % 60}min` : ''}` : `${tournament.config.targetDuration}min`}</span>
          )}
        </div>

        {tournament.phase === 'in-progress' ? (
          <>
            <EditableField
              label={t('settings.pointsPerMatch')}
              value={String(tournament.config.pointsPerMatch)}
              type="number"
              min={1}
              onSave={val => {
                const num = parseInt(val, 10);
                if (!isNaN(num) && num > 0 && num !== tournament.config.pointsPerMatch) {
                  dispatch({ type: 'UPDATE_POINTS', payload: { pointsPerMatch: num } });
                }
              }}
            />

            <EditableField
              label={t('settings.rounds')}
              value={String(tournament.rounds.length)}
              type="number"
              min={tournament.rounds.filter(r => r.matches.some(m => m.score !== null)).length}
              hint={t('settings.roundsHint', { min: tournament.rounds.filter(r => r.matches.some(m => m.score !== null)).length })}
              onSave={val => {
                const num = parseInt(val, 10);
                const scoredCount = tournament.rounds.filter(r => r.matches.some(m => m.score !== null)).length;
                if (!isNaN(num) && num >= scoredCount && num !== tournament.rounds.length) {
                  dispatch({ type: 'SET_ROUND_COUNT', payload: { count: num } });
                }
              }}
            />
            {(() => {
              const activePlayers = tournament.players.filter(p => !p.unavailable).length;
              const activeCourts = tournament.config.courts.filter(c => !c.unavailable).length;
              const info = computeSitOutInfo(activePlayers, activeCourts, tournament.rounds.length);
              if (!info.isEqual && info.sitOutsPerRound > 0) {
                const suggestions = [info.nearestFairBelow, info.nearestFairAbove]
                  .filter((v): v is number => v !== null && v >= 1)
                  .filter((v, i, a) => a.indexOf(v) === i);
                return (
                  <div className={styles.sitOutWarning}>
                    {t('settings.sitOutWarning', { rounds: tournament.rounds.length })}
                    {suggestions.length > 0 && (
                      <> {t('settings.trySitOut', { suggestions: suggestions.join(' or ') })}</>
                    )}
                  </div>
                );
              }
              return null;
            })()}
          </>
        ) : (
          <div className={styles.chipList}>
            <span className={styles.chip}>{t('settings.pts', { count: tournament.config.pointsPerMatch })}</span>
            {tournament.rounds.length > 0 && (
              <span className={styles.chip}>{t('settings.roundCount', { count: tournament.rounds.length })}</span>
            )}
          </div>
        )}
      </Card>

      {/* Courts */}
      <CourtList tournament={tournament} dispatch={dispatch} />

      {/* Players */}
      <PlayerList tournament={tournament} dispatch={dispatch} showToast={showToast} />

      {/* Export / Import */}
      <Card>
        <h3 className={styles.sectionTitle}>{t('settings.exportImport')}</h3>
        <div className={styles.actions}>
          <div className={styles.dropdown} ref={exportRef}>
            <Button variant="secondary" fullWidth onClick={() => { setExportOpen(v => !v); setImportOpen(false); }}>
              {t('settings.export')} <span className={styles.dropdownArrow}>{exportOpen ? '\u25B2' : '\u25BC'}</span>
            </Button>
            {exportOpen && (
              <div className={styles.dropdownMenu}>
                <button className={styles.dropdownItem} onClick={() => { setExportOpen(false); handleCopy(); }}>
                  {t('settings.copyData')}
                </button>
                <button className={styles.dropdownItem} onClick={() => { setExportOpen(false); handleExportFile(); }}>
                  {t('settings.exportFile')}
                </button>
              </div>
            )}
          </div>
          <div className={styles.dropdown} ref={importRef}>
            <Button variant="secondary" fullWidth onClick={() => { setImportOpen(v => !v); setExportOpen(false); }}>
              {t('settings.import')} <span className={styles.dropdownArrow}>{importOpen ? '\u25B2' : '\u25BC'}</span>
            </Button>
            {importOpen && (
              <div className={styles.dropdownMenu}>
                <button className={styles.dropdownItem} onClick={() => { setImportOpen(false); handleImportClipboard(); }}>
                  {t('settings.importFromClipboard')}
                </button>
                <button className={styles.dropdownItem} onClick={() => { setImportOpen(false); fileInputRef.current?.click(); }}>
                  {t('settings.loadFile')}
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileLoad}
            className={styles.fileInput}
          />
        </div>
        {importError && <div className={styles.error}>{importError}</div>}
      </Card>

      {/* Danger zone */}
      <div className={styles.danger}>
        <h3 className={styles.sectionTitle}>{t('settings.dangerZone')}</h3>
        <Button variant="danger" fullWidth onClick={handleReset}>
          {t('settings.deleteTournament')}
        </Button>
      </div>

      <AppFooter
        onFeedbackClick={() => setFeedbackOpen(true)}
        auth={auth}
      />

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={handleFeedback}
      />

      <Toast message={toastMessage} />
    </div>
  );
}
