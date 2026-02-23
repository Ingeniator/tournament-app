import { useState, useEffect, useCallback } from 'react';
import { ref, get, set, update, onValue } from 'firebase/database';
import type { PlannerRegistration } from '@padel/common';
import { generateId } from '@padel/common';
import { db } from '../firebase';

export function usePlayers(tournamentId: string | null) {
  const [players, setPlayers] = useState<PlannerRegistration[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tournamentId || !db) return;
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

    // Prevent duplicate: skip if this UID is already registered
    const existing = await get(ref(db, `tournaments/${tournamentId}/players/${uid}`));
    if (existing.exists()) return;

    // Prevent duplicate: skip if same Telegram user registered under a
    // different UID (happens when WebView storage is cleared between sessions)
    if (telegramUsername && players.some(p => p.telegramUsername === telegramUsername)) return;

    const playerData = {
      name,
      timestamp: Date.now(),
      ...(telegramUsername ? { telegramUsername } : {}),
    };

    // Atomic write: player record + per-device index + per-person index (if Telegram)
    const updates: Record<string, unknown> = {
      [`tournaments/${tournamentId}/players/${uid}`]: playerData,
      [`users/${uid}/registrations/${tournamentId}`]: true,
    };
    if (telegramUsername) {
      updates[`telegramUsers/${telegramUsername}/registrations/${tournamentId}`] = true;
      updates[`telegramUsers/${telegramUsername}/currentUid`] = uid;
    }
    await update(ref(db), updates);
  }, [tournamentId, players]);

  const removePlayer = useCallback(async (playerId: string) => {
    if (!tournamentId || !db) return;
    // Read player to get telegramUsername for index cleanup
    const playerSnap = await get(ref(db, `tournaments/${tournamentId}/players/${playerId}`));
    const tgUsername = playerSnap.exists() ? playerSnap.val()?.telegramUsername : undefined;

    // Atomically remove the player entry, registration index, and telegram index
    const updates: Record<string, null> = {
      [`tournaments/${tournamentId}/players/${playerId}`]: null,
      [`users/${playerId}/registrations/${tournamentId}`]: null,
    };
    if (tgUsername) {
      updates[`telegramUsers/${tgUsername}/registrations/${tournamentId}`] = null;
    }
    await update(ref(db), updates);
  }, [tournamentId]);

  const updateConfirmed = useCallback(async (uid: string, confirmed: boolean) => {
    if (!tournamentId || !db) return;
    await update(ref(db, `tournaments/${tournamentId}/players/${uid}`), {
      confirmed,
      ...(confirmed ? { timestamp: Date.now() } : {}),
    });
  }, [tournamentId]);

  const addPlayer = useCallback(async (name: string, telegramUsername?: string) => {
    if (!tournamentId || !db) return;
    const id = generateId();
    await set(ref(db, `tournaments/${tournamentId}/players/${id}`), {
      name,
      timestamp: Date.now(),
      confirmed: true,
      ...(telegramUsername ? { telegramUsername } : {}),
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

  const updatePlayerTelegram = useCallback(async (playerId: string, telegramUsername: string | null) => {
    if (!tournamentId || !db) return;
    await update(ref(db, `tournaments/${tournamentId}/players/${playerId}`), {
      telegramUsername: telegramUsername || null,
    });
  }, [tournamentId]);

  /**
   * Claim a registration that was manually added by the organizer with a
   * telegramUsername. Moves the player record from the random orphan ID to
   * the real Firebase UID so the Telegram user can manage their own
   * participation (cancel, edit name, etc.).
   */
  const claimOrphanRegistration = useCallback(async (orphanId: string, newUid: string, telegramUsername: string) => {
    if (!tournamentId || !db) return;

    const playerSnap = await get(ref(db, `tournaments/${tournamentId}/players/${orphanId}`));
    if (!playerSnap.exists()) return;

    const playerData = playerSnap.val();
    if (playerData.telegramUsername !== telegramUsername) return;

    // Already claimed by this UID
    const existing = await get(ref(db, `tournaments/${tournamentId}/players/${newUid}`));
    if (existing.exists()) return;

    // Move player record atomically (delete orphan + create under real UID)
    await update(ref(db), {
      [`tournaments/${tournamentId}/players/${orphanId}`]: null,
      [`tournaments/${tournamentId}/players/${newUid}`]: { ...playerData, telegramUsername },
    });

    // Set up indexes separately to avoid cross-node permission issues
    await set(ref(db, `users/${newUid}/registrations/${tournamentId}`), true);
    await set(ref(db, `telegramUsers/${telegramUsername}/registrations/${tournamentId}`), true);
  }, [tournamentId]);

  const isRegistered = useCallback((uid: string): boolean => {
    return players.some(p => p.id === uid);
  }, [players]);

  return { players, loading, registerPlayer, removePlayer, updateConfirmed, addPlayer, bulkAddPlayers, toggleConfirmed, updatePlayerName, updatePlayerTelegram, isRegistered, claimOrphanRegistration };
}
