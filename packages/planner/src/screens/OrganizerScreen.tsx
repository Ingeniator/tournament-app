import { useState, useMemo, useEffect, useRef } from 'react';
import { ref, push, set } from 'firebase/database';
import { Card, FeedbackModal, AppFooter, Toast, useToast, useTranslation, formatHasClubs, formatHasFixedPartners } from '@padel/common';
import type { Team } from '@padel/common';
import { usePlanner } from '../state/PlannerContext';
import { auth, db } from '../firebase';
import { exportRunnerTournamentJSON } from '../utils/exportToRunner';
import { exportPlannerTournament } from '../utils/plannerExport';
import { useStartGuard } from '../hooks/useStartGuard';
import { StartWarningModal } from '../components/StartWarningModal';
import { TeamPairingModal } from '../components/TeamPairingModal';
import { PlayerList } from '../components/organizer/PlayerList';
import { ClubPanel } from '../components/organizer/ClubPanel';
import { CompletedView } from '../components/organizer/CompletedView';
import { WhenWhereSection } from '../components/organizer/WhenWhereSection';
import { DetailsSection } from '../components/organizer/DetailsSection';
import { ShareSection } from '../components/organizer/ShareSection';
import { CourtsSection } from '../components/organizer/CourtsSection';
import { FormatSection } from '../components/organizer/FormatSection';
import { MatchSettingsSection } from '../components/organizer/MatchSettingsSection';
import { WarningsActions } from '../components/organizer/WarningsActions';
import { getPlayerStatuses } from '../utils/playerStatus';
import { validateLaunch as validateLaunchUtil } from '../utils/validateLaunch';
import styles from './OrganizerScreen.module.css';

type PlayerMode = 'quick' | 'share';

export function OrganizerScreen() {
  const { tournament, players, removePlayer, updateTournament, setScreen, userName, addPlayer, bulkAddPlayers, toggleConfirmed, updatePlayerAlias, updatePlayerTelegram, updatePlayerPartner, updatePlayerGroup, updatePlayerClub, updatePlayerRank, deleteTournament, completedAt, undoComplete, uid, updateCaptainApproval } = usePlanner();
  const { startedBy, showWarning, warningReason, handleLaunch: handleGuardedLaunch, proceedAnyway, dismissWarning } = useStartGuard(tournament?.id ?? null, uid, userName);
  const { t } = useTranslation();
  const { toastMessage, showToast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const tournamentRef = useRef(tournament);
  tournamentRef.current = tournament;
  const playersRef = useRef(players);
  playersRef.current = players;

  const hasSelfRegistered = players.some(p => p.id !== uid && p.confirmed === undefined);
  const [playerMode, setPlayerMode] = useState<PlayerMode>('quick');
  const [showTeamPairing, setShowTeamPairing] = useState(false);

  // Auto-switch to 'share' once Firebase data loads and self-registered players exist
  useEffect(() => {
    if (hasSelfRegistered) setPlayerMode('share');
  }, [hasSelfRegistered]);

  const capacity = tournament ? tournament.courts.length * 4 + (tournament.extraSpots ?? 0) : 0;
  const statuses = useMemo(() => getPlayerStatuses(players, capacity, {
    format: tournament?.format,
    clubs: tournament?.clubs,
    rankLabels: tournament?.rankLabels,
    captainMode: tournament?.captainMode,
  }), [players, capacity, tournament?.format, tournament?.clubs, tournament?.rankLabels, tournament?.captainMode]);

  // Auto-trim rankLabels/rankColors and clear player rankSlots when maxRanks decreases
  useEffect(() => {
    const t = tournamentRef.current;
    if (!t || t.format !== 'club-ranked') return;
    const clubs = t.clubs ?? [];
    if (clubs.length < 2) return;
    const slotsPerClub = Math.floor(capacity / clubs.length);
    const maxRanks = Math.max(2, Math.floor(slotsPerClub / 2));
    const tournamentUpdates: Record<string, unknown> = {};
    if (t.rankLabels && t.rankLabels.length > maxRanks) {
      tournamentUpdates.rankLabels = t.rankLabels.slice(0, maxRanks);
    }
    if (t.rankColors && t.rankColors.length > maxRanks) {
      tournamentUpdates.rankColors = t.rankColors.slice(0, maxRanks);
    }
    if (Object.keys(tournamentUpdates).length > 0) {
      updateTournament(tournamentUpdates);
      for (const p of playersRef.current) {
        if (p.rankSlot != null && p.rankSlot >= maxRanks) {
          updatePlayerRank(p.id, null);
        }
      }
    }
  }, [capacity, tournament?.clubs?.length, tournament?.format, updateTournament, updatePlayerRank]);

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

  const playingPlayers = useMemo(() =>
    players.filter(p => statuses.get(p.id) === 'playing'),
    [players, statuses]
  );

  if (!tournament) return null;

  if (completedAt) {
    return (
      <CompletedView
        tournament={tournament}
        completedAt={completedAt}
        undoComplete={undoComplete}
        deleteTournament={deleteTournament}
        setScreen={setScreen}
        showToast={showToast}
      />
    );
  }

  const confirmedCount = players.filter(p => p.confirmed !== false).length;
  const playingCount = [...statuses.values()].filter(s => s === 'playing').length;
  const playerCount = playingCount || capacity;

  const handleLaunch = async () => {
    const result = validateLaunchUtil(tournament!, players, statuses, capacity);
    if (result) { showToast(t(result.key, result.params)); return; }
    if (formatHasFixedPartners(tournament!.format)) {
      setShowTeamPairing(true);
      return;
    }
    const aliases = new Map<string, string>();
    for (const p of players) { if (p.alias) aliases.set(p.id, p.alias); }
    await handleGuardedLaunch(tournament!, players, undefined, aliases.size > 0 ? aliases : undefined);
  };

  const handleTeamStart = async (teams: Team[], aliases: Map<string, string>) => {
    setShowTeamPairing(false);
    await handleGuardedLaunch(tournament!, players, teams, aliases);
  };

  const handleCopyExport = async () => {
    const json = exportRunnerTournamentJSON(tournament, players);
    try {
      await navigator.clipboard.writeText(json);
      showToast(t('organizer.jsonCopied'));
    } catch {
      showToast(t('organizer.failedCopy'));
    }
  };

  const handleExportCopy = async () => {
    const text = exportPlannerTournament(tournament, players);
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('organizer.exportCopied'));
    } catch {
      showToast(t('organizer.failedCopy'));
    }
  };

  const handleExportFile = () => {
    const text = exportPlannerTournament(tournament, players);
    const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(text);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${tournament.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    a.click();
  };

  const handleNameSave = async () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== tournament.name) {
      await updateTournament({ name: trimmed });
    }
    setEditingName(false);
  };

  const handleDelete = async () => {
    if (window.confirm(t('organizer.deleteConfirm'))) {
      await deleteTournament();
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => setScreen('home')} aria-label={t('organizer.back')}>&larr;</button>
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
          <div className={styles.nameRow}>
            <h1 className={styles.name}>{tournament.name}</h1>
            <button
              className={styles.editNameBtn}
              onClick={() => { setNameDraft(tournament.name); setEditingName(true); }}
              aria-label={t('organizer.renameTournament')}
            >
              &#x270E;
            </button>
          </div>
        )}
      </header>
      <main>
      {userName && (
        <span className={styles.organizerLabel}>{t('organizer.by', { name: userName })}</span>
      )}

      {/* Player mode toggle */}
      <div className={styles.modeToggle}>
        <button
          className={playerMode === 'quick' ? styles.modeBtnActive : styles.modeBtn}
          onClick={() => setPlayerMode('quick')}
        >
          {t('organizer.modeQuickPlay')}
        </button>
        <button
          className={playerMode === 'share' ? styles.modeBtnActive : styles.modeBtn}
          onClick={() => setPlayerMode('share')}
        >
          {t('organizer.modeShare')}
        </button>
      </div>

      {playerMode === 'share' && <WhenWhereSection tournament={tournament} updateTournament={updateTournament} />}
      {playerMode === 'share' && <DetailsSection tournament={tournament} updateTournament={updateTournament} />}
      {playerMode === 'share' && (
        <ShareSection
          tournament={tournament}
          players={players}
          uid={uid}
          updateTournament={updateTournament}
          showToast={showToast}
        />
      )}

      <CourtsSection tournament={tournament} updateTournament={updateTournament} />
      <FormatSection tournament={tournament} players={players} capacity={capacity} updateTournament={updateTournament} />
      <MatchSettingsSection
        tournament={tournament}
        playerCount={playerCount}
        confirmedCount={confirmedCount}
        capacity={capacity}
        updateTournament={updateTournament}
        showToast={showToast}
      />

      <PlayerList
        players={players}
        capacity={capacity}
        addPlayer={addPlayer}
        bulkAddPlayers={bulkAddPlayers}
        removePlayer={removePlayer}
        toggleConfirmed={toggleConfirmed}
        updatePlayerAlias={updatePlayerAlias}
        updatePlayerTelegram={updatePlayerTelegram}
        updatePlayerPartner={updatePlayerPartner}
        statuses={statuses}
        format={tournament.format}
        clubs={tournament.clubs}
        groupLabels={tournament.groupLabels}
        rankLabels={tournament.rankLabels}
        rankColors={tournament.rankColors}
        onSetGroup={updatePlayerGroup}
        onSetClub={updatePlayerClub}
        onSetRank={updatePlayerRank}
        simplified={playerMode === 'quick'}
        captainMode={tournament.captainMode}
        showToast={showToast}
        operatorName={userName ?? undefined}
        onApprove={tournament.captainMode ? (pid) => updateCaptainApproval(pid, true) : undefined}
        onReject={tournament.captainMode ? (pid) => updateCaptainApproval(pid, false) : undefined}
      />

      {formatHasClubs(tournament.format) && (tournament.clubs?.length ?? 0) >= 2 && (
        <Card>
          <ClubPanel
            clubs={tournament.clubs!}
            players={players}
            onSetClub={updatePlayerClub}
          />
        </Card>
      )}

      <WarningsActions
        tournament={tournament}
        players={players}
        playingPlayers={playingPlayers}
        statuses={statuses}
        capacity={capacity}
        confirmedCount={confirmedCount}
        playerMode={playerMode}
        duplicateNames={duplicateNames}
        onLaunch={handleLaunch}
        onCopyExport={handleCopyExport}
        onExportCopy={handleExportCopy}
        onExportFile={handleExportFile}
        onDelete={handleDelete}
      />

      </main>

      <AppFooter
        onFeedbackClick={() => setFeedbackOpen(true)}
        auth={auth}
      />

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={async (message) => {
          if (!db) return;
          const feedbackRef = push(ref(db, 'feedback'));
          await set(feedbackRef, { message, source: 'planner', createdAt: Date.now() });
        }}
      />

      <Toast message={toastMessage} className={styles.toast} />

      <TeamPairingModal
        open={showTeamPairing}
        players={playingPlayers}
        format={tournament.format}
        clubs={tournament.clubs}
        rankLabels={tournament.rankLabels}
        onStart={handleTeamStart}
        onClose={() => setShowTeamPairing(false)}
      />

      <StartWarningModal
        open={showWarning}
        startedBy={startedBy}
        reason={warningReason}
        onProceed={() => proceedAnyway(tournament!, players)}
        onClose={dismissWarning}
      />
    </div>
  );
}
