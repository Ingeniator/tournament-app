import type { TournamentFormat } from '@padel/common';
import type { TournamentStrategy } from './types';
import { americanoStrategy } from './americano';
import { mexicanoStrategy } from './mexicano';
import { mixicanoStrategy } from './mixicano';
import { teamAmericanoStrategy } from './teamAmericano';

export type { TournamentStrategy, ScheduleResult } from './types';
export { scoreSchedule } from './americano';

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

// Register built-in strategies
registerStrategy('americano', americanoStrategy);
registerStrategy('mexicano', mexicanoStrategy);
registerStrategy('mixicano', mixicanoStrategy);
registerStrategy('team-americano', teamAmericanoStrategy);
