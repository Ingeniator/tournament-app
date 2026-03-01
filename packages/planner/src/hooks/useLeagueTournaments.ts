import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import type { Tournament } from '@padel/common';
import { db } from '../firebase';

export interface LeagueTournamentInfo {
  id: string;
  name: string;
  hasRunnerData: boolean;
}

export function useLeagueTournaments(tournamentIds: string[]) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentInfos, setTournamentInfos] = useState<LeagueTournamentInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!db || tournamentIds.length === 0) {
      setTournaments([]);
      setTournamentInfos([]);
      return;
    }
    setLoading(true);

    // Set up real-time listeners for each tournament's runnerData
    const unsubscribes: (() => void)[] = [];
    const dataMap = new Map<string, Tournament | null>();
    const infoMap = new Map<string, LeagueTournamentInfo>();

    for (const tid of tournamentIds) {
      // Listen for runnerData (contains full Tournament with rounds/scores)
      const unsub = onValue(ref(db, `tournaments/${tid}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const name = (data.name as string) ?? tid;
          const runnerData = data.runnerData as Tournament | null;
          dataMap.set(tid, runnerData ?? null);
          infoMap.set(tid, {
            id: tid,
            name,
            hasRunnerData: !!runnerData,
          });
        } else {
          dataMap.delete(tid);
          infoMap.delete(tid);
        }

        // Update state with all current data
        const allTournaments: Tournament[] = [];
        for (const t of dataMap.values()) {
          if (t) allTournaments.push(t);
        }
        setTournaments(allTournaments);
        setTournamentInfos(Array.from(infoMap.values()));
        setLoading(false);
      });
      unsubscribes.push(unsub);
    }

    return () => {
      for (const unsub of unsubscribes) unsub();
    };
  }, [tournamentIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return { tournaments, tournamentInfos, loading };
}
