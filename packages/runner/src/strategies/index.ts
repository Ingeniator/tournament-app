import type { TournamentFormat } from '@padel/common';
import type { TournamentStrategy } from './types';
import { americanoStrategy } from './americano';

export type { TournamentStrategy, ScheduleResult } from './types';

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
