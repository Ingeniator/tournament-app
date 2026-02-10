import { useState, useMemo } from 'react';
import { Button, Card, Toast, useToast } from '@padel/common';
import type { TournamentFormat, Court } from '@padel/common';
import { generateId } from '@padel/common';
import { usePlanner } from '../state/PlannerContext';
import { launchInRunner, buildRunnerTournament } from '../utils/exportToRunner';
import { getPlayerStatuses } from '../utils/playerStatus';
import styles from './OrganizerScreen.module.css';

export function OrganizerScreen() {
  const { tournament, players, removePlayer, updateTournament, setScreen, userName, addPlayer, toggleConfirmed, deleteTournament } = usePlanner();
  const { toastMessage, showToast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [showFormatInfo, setShowFormatInfo] = useState(false);

  const capacity = tournament ? tournament.courts.length * 4 + (tournament.extraSpots ?? 0) : 0;
  const statuses = useMemo(() => getPlayerStatuses(players, capacity), [players, capacity]);

  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of players) {
      if (p.confirmed === false) continue;
      const lower = p.name.trim().toLowerCase();
      counts.set(lower, (counts.get(lower) ?? 0) + 1);
    }
    const dupes: string[] = [];
    for (const [name, count] of counts) {
      if (count > 1) dupes.push(players.find(p => p.name.trim().toLowerCase() === name)!.name);
    }
    return dupes;
  }, [players]);

  if (!tournament) return null;

  const confirmedCount = players.filter(p => p.confirmed !== false).length;
  const reserveCount = [...statuses.values()].filter(s => s === 'reserve').length;

  const shareUrl = `${window.location.origin}/plan?code=${tournament.code}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link copied!');
    } catch {
      showToast('Failed to copy');
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(tournament.code);
      showToast('Code copied!');
    } catch {
      showToast('Failed to copy');
    }
  };

  const handleLaunch = () => {
    launchInRunner(tournament, players);
  };

  const handleCopyExport = async () => {
    const json = JSON.stringify(buildRunnerTournament(tournament, players), null, 2);
    try {
      await navigator.clipboard.writeText(json);
      showToast('Tournament JSON copied!');
    } catch {
      showToast('Failed to copy');
    }
  };

  const handleNameSave = async () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== tournament.name) {
      await updateTournament({ name: trimmed });
    }
    setEditingName(false);
  };

  const handleFormatChange = (format: TournamentFormat) => {
    updateTournament({ format });
  };

  const handlePointsChange = (points: number) => {
    if (points > 0) updateTournament({ pointsPerMatch: points });
  };

  const handleMaxRoundsChange = (value: string) => {
    const num = value === '' ? null : parseInt(value, 10);
    updateTournament({ maxRounds: num && num > 0 ? num : null });
  };

  const handleAddCourt = async () => {
    const courts: Court[] = [...tournament.courts, { id: generateId(), name: `Court ${tournament.courts.length + 1}` }];
    await updateTournament({ courts });
  };

  const handleRemoveCourt = async (courtId: string) => {
    if (tournament.courts.length <= 1) return;
    const courts = tournament.courts.filter(c => c.id !== courtId);
    await updateTournament({ courts });
  };

  const handleBack = () => {
    setScreen('home');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={handleBack}>&larr;</button>
        {editingName ? (
          <input
            className={styles.nameInput}
            value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleNameSave();
              if (e.key === 'Escape') setEditingName(false);
            }}
            onBlur={handleNameSave}
            autoFocus
          />
        ) : (
          <h1
            className={styles.name}
            onClick={() => { setNameDraft(tournament.name); setEditingName(true); }}
          >
            {tournament.name}
          </h1>
        )}
      </div>
      {userName && (
        <span className={styles.organizerLabel}>by {userName}</span>
      )}

      {/* Share section */}
      <Card>
        <h3 className={styles.sectionTitle}>Share with Players</h3>
        <div className={styles.codeDisplay}>
          <span className={styles.code} onClick={handleCopyCode}>{tournament.code}</span>
        </div>
        <p className={styles.hint}>Players enter this code to register</p>
        <Button variant="secondary" fullWidth onClick={handleCopyLink}>
          Copy Link
        </Button>
      </Card>

      {/* Player list */}
      <Card>
        <h3 className={styles.sectionTitle}>
          Players ({confirmedCount} / {capacity}{reserveCount > 0 ? ` + ${reserveCount} reserve` : ''})
        </h3>
        {players.length === 0 ? (
          <p className={styles.empty}>No players registered yet</p>
        ) : (
          <div className={styles.playerList}>
            {players.map((player, i) => (
              <div key={player.id} className={styles.playerItem}>
                <span className={styles.playerNum}>{i + 1}</span>
                <span className={styles.playerName}>
                  {player.name}
                  {statuses.get(player.id) === 'reserve' && (
                    <span className={styles.reserveBadge}>reserve</span>
                  )}
                </span>
                <button
                  className={player.confirmed !== false ? styles.statusConfirmed : styles.statusCancelled}
                  onClick={() => toggleConfirmed(player.id, player.confirmed !== false)}
                  title={player.confirmed !== false ? 'Mark as cancelled' : 'Mark as confirmed'}
                >
                  {player.confirmed !== false ? '\u2713' : '\u2717'}
                </button>
                <button
                  className={styles.removeBtn}
                  onClick={() => removePlayer(player.id)}
                  title="Remove player"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
        <div className={styles.addPlayerRow}>
          <input
            className={styles.addPlayerInput}
            type="text"
            value={newPlayerName}
            onChange={e => setNewPlayerName(e.target.value)}
            placeholder="Add player..."
            onKeyDown={e => {
              if (e.key === 'Enter' && newPlayerName.trim()) {
                addPlayer(newPlayerName.trim());
                setNewPlayerName('');
              }
            }}
          />
          <Button
            variant="ghost"
            size="small"
            onClick={() => {
              if (newPlayerName.trim()) {
                addPlayer(newPlayerName.trim());
                setNewPlayerName('');
              }
            }}
            disabled={!newPlayerName.trim()}
          >
            + Add
          </Button>
        </div>
      </Card>

      {/* Config section */}
      <Card>
        <h3 className={styles.sectionTitle}>Settings</h3>
        <div className={styles.configGrid}>
          <label className={styles.configLabel}>Date & time</label>
          <input
            className={styles.configInput}
            type="datetime-local"
            value={tournament.date ?? ''}
            onChange={e => updateTournament({ date: e.target.value || undefined })}
          />

          <label className={styles.configLabel}>Place</label>
          <input
            className={styles.configInput}
            type="text"
            value={tournament.place ?? ''}
            onChange={e => updateTournament({ place: e.target.value || undefined })}
            placeholder="Venue / location"
          />

          <label className={styles.configLabel}>Group chat</label>
          <input
            className={styles.configInput}
            type="url"
            value={tournament.chatLink ?? ''}
            onChange={e => updateTournament({ chatLink: e.target.value || undefined })}
            placeholder="https://t.me/..."
          />

          <label className={styles.configLabel}>
            Format
            <button
              className={styles.infoBtn}
              onClick={() => setShowFormatInfo(v => !v)}
              type="button"
              aria-label="Format info"
            >
              i
            </button>
          </label>
          <select
            className={styles.select}
            value={tournament.format}
            onChange={e => handleFormatChange(e.target.value as TournamentFormat)}
          >
            <option value="americano">Americano</option>
            <option value="mexicano">Mexicano</option>
          </select>
          {showFormatInfo && (
            <div className={styles.formatInfo}>
              <p><strong>Americano</strong> — Random partner rotation each round. Individual standings.</p>
              <p><strong>Mexicano</strong> — After round 1, pairings based on standings — top player pairs with bottom, keeping matches competitive.</p>
            </div>
          )}

          <label className={styles.configLabel}>Points per match</label>
          <input
            className={styles.configInput}
            type="number"
            value={tournament.pointsPerMatch}
            onChange={e => handlePointsChange(parseInt(e.target.value, 10))}
            min={1}
          />

          <label className={styles.configLabel}>Max rounds</label>
          <input
            className={styles.configInput}
            type="number"
            value={tournament.maxRounds ?? ''}
            onChange={e => handleMaxRoundsChange(e.target.value)}
            placeholder="Unlimited"
            min={1}
          />
        </div>

        <div className={styles.courtsSection}>
          <div className={styles.courtsHeader}>
            <span>Courts ({tournament.courts.length})</span>
            <Button variant="ghost" size="small" onClick={handleAddCourt}>+ Add</Button>
          </div>
          {tournament.courts.map(court => (
            <div key={court.id} className={styles.courtItem}>
              <input
                className={styles.courtNameInput}
                value={court.name}
                onChange={e => {
                  const courts = tournament.courts.map(c =>
                    c.id === court.id ? { ...c, name: e.target.value } : c
                  );
                  updateTournament({ courts });
                }}
              />
              {tournament.courts.length > 1 && (
                <button
                  className={styles.removeBtn}
                  onClick={() => handleRemoveCourt(court.id)}
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>

        <div className={styles.capacitySection}>
          <label className={styles.configLabel}>Extra spots</label>
          <input
            className={styles.configInput}
            type="number"
            value={tournament.extraSpots ?? 0}
            onChange={e => {
              const v = parseInt(e.target.value, 10);
              updateTournament({ extraSpots: v > 0 ? v : 0 });
            }}
            min={0}
          />
          <span className={styles.capacityTotal}>
            Total spots: {tournament.courts.length * 4 + (tournament.extraSpots ?? 0)} ({tournament.courts.length} &times; 4{(tournament.extraSpots ?? 0) > 0 ? ` + ${tournament.extraSpots}` : ''})
          </span>
        </div>
      </Card>

      {/* Export */}
      {confirmedCount > 0 && confirmedCount < capacity && (
        <div className={styles.warning}>
          Only {confirmedCount} of {capacity} spots filled. Some courts won't have full games.
        </div>
      )}
      {duplicateNames.length > 0 && (
        <div className={styles.warning}>
          Duplicate names: {duplicateNames.join(', ')}. Same person registered twice?
        </div>
      )}
      <Button fullWidth onClick={handleLaunch} disabled={players.length === 0}>
        Let's play
      </Button>
      <Button variant="secondary" fullWidth onClick={handleCopyExport} disabled={players.length === 0}>
        Copy for Another Device
      </Button>

      <button
        className={styles.deleteBtn}
        onClick={async () => {
          if (window.confirm('Delete this tournament? This cannot be undone.')) {
            await deleteTournament();
          }
        }}
      >
        Delete Tournament
      </button>

      <div className={styles.supportNudge}>
        Free &amp; open source &middot;{' '}
        <button className={styles.supportLink} onClick={() => setScreen('supporters')}>
          View supporters
        </button>
      </div>

      <Toast message={toastMessage} className={styles.toast} />
    </div>
  );
}
