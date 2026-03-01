import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, update as firebaseUpdate } from 'firebase/database';
import type { PadelEvent, EventRankingRules, EventTournamentLink } from '@padel/common';
import { generateId } from '@padel/common';
import { db } from '../firebase';

const DEFAULT_RULES: EventRankingRules = {
  pointsPerWin: 3,
  pointsPerDraw: 1,
  pointsPerLoss: 0,
  tiebreaker: 'pointDifference',
};

function toEvent(id: string, data: Record<string, unknown>): PadelEvent {
  const tournaments = data.tournaments;
  return {
    id,
    name: data.name as string,
    date: data.date as string,
    tournaments: Array.isArray(tournaments)
      ? tournaments.map((t: EventTournamentLink) => ({
          tournamentId: t.tournamentId,
          weight: t.weight ?? 1,
        }))
      : [],
    rankingRules: (data.rankingRules as EventRankingRules) ?? DEFAULT_RULES,
    organizerId: data.organizerId as string,
    createdAt: data.createdAt as number,
    updatedAt: data.updatedAt as number,
  };
}

export function useEvent(eventId: string | null) {
  const [event, setEvent] = useState<PadelEvent | null>(null);
  const [loading, setLoading] = useState(false);

  // Real-time subscription
  useEffect(() => {
    if (!eventId || !db) return;
    setLoading(true);
    const unsubscribe = onValue(ref(db, `events/${eventId}`), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setEvent(toEvent(eventId, data));
      } else {
        setEvent(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [eventId]);

  const createEvent = useCallback(async (
    name: string,
    date: string,
    organizerId: string,
    rankingRules?: EventRankingRules,
  ): Promise<string> => {
    if (!db) throw new Error('Firebase not configured');
    const id = generateId();
    const now = Date.now();
    const padelEvent: PadelEvent = {
      id,
      name,
      date,
      tournaments: [],
      rankingRules: rankingRules ?? DEFAULT_RULES,
      organizerId,
      createdAt: now,
      updatedAt: now,
    };
    const updates: Record<string, unknown> = {
      [`events/${id}`]: padelEvent,
      [`users/${organizerId}/events/${id}`]: true,
    };
    await firebaseUpdate(ref(db), updates);
    return id;
  }, []);

  const updateEvent = useCallback(async (
    updates: Partial<Pick<PadelEvent, 'name' | 'date' | 'rankingRules' | 'tournaments'>>,
  ) => {
    if (!eventId || !db) return;
    const pathUpdates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      pathUpdates[`events/${eventId}/${k}`] = v === undefined ? null : v;
    }
    pathUpdates[`events/${eventId}/updatedAt`] = Date.now();
    await firebaseUpdate(ref(db), pathUpdates);
  }, [eventId]);

  const linkTournament = useCallback(async (tournamentId: string, weight = 1) => {
    if (!eventId || !db || !event) return;
    const existing = event.tournaments.find(t => t.tournamentId === tournamentId);
    if (!existing) {
      const tournaments = [...event.tournaments, { tournamentId, weight }];
      await updateEvent({ tournaments });
    }
  }, [eventId, event, updateEvent]);

  const unlinkTournament = useCallback(async (tournamentId: string) => {
    if (!eventId || !db || !event) return;
    const tournaments = event.tournaments.filter(t => t.tournamentId !== tournamentId);
    await updateEvent({ tournaments });
  }, [eventId, event, updateEvent]);

  const updateTournamentWeight = useCallback(async (tournamentId: string, weight: number) => {
    if (!eventId || !db || !event) return;
    const tournaments = event.tournaments.map(t =>
      t.tournamentId === tournamentId ? { ...t, weight } : t
    );
    await updateEvent({ tournaments });
  }, [eventId, event, updateEvent]);

  const deleteEvent = useCallback(async (organizerId: string) => {
    if (!eventId || !db) return;
    const deletes: Record<string, null> = {
      [`events/${eventId}`]: null,
      [`users/${organizerId}/events/${eventId}`]: null,
    };
    await firebaseUpdate(ref(db), deletes);
  }, [eventId]);

  return {
    event,
    loading,
    createEvent,
    updateEvent,
    linkTournament,
    unlinkTournament,
    updateTournamentWeight,
    deleteEvent,
  };
}
