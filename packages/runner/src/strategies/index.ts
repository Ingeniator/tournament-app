import type { TournamentFormat } from '@padel/common';
import type { TournamentStrategy } from './types';
import { americanoStrategy, mixedAmericanoStrategy } from './americano';
import { mexicanoStrategy, mixicanoStrategy } from './mexicano';
import { teamAmericanoStrategy } from './teamAmericano';
import { teamMexicanoStrategy } from './teamMexicano';
import { kingOfTheCourtStrategy, mixedKingOfTheCourtStrategy } from './kingOfTheCourt';
import { clubAmericanoStrategy } from './clubAmericano';
import { clubRankedStrategy } from './clubRanked';
import { clubTeamAmericanoStrategy } from './clubTeamAmericano';
import { clubMexicanoStrategy } from './clubMexicano';
import { clubTeamMexicanoStrategy } from './clubTeamMexicano';

export type { TournamentStrategy, ScheduleResult } from './types';
export { scoreSchedule } from './shared';

const registry = new Map<TournamentFormat, TournamentStrategy>();

export function registerStrategy(format: TournamentFormat, strategy: TournamentStrategy): void {
  registry.set(format, strategy);
}

export function getStrategy(format: TournamentFormat): TournamentStrategy {
  const strategy = registry.get(format);
  if (!strategy) {
    throw new Error(`No strategy registered for format: ${format}`);
  }
  return strategy;
}

export function getRegisteredFormats(): TournamentFormat[] {
  return [...registry.keys()];
}

// Register built-in strategies
registerStrategy('americano', americanoStrategy);
registerStrategy('mexicano', mexicanoStrategy);
registerStrategy('mixicano', mixicanoStrategy);
registerStrategy('team-americano', teamAmericanoStrategy);
registerStrategy('team-mexicano', teamMexicanoStrategy);
registerStrategy('mixed-team-americano', teamAmericanoStrategy);
registerStrategy('mixed-team-mexicano', teamMexicanoStrategy);
registerStrategy('king-of-the-court', kingOfTheCourtStrategy);
registerStrategy('mixed-king-of-the-court', mixedKingOfTheCourtStrategy);
registerStrategy('club-americano', clubAmericanoStrategy);
registerStrategy('club-mexicano', clubMexicanoStrategy);
registerStrategy('club-ranked', clubRankedStrategy);
registerStrategy('club-team-americano', clubTeamAmericanoStrategy);
registerStrategy('club-team-mexicano', clubTeamMexicanoStrategy);
registerStrategy('mixed-americano', mixedAmericanoStrategy);
