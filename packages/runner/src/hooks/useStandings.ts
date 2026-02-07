import { useMemo } from 'react';
import type { Tournament, StandingsEntry } from '@padel/common';
import { getStrategy } from '../strategies';

export function useStandings(tournament: Tournament | null): StandingsEntry[] {
  return useMemo(() => {
    if (!tournament || tournament.phase === 'setup') return [];
    const strategy = getStrategy(tournament.config.format);
    return strategy.calculateStandings(tournament);
  }, [tournament]);
}
