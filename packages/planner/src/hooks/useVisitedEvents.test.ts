// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVisitedEvents, markEventVisited } from './useVisitedEvents';

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
const mockSet = vi.fn(async () => {});
const mockRemove = vi.fn(async () => {});
const mockOnValue = vi.fn((refObj: { _path: string }, callback: (snap: unknown) => void, errorCb?: (err: Error) => void) => {
  listeners.set(refObj._path, { callback, error: errorCb });
  return () => { listeners.delete(refObj._path); };
});

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => mockRef(...args),
  get: (...args: unknown[]) => mockGet(...args),
  set: (...args: unknown[]) => mockSet(...args),
  remove: (...args: unknown[]) => mockRemove(...args),
  onValue: (...args: unknown[]) => mockOnValue(...args),
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

describe('markEventVisited', () => {
  it('writes true to visitedEvents path', async () => {
    await markEventVisited('u1', 'e1');
    expect(mockSet).toHaveBeenCalledWith({ _path: 'users/u1/visitedEvents/e1' }, true);
  });
});

describe('useVisitedEvents', () => {
  const emptyCreated = new Set<string>();

  it('returns empty events when uid is null', () => {
    const { result } = renderHook(() => useVisitedEvents(null, emptyCreated));
    expect(result.current.events).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('loads visited event summaries', async () => {
    store = {
      events: {
        e1: { name: 'Event A', date: '2026-06-10', code: 'E1', createdAt: 1000 },
        e2: { name: 'Event B', date: '2026-06-20', code: 'E2', createdAt: 2000 },
      },
    };

    const { result } = renderHook(() => useVisitedEvents('u1', emptyCreated));

    act(() => {
      fireListener('users/u1/visitedEvents', { e1: true, e2: true });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.events).toHaveLength(2);
    // Sorted by date descending
    expect(result.current.events[0].name).toBe('Event B');
  });

  it('excludes events the user created', async () => {
    store = {
      events: {
        e1: { name: 'Event A', date: '2026-06-10', code: 'E1', createdAt: 1000 },
        e2: { name: 'Event B', date: '2026-06-20', code: 'E2', createdAt: 2000 },
      },
    };

    const createdIds = new Set(['e1']);
    const { result } = renderHook(() => useVisitedEvents('u1', createdIds));

    act(() => {
      fireListener('users/u1/visitedEvents', { e1: true, e2: true });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].name).toBe('Event B');
  });

  it('cleans up deleted events', async () => {
    store = {
      events: {
        // e1 doesn't exist (deleted)
        e2: { name: 'Event B', date: '2026-06-20', code: 'E2', createdAt: 2000 },
      },
    };

    const { result } = renderHook(() => useVisitedEvents('u1', emptyCreated));

    act(() => {
      fireListener('users/u1/visitedEvents', { e1: true, e2: true });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.events).toHaveLength(1);
    expect(mockRemove).toHaveBeenCalled();
  });

  it('returns empty when no visited events', () => {
    const { result } = renderHook(() => useVisitedEvents('u1', emptyCreated));

    act(() => {
      fireListener('users/u1/visitedEvents', null);
    });

    expect(result.current.events).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('sets error on listener failure', () => {
    const { result } = renderHook(() => useVisitedEvents('u1', emptyCreated));

    act(() => {
      fireError('users/u1/visitedEvents', 'Permission denied');
    });

    expect(result.current.error).toBe('Permission denied');
  });
});
