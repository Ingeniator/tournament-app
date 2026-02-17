import { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import type { PlannerTournament, PlannerRegistration, TournamentStartInfo } from '@padel/common';
import { db } from '../firebase';
import { launchInRunner } from '../utils/exportToRunner';

export function useStartGuard(tournamentId: string | null, uid: string | null, userName: string | null) {
  const [startedBy, setStartedBy] = useState<TournamentStartInfo | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!tournamentId || !db) return;
    const startedByRef = ref(db, `tournaments/${tournamentId}/startedBy`);
    const unsub = onValue(startedByRef, (snap) => {
      setStartedBy(snap.exists() ? (snap.val() as TournamentStartInfo) : null);
    });
    return unsub;
  }, [tournamentId]);

  const writeStartedBy = (tournament: PlannerTournament) => {
    if (!db || !uid) return;
    const startedByRef = ref(db, `tournaments/${tournament.id}/startedBy`);
    set(startedByRef, { uid, name: userName ?? 'Unknown', timestamp: Date.now() });
  };

  const handleLaunch = (tournament: PlannerTournament, players: PlannerRegistration[]) => {
    if (startedBy && startedBy.uid !== uid) {
      setShowWarning(true);
      return;
    }
    writeStartedBy(tournament);
    launchInRunner(tournament, players);
  };

  const proceedAnyway = (tournament: PlannerTournament, players: PlannerRegistration[]) => {
    setShowWarning(false);
    writeStartedBy(tournament);
    launchInRunner(tournament, players);
  };

  const dismissWarning = () => {
    setShowWarning(false);
  };

  return { startedBy, showWarning, handleLaunch, proceedAnyway, dismissWarning };
}
