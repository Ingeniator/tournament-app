import { useReducer, useEffect, useRef, useState, type ReactNode } from 'react';
import { ref, update } from 'firebase/database';
import { TournamentContext } from './tournamentContextDef';
import { tournamentReducer } from './tournamentReducer';
import { saveTournament, loadTournament } from './persistence';
import { db, signIn } from '../firebase';

export function TournamentProvider({ children }: { children: ReactNode }) {
  // For planner tournaments, generate the schedule synchronously on load
  // so the runner opens directly to the in-progress play view.
  const [tournament, dispatch] = useReducer(tournamentReducer, null, () => {
    const loaded = loadTournament();
    if (
      loaded?.plannerTournamentId &&
      (loaded.phase === 'setup' || loaded.phase === 'team-pairing')
    ) {
      return tournamentReducer(loaded, { type: 'GENERATE_SCHEDULE' });
    }
    return loaded;
  });
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
