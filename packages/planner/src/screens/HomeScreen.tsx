import { useState } from 'react';
import { Button, Card } from '@padel/common';
import type { TournamentSummary } from '@padel/common';
import { usePlanner } from '../state/PlannerContext';
import styles from './HomeScreen.module.css';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function formatCreatedAt(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function HomeScreen() {
  const {
    createTournament, loadByCode, setScreen,
    userName, userNameLoading, updateUserName,
    myTournaments, registeredTournaments, listingsLoading,
    openTournament,
  } = usePlanner();

  const [name, setName] = useState('Tournament');
  const [joinCode, setJoinCode] = useState('');
  const [joinMode, setJoinMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createTournament(name.trim());
    } catch {
      setError('Failed to create tournament');
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setError('Code must be 6 characters');
      return;
    }
    setJoining(true);
    setError(null);
    const found = await loadByCode(code);
    if (found) {
      setScreen('join');
    } else {
      setError('Tournament not found');
      setJoining(false);
    }
  };

  const handleSaveName = async () => {
    const trimmed = profileName.trim();
    if (!trimmed) return;
    setSavingName(true);
    try {
      await updateUserName(trimmed);
    } catch {
      // silent
    }
    setSavingName(false);
  };

  const renderTournamentItem = (t: TournamentSummary, screen: 'organizer' | 'join') => (
    <div key={t.id} className={styles.tournamentItem} onClick={() => openTournament(t.id, screen)}>
      <span className={styles.tournamentName}>{t.name}</span>
      <span className={styles.tournamentMeta}>
        {t.date && <span>{formatDate(t.date)}</span>}
        {t.place && <span>{t.place}</span>}
        {t.organizerName && <span>by {t.organizerName}</span>}
        {!t.date && <span>{formatCreatedAt(t.createdAt)}</span>}
      </span>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <svg viewBox="0 0 100 100" width="32" height="32">
          <circle cx="50" cy="50" r="22" fill="none" stroke="#e94560" strokeWidth="5"/>
          <line x1="50" y1="28" x2="50" y2="72" stroke="#e94560" strokeWidth="3"/>
          <line x1="28" y1="50" x2="72" y2="50" stroke="#e94560" strokeWidth="3"/>
        </svg>
        <span className={styles.headerTitle}>Tournament Planner</span>
      </div>

      {/* Name prompt */}
      {!userNameLoading && !userName && (
        <Card>
          <div className={styles.namePrompt}>
            <span className={styles.namePromptLabel}>Set your name to get started</span>
            <input
              className={styles.input}
              type="text"
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              placeholder="Your name"
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
            />
            <Button fullWidth onClick={handleSaveName} disabled={savingName || !profileName.trim()}>
              {savingName ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <div className={styles.createSection}>
          <input
            className={styles.input}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Tournament name"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <Button fullWidth onClick={handleCreate} disabled={creating || !name.trim() || !userName}>
            {creating ? 'Creating...' : 'Create Tournament'}
          </Button>
        </div>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        {joinMode ? (
          <div className={styles.joinSection}>
            <input
              className={styles.codeInput}
              type="text"
              value={joinCode}
              onChange={e => {
                setJoinCode(e.target.value.toUpperCase().slice(0, 6));
                setError(null);
              }}
              placeholder="ABCDEF"
              maxLength={6}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            {error && <div className={styles.error}>{error}</div>}
            <Button fullWidth onClick={handleJoin} disabled={joining || joinCode.length !== 6}>
              {joining ? 'Joining...' : 'Join'}
            </Button>
            <Button variant="ghost" fullWidth onClick={() => { setJoinMode(false); setError(null); }}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="secondary" fullWidth onClick={() => setJoinMode(true)}>
            Join with Code
          </Button>
        )}
      </div>

      {/* My Tournaments */}
      {!listingsLoading && (
        <Card>
          <h3 className={styles.sectionTitle}>My Tournaments</h3>
          {myTournaments.length === 0 ? (
            <p className={styles.empty}>No tournaments created yet</p>
          ) : (
            <div className={styles.tournamentList}>
              {myTournaments.map(t => renderTournamentItem(t, 'organizer'))}
            </div>
          )}
        </Card>
      )}

      {/* Registered Tournaments */}
      {!listingsLoading && (
        <Card>
          <h3 className={styles.sectionTitle}>Registered Tournaments</h3>
          {registeredTournaments.length === 0 ? (
            <p className={styles.empty}>No tournaments joined yet</p>
          ) : (
            <div className={styles.tournamentList}>
              {registeredTournaments.map(t => renderTournamentItem(t, 'join'))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
