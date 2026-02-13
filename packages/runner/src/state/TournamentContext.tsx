import { useReducer, useEffect, useRef, type ReactNode } from 'react';
import { TournamentContext } from './tournamentContext';
import { tournamentReducer } from './tournamentReducer';
import { saveTournament, loadTournament } from './persistence';

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [tournament, dispatch] = useReducer(tournamentReducer, null, () => loadTournament());
  const saveErrorRef = useRef(false);

  useEffect(() => {
    saveErrorRef.current = !saveTournament(tournament);
  }, [tournament]);

  return (
    <TournamentContext.Provider value={{ tournament, dispatch, saveError: saveErrorRef.current }}>
      {children}
    </TournamentContext.Provider>
  );
}
