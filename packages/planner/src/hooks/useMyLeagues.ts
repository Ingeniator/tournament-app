import { useState, useEffect, useRef } from 'react';
import { ref, onValue, get, remove } from 'firebase/database';
import type { LeagueSummary, League } from '@padel/common';
import { db } from '../firebase';

function toSummary(id: string, data: Record<string, unknown>): LeagueSummary {
  const tournamentIds = data.tournamentIds;
  return {
    id,
    name: data.name as string,
    date: data.date as string,
    status: (data.status as League['status']) ?? 'draft',
    tournamentCount: Array.isArray(tournamentIds) ? tournamentIds.length : 0,
    createdAt: data.createdAt as number,
  };
}

export function useMyLeagues(uid: string | null) {
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const versionRef = useRef(0);

  useEffect(() => {
    if (!uid || !db) {
      setLeagues([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onValue(ref(db, `users/${uid}/leagues`), async (snapshot) => {
      const version = ++versionRef.current;
      const data = snapshot.val() as Record<string, boolean> | null;
      if (!data) {
        setLeagues([]);
        setLoading(false);
        return;
      }

      const ids = Object.keys(data);
      const results: LeagueSummary[] = [];

      try {
        await Promise.all(ids.map(async (id) => {
          const snap = await get(ref(db!, `leagues/${id}`));
          if (!snap.exists()) {
            // League deleted — lazy cleanup
            remove(ref(db!, `users/${uid}/leagues/${id}`));
            return;
          }
          results.push(toSummary(id, snap.val()));
        }));
      } catch {
        // Network or permission error — show whatever we have
      }

      if (version !== versionRef.current) return;

      results.sort((a, b) => {
        // Sort by date descending, then by createdAt descending
        if (a.date && b.date) return b.date.localeCompare(a.date);
        if (a.date) return -1;
        if (b.date) return 1;
        return b.createdAt - a.createdAt;
      });
      setLeagues(results);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  return { leagues, loading };
}
