import { createContext, useReducer, useEffect, useState, type ReactNode } from 'react';
import type { Tournament } from '@padel/common';
import type { TournamentAction } from './actions';
import { tournamentReducer } from './tournamentReducer';
import { saveTournament, loadTournament } from './persistence';

interface TournamentContextValue {
  tournament: Tournament | null;
  dispatch: React.Dispatch<TournamentAction>;
  saveError: boolean;
}

export const TournamentContext = createContext<TournamentContextValue>({
  tournament: null,
  dispatch: () => {},
  saveError: false,
});

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [tournament, dispatch] = useReducer(tournamentReducer, null, () => loadTournament());
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    const ok = saveTournament(tournament);
    setSaveError(!ok);
  }, [tournament]);

  return (
    <TournamentContext.Provider value={{ tournament, dispatch, saveError }}>
      {children}
    </TournamentContext.Provider>
  );
}
