import { ref, get } from 'firebase/database';
import { db, signIn } from '../firebase';

const RUNNER_STORAGE_KEY = 'padel-tournament-v1';

/**
 * Firebase strips empty arrays and null values.
 * Restore them so the runner app doesn't crash on missing fields.
 */
function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  // Ensure top-level arrays
  if (!Array.isArray(data.rounds)) data.rounds = [];
  if (!Array.isArray(data.players)) data.players = [];

  // Restore nulls that Firebase deletes
  const config = data.config as Record<string, unknown> | undefined;
  if (config && !('maxRounds' in config)) config.maxRounds = null;

  // Ensure each round has sitOuts and matches arrays
  for (const round of data.rounds as Record<string, unknown>[]) {
    if (!Array.isArray(round.sitOuts)) round.sitOuts = [];
    if (!Array.isArray(round.matches)) round.matches = [];
    for (const match of round.matches as Record<string, unknown>[]) {
      if (!Array.isArray(match.team1)) match.team1 = [];
      if (!Array.isArray(match.team2)) match.team2 = [];
    }
  }

  return data;
}

export async function restoreFromBackup(plannerTournamentId: string): Promise<boolean> {
  try {
    if (!db) return false;
    await signIn();
    const snap = await get(ref(db, `tournaments/${plannerTournamentId}/runnerData`));
    if (!snap.exists()) return false;
    const data = sanitize(snap.val());
    localStorage.setItem(RUNNER_STORAGE_KEY, JSON.stringify(data));
    window.location.href = '/play';
    return true;
  } catch {
    return false;
  }
}
