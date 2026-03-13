import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, push, set } from 'firebase/database';
import { Button, Card, SkinPicker, FeedbackModal, AppFooter, useTranslation } from '@padel/common';
import type { TournamentSummary } from '@padel/common';
import { usePlanner } from '../state/PlannerContext';
import { auth, db } from '../firebase';
import { randomTournamentName } from '../utils/tournamentNames';
import { SwipeToDelete } from '../components/SwipeToDelete';
import { parsePlannerExport, parsePlannerEventExport } from '../utils/plannerExport';
import styles from './HomeScreen.module.css';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return iso;
  }
}

function formatCreatedAt(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isExpired(t: TournamentSummary): boolean {
  if (t.completedAt) return false;
  if (!t.date) return false;
  const tournamentDate = new Date(t.date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return tournamentDate < now;
}

export function HomeScreen() {
  const {
    createTournament, importTournament, importEvent, loadByCode, loadEventByCode, setScreen,
    userName, userNameLoading, updateUserName,
    myTournaments, registeredTournaments, listingsLoading,
    chatRoomTournaments, chatRoomLoading,
    openTournament, deleteTournamentById, skin, setSkin,
    myEvents, visitedEvents, eventsLoading, setActiveEventId,
  } = usePlanner();
  const { t } = useTranslation();

  const [mode, setMode] = useState<'player' | 'organizer'>('player');
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
  const [importOpen, setImportOpen] = useState(false);
  const importRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!importOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (importRef.current && !importRef.current.contains(e.target as Node)) {
        setImportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [importOpen]);

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
    const foundTournament = await loadByCode(code);
    if (foundTournament) {
      setScreen('join');
      return;
    }
    const foundEvent = await loadEventByCode(code);
    if (foundEvent) {
      setScreen('event-join');
      return;
    }
    setError(t('home.joinNotFound'));
    setJoining(false);
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

  const handleOpenGroupTournament = async (code: string) => {
    const found = await loadByCode(code);
    if (found) {
      setScreen('join');
    }
  };

  const handleFeedback = async (message: string) => {
    if (!db) return;
    const feedbackRef = push(ref(db, 'feedback'));
    await set(feedbackRef, { message, source: 'planner', createdAt: Date.now() });
  };

  const loadImport = useCallback((text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (parsed._format === 'padel-event-v1' || parsed._format === 'planner-event-v1') {
        const eventData = parsePlannerEventExport(text);
        if (window.confirm(t('event.importConfirm', { name: eventData.name, count: eventData.tournaments.length }))) {
          importEvent(eventData);
        }
      } else {
        const { tournament: tournamentData, players } = parsePlannerExport(text);
        if (window.confirm(t('organizer.importConfirm', { name: tournamentData.name, count: players.length }))) {
          importTournament(tournamentData, players);
        }
      }
    } catch {
      setError(t('home.importFailed'));
    }
  }, [importTournament, importEvent, t]);

  const handleImportClipboard = async () => {
    setError(null);
    try {
      const text = await navigator.clipboard.readText();
      loadImport(text);
    } catch {
      setError(t('organizer.failedCopy'));
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        loadImport(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeleteTournament = (id: string) => {
    if (window.confirm(t('organizer.deleteConfirm'))) {
      deleteTournamentById(id);
    }
  };

  const renderTournamentItem = (ti: TournamentSummary, screen: 'organizer' | 'join', options?: { swipeToDelete?: boolean }) => {
    const item = (
      <div
        className={styles.tournamentItem}
        role="button"
        tabIndex={0}
        onClick={() => openTournament(ti.id, screen)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTournament(ti.id, screen); } }}
      >
        <span className={styles.tournamentNameRow}>
          <span className={styles.tournamentName}>{ti.name}</span>
          {ti.completedAt ? (
            <span className={`${styles.badge} ${styles.badgeCompleted}`}>{t('home.completed')}</span>
          ) : isExpired(ti) ? (
            <span className={`${styles.badge} ${styles.badgeExpired}`}>{t('home.expired')}</span>
          ) : null}
        </span>
        <span className={styles.tournamentMeta}>
          {ti.date && <span>{formatDate(ti.date)}</span>}
          {ti.place && <span>{ti.place}</span>}
          {ti.organizerName && <span>by {ti.organizerName}</span>}
          {!ti.date && <span>{formatCreatedAt(ti.createdAt)}</span>}
        </span>
      </div>
    );

    if (options?.swipeToDelete) {
      return (
        <SwipeToDelete key={ti.id} onDelete={() => handleDeleteTournament(ti.id)} label={t('organizer.deleteTournament')}>
          {item}
        </SwipeToDelete>
      );
    }

    return <div key={ti.id}>{item}</div>;
  };

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
        <SkinPicker skin={skin} onSelect={setSkin} />
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

      {/* Mode toggle */}
      <div className={styles.modeToggle}>
        <button
          className={mode === 'player' ? styles.modeBtnActive : styles.modeBtn}
          onClick={() => setMode('player')}
        >
          {t('home.playerMode')}
        </button>
        <button
          className={mode === 'organizer' ? styles.modeBtnActive : styles.modeBtn}
          onClick={() => setMode('organizer')}
        >
          {t('home.organizerMode')}
        </button>
      </div>

      {mode === 'player' ? (
        <>
          {/* Registered Tournaments */}
          {!listingsLoading && (
            <Card>
              <h2 className={styles.sectionTitle}>{t('home.registeredTournaments')}</h2>
              {registeredTournaments.length === 0 ? (
                <p className={styles.empty}>{t('home.noTournamentsJoined')}</p>
              ) : (
                <div className={styles.tournamentList}>
                  {registeredTournaments.map(ti => renderTournamentItem(ti, 'join'))}
                </div>
              )}
            </Card>
          )}

          {/* Group Tournaments */}
          {!chatRoomLoading && chatRoomTournaments.length > 0 && (
            <Card>
              <h2 className={styles.sectionTitle}>{t('home.groupTournaments')}</h2>
              <div className={styles.tournamentList}>
                {chatRoomTournaments.map(ct => (
                  <div
                    key={ct.id}
                    className={styles.tournamentItem}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenGroupTournament(ct.code)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenGroupTournament(ct.code); } }}
                  >
                    <span className={styles.tournamentName}>{ct.name}</span>
                    <span className={styles.tournamentMeta}>
                      {ct.date && <span>{formatDate(ct.date)}</span>}
                      {ct.organizerName && <span>by {ct.organizerName}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Visited Events */}
          {visitedEvents.length > 0 && (
            <Card>
              <h2 className={styles.sectionTitle}>{t('home.myEvents')}</h2>
              <div className={styles.tournamentList}>
                {visitedEvents.map(ev => (
                  <div
                    key={ev.id}
                    className={styles.tournamentItem}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setActiveEventId(ev.id); setScreen('event-join'); }}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveEventId(ev.id); setScreen('event-join'); } }}
                  >
                    <span className={styles.tournamentName}>{ev.name}</span>
                    <span className={styles.tournamentMeta}>
                      <span>{ev.date}</span>
                      <span>{t('event.tournaments', { count: ev.tournamentCount })}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Join with Code */}
          {joinMode ? (
            <Card>
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
                  aria-label="Join code"
                />
                {error && <div className={styles.error}>{error}</div>}
                <Button fullWidth onClick={handleJoin} disabled={joining || joinCode.length !== 6}>
                  {joining ? t('home.joining') : t('home.join')}
                </Button>
                <Button variant="ghost" fullWidth onClick={() => { setJoinMode(false); setError(null); }}>
                  {t('home.cancel')}
                </Button>
              </div>
            </Card>
          ) : (
            <Button variant="secondary" fullWidth onClick={() => setJoinMode(true)}>
              {t('home.joinWithCode')}
            </Button>
          )}
        </>
      ) : (
        <>
          {/* Name prompt (organizer needs a name to create tournaments) */}
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

          {/* My Tournaments */}
          {!listingsLoading && (
            <Card>
              <h2 className={styles.sectionTitle}>{t('home.myTournaments')}</h2>
              {myTournaments.length === 0 ? (
                <p className={styles.empty}>{t('home.noTournamentsCreated')}</p>
              ) : (
                <div className={styles.tournamentList}>
                  {myTournaments.map(ti => renderTournamentItem(ti, 'organizer', { swipeToDelete: true }))}
                </div>
              )}
              <div className={styles.createSection} style={{ marginTop: 'var(--space-md)' }}>
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
                <div className={styles.dropdown} ref={importRef}>
                  <Button variant="ghost" fullWidth onClick={() => setImportOpen(v => !v)} disabled={!userName}>
                    {t('home.importTournament')} <span className={styles.dropdownArrow}>{importOpen ? '\u25B2' : '\u25BC'}</span>
                  </Button>
                  {importOpen && (
                    <div className={styles.dropdownMenu}>
                      <button className={styles.dropdownItem} onClick={() => { setImportOpen(false); handleImportClipboard(); }}>
                        {t('organizer.importFromClipboard')}
                      </button>
                      <button className={styles.dropdownItem} onClick={() => { setImportOpen(false); fileInputRef.current?.click(); }}>
                        {t('organizer.loadFile')}
                      </button>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportFile}
                  className={styles.fileInput}
                />
              </div>
            </Card>
          )}

          {/* My Events */}
          {!eventsLoading && (
            <Card>
              <h2 className={styles.sectionTitle}>{t('event.myEvents')}</h2>
              {myEvents.length === 0 ? (
                <p className={styles.empty}>{t('event.noEvents')}</p>
              ) : (
                <div className={styles.tournamentList}>
                  {myEvents.map(ev => (
                    <div
                      key={ev.id}
                      className={styles.tournamentItem}
                      role="button"
                      tabIndex={0}
                      onClick={() => { setActiveEventId(ev.id); setScreen('event-detail'); }}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveEventId(ev.id); setScreen('event-detail'); } }}
                    >
                      <span className={styles.tournamentNameRow}>
                        <span className={styles.tournamentName}>{ev.name}</span>
                      </span>
                      <span className={styles.tournamentMeta}>
                        <span>{ev.date}</span>
                        <span>{t('event.tournaments', { count: ev.tournamentCount })}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 'var(--space-md)' }}>
                <Button variant="secondary" fullWidth onClick={() => setScreen('event-create')} disabled={!userName}>
                  {t('event.createEvent')}
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      </main>

      <AppFooter
        onFeedbackClick={() => setFeedbackOpen(true)}
        auth={auth}
      />

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={handleFeedback}
      />

    </div>
  );
}
