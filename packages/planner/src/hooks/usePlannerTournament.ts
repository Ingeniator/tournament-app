import { useState, useEffect, useCallback } from 'react';
import { ref, set, get, onValue } from 'firebase/database';
import type { PlannerTournament, Court } from '@padel/common';
import { generateId } from '@padel/common';
import { db } from '../firebase';
import { generateUniqueCode } from '../utils/shortCode';

export function usePlannerTournament(tournamentId: string | null) {
  const [tournament, setTournament] = useState<PlannerTournament | null>(null);
  const [loading, setLoading] = useState(false);

  // Real-time subscription
  useEffect(() => {
    if (!tournamentId || !db) {
      setTournament(null);
      return;
    }
    setLoading(true);
    const unsubscribe = onValue(ref(db, `tournaments/${tournamentId}`), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTournament({ ...data, id: tournamentId });
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
    await set(ref(db, `tournaments/${id}`), tournament);
    await set(ref(db, `codes/${code}`), id);
    // Index in user's organized list for listing
    await set(ref(db, `users/${organizerId}/organized/${id}`), true);
    return id;
  }, []);

  const updateTournament = useCallback(async (updates: Partial<Pick<PlannerTournament, 'name' | 'format' | 'pointsPerMatch' | 'courts' | 'maxRounds' | 'date' | 'place' | 'extraSpots'>>) => {
    if (!tournamentId || !db) return;
    const snapshot = await get(ref(db, `tournaments/${tournamentId}`));
    if (!snapshot.exists()) return;
    const current = snapshot.val() as PlannerTournament;
    await set(ref(db, `tournaments/${tournamentId}`), { ...current, ...updates });
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

  return { tournament, loading, createTournament, updateTournament, updateCourts, loadByCode };
}
