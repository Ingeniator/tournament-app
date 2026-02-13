import { describe, it, expect } from 'vitest';
import { groupSupporters } from '@padel/common';
import type { Supporter } from '@padel/common';

function makeSup(id: string, name: string, amount: number, ts: number, message?: string): Supporter {
  return { id, name, amount, timestamp: ts, message };
}

describe('groupSupporters', () => {
  it('returns empty array for empty input', () => {
    expect(groupSupporters([])).toEqual([]);
  });

  it('returns single entry for single supporter', () => {
    const result = groupSupporters([makeSup('1', 'Alice', 10, 100)]);
    expect(result).toEqual([{
      name: 'Alice',
      totalAmount: 10,
      count: 1,
      message: undefined,
    }]);
  });

  it('groups supporters by case-insensitive name', () => {
    const result = groupSupporters([
      makeSup('1', 'Alice', 10, 100),
      makeSup('2', 'alice', 5, 200),
      makeSup('3', 'ALICE', 3, 50),
    ]);
    expect(result.length).toBe(1);
    expect(result[0].totalAmount).toBe(18);
    expect(result[0].count).toBe(3);
  });

  it('uses the first occurrence name', () => {
    const result = groupSupporters([
      makeSup('1', 'Alice', 10, 100),
      makeSup('2', 'ALICE', 5, 200),
    ]);
    expect(result[0].name).toBe('Alice');
  });

  it('keeps latest message by timestamp', () => {
    const result = groupSupporters([
      makeSup('1', 'Alice', 10, 100, 'old message'),
      makeSup('2', 'alice', 5, 200, 'new message'),
      makeSup('3', 'alice', 3, 50, 'oldest message'),
    ]);
    expect(result[0].message).toBe('new message');
  });

  it('sorts by total amount descending', () => {
    const result = groupSupporters([
      makeSup('1', 'Alice', 5, 100),
      makeSup('2', 'Bob', 20, 100),
      makeSup('3', 'Charlie', 10, 100),
    ]);
    expect(result[0].name).toBe('Bob');
    expect(result[1].name).toBe('Charlie');
    expect(result[2].name).toBe('Alice');
  });

  it('handles zero amounts', () => {
    const result = groupSupporters([makeSup('1', 'Alice', 0, 100)]);
    expect(result[0].totalAmount).toBe(0);
  });

  it('separates different names into different groups', () => {
    const result = groupSupporters([
      makeSup('1', 'Alice', 10, 100),
      makeSup('2', 'Bob', 5, 100),
    ]);
    expect(result.length).toBe(2);
  });

  it('does not include latestTs in output', () => {
    const result = groupSupporters([makeSup('1', 'Alice', 10, 100)]);
    expect('latestTs' in result[0]).toBe(false);
  });
});
