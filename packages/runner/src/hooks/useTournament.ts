import { useContext } from 'react';
import { TournamentContext } from '../state/tournamentContext';

export function useTournament() {
  return useContext(TournamentContext);
}
