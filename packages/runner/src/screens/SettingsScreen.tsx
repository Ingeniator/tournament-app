import { useState, useCallback } from 'react';
import { useTournament } from '../hooks/useTournament';
import { SupportOverlay } from '../components/support/SupportOverlay';
import { copyToClipboard } from '../utils/clipboard';
import { exportTournament, validateImport } from '../utils/importExport';
import { Button, Card } from '@padel/common';
import styles from './SettingsScreen.module.css';

export function SettingsScreen() {
  const { tournament, dispatch } = useTournament();
  const [toast, setToast] = useState<string | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [replacingPlayerId, setReplacingPlayerId] = useState<string | null>(null);
  const [replacePlayerName, setReplacePlayerName] = useState('');
  const [addPlayerName, setAddPlayerName] = useState('');
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [editingCourtId, setEditingCourtId] = useState<string | null>(null);
  const [editCourtName, setEditCourtName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [tournamentNameDraft, setTournamentNameDraft] = useState('');
  const [importMode, setImportMode] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [showSupporters, setShowSupporters] = useState(false);
  const [editingPoints, setEditingPoints] = useState(false);
  const [pointsDraft, setPointsDraft] = useState('');
  const [editingRounds, setEditingRounds] = useState(false);
  const [roundsDraft, setRoundsDraft] = useState('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handlePointsSave = () => {
    const val = parseInt(pointsDraft, 10);
    if (!isNaN(val) && val > 0 && tournament && val !== tournament.config.pointsPerMatch) {
      dispatch({ type: 'UPDATE_POINTS', payload: { pointsPerMatch: val } });
    }
    setEditingPoints(false);
  };

  const handleRoundsSave = () => {
    if (!tournament) { setEditingRounds(false); return; }
    const val = parseInt(roundsDraft, 10);
    const scoredCount = tournament.rounds.filter(r => r.matches.some(m => m.score !== null)).length;
    if (!isNaN(val) && val >= scoredCount && val !== tournament.rounds.length) {
      dispatch({ type: 'SET_ROUND_COUNT', payload: { count: val } });
    }
    setEditingRounds(false);
  };

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

  const handleTournamentNameSave = () => {
    const trimmed = tournamentNameDraft.trim();
    if (trimmed && trimmed !== tournament.name) {
      dispatch({ type: 'UPDATE_NAME', payload: { name: trimmed } });
    }
    setEditingName(false);
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
        {editingName ? (
          <div className={styles.inlineEdit}>
            <input
              className={styles.editInput}
              type="text"
              value={tournamentNameDraft}
              onChange={e => setTournamentNameDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleTournamentNameSave();
                if (e.key === 'Escape') setEditingName(false);
              }}
              onBlur={handleTournamentNameSave}
              autoFocus
            />
          </div>
        ) : (
          <div
            className={styles.tappableField}
            onClick={() => {
              setTournamentNameDraft(tournament.name);
              setEditingName(true);
            }}
          >
            <span className={styles.fieldLabel}>Name</span>
            <span className={styles.fieldValue}>{tournament.name}</span>
          </div>
        )}
        <div className={styles.chipList}>
          <span className={styles.chip}>{tournament.config.format}</span>
          <span className={styles.chip}>{tournament.config.courts.filter(c => !c.unavailable).length} court(s)</span>
        </div>

        {tournament.phase === 'in-progress' ? (
          <>
            {editingPoints ? (
              <div className={styles.inlineEdit}>
                <input
                  className={styles.editInput}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={pointsDraft}
                  onChange={e => setPointsDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handlePointsSave();
                    if (e.key === 'Escape') setEditingPoints(false);
                  }}
                  onBlur={handlePointsSave}
                  autoFocus
                />
              </div>
            ) : (
              <div
                className={styles.tappableField}
                onClick={() => {
                  setPointsDraft(String(tournament.config.pointsPerMatch));
                  setEditingPoints(true);
                }}
              >
                <span className={styles.fieldLabel}>Points per match</span>
                <span className={styles.fieldValue}>{tournament.config.pointsPerMatch}</span>
              </div>
            )}

            {editingRounds ? (
              <div className={styles.inlineEdit}>
                <input
                  className={styles.editInput}
                  type="number"
                  inputMode="numeric"
                  min={tournament.rounds.filter(r => r.matches.some(m => m.score !== null)).length}
                  value={roundsDraft}
                  onChange={e => setRoundsDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRoundsSave();
                    if (e.key === 'Escape') setEditingRounds(false);
                  }}
                  onBlur={handleRoundsSave}
                  autoFocus
                />
              </div>
            ) : (
              <div
                className={styles.tappableField}
                onClick={() => {
                  setRoundsDraft(String(tournament.rounds.length));
                  setEditingRounds(true);
                }}
              >
                <span className={styles.fieldLabel}>Rounds</span>
                <span className={styles.fieldValue}>
                  {tournament.rounds.length}
                  {' '}
                  <span className={styles.fieldHint}>
                    (min {tournament.rounds.filter(r => r.matches.some(m => m.score !== null)).length} scored)
                  </span>
                </span>
              </div>
            )}
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
          {tournament.config.courts.map(court => (
            <div key={court.id} className={styles.playerItem}>
              {editingCourtId === court.id ? (
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
                  )}
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
                    <span className={styles.statusBadge}>out</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {tournament.phase === 'in-progress' && (() => {
          const activePlayers = tournament.players.filter(p => !p.unavailable);
          const maxCourts = Math.max(1, Math.floor(activePlayers.length / 4));
          const availableCourtCount = tournament.config.courts.filter(c => !c.unavailable).length;
          return availableCourtCount < maxCourts ? (
            <Button
              variant="secondary"
              size="small"
              fullWidth
              onClick={() => dispatch({ type: 'ADD_COURT_LIVE' })}
              style={{ marginTop: 'var(--space-sm)' }}
            >
              + Add Court
            </Button>
          ) : null;
        })()}
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
                    onClick={() => {
                      setEditPlayerName(player.name);
                      setEditingPlayerId(player.id);
                    }}
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

        {showAddPlayer ? (
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
          View our supporters
        </button>
      </div>

      <SupportOverlay open={showSupporters} onClose={() => setShowSupporters(false)} />

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
