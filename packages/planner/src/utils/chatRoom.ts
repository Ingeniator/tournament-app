import { ref, get, set } from 'firebase/database';
import { db } from '../firebase';

export async function linkTournamentToChat(
  tournamentId: string,
  chatInstance: string,
  linkedBy: string,
): Promise<void> {
  if (!db) return;

  const entryRef = ref(db, `chatRooms/${chatInstance}/tournaments/${tournamentId}`);

  // Skip if already linked
  const existing = await get(entryRef);
  if (existing.exists()) return;

  // Read tournament metadata
  const tSnap = await get(ref(db, `tournaments/${tournamentId}`));
  if (!tSnap.exists()) return;
  const t = tSnap.val() as { name: string; date?: string; code: string; organizerId: string };

  // Read organizer name
  const nameSnap = await get(ref(db, `users/${t.organizerId}/name`));
  const organizerName = nameSnap.exists() ? (nameSnap.val() as string) : undefined;

  await set(entryRef, {
    name: t.name,
    ...(t.date && { date: t.date }),
    code: t.code,
    ...(organizerName && { organizerName }),
    linkedAt: Date.now(),
    linkedBy,
  });
}
