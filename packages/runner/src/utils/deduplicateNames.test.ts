import { describe, it, expect } from 'vitest';
import { deduplicateNames } from './deduplicateNames';
import type { Player } from '@padel/common';

function p(id: string, name: string): Player {
  return { id, name };
}

describe('deduplicateNames', () => {
  it('returns players unchanged when no duplicates', () => {
    const players = [p('1', 'Alice'), p('2', 'Bob'), p('3', 'Charlie')];
    const result = deduplicateNames(players);
    expect(result).toBe(players); // same reference — no changes
  });

  it('adds suffix to duplicate names', () => {
    const players = [p('1', 'Alice'), p('2', 'Alice')];
    const result = deduplicateNames(players);
    const names = result.map(p => p.name);
    // Names should be different after deduplication
    expect(new Set(names).size).toBe(2);
    // At least one should have a suffix
    expect(names.some(n => n.startsWith('Alice '))).toBe(true);
  });

  it('preserves existing suffixes', () => {
    const players = [p('1', 'Alice Jr.'), p('2', 'Alice'), p('3', 'Alice')];
    const result = deduplicateNames(players);
    // Jr. player should keep their name
    expect(result.find(p => p.id === '1')!.name).toBe('Alice Jr.');
    // Other two should get unique suffixes
    const names = result.map(p => p.name);
    expect(new Set(names).size).toBe(3);
  });

  it('handles triple duplicates', () => {
    const players = [p('1', 'Alice'), p('2', 'Alice'), p('3', 'Alice')];
    const result = deduplicateNames(players);
    const names = result.map(p => p.name);
    expect(new Set(names).size).toBe(3);
  });

  it('handles multiple groups of duplicates', () => {
    const players = [p('1', 'Alice'), p('2', 'Alice'), p('3', 'Bob'), p('4', 'Bob')];
    const result = deduplicateNames(players);
    const names = result.map(p => p.name);
    expect(new Set(names).size).toBe(4);
  });

  it('preserves player ids', () => {
    const players = [p('1', 'Alice'), p('2', 'Alice')];
    const result = deduplicateNames(players);
    expect(result.find(p => p.id === '1')).toBeDefined();
    expect(result.find(p => p.id === '2')).toBeDefined();
  });

  it('returns new array when deduplication occurs', () => {
    const players = [p('1', 'Alice'), p('2', 'Alice')];
    const result = deduplicateNames(players);
    expect(result).not.toBe(players);
  });

  it('preserves non-duplicate players exactly', () => {
    const players = [p('1', 'Alice'), p('2', 'Alice'), p('3', 'Bob')];
    const result = deduplicateNames(players);
    expect(result.find(p => p.id === '3')!.name).toBe('Bob');
  });

  it('handles single player', () => {
    const players = [p('1', 'Alice')];
    const result = deduplicateNames(players);
    expect(result).toBe(players);
  });

  it('handles empty array', () => {
    const result = deduplicateNames([]);
    expect(result).toEqual([]);
  });

  it('falls back to numeric suffix when all named suffixes are used', () => {
    // Create players where one already has each named suffix, exhausting the pool
    // The DEDUP_SUFFIXES array has 24 entries. We need >24 duplicates with same base.
    const players: Player[] = [];
    // Add 26 players with the same name to exhaust all 24 suffixes
    for (let i = 0; i < 26; i++) {
      players.push(p(`id${i}`, 'Alex'));
    }
    const result = deduplicateNames(players);
    const names = result.map(r => r.name);
    // All should be unique
    expect(new Set(names).size).toBe(26);
    // At least one should have a # numeric suffix (since 24 named suffixes < 25 needed)
    expect(names.some(n => n.match(/#\d+$/))).toBe(true);
  });
});
