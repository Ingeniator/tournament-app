import { useState } from 'react';
import { ref, push, set } from 'firebase/database';
import { useTournament } from '../hooks/useTournament';
import { SupportOverlay } from '../components/support/SupportOverlay';
import { EditableField } from '../components/settings/EditableField';
import { copyToClipboard } from '../utils/clipboard';
import { exportTournament, validateImport } from '../utils/importExport';
import { db, firebaseConfigured } from '../firebase';
import { computeSitOutInfo } from '../utils/resolveConfigDefaults';
import { Button, Card, FeedbackModal, Toast, useToast, useTranslation } from '@padel/common';
import styles from './SettingsScreen.module.css';

export function SettingsScreen() {
  const { tournament, dispatch } = useTournament();
  const { t } = useTranslation();
  const { toastMessage, showToast } = useToast();
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [replacingPlayerId, setReplacingPlayerId] = useState<string | null>(null);
  const [replacePlayerName, setReplacePlayerName] = useState('');
  const [addPlayerName, setAddPlayerName] = useState('');
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [editingCourtId, setEditingCourtId] = useState<string | null>(null);
  const [editCourtName, setEditCourtName] = useState('');
  const [replacingCourtId, setReplacingCourtId] = useState<string | null>(null);
  const [replaceCourtName, setReplaceCourtName] = useState('');
  const [importMode, setImportMode] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [showSupporters, setShowSupporters] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  if (!tournament) return null;

  const handleRenameSave = (playerId: string) => {
    const trimmed = editPlayerName.trim();
    if (trimmed && trimmed !== tournament.players.find(p => p.id === playerId)?.name) {
      dispatch({ type: 'UPDATE_PLAYER', payload: { playerId, name: trimmed } });
    }
    setEditingPlayerId(null);
  };

  const handleReplacePlayer = (oldPlayerId: string) => {
    const trimmed = replacePlayerName.trim();
    if (!trimmed) return;
    dispatch({ type: 'REPLACE_PLAYER', payload: { oldPlayerId, newPlayerName: trimmed } });
    setReplacingPlayerId(null);
    setReplacePlayerName('');
    showToast(t('settings.playerReplaced'));
  };

  const handleAddPlayer = () => {
    const trimmed = addPlayerName.trim();
    if (!trimmed) return;
    if (tournament.phase === 'in-progress') {
      dispatch({ type: 'ADD_PLAYER_LIVE', payload: { name: trimmed } });
    } else {
      dispatch({ type: 'ADD_PLAYER', payload: { name: trimmed } });
    }
    setAddPlayerName('');
    setShowAddPlayer(false);
    showToast(t('settings.playerAdded'));
  };

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
    showToast(t('settings.courtReplaced'));
  };

  const handleCopy = async () => {
    const text = exportTournament(tournament);
    const ok = await copyToClipboard(text);
    showToast(ok ? t('settings.tournamentCopied') : t('settings.failedCopy'));
  };

  const handleImport = () => {
    const result = validateImport(importText);
    if (result.error || !result.tournament) {
      setImportError(result.error ?? 'Unknown error');
      return;
    }
    if (!confirm(t('settings.replaceImportConfirm'))) {
      return;
    }
    dispatch({ type: 'LOAD_TOURNAMENT', payload: result.tournament });
    setImportMode(false);
    setImportText('');
    setImportError(null);
    showToast(t('settings.tournamentImported'));
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
                    onClick={() => {
                      setEditCourtName(court.name);
                      setEditingCourtId(court.id);
                    }}
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

      {/* Players */}
      <Card>
        <h3 className={styles.sectionTitle}>{t('settings.playersTitle', { count: tournament.players.length })}</h3>
        <div className={styles.playerList}>
          {tournament.players.map((player, i) => {
            const isEditing = editingPlayerId === player.id;
            const isReplacing = replacingPlayerId === player.id;

            return (
              <div key={player.id} className={styles.playerItem}>
                <span className={styles.playerNum}>{i + 1}</span>

                {isEditing ? (
                  <div className={styles.playerEditPanel}>
                    <input
                      className={styles.editInput}
                      type="text"
                      value={editPlayerName}
                      onChange={e => setEditPlayerName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRenameSave(player.id);
                        if (e.key === 'Escape') setEditingPlayerId(null);
                      }}
                      onBlur={() => handleRenameSave(player.id)}
                      autoFocus
                    />
                    <button
                      className={`${styles.availabilityToggle} ${player.unavailable ? styles.toggleUnavailable : styles.toggleAvailable}`}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        dispatch({
                          type: 'TOGGLE_PLAYER_AVAILABILITY',
                          payload: { playerId: player.id },
                        });
                      }}
                    >
                      {player.unavailable ? t('settings.unavailable') : t('settings.available')}
                    </button>
                    {tournament.phase === 'in-progress' && (
                      <button
                        className={styles.replaceBtn}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          setEditingPlayerId(null);
                          setReplacingPlayerId(player.id);
                          setReplacePlayerName('');
                        }}
                      >
                        {t('settings.replaceWith')}
                      </button>
                    )}
                  </div>
                ) : isReplacing ? (
                  <div className={styles.playerEditPanel}>
                    <div className={styles.replaceLabel}>
                      {t('settings.replaceLabel', { name: player.name })}
                    </div>
                    <input
                      className={styles.editInput}
                      type="text"
                      value={replacePlayerName}
                      placeholder={t('settings.newPlayerNamePlaceholder')}
                      onChange={e => setReplacePlayerName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleReplacePlayer(player.id);
                        if (e.key === 'Escape') setReplacingPlayerId(null);
                      }}
                      autoFocus
                    />
                    <div className={styles.replaceActions}>
                      <Button size="small" onClick={() => handleReplacePlayer(player.id)} disabled={!replacePlayerName.trim()}>
                        {t('settings.replace')}
                      </Button>
                      <Button size="small" variant="ghost" onClick={() => setReplacingPlayerId(null)}>
                        {t('settings.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={styles.playerNameRow}
                    onClick={tournament.phase !== 'completed' ? () => {
                      setEditPlayerName(player.name);
                      setEditingPlayerId(player.id);
                    } : undefined}
                  >
                    <span className={`${styles.playerName} ${player.unavailable ? styles.playerInactive : ''}`}>
                      {player.name}
                    </span>
                    {player.unavailable && (
                      <span className={styles.statusBadge}>{t('settings.out')}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {tournament.phase === 'completed' ? null : showAddPlayer ? (
          <div className={styles.addPlayerPanel}>
            <input
              className={styles.editInput}
              type="text"
              placeholder={t('settings.newPlayerPlaceholder')}
              value={addPlayerName}
              onChange={e => setAddPlayerName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddPlayer();
                if (e.key === 'Escape') setShowAddPlayer(false);
              }}
              autoFocus
            />
            <div className={styles.addPlayerActions}>
              <Button size="small" onClick={handleAddPlayer} disabled={!addPlayerName.trim()}>
                {t('settings.add')}
              </Button>
              <Button size="small" variant="ghost" onClick={() => setShowAddPlayer(false)}>
                {t('settings.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="small"
            fullWidth
            onClick={() => setShowAddPlayer(true)}
            style={{ marginTop: 'var(--space-sm)' }}
          >
            {t('settings.addPlayer')}
          </Button>
        )}
      </Card>

      {/* Export / Import */}
      <Card>
        <h3 className={styles.sectionTitle}>{t('settings.exportImport')}</h3>
        <div className={styles.actions}>
          <Button variant="secondary" fullWidth onClick={handleCopy}>
            {t('settings.copyData')}
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
            {importMode ? t('settings.cancelImport') : t('settings.importFromClipboard')}
          </Button>
        </div>

        {importMode && (
          <div className={styles.importSection}>
            <p className={styles.hint}>{t('settings.importHint')}</p>
            <textarea
              className={styles.importArea}
              value={importText}
              onChange={e => {
                setImportText(e.target.value);
                setImportError(null);
              }}
              placeholder={t('settings.importPlaceholder')}
              rows={6}
            />
            {importError && <div className={styles.error}>{importError}</div>}
            <Button
              fullWidth
              onClick={handleImport}
              disabled={!importText.trim()}
            >
              {t('settings.validateImport')}
            </Button>
          </div>
        )}
      </Card>

      {/* Danger zone */}
      <div className={styles.danger}>
        <h3 className={styles.sectionTitle}>{t('settings.dangerZone')}</h3>
        <Button variant="danger" fullWidth onClick={handleReset}>
          {t('settings.deleteTournament')}
        </Button>
      </div>

      <div className={styles.attribution}>
        {t('settings.madeWithCare')} &middot;{' '}
        <button className={styles.attributionLink} onClick={() => setShowSupporters(true)}>
          {t('settings.supportUs')}
        </button>
        {firebaseConfigured && (
          <>
            {' '}&middot;{' '}
            <button className={styles.attributionLink} onClick={() => setFeedbackOpen(true)}>
              {t('settings.sendFeedback')}
            </button>
          </>
        )}
      </div>

      <SupportOverlay open={showSupporters} onClose={() => setShowSupporters(false)} />

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={handleFeedback}
      />

      <Toast message={toastMessage} />
    </div>
  );
}
