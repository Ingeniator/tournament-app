import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayers } from './usePlayers';

// Track calls for assertions
let store: Record<string, unknown> = {};
let onValueCallback: ((snapshot: unknown) => void) | null = null;

function getNestedValue(path: string): unknown {
  const parts = path.split('/');
  let current: unknown = store;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setNestedValue(path: string, value: unknown) {
  const parts = path.split('/');
  let current = store as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== 'object' || current[parts[i]] === null) {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  if (value === null) {
    delete current[parts[parts.length - 1]];
  } else {
    current[parts[parts.length - 1]] = value;
  }
}

function makeSnapshot(path: string) {
  const val = getNestedValue(path);
  return {
    val: () => val ?? null,
    exists: () => val !== undefined && val !== null,
    child: (childPath: string) => makeSnapshot(`${path}/${childPath}`),
  };
}

const mockRef = vi.fn((_db: unknown, path?: string) => ({ _path: path ?? '' }));
const mockGet = vi.fn(async (refObj: { _path: string }) => makeSnapshot(refObj._path));
const mockSet = vi.fn(async (refObj: { _path: string }, value: unknown) => {
  setNestedValue(refObj._path, value);
});
const mockUpdate = vi.fn(async (refObj: { _path: string }, updates: Record<string, unknown>) => {
  if (refObj._path) {
    for (const [key, value] of Object.entries(updates)) {
      setNestedValue(`${refObj._path}/${key}`, value);
    }
  } else {
    for (const [path, value] of Object.entries(updates)) {
      setNestedValue(path, value);
    }
  }
});
const mockOnValue = vi.fn((_refObj: unknown, callback: (snapshot: unknown) => void) => {
  onValueCallback = callback;
  // Immediately fire with empty data
  callback({ val: () => null });
  return vi.fn(); // unsubscribe
});

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => mockRef(...args),
  get: (...args: unknown[]) => mockGet(...args),
  set: (...args: unknown[]) => mockSet(...args),
  update: (...args: unknown[]) => mockUpdate(...args),
  onValue: (...args: unknown[]) => mockOnValue(...args),
}));

vi.mock('../firebase', () => ({
  db: { __mock: true },
}));

vi.mock('@padel/common', () => ({
  generateId: () => 'generated-id-' + Math.random().toString(36).slice(2, 8),
}));

beforeEach(() => {
  store = {};
  onValueCallback = null;
  vi.clearAllMocks();
});

describe('usePlayers', () => {
  describe('registerPlayer', () => {
    it('writes 2 paths for web users (no telegram)', async () => {
      const { result } = renderHook(() => usePlayers('t1'));

      await act(async () => {
        await result.current.registerPlayer('Alice', 'uid1');
      });

      // Should have used atomic multi-path update
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ _path: '' }),
        expect.objectContaining({
          'tournaments/t1/players/uid1': expect.objectContaining({ name: 'Alice' }),
          'users/uid1/registrations/t1': true,
        })
      );

      // Should NOT include telegramUsers paths
      const updateArg = mockUpdate.mock.calls[0][1];
      const keys = Object.keys(updateArg);
      expect(keys.some(k => k.startsWith('telegramUsers/'))).toBe(false);
    });

    it('writes 4 paths for Telegram users', async () => {
      const { result } = renderHook(() => usePlayers('t1'));

      await act(async () => {
        await result.current.registerPlayer('Alice', 'uid1', 'alice_tg');
      });

      const updateArg = mockUpdate.mock.calls[0][1];
      expect(updateArg).toEqual(expect.objectContaining({
        'tournaments/t1/players/uid1': expect.objectContaining({
          name: 'Alice',
          telegramUsername: 'alice_tg',
        }),
        'users/uid1/registrations/t1': true,
        'telegramUsers/alice_tg/registrations/t1': true,
        'telegramUsers/alice_tg/currentUid': 'uid1',
      }));
    });

    it('skips registration when UID already exists', async () => {
      store = {
        tournaments: { t1: { players: { uid1: { name: 'Alice', timestamp: 1000 } } } },
      };

      const { result } = renderHook(() => usePlayers('t1'));

      await act(async () => {
        await result.current.registerPlayer('Alice', 'uid1');
      });

      // update should NOT have been called (only get was called to check existence)
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('removePlayer', () => {
    it('removes 2 paths for web player (no telegram)', async () => {
      store = {
        tournaments: { t1: { players: { uid1: { name: 'Alice', timestamp: 1000 } } } },
        users: { uid1: { registrations: { t1: true } } },
      };

      const { result } = renderHook(() => usePlayers('t1'));

      await act(async () => {
        await result.current.removePlayer('uid1');
      });

      const updateArg = mockUpdate.mock.calls[0][1];
      expect(updateArg).toEqual({
        'tournaments/t1/players/uid1': null,
        'users/uid1/registrations/t1': null,
      });
    });

    it('removes 3 paths for Telegram player', async () => {
      store = {
        tournaments: { t1: { players: { uid1: { name: 'Alice', timestamp: 1000, telegramUsername: 'alice_tg' } } } },
        users: { uid1: { registrations: { t1: true } } },
        telegramUsers: { alice_tg: { registrations: { t1: true }, currentUid: 'uid1' } },
      };

      const { result } = renderHook(() => usePlayers('t1'));

      await act(async () => {
        await result.current.removePlayer('uid1');
      });

      const updateArg = mockUpdate.mock.calls[0][1];
      expect(updateArg).toEqual({
        'tournaments/t1/players/uid1': null,
        'users/uid1/registrations/t1': null,
        'telegramUsers/alice_tg/registrations/t1': null,
      });
    });
  });

  describe('claimRegistration', () => {
    it('moves player record from old UID to new UID atomically', async () => {
      const playerData = { name: 'Alice', timestamp: 1000, telegramUsername: 'alice_tg' };
      store = {
        tournaments: { t1: { players: { 'old-uid': playerData } } },
        users: { 'old-uid': { registrations: { t1: true } } },
      };

      const { result } = renderHook(() => usePlayers('t1'));

      await act(async () => {
        await result.current.claimRegistration('old-uid', 'new-uid', 'alice_tg');
      });

      const updateArg = mockUpdate.mock.calls[0][1];
      expect(updateArg).toEqual({
        'tournaments/t1/players/old-uid': null,
        'tournaments/t1/players/new-uid': { ...playerData, telegramUsername: 'alice_tg' },
        'users/old-uid/registrations/t1': null,
        'users/new-uid/registrations/t1': true,
      });
    });

    it('does nothing when old player record does not exist', async () => {
      store = {
        tournaments: { t1: { players: {} } },
      };

      const { result } = renderHook(() => usePlayers('t1'));

      await act(async () => {
        await result.current.claimRegistration('old-uid', 'new-uid', 'alice_tg');
      });

      // Only get was called, no update
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
