import { bench, describe } from 'vitest';
import { americanoStrategy } from './americano';
import type { Player, TournamentConfig } from '@padel/common';

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
}

function makeConfig(numCourts: number, maxRounds: number): TournamentConfig {
  return {
    format: 'americano',
    pointsPerMatch: 21,
    courts: Array.from({ length: numCourts }, (_, i) => ({ id: `c${i + 1}`, name: `Court ${i + 1}` })),
    maxRounds,
  };
}

describe('generateSchedule', () => {
  bench('5p / 1c / 4r', () => {
    americanoStrategy.generateSchedule(makePlayers(5), makeConfig(1, 4));
  }, { iterations: 20, warmupIterations: 2 });

  bench('8p / 2c / 7r', () => {
    americanoStrategy.generateSchedule(makePlayers(8), makeConfig(2, 7));
  }, { iterations: 10, warmupIterations: 1 });

  bench('10p / 2c / 9r', () => {
    americanoStrategy.generateSchedule(makePlayers(10), makeConfig(2, 9));
  }, { iterations: 10, warmupIterations: 1 });

  bench('12p / 2c / 11r', () => {
    americanoStrategy.generateSchedule(makePlayers(12), makeConfig(2, 11));
  }, { iterations: 10, warmupIterations: 1 });

  bench('12p / 3c / 11r', () => {
    americanoStrategy.generateSchedule(makePlayers(12), makeConfig(3, 11));
  }, { iterations: 10, warmupIterations: 1 });

  bench('15p / 3c / 14r', () => {
    americanoStrategy.generateSchedule(makePlayers(15), makeConfig(3, 14));
  }, { iterations: 10, warmupIterations: 1 });

  bench('16p / 4c / 15r', () => {
    americanoStrategy.generateSchedule(makePlayers(16), makeConfig(4, 15));
  }, { iterations: 10, warmupIterations: 1 });

  bench('20p / 4c / 19r', () => {
    americanoStrategy.generateSchedule(makePlayers(20), makeConfig(4, 19));
  }, { iterations: 10, warmupIterations: 1 });
});

describe('generateAdditionalRounds (from mid-tournament)', () => {
  const players8 = makePlayers(8);
  const config8 = makeConfig(2, 7);
  const { rounds: initial8 } = americanoStrategy.generateSchedule(players8, config8);
  const scored8 = initial8.slice(0, 3);

  bench('8p / 2c / +4r (from 3 scored)', () => {
    americanoStrategy.generateAdditionalRounds(players8, config8, scored8, 4);
  }, { iterations: 10, warmupIterations: 1 });

  const players12 = makePlayers(12);
  const config12 = makeConfig(3, 11);
  const { rounds: initial12 } = americanoStrategy.generateSchedule(players12, config12);
  const scored12 = initial12.slice(0, 5);

  bench('12p / 3c / +6r (from 5 scored)', () => {
    americanoStrategy.generateAdditionalRounds(players12, config12, scored12, 6);
  }, { iterations: 10, warmupIterations: 1 });
});
