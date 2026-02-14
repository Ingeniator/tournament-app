import { useState } from 'react';
import { ref, push, set } from 'firebase/database';
import { useTournament } from '../hooks/useTournament';
import { SupportOverlay } from '../components/support/SupportOverlay';
import { EditableField } from '../components/settings/EditableField';
import { copyToClipboard } from '../utils/clipboard';
import { exportTournament, validateImport } from '../utils/importExport';
import { db, firebaseConfigured } from '../firebase';
import { computeSitOutInfo } from '../utils/resolveConfigDefaults';
import { Button, Card, FeedbackModal, Toast, useToast } from '@padel/common';
import styles from './SettingsScreen.module.css';

export function SettingsScreen() {
  const { tournament, dispatch } = useTournament();
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
    showToast('Player replaced');
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
    showToast('Player added');
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
    showToast('Court replaced');
  };

  const handleCopy = async () => {
    const text = exportTournament(tournament);
    const ok = await copyToClipboard(text);
    showToast(ok ? 'Tournament copied!' : 'Failed to copy');
  };

  const handleImport = () => {
    const result = validateImport(importText);
    if (result.error || !result.tournament) {
      setImportError(result.error ?? 'Unknown error');
      return;
    }
    if (!confirm('Replace current tournament with imported data? This cannot be undone.')) {
      return;
    }
    dispatch({ type: 'LOAD_TOURNAMENT', payload: result.tournament });
    setImportMode(false);
    setImportText('');
    setImportError(null);
    showToast('Tournament imported!');
  };

  const handleFeedback = async (message: string) => {
    if (!db) return;
    const feedbackRef = push(ref(db, 'feedback'));
    await set(feedbackRef, { message, source: 'runner', createdAt: Date.now() });
  };

  const handleReset = () => {
    if (confirm('Delete this tournament? This cannot be undone.')) {
      dispatch({ type: 'RESET_TOURNAMENT' });
    }
  };

  return (
    <div className={styles.container}>
      {/* Tournament info */}
      <Card>
        <h3 className={styles.sectionTitle}>Tournament</h3>
        <EditableField
          label="Name"
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
          <span className={styles.chip}>{tournament.config.courts.filter(c => !c.unavailable).length} court(s)</span>
          {tournament.config.targetDuration && (
            <span className={styles.chip}>{tournament.config.targetDuration >= 60 ? `${Math.floor(tournament.config.targetDuration / 60)}h${tournament.config.targetDuration % 60 ? ` ${tournament.config.targetDuration % 60}min` : ''}` : `${tournament.config.targetDuration}min`}</span>
          )}
        </div>

        {tournament.phase === 'in-progress' ? (
          <>
            <EditableField
              label="Points per match"
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
              label="Rounds"
              value={String(tournament.rounds.length)}
              type="number"
              min={tournament.rounds.filter(r => r.matches.some(m => m.score !== null)).length}
              hint={`(min ${tournament.rounds.filter(r => r.matches.some(m => m.score !== null)).length} scored)`}
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
                    Sit-outs are not equal with {tournament.rounds.length} rounds.
                    {suggestions.length > 0 && (
                      <> Try {suggestions.join(' or ')} rounds for equal sit-outs.</>
                    )}
                  </div>
                );
              }
              return null;
            })()}
          </>
        ) : (
          <div className={styles.chipList}>
            <span className={styles.chip}>{tournament.config.pointsPerMatch} pts</span>
            {tournament.rounds.length > 0 && (
              <span className={styles.chip}>{tournament.rounds.length} rounds</span>
            )}
          </div>
        )}
      </Card>

      {/* Courts */}
      <Card>
        <h3 className={styles.sectionTitle}>Courts</h3>
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
                          {court.unavailable ? 'Unavailable' : 'Available'}
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
                          Replace with...
                        </button>
                      </>
                    )}
                  </div>
                ) : isReplacingCourt ? (
                  <div className={styles.playerEditPanel}>
                    <div className={styles.replaceLabel}>
                      Replace {court.name} with:
                    </div>
                    <input
                      className={styles.editInput}
                      type="text"
                      value={replaceCourtName}
                      placeholder="New court name"
                      onChange={e => setReplaceCourtName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleReplaceCourt(court.id);
                        if (e.key === 'Escape') setReplacingCourtId(null);
                      }}
                      autoFocus
                    />
                    <div className={styles.replaceActions}>
                      <Button size="small" onClick={() => handleReplaceCourt(court.id)} disabled={!replaceCourtName.trim()}>
                        Replace
                      </Button>
                      <Button size="small" variant="ghost" onClick={() => setReplacingCourtId(null)}>
                        Cancel
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
                      <span className={styles.statusBadge}>out</span>
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
            + Add Court
          </Button>
        )}
      </Card>

      {/* Players */}
      <Card>
        <h3 className={styles.sectionTitle}>Players ({tournament.players.length})</h3>
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
                      {player.unavailable ? 'Unavailable' : 'Available'}
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
                        Replace with...
                      </button>
                    )}
                  </div>
                ) : isReplacing ? (
                  <div className={styles.playerEditPanel}>
                    <div className={styles.replaceLabel}>
                      Replace {player.name} with:
                    </div>
                    <input
                      className={styles.editInput}
                      type="text"
                      value={replacePlayerName}
                      placeholder="New player name"
                      onChange={e => setReplacePlayerName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleReplacePlayer(player.id);
                        if (e.key === 'Escape') setReplacingPlayerId(null);
                      }}
                      autoFocus
                    />
                    <div className={styles.replaceActions}>
                      <Button size="small" onClick={() => handleReplacePlayer(player.id)} disabled={!replacePlayerName.trim()}>
                        Replace
                      </Button>
                      <Button size="small" variant="ghost" onClick={() => setReplacingPlayerId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={styles.playerNameRow}
                    {...(tournament.phase !== 'completed' ? {
                      role: 'button' as const,
                      tabIndex: 0,
                      onClick: () => { setEditPlayerName(player.name); setEditingPlayerId(player.id); },
                      onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditPlayerName(player.name); setEditingPlayerId(player.id); } },
                    } : {})}
                  >
                    <span className={`${styles.playerName} ${player.unavailable ? styles.playerInactive : ''}`}>
                      {player.name}
                    </span>
                    {player.unavailable && (
                      <span className={styles.statusBadge}>out</span>
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
              placeholder="Player name"
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
                Add
              </Button>
              <Button size="small" variant="ghost" onClick={() => setShowAddPlayer(false)}>
                Cancel
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
            + Add Player
          </Button>
        )}
      </Card>

      {/* Export / Import */}
      <Card>
        <h3 className={styles.sectionTitle}>Export / Import</h3>
        <div className={styles.actions}>
          <Button variant="secondary" fullWidth onClick={handleCopy}>
            Copy Tournament Data
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
            {importMode ? 'Cancel Import' : 'Import from Clipboard'}
          </Button>
        </div>

        {importMode && (
          <div className={styles.importSection}>
            <p className={styles.hint}>Paste exported tournament data below:</p>
            <textarea
              className={styles.importArea}
              value={importText}
              onChange={e => {
                setImportText(e.target.value);
                setImportError(null);
              }}
              placeholder='{"_format": "padel-tournament-v1", ...}'
              rows={6}
            />
            {importError && <div className={styles.error}>{importError}</div>}
            <Button
              fullWidth
              onClick={handleImport}
              disabled={!importText.trim()}
            >
              Validate & Import
            </Button>
          </div>
        )}
      </Card>

      {/* Danger zone */}
      <div className={styles.danger}>
        <h3 className={styles.sectionTitle}>Danger Zone</h3>
        <Button variant="danger" fullWidth onClick={handleReset}>
          Delete Tournament
        </Button>
      </div>

      <div className={styles.attribution}>
        Made with care &middot;{' '}
        <button className={styles.attributionLink} onClick={() => setShowSupporters(true)}>
          Support us
        </button>
        {firebaseConfigured && (
          <>
            {' '}&middot;{' '}
            <button className={styles.attributionLink} onClick={() => setFeedbackOpen(true)}>
              Send feedback
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
