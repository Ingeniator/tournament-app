// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { restoreFromBackup } from './restoreFromBackup';

let store: Record<string, unknown> = {};

function getNestedValue(path: string): unknown {
  const parts = path.split('/');
  let current: unknown = store;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function makeSnapshot(path: string) {
  const val = getNestedValue(path);
  return {
    val: () => val ?? null,
    exists: () => val !== undefined && val !== null,
  };
}

const mockRef = vi.fn((_db: unknown, path?: string) => ({ _path: path ?? '' }));
const mockGet = vi.fn(async (refObj: { _path: string }) => makeSnapshot(refObj._path));
const mockSignIn = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => mockRef(...args),
  get: (...args: unknown[]) => mockGet(...args),
}));

vi.mock('../firebase', () => ({
  db: { __mock: true },
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

let locationHref = '';

beforeEach(() => {
  store = {};
  vi.clearAllMocks();
  localStorage.clear();
  locationHref = '';
  Object.defineProperty(window, 'location', {
    value: {
      get href() { return locationHref; },
      set href(v: string) { locationHref = v; },
    },
    writable: true,
    configurable: true,
  });
});

describe('restoreFromBackup', () => {
  it('returns false when runnerData does not exist', async () => {
    const result = await restoreFromBackup('t1');
    expect(result).toBe(false);
  });

  it('saves sanitized data to localStorage and redirects on success', async () => {
    store = {
      tournaments: {
        t1: {
          runnerData: {
            config: { pointsPerMatch: 32 },
            players: [{ name: 'Alice' }],
            rounds: [
              {
                matches: [{ team1: [0], team2: [1], scores: [0, 0] }],
                sitOuts: [2],
              },
            ],
          },
        },
      },
    };

    const result = await restoreFromBackup('t1');
    expect(result).toBe(true);
    expect(mockSignIn).toHaveBeenCalled();

    const saved = JSON.parse(localStorage.getItem('padel-tournament-v1')!);
    expect(saved.players).toEqual([{ name: 'Alice' }]);
    expect(saved.rounds).toHaveLength(1);
    expect(saved.rounds[0].matches[0].team1).toEqual([0]);
    expect(saved.config.maxRounds).toBeNull();
    expect(locationHref).toBe('/play');
  });

  it('restores missing arrays in data', async () => {
    store = {
      tournaments: {
        t1: {
          runnerData: {
            config: { pointsPerMatch: 32, maxRounds: 5 },
            // rounds and players missing (Firebase strips empty arrays)
          },
        },
      },
    };

    const result = await restoreFromBackup('t1');
    expect(result).toBe(true);

    const saved = JSON.parse(localStorage.getItem('padel-tournament-v1')!);
    expect(saved.players).toEqual([]);
    expect(saved.rounds).toEqual([]);
    expect(saved.config.maxRounds).toBe(5);
  });

  it('restores sitOuts, matches, team1, team2 arrays in rounds', async () => {
    store = {
      tournaments: {
        t1: {
          runnerData: {
            config: {},
            players: [],
            rounds: [
              { /* missing sitOuts and matches */ },
            ],
          },
        },
      },
    };

    const result = await restoreFromBackup('t1');
    expect(result).toBe(true);

    const saved = JSON.parse(localStorage.getItem('padel-tournament-v1')!);
    expect(saved.rounds[0].sitOuts).toEqual([]);
    expect(saved.rounds[0].matches).toEqual([]);
  });

  it('returns false when signIn throws', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('Network error'));
    const result = await restoreFromBackup('t1');
    expect(result).toBe(false);
  });
});
