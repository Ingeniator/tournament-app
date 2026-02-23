import type { TournamentFormat } from '@padel/common';
import type { TournamentStrategy } from './types';
import { americanoStrategy } from './americano';
import { mexicanoStrategy } from './mexicano';
import { mixicanoStrategy } from './mixicano';
import { teamAmericanoStrategy } from './teamAmericano';
import { teamMexicanoStrategy } from './teamMexicano';
import { kingOfTheCourtStrategy } from './kingOfTheCourt';

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
registerStrategy('king-of-the-court', kingOfTheCourtStrategy);
