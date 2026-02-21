import { ref, get } from 'firebase/database';
import { db, signIn } from '../firebase';

const RUNNER_STORAGE_KEY = 'padel-tournament-v1';

export async function restoreFromBackup(plannerTournamentId: string): Promise<boolean> {
  try {
    if (!db) return false;
    await signIn();
    const snap = await get(ref(db, `tournaments/${plannerTournamentId}/runnerData`));
    if (!snap.exists()) return false;
    localStorage.setItem(RUNNER_STORAGE_KEY, JSON.stringify(snap.val()));
    window.location.href = '/play';
    return true;
  } catch {
    return false;
  }
}
