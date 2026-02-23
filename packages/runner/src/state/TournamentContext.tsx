import { useReducer, useEffect, useRef, useState, type ReactNode } from 'react';
import { ref, set } from 'firebase/database';
import { TournamentContext } from './tournamentContextDef';
import { tournamentReducer } from './tournamentReducer';
import { saveTournament, loadTournament } from './persistence';
import { db, signIn } from '../firebase';

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [tournament, dispatch] = useReducer(tournamentReducer, null, () => loadTournament());
  const [saveError, setSaveError] = useState(false);
  const prevPhaseRef = useRef(tournament?.phase);

  useEffect(() => {
    const ok = saveTournament(tournament);
    setSaveError(!ok);
  }, [tournament]);

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
        // Write runnerData first so it's available when the planner's
        // real-time listener fires on completedAt
        await set(ref(db!, `${base}/runnerData`), tournament);
        await set(ref(db!, `${base}/completedAt`), Date.now());
      }).catch(() => {});
    }
  }, [tournament?.phase, tournament?.plannerTournamentId]);

  return (
    <TournamentContext.Provider value={{ tournament, dispatch, saveError }}>
      {children}
    </TournamentContext.Provider>
  );
}
