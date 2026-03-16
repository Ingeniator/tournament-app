// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEvent, loadEventByCode } from './useEvent';

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
const mockUpdate = vi.fn(async () => {});
const mockOnValue = vi.fn((refObj: { _path: string }, callback: (snap: unknown) => void, errorCb?: (err: Error) => void) => {
  listeners.set(refObj._path, { callback, error: errorCb });
  return () => { listeners.delete(refObj._path); };
});

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => mockRef(...args),
  get: (...args: unknown[]) => mockGet(...args),
  update: (...args: unknown[]) => mockUpdate(...args),
  onValue: (...args: unknown[]) => mockOnValue(...args),
}));

vi.mock('../firebase', () => ({
  db: { __mock: true },
}));

let idCounter = 0;
vi.mock('@padel/common', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, generateId: () => `mock-id-${++idCounter}` };
});

vi.mock('../utils/shortCode', () => ({
  generateUniqueCode: vi.fn().mockResolvedValue('EVT123'),
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
  idCounter = 0;
});

describe('useEvent', () => {
  describe('subscription', () => {
    it('does not subscribe when eventId is null', () => {
      renderHook(() => useEvent(null));
      expect(listeners.size).toBe(0);
    });

    it('subscribes to event data', () => {
      renderHook(() => useEvent('e1'));
      expect(listeners.has('events/e1')).toBe(true);
    });

    it('sets event from snapshot', () => {
      const { result } = renderHook(() => useEvent('e1'));

      act(() => {
        fireListener('events/e1', {
          name: 'Weekend Event',
          date: '2026-06-15',
          code: 'EVT1',
          tournaments: [{ tournamentId: 't1', weight: 2 }],
          organizerId: 'org1',
          createdAt: 1000,
          updatedAt: 2000,
        });
      });

      expect(result.current.event).not.toBeNull();
      expect(result.current.event!.name).toBe('Weekend Event');
      expect(result.current.event!.tournaments).toEqual([{ tournamentId: 't1', weight: 2 }]);
      expect(result.current.loading).toBe(false);
    });

    it('normalizes tournaments with default weight', () => {
      const { result } = renderHook(() => useEvent('e1'));

      act(() => {
        fireListener('events/e1', {
          name: 'Event',
          date: '2026-06-15',
          code: 'E1',
          tournaments: [{ tournamentId: 't1' }],
          organizerId: 'org1',
          createdAt: 1000,
          updatedAt: 1000,
        });
      });

      expect(result.current.event!.tournaments[0].weight).toBe(1);
    });

    it('sets empty tournaments when not an array', () => {
      const { result } = renderHook(() => useEvent('e1'));

      act(() => {
        fireListener('events/e1', {
          name: 'Event',
          date: '2026-06-15',
          code: 'E1',
          organizerId: 'org1',
          createdAt: 1000,
          updatedAt: 1000,
        });
      });

      expect(result.current.event!.tournaments).toEqual([]);
    });

    it('sets event to null when data is null', () => {
      const { result } = renderHook(() => useEvent('e1'));

      act(() => {
        fireListener('events/e1', null);
      });

      expect(result.current.event).toBeNull();
    });

    it('sets error on listener failure', () => {
      const { result } = renderHook(() => useEvent('e1'));

      act(() => {
        fireError('events/e1', 'Permission denied');
      });

      expect(result.current.error).toBe('Permission denied');
    });
  });

  describe('createEvent', () => {
    it('creates event with multi-path update', async () => {
      const { result } = renderHook(() => useEvent(null));

      let id: string;
      await act(async () => {
        id = await result.current.createEvent('Weekend', '2026-06-15', 'org1');
      });

      expect(id!).toBe('mock-id-1');
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      const updates = mockUpdate.mock.calls[0][1];
      expect(updates['events/mock-id-1']).toMatchObject({ name: 'Weekend', date: '2026-06-15' });
      expect(updates['users/org1/events/mock-id-1']).toBe(true);
      expect(updates['eventCodes/EVT123']).toBe('mock-id-1');
    });
  });

  describe('updateEvent', () => {
    it('converts undefined values to null', async () => {
      const { result } = renderHook(() => useEvent('e1'));

      await act(async () => {
        await result.current.updateEvent({ name: 'New Name', description: undefined });
      });

      const updates = mockUpdate.mock.calls[0][1];
      expect(updates['events/e1/name']).toBe('New Name');
      expect(updates['events/e1/description']).toBeNull();
      expect(updates['events/e1/updatedAt']).toEqual(expect.any(Number));
    });
  });

  describe('linkTournament', () => {
    it('adds tournament to event', async () => {
      const { result } = renderHook(() => useEvent('e1'));

      // First populate event
      act(() => {
        fireListener('events/e1', {
          name: 'Event',
          date: '2026-06-15',
          code: 'E1',
          tournaments: [],
          organizerId: 'org1',
          createdAt: 1000,
          updatedAt: 1000,
        });
      });

      await act(async () => {
        await result.current.linkTournament('t1', 2);
      });

      const updates = mockUpdate.mock.calls[0][1];
      expect(updates['events/e1/tournaments']).toEqual([{ tournamentId: 't1', weight: 2 }]);
    });

    it('does not add duplicate tournament', async () => {
      const { result } = renderHook(() => useEvent('e1'));

      act(() => {
        fireListener('events/e1', {
          name: 'Event',
          date: '2026-06-15',
          code: 'E1',
          tournaments: [{ tournamentId: 't1', weight: 1 }],
          organizerId: 'org1',
          createdAt: 1000,
          updatedAt: 1000,
        });
      });

      await act(async () => {
        await result.current.linkTournament('t1');
      });

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('unlinkTournament', () => {
    it('removes tournament from event', async () => {
      const { result } = renderHook(() => useEvent('e1'));

      act(() => {
        fireListener('events/e1', {
          name: 'Event',
          date: '2026-06-15',
          code: 'E1',
          tournaments: [{ tournamentId: 't1', weight: 1 }, { tournamentId: 't2', weight: 2 }],
          organizerId: 'org1',
          createdAt: 1000,
          updatedAt: 1000,
        });
      });

      await act(async () => {
        await result.current.unlinkTournament('t1');
      });

      const updates = mockUpdate.mock.calls[0][1];
      expect(updates['events/e1/tournaments']).toEqual([{ tournamentId: 't2', weight: 2 }]);
    });
  });

  describe('updateTournamentWeight', () => {
    it('updates weight for specific tournament', async () => {
      const { result } = renderHook(() => useEvent('e1'));

      act(() => {
        fireListener('events/e1', {
          name: 'Event',
          date: '2026-06-15',
          code: 'E1',
          tournaments: [{ tournamentId: 't1', weight: 1 }],
          organizerId: 'org1',
          createdAt: 1000,
          updatedAt: 1000,
        });
      });

      await act(async () => {
        await result.current.updateTournamentWeight('t1', 3);
      });

      const updates = mockUpdate.mock.calls[0][1];
      expect(updates['events/e1/tournaments']).toEqual([{ tournamentId: 't1', weight: 3 }]);
    });
  });

  describe('deleteEvent', () => {
    it('deletes event, user index, and event code', async () => {
      const { result } = renderHook(() => useEvent('e1'));

      act(() => {
        fireListener('events/e1', {
          name: 'Event',
          date: '2026-06-15',
          code: 'EVT1',
          tournaments: [],
          organizerId: 'org1',
          createdAt: 1000,
          updatedAt: 1000,
        });
      });

      await act(async () => {
        await result.current.deleteEvent('org1');
      });

      const updates = mockUpdate.mock.calls[0][1];
      expect(updates['events/e1']).toBeNull();
      expect(updates['users/org1/events/e1']).toBeNull();
      expect(updates['eventCodes/EVT1']).toBeNull();
    });
  });

  describe('importEvent', () => {
    it('imports event with tournaments', async () => {
      const { result } = renderHook(() => useEvent(null));

      let id: string;
      await act(async () => {
        id = await result.current.importEvent(
          'Imported Event',
          '2026-06-20',
          'org1',
          'A fun event',
          [{ tournamentId: 't1', weight: 1 }],
        );
      });

      expect(id!).toBe('mock-id-1');
      const updates = mockUpdate.mock.calls[0][1];
      const evt = updates['events/mock-id-1'] as Record<string, unknown>;
      expect(evt.name).toBe('Imported Event');
      expect(evt.description).toBe('A fun event');
      expect(evt.tournaments).toEqual([{ tournamentId: 't1', weight: 1 }]);
    });
  });
});

describe('loadEventByCode', () => {
  it('returns event ID for valid code', async () => {
    store = { eventCodes: { EVT1: 'e1' } };
    const id = await loadEventByCode('EVT1');
    expect(id).toBe('e1');
  });

  it('returns null for non-existent code', async () => {
    const id = await loadEventByCode('NOPE');
    expect(id).toBeNull();
  });
});
