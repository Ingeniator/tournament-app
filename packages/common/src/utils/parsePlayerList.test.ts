import { describe, it, expect } from 'vitest';
import { parsePlayerList } from './parsePlayerList';

describe('parsePlayerList', () => {
  it('splits newline-separated names', () => {
    expect(parsePlayerList('Alice\nBob\nCharlie')).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('strips ordered markers (dot and paren)', () => {
    expect(parsePlayerList('1. Alice\n2) Bob\n3. Charlie')).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('strips unordered markers (-, *, •, ‣)', () => {
    expect(parsePlayerList('- Alice\n* Bob\n• Charlie\n‣ Dave')).toEqual([
      'Alice',
      'Bob',
      'Charlie',
      'Dave',
    ]);
  });

  it('strips status emojis', () => {
    expect(parsePlayerList('🟢 Alice\n🔵 Bob\n⊗ Charlie')).toEqual([
      'Alice',
      'Bob',
      'Charlie',
    ]);
  });

  it('strips trailing colon messages', () => {
    expect(parsePlayerList('Alice: will be late\nBob: bringing balls')).toEqual([
      'Alice',
      'Bob',
    ]);
  });

  it('handles combined formats', () => {
    const input = '1.  🟢 Наталья Бусыгина\n2.  🔵 Maxim: some message\n- ⊗ Ivan';
    expect(parsePlayerList(input)).toEqual(['Наталья Бусыгина', 'Maxim', 'Ivan']);
  });

  it('returns empty array for empty input', () => {
    expect(parsePlayerList('')).toEqual([]);
  });

  it('skips blank and whitespace-only lines', () => {
    expect(parsePlayerList('Alice\n   \n\nBob\n  \n')).toEqual(['Alice', 'Bob']);
  });

  it('trims surrounding whitespace from names', () => {
    expect(parsePlayerList('  Alice  \n  Bob  ')).toEqual(['Alice', 'Bob']);
  });

  it('splits comma-separated names', () => {
    expect(parsePlayerList('Alice, Bob, Charlie')).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('handles mixed comma and newline separators', () => {
    expect(parsePlayerList('Alice, Bob\nCharlie, Dave')).toEqual(['Alice', 'Bob', 'Charlie', 'Dave']);
  });

  it('skips empty segments from commas', () => {
    expect(parsePlayerList('Alice,, Bob,')).toEqual(['Alice', 'Bob']);
  });
});
