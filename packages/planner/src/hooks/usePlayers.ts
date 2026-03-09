import { useState, useEffect, useCallback } from 'react';
import { ref, get, set, update, onValue } from 'firebase/database';
import type { PlannerRegistration } from '@padel/common';
import { generateId } from '@padel/common';
import { db } from '../firebase';
import { resolvePartnerUpdate, type PartnerConstraints, type PartnerRejection } from '../utils/partnerLogic';

export function usePlayers(tournamentId: string | null) {
  const [players, setPlayers] = useState<PlannerRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId || !db) return;
    setLoading(true);
    setError(null);
    const unsubscribe = onValue(
      ref(db, `tournaments/${tournamentId}/players`),
      (snapshot) => {
        setError(null);
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
      },
      (err) => {
        console.warn('Players listener failed:', err.message);
        setError(err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [tournamentId]);

  const registerPlayer = useCallback(async (name: string, uid: string, telegramUsername?: string, extras?: { group?: 'A' | 'B'; clubId?: string; rankSlot?: number }) => {
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
      ...(extras?.group ? { group: extras.group } : {}),
      ...(extras?.clubId ? { clubId: extras.clubId } : {}),
      ...(extras?.rankSlot != null ? { rankSlot: extras.rankSlot } : {}),
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

    // Read player to get telegramUsername for index management
    const playerSnap = await get(ref(db, `tournaments/${tournamentId}/players/${uid}`));
    const tgUsername = playerSnap.exists() ? playerSnap.val()?.telegramUsername : undefined;

    // Build a single atomic update for partner unlink + confirmed flag + indexes
    const atomicUpdates: Record<string, unknown> = {};

    // When cancelling, disconnect the partner link (bidirectional clear)
    if (!confirmed) {
      const { writes } = resolvePartnerUpdate(uid, null, null, players);
      for (const w of writes) {
        for (const [field, value] of Object.entries(w.fields)) {
          atomicUpdates[`tournaments/${tournamentId}/players/${w.playerId}/${field}`] = value;
        }
      }
    }

    // Confirmed flag on player record
    atomicUpdates[`tournaments/${tournamentId}/players/${uid}/confirmed`] = confirmed;
    if (confirmed) {
      atomicUpdates[`tournaments/${tournamentId}/players/${uid}/timestamp`] = Date.now();
    }

    // Registration indexes
    atomicUpdates[`users/${uid}/registrations/${tournamentId}`] = confirmed ? true : null;
    if (tgUsername) {
      atomicUpdates[`telegramUsers/${tgUsername}/registrations/${tournamentId}`] = confirmed ? true : null;
    }

    await update(ref(db), atomicUpdates);
  }, [tournamentId, players]);

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

    // Atomic update: partner unlink + confirmed flag
    const atomicUpdates: Record<string, unknown> = {};

    // When cancelling, disconnect the partner link (bidirectional clear)
    if (!confirmed) {
      const { writes } = resolvePartnerUpdate(playerId, null, null, players);
      for (const w of writes) {
        for (const [field, value] of Object.entries(w.fields)) {
          atomicUpdates[`tournaments/${tournamentId}/players/${w.playerId}/${field}`] = value;
        }
      }
    }

    atomicUpdates[`tournaments/${tournamentId}/players/${playerId}/confirmed`] = confirmed;
    if (confirmed) {
      atomicUpdates[`tournaments/${tournamentId}/players/${playerId}/timestamp`] = Date.now();
    }

    await update(ref(db), atomicUpdates);
  }, [tournamentId, players]);

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

  const updatePlayerGroup = useCallback(async (playerId: string, group: 'A' | 'B' | null) => {
    if (!tournamentId || !db) return;
    await update(ref(db, `tournaments/${tournamentId}/players/${playerId}`), {
      group: group ?? null,
    });
  }, [tournamentId]);

  const updatePlayerClub = useCallback(async (playerId: string, clubId: string | null) => {
    if (!tournamentId || !db) return;
    await update(ref(db, `tournaments/${tournamentId}/players/${playerId}`), {
      clubId: clubId ?? null,
    });
  }, [tournamentId]);

  const updatePlayerRank = useCallback(async (playerId: string, rankSlot: number | null) => {
    if (!tournamentId || !db) return;
    await set(ref(db, `tournaments/${tournamentId}/players/${playerId}/rankSlot`), rankSlot ?? null);
  }, [tournamentId]);

  const updatePlayerPartner = useCallback(async (playerId: string, partnerName: string | null, partnerTelegram: string | null, constraints?: PartnerConstraints, addedBy?: string): Promise<PartnerRejection | null> => {
    if (!tournamentId || !db) return null;
    const { writes, newPlayer, rejected } = resolvePartnerUpdate(playerId, partnerName, partnerTelegram, players, constraints, addedBy);

    if (rejected) return rejected;

    // Flatten all partner writes into a single atomic update
    const atomicUpdates: Record<string, unknown> = {};
    for (const w of writes) {
      for (const [field, value] of Object.entries(w.fields)) {
        atomicUpdates[`tournaments/${tournamentId}/players/${w.playerId}/${field}`] = value;
      }
    }
    if (newPlayer) {
      const partnerId = generateId();
      atomicUpdates[`tournaments/${tournamentId}/players/${partnerId}`] = newPlayer.data;
    }
    if (Object.keys(atomicUpdates).length > 0) {
      await update(ref(db), atomicUpdates);
    }
    return null;
  }, [tournamentId, players]);

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
    // Clear addedByPartner — the player has claimed their spot
    const { addedByPartner: _, ...cleanData } = playerData;
    await update(ref(db), {
      [`tournaments/${tournamentId}/players/${orphanId}`]: null,
      [`tournaments/${tournamentId}/players/${newUid}`]: { ...cleanData, telegramUsername },
    });

    // Set up indexes separately to avoid cross-node permission issues
    await set(ref(db, `users/${newUid}/registrations/${tournamentId}`), true);
    await set(ref(db, `telegramUsers/${telegramUsername}/registrations/${tournamentId}`), true);
  }, [tournamentId]);

  const updateCaptainApproval = useCallback(async (playerId: string, approved: boolean) => {
    if (!tournamentId || !db) return;
    await update(ref(db, `tournaments/${tournamentId}/players/${playerId}`), {
      captainApproved: approved,
    });
  }, [tournamentId]);

  const isRegistered = useCallback((uid: string): boolean => {
    return players.some(p => p.id === uid);
  }, [players]);

  return { players, loading, error, registerPlayer, removePlayer, updateConfirmed, addPlayer, bulkAddPlayers, toggleConfirmed, updatePlayerName, updatePlayerTelegram, updatePlayerGroup, updatePlayerClub, updatePlayerRank, updatePlayerPartner, updateCaptainApproval, isRegistered, claimOrphanRegistration };
}
