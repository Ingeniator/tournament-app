import { ref, get, update as firebaseUpdate } from 'firebase/database';
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

  const updates: Record<string, unknown> = {};
  updates[`chatRooms/${chatInstance}/tournaments/${tournamentId}`] = {
    name: t.name,
    ...(t.date && { date: t.date }),
    code: t.code,
    organizerId: t.organizerId,
    ...(organizerName && { organizerName }),
    linkedAt: Date.now(),
    linkedBy,
  };
  // Reverse mapping so deletion can find all linked chat rooms
  updates[`tournaments/${tournamentId}/chatRooms/${chatInstance}`] = true;
  await firebaseUpdate(ref(db), updates);
}
