import { useState } from 'react';
import { ref, push, set } from 'firebase/database';
import { Button, Card, FeedbackModal, LanguageSelector, useTranslation } from '@padel/common';
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
  const { t } = useTranslation();

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
      setError(t('home.failedCreate'));
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setError(t('home.codeMustBe6'));
      return;
    }
    setJoining(true);
    setError(null);
    const found = await loadByCode(code);
    if (found) {
      setScreen('join');
    } else {
      setError(t('home.tournamentNotFound'));
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
        <h1 className={styles.headerTitle}>{t('home.title')}</h1>
      </header>

      <main>
      {userName && !editingUserName && (
        <div className={styles.userBadge}>
          <span className={styles.userBadgeText}>{t('home.loggedInAs')} <strong>{userName}</strong></span>
          <button
            className={styles.editNameBtn}
            onClick={() => { setUserNameDraft(userName); setEditingUserName(true); }}
            aria-label={t('home.editName')}
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
            aria-label={t('home.namePlaceholder')}
          />
          <Button size="small" onClick={handleSaveUserName} disabled={!userNameDraft.trim()}>
            {t('home.save')}
          </Button>
          <Button size="small" variant="ghost" onClick={() => setEditingUserName(false)}>
            {t('home.cancel')}
          </Button>
        </div>
      )}

      {/* Name prompt */}
      {!userNameLoading && !userName && (
        <Card>
          <div className={styles.namePrompt}>
            <span className={styles.namePromptLabel}>{t('home.namePrompt')}</span>
            <span className={styles.namePromptLabel}>{t('home.namePromptSub')}</span>
            <input
              className={styles.input}
              type="text"
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              placeholder={t('home.namePlaceholder')}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              aria-label={t('home.namePlaceholder')}
              autoFocus
            />
            <Button fullWidth onClick={handleSaveName} disabled={savingName || !profileName.trim()}>
              {savingName ? t('home.saving') : t('home.save')}
            </Button>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <div className={styles.createSection}>
          <label className={styles.inputLabel} htmlFor="tournament-name">{t('home.tournamentName')}</label>
          <input
            id="tournament-name"
            className={styles.input}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('home.tournamentNamePlaceholder')}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <Button fullWidth onClick={handleCreate} disabled={creating || !name.trim() || !userName}>
            {creating ? t('home.creating') : t('home.createTournament')}
          </Button>
        </div>

        <div className={styles.divider}>
          <span>{t('home.or')}</span>
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
              placeholder={t('home.codePlaceholder')}
              maxLength={6}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              aria-label="Tournament join code"
            />
            {error && <div className={styles.error}>{error}</div>}
            <Button fullWidth onClick={handleJoin} disabled={joining || joinCode.length !== 6}>
              {joining ? t('home.joining') : t('home.join')}
            </Button>
            <Button variant="ghost" fullWidth onClick={() => { setJoinMode(false); setError(null); }}>
              {t('home.cancel')}
            </Button>
          </div>
        ) : (
          <Button variant="secondary" fullWidth onClick={() => setJoinMode(true)}>
            {t('home.joinWithCode')}
          </Button>
        )}
      </div>

      {/* My Tournaments */}
      {!listingsLoading && (
        <Card>
          <h2 className={styles.sectionTitle}>{t('home.myTournaments')}</h2>
          {myTournaments.length === 0 ? (
            <p className={styles.empty}>{t('home.noTournamentsCreated')}</p>
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
          <h2 className={styles.sectionTitle}>{t('home.registeredTournaments')}</h2>
          {registeredTournaments.length === 0 ? (
            <p className={styles.empty}>{t('home.noTournamentsJoined')}</p>
          ) : (
            <div className={styles.tournamentList}>
              {registeredTournaments.map(t => renderTournamentItem(t, 'join'))}
            </div>
          )}
        </Card>
      )}
      </main>

      <footer className={styles.footer}>
        {t('home.freeOpenSource')} &middot;{' '}
        <button className={styles.footerLink} onClick={() => setScreen('supporters')}>
          {t('home.supportUs')}
        </button>
        {' '}&middot;{' '}
        <button className={styles.footerLink} onClick={() => setFeedbackOpen(true)}>
          {t('home.sendFeedback')}
        </button>
        <LanguageSelector />
      </footer>

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={handleFeedback}
      />
    </div>
  );
}
