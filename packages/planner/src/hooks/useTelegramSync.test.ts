import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTelegramSync } from './useTelegramSync';

// In-memory Firebase mock
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
    // Scoped update
    for (const [key, value] of Object.entries(updates)) {
      setNestedValue(`${refObj._path}/${key}`, value);
    }
  } else {
    // Root update (multi-path)
    for (const [path, value] of Object.entries(updates)) {
      setNestedValue(path, value);
    }
  }
});

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => mockRef(...args),
  get: (...args: unknown[]) => mockGet(...args),
  set: (...args: unknown[]) => mockSet(...args),
  update: (...args: unknown[]) => mockUpdate(...args),
}));

vi.mock('../firebase', () => ({
  db: { __mock: true },
}));

beforeEach(() => {
  store = {};
  vi.clearAllMocks();
});

describe('useTelegramSync', () => {
  it('does nothing when uid is null', () => {
    renderHook(() => useTelegramSync(null, 'alice'));
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('does nothing when telegramUsername is undefined', () => {
    renderHook(() => useTelegramSync('uid1', undefined));
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('sets currentUid on first-time Telegram user', async () => {
    // No existing telegramUsers entry
    const { result } = renderHook(() => useTelegramSync('uid1', 'alice'));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });

    expect(store.telegramUsers).toEqual({
      alice: { currentUid: 'uid1' },
    });
    // Should also store telegramUsername on the user profile
    expect(store.users).toEqual({
      uid1: { telegramUsername: 'alice' },
    });
    expect(result.current.syncing).toBe(false);
  });

  it('just updates currentUid when same device reconnects', async () => {
    store = {
      telegramUsers: { alice: { currentUid: 'uid1', registrations: { t1: true } } },
    };

    renderHook(() => useTelegramSync('uid1', 'alice'));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });

    // currentUid should still be uid1
    expect((store.telegramUsers as Record<string, unknown> as any).alice.currentUid).toBe('uid1');
    // No claim sweep should have happened — update called only for currentUid set and telegramUsername
    const rootUpdates = mockUpdate.mock.calls.filter(
      ([refObj]: [{ _path: string }]) => refObj._path === ''
    );
    expect(rootUpdates).toHaveLength(0);
  });

  it('performs claim sweep when different device detected', async () => {
    const playerData = { name: 'Alice', timestamp: 1000, telegramUsername: 'alice' };
    store = {
      telegramUsers: { alice: { currentUid: 'old-uid', registrations: { t1: true, t2: true } } },
      tournaments: {
        t1: { players: { 'old-uid': playerData } },
        t2: { players: { 'old-uid': { ...playerData, name: 'Alice 2' } } },
      },
      users: {
        'old-uid': { registrations: { t1: true, t2: true } },
      },
    };

    const { result } = renderHook(() => useTelegramSync('new-uid', 'alice'));

    await waitFor(() => {
      // Should have updated currentUid to new-uid after sweep
      expect((store.telegramUsers as any).alice.currentUid).toBe('new-uid');
    });

    // Player records should be moved from old-uid to new-uid
    expect((store.tournaments as any).t1.players['old-uid']).toBeUndefined();
    expect((store.tournaments as any).t1.players['new-uid']).toEqual(playerData);
    expect((store.tournaments as any).t2.players['old-uid']).toBeUndefined();
    expect((store.tournaments as any).t2.players['new-uid']).toEqual({
      ...playerData,
      name: 'Alice 2',
    });

    // Registration indexes should be moved
    expect((store.users as any)['old-uid']?.registrations?.t1).toBeUndefined();
    expect((store.users as any)['old-uid']?.registrations?.t2).toBeUndefined();
    expect((store.users as any)['new-uid'].registrations.t1).toBe(true);
    expect((store.users as any)['new-uid'].registrations.t2).toBe(true);

    expect(result.current.syncing).toBe(false);
  });

  it('skips claim when player has different telegramUsername', async () => {
    store = {
      telegramUsers: { alice: { currentUid: 'old-uid', registrations: { t1: true } } },
      tournaments: {
        t1: { players: { 'old-uid': { name: 'Bob', timestamp: 1000, telegramUsername: 'bob' } } },
      },
    };

    renderHook(() => useTelegramSync('new-uid', 'alice'));

    await waitFor(() => {
      expect((store.telegramUsers as any).alice.currentUid).toBe('new-uid');
    });

    // Player should NOT have been moved (different telegramUsername)
    expect((store.tournaments as any).t1.players['old-uid']).toBeDefined();
    expect((store.tournaments as any).t1.players['new-uid']).toBeUndefined();
  });

  it('skips claim when new uid already has a registration in tournament', async () => {
    store = {
      telegramUsers: { alice: { currentUid: 'old-uid', registrations: { t1: true } } },
      tournaments: {
        t1: {
          players: {
            'old-uid': { name: 'Alice Old', timestamp: 1000, telegramUsername: 'alice' },
            'new-uid': { name: 'Alice New', timestamp: 2000, telegramUsername: 'alice' },
          },
        },
      },
    };

    renderHook(() => useTelegramSync('new-uid', 'alice'));

    await waitFor(() => {
      expect((store.telegramUsers as any).alice.currentUid).toBe('new-uid');
    });

    // Both records should remain (old one wasn't deleted because new one already exists)
    expect((store.tournaments as any).t1.players['old-uid']).toBeDefined();
    expect((store.tournaments as any).t1.players['new-uid']).toBeDefined();
  });

  it('skips tournaments where old player record no longer exists', async () => {
    store = {
      telegramUsers: { alice: { currentUid: 'old-uid', registrations: { t1: true, t2: true } } },
      tournaments: {
        t1: { players: {} },  // Player already removed
        t2: { players: { 'old-uid': { name: 'Alice', timestamp: 1000, telegramUsername: 'alice' } } },
      },
    };

    renderHook(() => useTelegramSync('new-uid', 'alice'));

    await waitFor(() => {
      expect((store.telegramUsers as any).alice.currentUid).toBe('new-uid');
    });

    // t1 should be untouched (no old player), t2 should be claimed
    expect((store.tournaments as any).t2.players['new-uid']).toBeDefined();
    expect((store.tournaments as any).t2.players['old-uid']).toBeUndefined();
  });
});
