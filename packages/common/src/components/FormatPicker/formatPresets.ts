import type { TournamentFormat, TournamentConfig } from '../../types/tournament';

export interface FormatPreset {
  id: string;
  format: TournamentFormat;
  nameKey: string;
  descKey: string;
  category: 'social' | 'competitive' | 'team' | 'club';
  tags: string[];
  requiresGroups?: boolean;
  requiresClubs?: boolean;
  defaultConfig?: Partial<TournamentConfig>;
}

export const FORMAT_PRESETS: FormatPreset[] = [
  // Social
  {
    id: 'americano',
    format: 'americano',
    nameKey: 'format.americano',
    descKey: 'format.americanoDesc',
    category: 'social',
    tags: ['rotating', 'random'],
  },
  {
    id: 'mixed-americano',
    format: 'mixed-americano',
    nameKey: 'format.mixedAmericano',
    descKey: 'format.mixedAmericanoDesc',
    category: 'social',
    tags: ['rotating', 'random', 'groups'],
    requiresGroups: true,
  },
  // Competitive
  {
    id: 'mexicano',
    format: 'mexicano',
    nameKey: 'format.mexicano',
    descKey: 'format.mexicanoDesc',
    category: 'competitive',
    tags: ['rotating', 'standings'],
  },
  {
    id: 'mixicano',
    format: 'mixicano',
    nameKey: 'format.mixicano',
    descKey: 'format.mixicanoDesc',
    category: 'competitive',
    tags: ['rotating', 'standings', 'groups'],
    requiresGroups: true,
  },
  {
    id: 'king-of-the-court',
    format: 'king-of-the-court',
    nameKey: 'format.kingOfTheCourt',
    descKey: 'format.kingOfTheCourtDesc',
    category: 'competitive',
    tags: ['rotating', 'promotion'],
  },
  // Team
  {
    id: 'team-americano',
    format: 'team-americano',
    nameKey: 'format.teamAmericano',
    descKey: 'format.teamAmericanoDesc',
    category: 'team',
    tags: ['fixed', 'random'],
  },
  {
    id: 'team-mexicano',
    format: 'team-mexicano',
    nameKey: 'format.teamMexicano',
    descKey: 'format.teamMexicanoDesc',
    category: 'team',
    tags: ['fixed', 'standings'],
  },
  {
    id: 'mixed-king-of-the-court',
    format: 'mixed-king-of-the-court',
    nameKey: 'format.mixedKingOfTheCourt',
    descKey: 'format.mixedKingOfTheCourtDesc',
    category: 'competitive',
    tags: ['rotating', 'promotion', 'groups'],
    requiresGroups: true,
  },
  // Team
  {
    id: 'mixed-team-americano',
    format: 'mixed-team-americano',
    nameKey: 'format.mixedTeamAmericano',
    descKey: 'format.mixedTeamAmericanoDesc',
    category: 'team',
    tags: ['fixed', 'random', 'groups'],
    requiresGroups: true,
  },
  {
    id: 'mixed-team-mexicano',
    format: 'mixed-team-mexicano',
    nameKey: 'format.mixedTeamMexicano',
    descKey: 'format.mixedTeamMexicanoDesc',
    category: 'team',
    tags: ['fixed', 'standings', 'groups'],
    requiresGroups: true,
  },
  // Club
  {
    id: 'club-americano',
    format: 'club-americano',
    nameKey: 'format.clubAmericano',
    descKey: 'format.clubAmericanoDesc',
    category: 'club',
    tags: ['rotating', 'random', 'clubs'],
    requiresClubs: true,
  },
  {
    id: 'club-mexicano',
    format: 'club-mexicano',
    nameKey: 'format.clubMexicano',
    descKey: 'format.clubMexicanoDesc',
    category: 'club',
    tags: ['rotating', 'standings', 'clubs'],
    requiresClubs: true,
  },
  {
    id: 'club-ranked',
    format: 'club-ranked',
    nameKey: 'format.clubRanked',
    descKey: 'format.clubRankedDesc',
    category: 'club',
    tags: ['fixed', 'slots', 'clubs'],
    requiresClubs: true,
  },
  {
    id: 'club-team-americano',
    format: 'club-team-americano',
    nameKey: 'format.clubTeamAmericano',
    descKey: 'format.clubTeamAmericanoDesc',
    category: 'club',
    tags: ['fixed', 'random', 'clubs'],
    requiresClubs: true,
  },
  {
    id: 'club-team-mexicano',
    format: 'club-team-mexicano',
    nameKey: 'format.clubTeamMexicano',
    descKey: 'format.clubTeamMexicanoDesc',
    category: 'club',
    tags: ['fixed', 'standings', 'clubs'],
    requiresClubs: true,
  },
];

export function getPresetById(id: string): FormatPreset | undefined {
  return FORMAT_PRESETS.find(p => p.id === id);
}

export function getPresetByFormat(format: TournamentFormat): FormatPreset | undefined {
  return FORMAT_PRESETS.find(p => p.format === format);
}

export function getPresetsByCategory(category: FormatPreset['category']): FormatPreset[] {
  return FORMAT_PRESETS.filter(p => p.category === category);
}

export function formatHasGroups(format: TournamentFormat): boolean {
  return ['mixicano', 'mixed-americano', 'mixed-team-americano', 'mixed-team-mexicano', 'mixed-king-of-the-court'].includes(format);
}

export function formatHasClubs(format: TournamentFormat): boolean {
  return ['club-americano', 'club-mexicano', 'club-ranked', 'club-team-americano', 'club-team-mexicano'].includes(format);
}
