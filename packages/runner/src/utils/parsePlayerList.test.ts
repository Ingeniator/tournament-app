import { describe, it, expect } from 'vitest';
import { parsePlayerList } from './parsePlayerList';

describe('parsePlayerList', () => {
  it('parses a numbered list with status emojis', () => {
    const input = `1.   ⊗ Ivan Evplov
2.  🟢 Наталья Бусыгина
3.   ⊗ Андрей Шан
4.  🔵 Maxim Podstrechnyy
5.  🟢 Maria Evplova
6.  🟠 Nikolai Slashchev
7.  🔵 Nikolai Proskurin
8.   ⊗ Иван Климюк`;

    expect(parsePlayerList(input)).toEqual([
      'Ivan Evplov',
      'Наталья Бусыгина',
      'Андрей Шан',
      'Maxim Podstrechnyy',
      'Maria Evplova',
      'Nikolai Slashchev',
      'Nikolai Proskurin',
      'Иван Климюк',
    ]);
  });

  it('strips trailing status messages after colon', () => {
    const input = `11.   ⚫ Anton                : куплю гараж
12.   🔵 Данила: ПРОДАМ ГАРАЖ`;

    expect(parsePlayerList(input)).toEqual(['Anton', 'Данила']);
  });

  it('keeps emojis that are part of the name', () => {
    const input = `9.   ⊗ Алексей 🎭`;
    // The 🎭 is after the colon-strip (no colon here), so it stays
    // But the ⊗ is a leading status emoji and gets stripped
    expect(parsePlayerList(input)).toEqual(['Алексей 🎭']);
  });

  it('keeps parenthetical nicknames', () => {
    const input = `10.   🟡 Григорий (Chiffa)`;
    expect(parsePlayerList(input)).toEqual(['Григорий (Chiffa)']);
  });

  it('handles unordered list markers', () => {
    const input = `- Alice
* Bob
• Charlie`;

    expect(parsePlayerList(input)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('skips empty lines', () => {
    const input = `1. Alice

2. Bob

`;

    expect(parsePlayerList(input)).toEqual(['Alice', 'Bob']);
  });

  it('handles plain names without markers', () => {
    const input = `Alice
Bob
Charlie`;

    expect(parsePlayerList(input)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('returns empty array for empty input', () => {
    expect(parsePlayerList('')).toEqual([]);
  });

  it('parses the full example from the organizer', () => {
    const input = `1.   ⊗ Ivan Evplov
2.  🟢 Наталья Бусыгина
3.   ⊗ Андрей Шан
4.  🔵 Maxim Podstrechnyy
5.  🟢 Maria Evplova
6.  🟠 Nikolai Slashchev
7.  🔵 Nikolai Proskurin
8.   ⊗ Иван Климюк
9.   ⊗ Алексей 🎭
10.   🟡 Григорий (Chiffa)
11.   ⚫ Anton                                                                                                                                                                       : куплю гараж
12.   🔵 Данила: ПРОДАМ ГАРАЖ
13.    ⊗ Ivan Gagarkin
14.    ⊗ Миронов Сергей`;

    const result = parsePlayerList(input);
    expect(result).toHaveLength(14);
    expect(result).toEqual([
      'Ivan Evplov',
      'Наталья Бусыгина',
      'Андрей Шан',
      'Maxim Podstrechnyy',
      'Maria Evplova',
      'Nikolai Slashchev',
      'Nikolai Proskurin',
      'Иван Климюк',
      'Алексей 🎭',
      'Григорий (Chiffa)',
      'Anton',
      'Данила',
      'Ivan Gagarkin',
      'Миронов Сергей',
    ]);
  });
});
