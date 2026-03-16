// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRegisteredTournaments } from './useRegisteredTournaments';

let store: Record<string, unknown> = {};
type Listener = { callback: (snap: unknown) => void; error?: (err: Error) => void };
const listeners = new Map<string, Listener>();

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
const mockOnValue = vi.fn((refObj: { _path: string }, callback: (snap: unknown) => void, errorCb?: (err: Error) => void) => {
  listeners.set(refObj._path, { callback, error: errorCb });
  return () => { listeners.delete(refObj._path); };
});
const mockRemove = vi.fn(async () => {});

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => mockRef(...args),
  get: (...args: unknown[]) => mockGet(...args),
  onValue: (...args: unknown[]) => mockOnValue(...args),
  remove: (...args: unknown[]) => mockRemove(...args),
}));

vi.mock('../firebase', () => ({
  db: { __mock: true },
}));

function fireListener(path: string, data: unknown) {
  const listener = listeners.get(path);
  listener?.callback({
    val: () => data,
    exists: () => data !== null && data !== undefined,
  });
}

function fireError(path: string, message: string) {
  const listener = listeners.get(path);
  listener?.error?.(new Error(message));
}

beforeEach(() => {
  store = {};
  listeners.clear();
  vi.clearAllMocks();
});

describe('useRegisteredTournaments', () => {
  it('returns empty when uid is null', () => {
    const { result } = renderHook(() => useRegisteredTournaments(null));
    expect(result.current.tournaments).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('loads registered tournaments with organizer names', async () => {
    store = {
      tournaments: {
        t1: { name: 'Cup A', date: '2026-06-15', organizerId: 'org1', code: 'A1', createdAt: 1000, players: { u1: { name: 'Me' } } },
      },
      users: { org1: { name: 'Alice' } },
    };

    const { result } = renderHook(() => useRegisteredTournaments('u1'));

    act(() => {
      fireListener('users/u1/registrations', { t1: true });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tournaments).toHaveLength(1);
    expect(result.current.tournaments[0].name).toBe('Cup A');
    expect(result.current.tournaments[0].organizerName).toBe('Alice');
  });

  it('cleans up when tournament is deleted', async () => {
    store = {
      tournaments: {},
    };

    const { result } = renderHook(() => useRegisteredTournaments('u1'));

    act(() => {
      fireListener('users/u1/registrations', { t1: true });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tournaments).toHaveLength(0);
    expect(mockRemove).toHaveBeenCalled();
  });

  it('cleans up when player is no longer registered', async () => {
    store = {
      tournaments: {
        t1: { name: 'Cup', date: '2026-06-15', organizerId: 'org1', code: 'A1', createdAt: 1000, players: {} },
      },
    };

    const { result } = renderHook(() => useRegisteredTournaments('u1'));

    act(() => {
      fireListener('users/u1/registrations', { t1: true });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tournaments).toHaveLength(0);
    expect(mockRemove).toHaveBeenCalled();
  });

  it('returns empty when no registrations', async () => {
    const { result } = renderHook(() => useRegisteredTournaments('u1'));

    act(() => {
      fireListener('users/u1/registrations', null);
    });

    expect(result.current.tournaments).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('sets error on listener failure', () => {
    const { result } = renderHook(() => useRegisteredTournaments('u1'));

    act(() => {
      fireError('users/u1/registrations', 'Permission denied');
    });

    expect(result.current.error).toBe('Permission denied');
    expect(result.current.loading).toBe(false);
  });
});
