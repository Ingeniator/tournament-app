import { useReducer, useEffect, useState, type ReactNode } from 'react';
import { TournamentContext } from './tournamentContextDef';
import { tournamentReducer } from './tournamentReducer';
import { saveTournament, loadTournament } from './persistence';

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [tournament, dispatch] = useReducer(tournamentReducer, null, () => loadTournament());
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    const ok = saveTournament(tournament);
    queueMicrotask(() => setSaveError(!ok));
  }, [tournament]);

  return (
    <TournamentContext.Provider value={{ tournament, dispatch, saveError }}>
      {children}
    </TournamentContext.Provider>
  );
}
