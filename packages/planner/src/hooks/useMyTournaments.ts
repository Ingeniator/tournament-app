import { useState, useEffect, useRef } from 'react';
import { ref, onValue, get, remove } from 'firebase/database';
import type { TournamentSummary, PlannerTournament } from '@padel/common';
import { db } from '../firebase';

function toSummary(id: string, t: PlannerTournament): TournamentSummary {
  return { id, name: t.name, date: t.date, place: t.place, organizerId: t.organizerId, code: t.code, createdAt: t.createdAt };
}

function sortByDate(a: TournamentSummary, b: TournamentSummary): number {
  const aKey = a.date ?? '';
  const bKey = b.date ?? '';
  if (aKey && bKey) return bKey.localeCompare(aKey);
  if (aKey) return -1;
  if (bKey) return 1;
  return b.createdAt - a.createdAt;
}

export function useMyTournaments(uid: string | null) {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  // Guard against re-entrant listener calls caused by lazy cleanup remove()
  const versionRef = useRef(0);

  useEffect(() => {
    if (!uid || !db) {
      setTournaments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onValue(ref(db, `users/${uid}/organized`), async (snapshot) => {
      const version = ++versionRef.current;
      const data = snapshot.val() as Record<string, boolean> | null;
      if (!data) {
        setTournaments([]);
        setLoading(false);
        return;
      }

      const ids = Object.keys(data);
      const results: TournamentSummary[] = [];

      await Promise.all(ids.map(async (id) => {
        const tSnap = await get(ref(db!, `tournaments/${id}`));
        if (!tSnap.exists()) {
          // Tournament deleted — lazy cleanup
          remove(ref(db!, `users/${uid}/organized/${id}`));
          return;
        }
        results.push(toSummary(id, tSnap.val() as PlannerTournament));
      }));

      // Skip if a newer listener call has started (re-entrant from remove())
      if (version !== versionRef.current) return;

      results.sort(sortByDate);
      setTournaments(results);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  return { tournaments, loading };
}
