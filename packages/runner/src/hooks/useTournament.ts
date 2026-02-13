import { useContext } from 'react';
import { TournamentContext } from '../state/tournamentContextDef';

export function useTournament() {
  return useContext(TournamentContext);
}
