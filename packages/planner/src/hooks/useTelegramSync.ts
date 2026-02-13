import { useEffect, useState } from 'react';
import { ref, get, set, update } from 'firebase/database';
import { db } from '../firebase';

/**
 * Cross-device sync for Telegram users.
 *
 * On app open, checks if this device's UID matches the stored currentUid
 * for the telegramUsername. If not, performs a claim sweep: iterates all
 * tournaments in the telegram index and moves registrations from the old
 * UID to the new one. Old device's registration index entries are cleaned
 * atomically during the sweep to prevent stale data.
 */
export function useTelegramSync(uid: string | null, telegramUsername: string | undefined) {
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!uid || !telegramUsername || !db) return;
    let cancelled = false;

    (async () => {
      // Ensure this UID's telegramUsername is stored in Firebase before
      // any claim operations (security rules reference it via root lookup)
      await set(ref(db, `users/${uid}/telegramUsername`), telegramUsername);

      const tgRef = ref(db, `telegramUsers/${telegramUsername}`);
      const snap = await get(tgRef);

      if (cancelled) return;

      const currentUid: string | undefined = snap.child('currentUid').val();

      // First time or same device — just ensure currentUid is set
      if (!currentUid || currentUid === uid) {
        await update(ref(db, `telegramUsers/${telegramUsername}`), { currentUid: uid });
        return;
      }

      // Different device detected — claim sweep
      setSyncing(true);

      const registrations = snap.child('registrations').val() as Record<string, boolean> | null;
      if (registrations) {
        for (const tournamentId of Object.keys(registrations)) {
          if (cancelled) return;

          const playerSnap = await get(ref(db, `tournaments/${tournamentId}/players/${currentUid}`));
          if (!playerSnap.exists()) continue;

          // Check that this is indeed the same telegram user
          const playerData = playerSnap.val();
          if (playerData.telegramUsername !== telegramUsername) continue;

          // Already claimed by new UID
          const newPlayerSnap = await get(ref(db, `tournaments/${tournamentId}/players/${uid}`));
          if (newPlayerSnap.exists()) continue;

          // Atomic claim: move player from old UID to new UID
          await update(ref(db), {
            [`tournaments/${tournamentId}/players/${currentUid}`]: null,
            [`tournaments/${tournamentId}/players/${uid}`]: { ...playerData, telegramUsername },
            [`users/${currentUid}/registrations/${tournamentId}`]: null,
            [`users/${uid}/registrations/${tournamentId}`]: true,
          });
        }
      }

      if (cancelled) return;

      // Update currentUid to point to this device
      await update(ref(db, `telegramUsers/${telegramUsername}`), { currentUid: uid });

      setSyncing(false);
    })();

    return () => { cancelled = true; };
  }, [uid, telegramUsername]);

  return { syncing };
}
