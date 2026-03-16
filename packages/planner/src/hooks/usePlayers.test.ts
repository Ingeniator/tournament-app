// @vitest-environment jsdom
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
const mockRunTransaction = vi.fn(async (refObj: { _path: string }, updateFn: (current: unknown) => unknown) => {
  const current = getNestedValue(refObj._path);
  const newValue = updateFn(current ?? null);
  if (newValue === undefined) {
    return { committed: false };
  }
  setNestedValue(refObj._path, newValue);
  return { committed: true };
});

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => mockRef(...args),
  get: (...args: unknown[]) => mockGet(...args),
  set: (...args: unknown[]) => mockSet(...args),
  update: (...args: unknown[]) => mockUpdate(...args),
  onValue: (...args: unknown[]) => mockOnValue(...args),
  runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
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

      // Transaction on player ref to guard against duplicate UID
      expect(mockRunTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ _path: 'tournaments/t1/players/uid1' }),
        expect.any(Function),
      );
      // Player data written via transaction
      expect(store).toHaveProperty('tournaments.t1.players.uid1');
      expect((store as Record<string, unknown>).tournaments).toHaveProperty('t1');

      // User registration written via set
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ _path: 'users/uid1/registrations/t1' }),
        true,
      );

      // Should NOT include telegramUsers paths
      expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    });

    it('writes 4 paths for Telegram users', async () => {
      const { result } = renderHook(() => usePlayers('t1'));

      await act(async () => {
        await result.current.registerPlayer('Alice', 'uid1', 'alice_tg');
      });

      // Transaction on telegram index first
      expect(mockRunTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ _path: 'telegramUsers/alice_tg/registrations/t1' }),
        expect.any(Function),
      );
      // Transaction on player ref second
      expect(mockRunTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ _path: 'tournaments/t1/players/uid1' }),
        expect.any(Function),
      );
      // Remaining indexes via update
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ _path: '' }),
        expect.objectContaining({
          'users/uid1/registrations/t1': true,
          'telegramUsers/alice_tg/currentUid': 'uid1',
        }),
      );
    });

    it('skips registration when UID already exists', async () => {
      store = {
        tournaments: { t1: { players: { uid1: { name: 'Alice', timestamp: 1000 } } } },
      };

      const { result } = renderHook(() => usePlayers('t1'));

      await act(async () => {
        await result.current.registerPlayer('Alice', 'uid1');
      });

      // Transaction was called but should not have committed (UID exists)
      expect(mockRunTransaction).toHaveBeenCalledTimes(1);
      // set/update should NOT have been called since transaction aborted
      expect(mockSet).not.toHaveBeenCalled();
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

});
