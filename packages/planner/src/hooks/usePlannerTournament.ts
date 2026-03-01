import { useState, useEffect, useCallback } from 'react';
import { ref, set, get, onValue, update as firebaseUpdate } from 'firebase/database';
import type { PlannerTournament, TournamentFormat } from '@padel/common';
import { generateId } from '@padel/common';
import { db } from '../firebase';
import { generateUniqueCode } from '../utils/shortCode';

function migrateClubFormat(format: TournamentFormat, matchMode?: string): TournamentFormat {
  if (format !== ('club-americano' as string)) return format;
  if (matchMode === 'random') return 'club-team-americano';
  if (matchMode === 'standings') return 'club-team-mexicano';
  return 'club-ranked';
}

function toTournament(id: string, data: Record<string, unknown>): PlannerTournament {
  // Firebase returns the entire node including nested children like `players`.
  // Extract only the known PlannerTournament fields to avoid passing opaque
  // objects into React state (which causes "Objects are not valid as a React
  // child" errors when accidentally rendered).
  const courts = data.courts;
  const clubs = data.clubs;
  return {
    id,
    name: data.name as string,
    format: migrateClubFormat(data.format as TournamentFormat, data.matchMode as string | undefined),
    courts: Array.isArray(courts)
      ? courts
      : typeof courts === 'object' && courts !== null
        ? Object.values(courts)
        : [{ id: generateId(), name: 'Court 1' }],
    organizerId: data.organizerId as string,
    code: data.code as string,
    createdAt: data.createdAt as number,
    duration: data.duration as number | undefined,
    date: data.date as string | undefined,
    place: data.place as string | undefined,
    extraSpots: data.extraSpots as number | undefined,
    chatLink: data.chatLink as string | undefined,
    description: data.description as string | undefined,
    locale: data.locale as string | undefined,
    clubs: Array.isArray(clubs)
      ? clubs
      : typeof clubs === 'object' && clubs !== null
        ? Object.values(clubs)
        : undefined,
    groupLabels: data.groupLabels as [string, string] | undefined,
  };
}

export function usePlannerTournament(tournamentId: string | null) {
  const [tournament, setTournament] = useState<PlannerTournament | null>(null);
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Real-time subscription
  useEffect(() => {
    if (!tournamentId || !db) return;
    setLoading(true);
    const unsubscribe = onValue(ref(db, `tournaments/${tournamentId}`), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTournament(toTournament(tournamentId, data));
        setCompletedAt(typeof data.completedAt === 'number' ? data.completedAt : null);
      } else {
        setTournament(null);
        setCompletedAt(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [tournamentId]);

  const createTournament = useCallback(async (name: string, organizerId: string, locale?: string, telegramUsername?: string): Promise<string> => {
    if (!db) throw new Error('Firebase not configured');
    const id = generateId();
    const code = await generateUniqueCode();
    const tournament: PlannerTournament = {
      id,
      name,
      format: 'americano',
      courts: [{ id: generateId(), name: 'Court 1' }],
      organizerId,
      code,
      createdAt: Date.now(),
      duration: 120,
      locale,
    };
    // Atomic multi-path write
    const updates: Record<string, unknown> = {
      [`tournaments/${id}`]: tournament,
      [`codes/${code}`]: id,
      [`users/${organizerId}/organized/${id}`]: true,
    };
    if (telegramUsername) {
      updates[`telegramUsers/${telegramUsername}/organized/${id}`] = true;
      updates[`telegramUsers/${telegramUsername}/currentUid`] = organizerId;
    }
    await firebaseUpdate(ref(db), updates);
    return id;
  }, []);

  const updateTournament = useCallback(async (updates: Partial<Pick<PlannerTournament, 'name' | 'format' | 'courts' | 'duration' | 'date' | 'place' | 'extraSpots' | 'chatLink' | 'description' | 'clubs' | 'groupLabels'>>) => {
    if (!tournamentId || !db) return;
    // Convert undefined to null so Firebase deletes the field
    const pathUpdates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      pathUpdates[`tournaments/${tournamentId}/${k}`] = v === undefined ? null : v;
    }
    await firebaseUpdate(ref(db), pathUpdates);
  }, [tournamentId]);

  const loadByCode = useCallback(async (code: string): Promise<string | null> => {
    if (!db) return null;
    const codeSnapshot = await get(ref(db, `codes/${code.toUpperCase()}`));
    if (codeSnapshot.exists()) {
      return codeSnapshot.val() as string;
    }
    return null;
  }, []);

  const deleteTournament = useCallback(async (organizerId: string) => {
    if (!tournamentId || !db) return;
    // Read fresh tournament data to get the code and player list
    const snapshot = await get(ref(db, `tournaments/${tournamentId}`));
    if (!snapshot.exists()) return;
    const data = snapshot.val() as Record<string, unknown>;

    const deletes: Record<string, null> = {
      [`codes/${data.code as string}`]: null,
      [`tournaments/${tournamentId}`]: null,
      [`users/${organizerId}/organized/${tournamentId}`]: null,
    };
    // Clean up registration indexes for all players
    const players = data.players as Record<string, unknown> | undefined;
    if (players) {
      for (const playerId of Object.keys(players)) {
        deletes[`users/${playerId}/registrations/${tournamentId}`] = null;
      }
    }
    await firebaseUpdate(ref(db), deletes);
  }, [tournamentId]);

  const undoComplete = useCallback(async () => {
    if (!tournamentId || !db) return;
    await set(ref(db, `tournaments/${tournamentId}/completedAt`), null);
  }, [tournamentId]);

  return { tournament, completedAt, loading, createTournament, updateTournament, loadByCode, deleteTournament, undoComplete };
}
