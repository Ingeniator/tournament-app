import { useState, useEffect, useCallback } from 'react';
import { ref, set, update, remove, onValue } from 'firebase/database';
import type { PlannerRegistration } from '@padel/common';
import { generateId } from '@padel/common';
import { db } from '../firebase';

export function usePlayers(tournamentId: string | null) {
  const [players, setPlayers] = useState<PlannerRegistration[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tournamentId || !db) {
      setPlayers([]);
      return;
    }
    setLoading(true);
    const unsubscribe = onValue(ref(db, `tournaments/${tournamentId}/players`), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([key, val]) => ({
          ...(val as Omit<PlannerRegistration, 'id'>),
          id: key,
        }));
        list.sort((a, b) => a.timestamp - b.timestamp);
        setPlayers(list);
      } else {
        setPlayers([]);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [tournamentId]);

  const registerPlayer = useCallback(async (name: string, uid: string, telegramUsername?: string) => {
    if (!tournamentId || !db) return;
    // Rules require $playerId === auth.uid, so use uid as key
    await set(ref(db, `tournaments/${tournamentId}/players/${uid}`), {
      name,
      timestamp: Date.now(),
      ...(telegramUsername ? { telegramUsername } : {}),
    });
    // Index in user's registrations for listing
    await set(ref(db, `users/${uid}/registrations/${tournamentId}`), true);
  }, [tournamentId]);

  const removePlayer = useCallback(async (playerId: string) => {
    if (!tournamentId || !db) return;
    // Only organizer can remove (via parent tournament write rule)
    await remove(ref(db, `tournaments/${tournamentId}/players/${playerId}`));
  }, [tournamentId]);

  const updateConfirmed = useCallback(async (uid: string, confirmed: boolean) => {
    if (!tournamentId || !db) return;
    await update(ref(db, `tournaments/${tournamentId}/players/${uid}`), {
      confirmed,
      ...(confirmed ? { timestamp: Date.now() } : {}),
    });
  }, [tournamentId]);

  const addPlayer = useCallback(async (name: string) => {
    if (!tournamentId || !db) return;
    const id = generateId();
    await set(ref(db, `tournaments/${tournamentId}/players/${id}`), {
      name,
      timestamp: Date.now(),
      confirmed: true,
    });
  }, [tournamentId]);

  const bulkAddPlayers = useCallback(async (names: string[]) => {
    if (!tournamentId || !db || names.length === 0) return;
    const updates: Record<string, object> = {};
    const now = Date.now();
    for (const name of names) {
      const id = generateId();
      updates[`tournaments/${tournamentId}/players/${id}`] = {
        name,
        timestamp: now,
        confirmed: true,
      };
    }
    await update(ref(db), updates);
  }, [tournamentId]);

  const toggleConfirmed = useCallback(async (playerId: string, currentConfirmed: boolean) => {
    if (!tournamentId || !db) return;
    const confirmed = !currentConfirmed;
    await update(ref(db, `tournaments/${tournamentId}/players/${playerId}`), {
      confirmed,
      ...(confirmed ? { timestamp: Date.now() } : {}),
    });
  }, [tournamentId]);

  const updatePlayerName = useCallback(async (playerId: string, name: string) => {
    if (!tournamentId || !db) return;
    await update(ref(db, `tournaments/${tournamentId}/players/${playerId}`), { name });
  }, [tournamentId]);

  const isRegistered = useCallback((uid: string): boolean => {
    return players.some(p => p.id === uid);
  }, [players]);

  return { players, loading, registerPlayer, removePlayer, updateConfirmed, addPlayer, bulkAddPlayers, toggleConfirmed, updatePlayerName, isRegistered };
}
