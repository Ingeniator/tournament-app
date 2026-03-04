import type { PlannerRegistration, PlannerTournament } from '@padel/common';
import { formatHasFixedPartners, formatHasClubs } from '@padel/common';
import type { PlayerStatus } from './playerStatus';

/**
 * Validates whether a tournament is ready to launch.
 * Returns a translation key (with params) or null if valid.
 */
export function validateLaunch(
  tournament: PlannerTournament,
  players: PlannerRegistration[],
  statuses: Map<string, PlayerStatus>,
): { key: string; params?: Record<string, number> } | null {
  const playingPlayers = players.filter(p => statuses.get(p.id) === 'playing');
  const count = playingPlayers.length;

  // Check for needs-partner players in pair formats
  const isTeamFormat = formatHasFixedPartners(tournament.format);
  if (isTeamFormat) {
    const needsPartner = players.filter(p => statuses.get(p.id) === 'needs-partner').length;
    if (needsPartner > 0) return { key: 'organizer.validationNeedsPartner', params: { count: needsPartner } };
  }

  if (count < 4) return { key: 'organizer.validationMinPlayers' };

  if (isTeamFormat && count % 2 !== 0) return { key: 'organizer.validationEvenPlayers' };

  const isClub = formatHasClubs(tournament.format);
  if (isClub) {
    const unassigned = playingPlayers.filter(p => !p.clubId).length;
    if (unassigned > 0) return { key: 'organizer.validationUnassignedClubs', params: { count: unassigned } };
  }

  const maxCourts = isTeamFormat
    ? Math.floor(Math.floor(count / 2) / 2)
    : Math.floor(count / 4);
  if (tournament.courts.length > maxCourts && maxCourts > 0) {
    return { key: 'organizer.validationTooManyCourts', params: { courts: tournament.courts.length, max: maxCourts } };
  }

  return null;
}
