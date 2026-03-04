import { useReducer, useEffect, useRef, useState, type ReactNode } from 'react';
import { ref, update } from 'firebase/database';
import { TournamentContext } from './tournamentContextDef';
import { tournamentReducer } from './tournamentReducer';
import { saveTournament, loadTournament } from './persistence';
import { db, signIn } from '../firebase';

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [tournament, dispatch] = useReducer(tournamentReducer, null, () => loadTournament());
  const [saveError, setSaveError] = useState(false);
  const prevPhaseRef = useRef(tournament?.phase);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    const ok = saveTournament(tournament);
    setSaveError(!ok);
  }, [tournament]);

  // TODO: Remove auto-start — planner tournaments should go through setup so
  // users can review/modify settings before generating the schedule.
  // Remove SettingsScreen page for planner tournaments (settings are managed in
  // the planner) and let the normal setup flow handle schedule generation.
  useEffect(() => {
    if (
      !autoStartedRef.current &&
      tournament?.plannerTournamentId &&
      (tournament.phase === 'setup' || tournament.phase === 'team-pairing')
    ) {
      autoStartedRef.current = true;
      dispatch({ type: 'GENERATE_SCHEDULE' });
    }
  }, [tournament?.plannerTournamentId, tournament?.phase]);

  // Write completedAt to Firebase when tournament transitions to completed
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = tournament?.phase;

    if (
      prevPhase && prevPhase !== 'completed' &&
      tournament?.phase === 'completed' &&
      tournament.plannerTournamentId &&
      db
    ) {
      signIn().then(async () => {
        const base = `tournaments/${tournament.plannerTournamentId}`;
        await update(ref(db!), {
          [`${base}/runnerData`]: tournament,
          [`${base}/completedAt`]: Date.now(),
        });
      }).catch(() => {});
    }
  }, [tournament?.phase, tournament?.plannerTournamentId]);

  return (
    <TournamentContext.Provider value={{ tournament, dispatch, saveError }}>
      {children}
    </TournamentContext.Provider>
  );
}
