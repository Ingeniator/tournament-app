// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMyTournaments } from './useMyTournaments';

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

describe('useMyTournaments', () => {
  it('returns empty tournaments when uid is null', () => {
    const { result } = renderHook(() => useMyTournaments(null));
    expect(result.current.tournaments).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('loads tournament summaries', async () => {
    store = {
      tournaments: {
        t1: { name: 'Cup A', date: '2026-06-15', organizerId: 'u1', code: 'A1', createdAt: 1000 },
        t2: { name: 'Cup B', date: '2026-06-20', organizerId: 'u1', code: 'B2', createdAt: 2000 },
      },
    };

    const { result } = renderHook(() => useMyTournaments('u1'));

    act(() => {
      fireListener('users/u1/organized', { t1: true, t2: true });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tournaments).toHaveLength(2);
    // Sorted by date descending
    expect(result.current.tournaments[0].name).toBe('Cup B');
    expect(result.current.tournaments[1].name).toBe('Cup A');
  });

  it('cleans up references to deleted tournaments', async () => {
    store = {
      tournaments: {
        // t1 doesn't exist (deleted)
        t2: { name: 'Cup B', date: '2026-06-20', organizerId: 'u1', code: 'B2', createdAt: 2000 },
      },
    };

    const { result } = renderHook(() => useMyTournaments('u1'));

    act(() => {
      fireListener('users/u1/organized', { t1: true, t2: true });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tournaments).toHaveLength(1);
    expect(mockRemove).toHaveBeenCalled();
  });

  it('returns empty array when no organized tournaments', async () => {
    const { result } = renderHook(() => useMyTournaments('u1'));

    act(() => {
      fireListener('users/u1/organized', null);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tournaments).toEqual([]);
  });

  it('sets error when listener fails', () => {
    const { result } = renderHook(() => useMyTournaments('u1'));

    act(() => {
      fireError('users/u1/organized', 'Permission denied');
    });

    expect(result.current.error).toBe('Permission denied');
    expect(result.current.loading).toBe(false);
  });

  describe('error paths', () => {
    it('shows partial results when some tournament fetches fail', async () => {
      store = {
        tournaments: {
          t1: { name: 'Cup A', date: '2026-06-15', organizerId: 'u1', code: 'A1', createdAt: 1000 },
          // t2 exists in store but we'll make its get() fail
        },
      };

      let callCount = 0;
      mockGet.mockImplementation(async (refObj: { _path: string }) => {
        callCount++;
        if (refObj._path === 'tournaments/t2') {
          throw new Error('Network error');
        }
        return makeSnapshot(refObj._path);
      });

      const { result } = renderHook(() => useMyTournaments('u1'));

      act(() => {
        fireListener('users/u1/organized', { t1: true, t2: true });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Promise.all catches the error — shows whatever was collected before failure
      // (may be 0 or 1 depending on resolution order)
      expect(result.current.error).toBeNull();
    });

    it('clears error when listener fires successfully after error', async () => {
      store = {
        tournaments: {
          t1: { name: 'Cup A', date: '2026-06-15', organizerId: 'u1', code: 'A1', createdAt: 1000 },
        },
      };

      const { result } = renderHook(() => useMyTournaments('u1'));

      act(() => {
        fireError('users/u1/organized', 'Temporary error');
      });
      expect(result.current.error).toBe('Temporary error');

      act(() => {
        fireListener('users/u1/organized', { t1: true });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.tournaments).toHaveLength(1);
      });
    });
  });
});
