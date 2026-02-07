import { useContext } from 'react';
import { TournamentContext } from '../state/TournamentContext';

export function useTournament() {
  return useContext(TournamentContext);
}
