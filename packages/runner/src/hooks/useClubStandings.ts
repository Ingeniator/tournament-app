import { useMemo } from 'react';
import type { Tournament, StandingsEntry, ClubStandingsEntry } from '@padel/common';
import { buildClubStandings } from '../utils/clubStandings';

export function useClubStandings(
  tournament: Tournament | null,
  standings: StandingsEntry[],
): ClubStandingsEntry[] {
  return useMemo(() => {
    if (!tournament) return [];
    return buildClubStandings(tournament, standings);
  }, [tournament, standings]);
}
