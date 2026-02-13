import { createContext } from 'react';
import type { Tournament } from '@padel/common';
import type { TournamentAction } from './actions';

export interface TournamentContextValue {
  tournament: Tournament | null;
  dispatch: React.Dispatch<TournamentAction>;
  saveError: boolean;
}

export const TournamentContext = createContext<TournamentContextValue>({
  tournament: null,
  dispatch: () => {},
  saveError: false,
});
