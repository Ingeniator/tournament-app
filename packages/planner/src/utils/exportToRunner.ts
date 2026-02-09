import type { Tournament, Player } from '@padel/common';
import type { PlannerTournament, PlannerRegistration } from '@padel/common';
import { generateId } from '@padel/common';

const RUNNER_STORAGE_KEY = 'padel-tournament-v1';

export function buildRunnerTournament(
  plannerTournament: PlannerTournament,
  registrations: PlannerRegistration[]
): Tournament {
  const players: Player[] = registrations
    .filter(r => r.confirmed !== false)
    .map(r => ({
      id: generateId(),
      name: r.name,
    }));

  return {
    id: generateId(),
    name: plannerTournament.name,
    config: {
      format: plannerTournament.format,
      pointsPerMatch: plannerTournament.pointsPerMatch,
      courts: plannerTournament.courts,
      maxRounds: plannerTournament.maxRounds,
    },
    phase: 'setup',
    players,
    rounds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function launchInRunner(
  plannerTournament: PlannerTournament,
  registrations: PlannerRegistration[]
): void {
  const tournament = buildRunnerTournament(plannerTournament, registrations);
  localStorage.setItem(RUNNER_STORAGE_KEY, JSON.stringify(tournament));
  window.location.href = '/play';
}
