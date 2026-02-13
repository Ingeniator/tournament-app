import { useState, useEffect, useCallback } from 'react';
import { ref, set, get, onValue, update as firebaseUpdate } from 'firebase/database';
import type { PlannerTournament, Court, TournamentFormat } from '@padel/common';
import { generateId } from '@padel/common';
import { db } from '../firebase';
import { generateUniqueCode } from '../utils/shortCode';

function toTournament(id: string, data: Record<string, unknown>): PlannerTournament {
  // Firebase returns the entire node including nested children like `players`.
  // Extract only the known PlannerTournament fields to avoid passing opaque
  // objects into React state (which causes "Objects are not valid as a React
  // child" errors when accidentally rendered).
  const courts = data.courts;
  return {
    id,
    name: data.name as string,
    format: data.format as TournamentFormat,
    pointsPerMatch: data.pointsPerMatch as number,
    courts: Array.isArray(courts)
      ? courts
      : typeof courts === 'object' && courts !== null
        ? Object.values(courts)
        : [{ id: generateId(), name: 'Court 1' }],
    maxRounds: (data.maxRounds as number | null) ?? null,
    organizerId: data.organizerId as string,
    code: data.code as string,
    createdAt: data.createdAt as number,
    date: data.date as string | undefined,
    place: data.place as string | undefined,
    extraSpots: data.extraSpots as number | undefined,
    chatLink: data.chatLink as string | undefined,
    description: data.description as string | undefined,
  };
}

export function usePlannerTournament(tournamentId: string | null) {
  const [tournament, setTournament] = useState<PlannerTournament | null>(null);
  const [loading, setLoading] = useState(false);

  // Real-time subscription
  useEffect(() => {
    if (!tournamentId || !db) return;
    setLoading(true);
    const unsubscribe = onValue(ref(db, `tournaments/${tournamentId}`), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTournament(toTournament(tournamentId, data));
      } else {
        setTournament(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [tournamentId]);

  const createTournament = useCallback(async (name: string, organizerId: string): Promise<string> => {
    if (!db) throw new Error('Firebase not configured');
    const id = generateId();
    const code = await generateUniqueCode();
    const tournament: PlannerTournament = {
      id,
      name,
      format: 'americano',
      pointsPerMatch: 24,
      courts: [{ id: generateId(), name: 'Court 1' }],
      maxRounds: null,
      organizerId,
      code,
      createdAt: Date.now(),
    };
    // Atomic multi-path write
    await firebaseUpdate(ref(db), {
      [`tournaments/${id}`]: tournament,
      [`codes/${code}`]: id,
      [`users/${organizerId}/organized/${id}`]: true,
    });
    return id;
  }, []);

  const updateTournament = useCallback(async (updates: Partial<Pick<PlannerTournament, 'name' | 'format' | 'pointsPerMatch' | 'courts' | 'maxRounds' | 'date' | 'place' | 'extraSpots' | 'chatLink' | 'description'>>) => {
    if (!tournamentId || !db) return;
    // Convert undefined to null so Firebase deletes the field
    const pathUpdates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      pathUpdates[`tournaments/${tournamentId}/${k}`] = v === undefined ? null : v;
    }
    await firebaseUpdate(ref(db), pathUpdates);
  }, [tournamentId]);

  const updateCourts = useCallback(async (courts: Court[]) => {
    if (!tournamentId || !db) return;
    await set(ref(db, `tournaments/${tournamentId}/courts`), courts);
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

  return { tournament, loading, createTournament, updateTournament, updateCourts, loadByCode, deleteTournament };
}
