import { useState, useEffect, useRef } from 'react';
import { ref, onValue, get, remove, set } from 'firebase/database';
import type { PadelEventSummary, EventTournamentLink } from '@padel/common';
import { db } from '../firebase';

function toSummary(id: string, data: Record<string, unknown>): PadelEventSummary {
  const tournaments = data.tournaments;
  return {
    id,
    name: data.name as string,
    date: data.date as string,
    code: (data.code as string) ?? '',
    tournamentCount: Array.isArray(tournaments) ? (tournaments as EventTournamentLink[]).length : 0,
    createdAt: data.createdAt as number,
  };
}

/** Track that a user visited an event */
export async function markEventVisited(uid: string, eventId: string): Promise<void> {
  if (!db) return;
  await set(ref(db, `users/${uid}/visitedEvents/${eventId}`), true);
}

/** Live list of events the user has visited (but not created) */
export function useVisitedEvents(uid: string | null, createdEventIds: Set<string>) {
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
    const unsubscribe = onValue(ref(db, `users/${uid}/visitedEvents`), async (snapshot) => {
      const version = ++versionRef.current;
      const data = snapshot.val() as Record<string, boolean> | null;
      if (!data) {
        setEvents([]);
        setLoading(false);
        return;
      }

      // Exclude events the user created (those show in Organizer tab)
      const ids = Object.keys(data).filter(id => !createdEventIds.has(id));
      const results: PadelEventSummary[] = [];

      try {
        await Promise.all(ids.map(async (id) => {
          const snap = await get(ref(db!, `events/${id}`));
          if (!snap.exists()) {
            remove(ref(db!, `users/${uid}/visitedEvents/${id}`));
            return;
          }
          results.push(toSummary(id, snap.val()));
        }));
      } catch {
        // Network or permission error
      }

      if (version !== versionRef.current) return;

      results.sort((a, b) => {
        if (a.date && b.date) return b.date.localeCompare(a.date);
        if (a.date) return -1;
        if (b.date) return 1;
        return b.createdAt - a.createdAt;
      });
      setEvents(results);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid, createdEventIds]);

  return { events, loading };
}
