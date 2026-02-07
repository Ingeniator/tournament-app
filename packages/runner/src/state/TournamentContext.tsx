import { createContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Tournament } from '@padel/common';
import type { TournamentAction } from './actions';
import { tournamentReducer } from './tournamentReducer';
import { saveTournament, loadTournament } from './persistence';

interface TournamentContextValue {
  tournament: Tournament | null;
  dispatch: React.Dispatch<TournamentAction>;
}

export const TournamentContext = createContext<TournamentContextValue>({
  tournament: null,
  dispatch: () => {},
});

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [tournament, dispatch] = useReducer(tournamentReducer, null, () => loadTournament());

  useEffect(() => {
    saveTournament(tournament);
  }, [tournament]);

  return (
    <TournamentContext.Provider value={{ tournament, dispatch }}>
      {children}
    </TournamentContext.Provider>
  );
}
