import { useState } from 'react';
import { ref, push, set } from 'firebase/database';
import { Button, Card, FeedbackModal } from '@padel/common';
import type { TournamentSummary } from '@padel/common';
import { usePlanner } from '../state/PlannerContext';
import { db } from '../firebase';
import { randomTournamentName } from '../utils/tournamentNames';
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

  const [name, setName] = useState(randomTournamentName);
  const [joinCode, setJoinCode] = useState('');
  const [joinMode, setJoinMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [editingUserName, setEditingUserName] = useState(false);
  const [userNameDraft, setUserNameDraft] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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

  const handleSaveUserName = async () => {
    const trimmed = userNameDraft.trim();
    if (trimmed && trimmed !== userName) {
      await updateUserName(trimmed);
    }
    setEditingUserName(false);
  };

  const handleFeedback = async (message: string) => {
    if (!db) return;
    const feedbackRef = push(ref(db, 'feedback'));
    await set(feedbackRef, { message, source: 'planner', createdAt: Date.now() });
  };

  const renderTournamentItem = (t: TournamentSummary, screen: 'organizer' | 'join') => (
    <div
      key={t.id}
      className={styles.tournamentItem}
      role="button"
      tabIndex={0}
      onClick={() => openTournament(t.id, screen)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTournament(t.id, screen); } }}
    >
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
      <header className={styles.header}>
        <svg viewBox="0 0 100 100" width="32" height="32" aria-hidden="true">
          <defs>
            <radialGradient id="ball-p" cx="40%" cy="38%" r="50%">
              <stop offset="0%" stopColor="#d4e142"/>
              <stop offset="100%" stopColor="#b8c230"/>
            </radialGradient>
            <clipPath id="bc-p"><circle cx="50" cy="50" r="24"/></clipPath>
          </defs>
          <circle cx="50" cy="50" r="24" fill="url(#ball-p)"/>
          <g clipPath="url(#bc-p)">
            <path d="M38 23 C26 38, 26 62, 38 77" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M62 23 C74 38, 74 62, 62 77" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round"/>
          </g>
        </svg>
        <h1 className={styles.headerTitle}>Tournament Planner</h1>
      </header>

      <main>
      {userName && !editingUserName && (
        <div className={styles.userBadge}>
          <span className={styles.userBadgeText}>Logged in as <strong>{userName}</strong></span>
          <button
            className={styles.editNameBtn}
            onClick={() => { setUserNameDraft(userName); setEditingUserName(true); }}
            aria-label="Edit name"
          >
            &#x270E;
          </button>
        </div>
      )}
      {editingUserName && (
        <div className={styles.editNameRow}>
          <input
            className={styles.input}
            type="text"
            value={userNameDraft}
            onChange={e => setUserNameDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSaveUserName();
              if (e.key === 'Escape') setEditingUserName(false);
            }}
            autoFocus
            aria-label="Your name"
          />
          <Button size="small" onClick={handleSaveUserName} disabled={!userNameDraft.trim()}>
            Save
          </Button>
          <Button size="small" variant="ghost" onClick={() => setEditingUserName(false)}>
            Cancel
          </Button>
        </div>
      )}

      {/* Name prompt */}
      {!userNameLoading && !userName && (
        <Card>
          <div className={styles.namePrompt}>
            <span className={styles.namePromptLabel}>Set your name to get started</span>
            <span className={styles.namePromptLabel}>(will be shown as tournament owner name)</span>
            <input
              className={styles.input}
              type="text"
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              placeholder="Group Name / Your name"
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              aria-label="Group Name / Your name"
              autoFocus
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
          <label className={styles.inputLabel} htmlFor="tournament-name">Tournament name</label>
          <input
            id="tournament-name"
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
              aria-label="Tournament join code"
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
          <h2 className={styles.sectionTitle}>My Tournaments</h2>
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
          <h2 className={styles.sectionTitle}>Registered Tournaments</h2>
          {registeredTournaments.length === 0 ? (
            <p className={styles.empty}>No tournaments joined yet</p>
          ) : (
            <div className={styles.tournamentList}>
              {registeredTournaments.map(t => renderTournamentItem(t, 'join'))}
            </div>
          )}
        </Card>
      )}
      </main>

      <footer className={styles.footer}>
        Free &amp; open source &middot;{' '}
        <button className={styles.footerLink} onClick={() => setScreen('supporters')}>
          Support us
        </button>
        {' '}&middot;{' '}
        <button className={styles.footerLink} onClick={() => setFeedbackOpen(true)}>
          Send feedback
        </button>
      </footer>

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={handleFeedback}
      />
    </div>
  );
}
