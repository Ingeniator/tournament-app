import type { Tournament, Player } from '@padel/common';
import type { PlannerTournament, PlannerRegistration } from '@padel/common';
import { generateId } from '@padel/common';
import { getPlayerStatuses } from './playerStatus';

const RUNNER_STORAGE_KEY = 'padel-tournament-v1';
const EXPORT_FORMAT = 'padel-tournament-v1';

export function buildRunnerTournament(
  plannerTournament: PlannerTournament,
  registrations: PlannerRegistration[]
): Tournament {
  const capacity = plannerTournament.courts.length * 4 + (plannerTournament.extraSpots ?? 0);
  const statuses = getPlayerStatuses(registrations, capacity);

  const players: Player[] = registrations
    .filter(r => statuses.get(r.id) === 'playing')
    .map(r => ({
      id: generateId(),
      name: r.name,
    }));

  return {
    id: generateId(),
    name: plannerTournament.name,
    config: {
      format: plannerTournament.format,
      pointsPerMatch: 0,
      courts: plannerTournament.courts,
      maxRounds: null,
      targetDuration: plannerTournament.duration,
    },
    phase: 'setup',
    players,
    rounds: [],
    plannerTournamentId: plannerTournament.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function exportRunnerTournamentJSON(
  plannerTournament: PlannerTournament,
  registrations: PlannerRegistration[]
): string {
  const tournament = buildRunnerTournament(plannerTournament, registrations);
  return JSON.stringify({ _format: EXPORT_FORMAT, tournament }, null, 2);
}

export function launchInRunner(
  plannerTournament: PlannerTournament,
  registrations: PlannerRegistration[]
): void {
  const tournament = buildRunnerTournament(plannerTournament, registrations);
  localStorage.setItem(RUNNER_STORAGE_KEY, JSON.stringify(tournament));
  window.location.href = '/play';
}
