import { useState, useEffect, useRef } from 'react';
import { ref, onValue, get, remove } from 'firebase/database';
import type { PadelEventSummary, EventTournamentLink } from '@padel/common';
import { db } from '../firebase';

function toSummary(id: string, data: Record<string, unknown>): PadelEventSummary {
  const tournaments = data.tournaments;
  return {
    id,
    name: data.name as string,
    date: data.date as string,
    tournamentCount: Array.isArray(tournaments) ? (tournaments as EventTournamentLink[]).length : 0,
    createdAt: data.createdAt as number,
  };
}

export function useMyEvents(uid: string | null) {
  const [events, setEvents] = useState<PadelEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const versionRef = useRef(0);

  useEffect(() => {
    if (!uid || !db) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onValue(ref(db, `users/${uid}/events`), async (snapshot) => {
      const version = ++versionRef.current;
      const data = snapshot.val() as Record<string, boolean> | null;
      if (!data) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const ids = Object.keys(data);
      const results: PadelEventSummary[] = [];

      try {
        await Promise.all(ids.map(async (id) => {
          const snap = await get(ref(db!, `events/${id}`));
          if (!snap.exists()) {
            // Event deleted — lazy cleanup
            remove(ref(db!, `users/${uid}/events/${id}`));
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
      setEvents(results);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  return { events, loading };
}
