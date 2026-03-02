import { describe, it, expect } from 'vitest';
import { groupSupporters } from './groupSupporters';
import type { Supporter } from '../types/supporter';

function supporter(overrides: Partial<Supporter> & { name: string }): Supporter {
  return { id: '1', amount: 0, timestamp: 1000, ...overrides };
}

describe('groupSupporters', () => {
  it('returns empty array for empty input', () => {
    expect(groupSupporters([])).toEqual([]);
  });

  it('returns a single entry for one supporter', () => {
    const result = groupSupporters([supporter({ name: 'Alice', amount: 5 })]);
    expect(result).toEqual([{ name: 'Alice', totalAmount: 5, message: undefined, count: 1 }]);
  });

  it('groups by name case-insensitively', () => {
    const result = groupSupporters([
      supporter({ name: 'Alice', amount: 3, timestamp: 1 }),
      supporter({ name: 'alice', amount: 7, timestamp: 2 }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].totalAmount).toBe(10);
    expect(result[0].count).toBe(2);
  });

  it('keeps the first occurrence name casing', () => {
    const result = groupSupporters([
      supporter({ name: 'Bob', amount: 1, timestamp: 1 }),
      supporter({ name: 'BOB', amount: 2, timestamp: 2 }),
    ]);
    expect(result[0].name).toBe('Bob');
  });

  it('keeps the latest message by timestamp', () => {
    const result = groupSupporters([
      supporter({ name: 'Alice', amount: 1, timestamp: 100, message: 'old' }),
      supporter({ name: 'Alice', amount: 1, timestamp: 200, message: 'new' }),
    ]);
    expect(result[0].message).toBe('new');
  });

  it('does not replace message with an older one', () => {
    const result = groupSupporters([
      supporter({ name: 'Alice', amount: 1, timestamp: 200, message: 'latest' }),
      supporter({ name: 'Alice', amount: 1, timestamp: 100, message: 'old' }),
    ]);
    expect(result[0].message).toBe('latest');
  });

  it('sorts by totalAmount descending', () => {
    const result = groupSupporters([
      supporter({ name: 'Low', amount: 1 }),
      supporter({ name: 'High', amount: 10 }),
      supporter({ name: 'Mid', amount: 5 }),
    ]);
    expect(result.map(s => s.name)).toEqual(['High', 'Mid', 'Low']);
  });

  it('sums amounts across grouped entries', () => {
    const result = groupSupporters([
      supporter({ name: 'Alice', amount: 3, timestamp: 1 }),
      supporter({ name: 'Alice', amount: 4, timestamp: 2 }),
      supporter({ name: 'Alice', amount: 5, timestamp: 3 }),
    ]);
    expect(result[0].totalAmount).toBe(12);
    expect(result[0].count).toBe(3);
  });

  it('strips internal latestTs from output', () => {
    const result = groupSupporters([supporter({ name: 'Alice', amount: 1 })]);
    expect(result[0]).not.toHaveProperty('latestTs');
  });
});
