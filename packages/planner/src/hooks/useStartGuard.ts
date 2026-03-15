import { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import type { PlannerTournament, PlannerRegistration, TournamentStartInfo, Team } from '@padel/common';
import { db } from '../firebase';
import { launchInRunner } from '../utils/exportToRunner';

export type WarningReason = 'same-user' | 'different-user';

export function useStartGuard(tournamentId: string | null, uid: string | null, userName: string | null) {
  const [startedBy, setStartedBy] = useState<TournamentStartInfo | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [warningReason, setWarningReason] = useState<WarningReason>('different-user');
  const [pendingTeams, setPendingTeams] = useState<Team[] | undefined>();
  const [pendingAliases, setPendingAliases] = useState<Map<string, string> | undefined>();

  useEffect(() => {
    if (!tournamentId || !db) return;
    const startedByRef = ref(db, `tournaments/${tournamentId}/startedBy`);
    const unsub = onValue(
      startedByRef,
      (snap) => {
        setStartedBy(snap.exists() ? (snap.val() as TournamentStartInfo) : null);
      },
      (err) => {
        console.warn('StartGuard listener failed:', err.message);
      },
    );
    return unsub;
  }, [tournamentId]);

  const writeStartedBy = async (tournament: PlannerTournament): Promise<boolean> => {
    if (!db || !uid) return false;
    const startedByRef = ref(db, `tournaments/${tournament.id}/startedBy`);
    try {
      await set(startedByRef, { uid, name: userName ?? 'Unknown', timestamp: Date.now() });
      return true;
    } catch (err) {
      console.warn('Failed to write startedBy:', (err as Error).message);
      return false;
    }
  };

  const handleLaunch = async (tournament: PlannerTournament, players: PlannerRegistration[], teams?: Team[], aliases?: Map<string, string>) => {
    if (startedBy) {
      setWarningReason(startedBy.uid === uid ? 'same-user' : 'different-user');
      setPendingTeams(teams);
      setPendingAliases(aliases);
      setShowWarning(true);
      return;
    }
    const ok = await writeStartedBy(tournament);
    if (!ok) return;
    launchInRunner(tournament, players, teams, aliases);
  };

  const proceedAnyway = async (tournament: PlannerTournament, players: PlannerRegistration[]) => {
    setShowWarning(false);
    const ok = await writeStartedBy(tournament);
    if (!ok) return;
    launchInRunner(tournament, players, pendingTeams, pendingAliases);
    setPendingTeams(undefined);
    setPendingAliases(undefined);
  };

  const dismissWarning = () => {
    setShowWarning(false);
    setPendingTeams(undefined);
    setPendingAliases(undefined);
  };

  return { startedBy, showWarning, warningReason, handleLaunch, proceedAnyway, dismissWarning };
}
