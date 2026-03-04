import type { Tournament, Player, Team } from '@padel/common';
import type { PlannerTournament, PlannerRegistration } from '@padel/common';
import { generateId } from '@padel/common';
import { getPlayerStatuses } from './playerStatus';

const RUNNER_STORAGE_KEY = 'padel-tournament-v1';
const EXPORT_FORMAT = 'padel-tournament-v1';

export function buildRunnerTournament(
  plannerTournament: PlannerTournament,
  registrations: PlannerRegistration[],
  teams?: Team[],
  aliases?: Map<string, string>
): Tournament {
  const capacity = plannerTournament.courts.length * 4 + (plannerTournament.extraSpots ?? 0);
  const statuses = getPlayerStatuses(registrations, capacity, {
    format: plannerTournament.format,
    clubs: plannerTournament.clubs,
    rankLabels: plannerTournament.rankLabels,
  });

  const regIdToRunnerId = new Map<string, string>();
  const players: Player[] = registrations
    .filter(r => statuses.get(r.id) === 'playing')
    .map(r => {
      const runnerId = generateId();
      regIdToRunnerId.set(r.id, runnerId);
      return {
        id: runnerId,
        name: aliases?.get(r.id) ?? r.name,
        ...(r.group ? { group: r.group } : {}),
        ...(r.clubId ? { clubId: r.clubId } : {}),
        ...(r.rankSlot != null ? { rankSlot: r.rankSlot } : {}),
      };
    });

  // When teams are provided from planner, remap player IDs from registration IDs to new runner IDs
  const remappedTeams = teams?.map(t => ({
    ...t,
    player1Id: regIdToRunnerId.get(t.player1Id) ?? t.player1Id,
    player2Id: regIdToRunnerId.get(t.player2Id) ?? t.player2Id,
  }));

  return {
    id: generateId(),
    name: plannerTournament.name,
    config: {
      format: plannerTournament.format,
      pointsPerMatch: plannerTournament.pointsPerMatch ?? 0,
      courts: plannerTournament.courts,
      maxRounds: plannerTournament.maxRounds ?? null,
      targetDuration: plannerTournament.duration,
      ...(plannerTournament.scoringMode ? { scoringMode: plannerTournament.scoringMode } : {}),
      ...(plannerTournament.minutesPerRound ? { minutesPerRound: plannerTournament.minutesPerRound } : {}),
      ...(plannerTournament.maldiciones ? { maldiciones: plannerTournament.maldiciones } : {}),
      ...(plannerTournament.groupLabels ? { groupLabels: plannerTournament.groupLabels } : {}),
      ...(plannerTournament.rankLabels ? { rankLabels: plannerTournament.rankLabels } : {}),
    },
    phase: remappedTeams ? 'team-pairing' : 'setup',
    players,
    rounds: [],
    ...(remappedTeams ? { teams: remappedTeams } : {}),
    ...(plannerTournament.clubs ? { clubs: plannerTournament.clubs } : {}),
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
  registrations: PlannerRegistration[],
  teams?: Team[],
  aliases?: Map<string, string>
): void {
  const tournament = buildRunnerTournament(plannerTournament, registrations, teams, aliases);
  localStorage.setItem(RUNNER_STORAGE_KEY, JSON.stringify(tournament));
  window.location.href = '/play';
}
