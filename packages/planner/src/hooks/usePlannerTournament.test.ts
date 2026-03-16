// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlannerTournament } from './usePlannerTournament';

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
  };
}

const mockRef = vi.fn((_db: unknown, path?: string) => ({ _path: path ?? '' }));
const mockGet = vi.fn(async (refObj: { _path: string }) => makeSnapshot(refObj._path));
const mockSet = vi.fn(async () => {});
const mockUpdate = vi.fn(async (_refObj: { _path: string }, updates: Record<string, unknown>) => {
  for (const [path, value] of Object.entries(updates)) {
    if (value === null) {
      // Delete path
      const parts = path.split('/');
      const parent = parts.slice(0, -1).join('/');
      const parentVal = getNestedValue(parent);
      if (parentVal && typeof parentVal === 'object') {
        delete (parentVal as Record<string, unknown>)[parts[parts.length - 1]];
      }
    } else {
      setNestedValue(path, value);
    }
  }
});
const mockOnValue = vi.fn((refObj: { _path: string }, callback: (snap: unknown) => void, errorCb?: (err: Error) => void) => {
  listeners.set(refObj._path, { callback, error: errorCb });
  return () => { listeners.delete(refObj._path); };
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

let idCounter = 0;
vi.mock('@padel/common', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, generateId: () => `mock-id-${++idCounter}` };
});

vi.mock('../utils/shortCode', () => ({
  generateUniqueCode: vi.fn().mockResolvedValue('ABC123'),
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

describe('usePlannerTournament', () => {
  describe('subscription', () => {
    it('does not subscribe when tournamentId is null', () => {
      renderHook(() => usePlannerTournament(null));
      expect(listeners.size).toBe(0);
    });

    it('subscribes to tournament data', () => {
      renderHook(() => usePlannerTournament('t1'));
      expect(listeners.has('tournaments/t1')).toBe(true);
    });

    it('sets tournament from snapshot data', () => {
      const { result } = renderHook(() => usePlannerTournament('t1'));

      act(() => {
        fireListener('tournaments/t1', {
          name: 'Cup',
          format: 'americano',
          courts: [{ id: 'c1', name: 'Court 1' }],
          organizerId: 'org1',
          code: 'XYZ',
          createdAt: 1000,
        });
      });

      expect(result.current.tournament).not.toBeNull();
      expect(result.current.tournament!.name).toBe('Cup');
      expect(result.current.tournament!.format).toBe('americano');
      expect(result.current.loading).toBe(false);
    });

    it('normalizes Firebase object-style courts to array', () => {
      const { result } = renderHook(() => usePlannerTournament('t1'));

      act(() => {
        fireListener('tournaments/t1', {
          name: 'Cup',
          format: 'americano',
          courts: { 0: { id: 'c1', name: 'Court 1' }, 1: { id: 'c2', name: 'Court 2' } },
          organizerId: 'org1',
          code: 'XYZ',
          createdAt: 1000,
        });
      });

      expect(result.current.tournament!.courts).toHaveLength(2);
    });

    it('provides default court when courts missing', () => {
      const { result } = renderHook(() => usePlannerTournament('t1'));

      act(() => {
        fireListener('tournaments/t1', {
          name: 'Cup',
          format: 'americano',
          organizerId: 'org1',
          code: 'XYZ',
          createdAt: 1000,
        });
      });

      expect(result.current.tournament!.courts).toHaveLength(1);
      expect(result.current.tournament!.courts[0].name).toBe('Court 1');
    });

    it('sets completedAt from snapshot', () => {
      const { result } = renderHook(() => usePlannerTournament('t1'));

      act(() => {
        fireListener('tournaments/t1', {
          name: 'Cup',
          format: 'americano',
          organizerId: 'org1',
          code: 'XYZ',
          createdAt: 1000,
          completedAt: 5000,
        });
      });

      expect(result.current.completedAt).toBe(5000);
    });

    it('sets tournament to null when data is null', () => {
      const { result } = renderHook(() => usePlannerTournament('t1'));

      act(() => {
        fireListener('tournaments/t1', null);
      });

      expect(result.current.tournament).toBeNull();
      expect(result.current.completedAt).toBeNull();
    });

    it('sets error on listener failure', () => {
      const { result } = renderHook(() => usePlannerTournament('t1'));

      act(() => {
        fireError('tournaments/t1', 'Permission denied');
      });

      expect(result.current.error).toBe('Permission denied');
      expect(result.current.loading).toBe(false);
    });
  });

  describe('createTournament', () => {
    it('creates tournament with multi-path update', async () => {
      const { result } = renderHook(() => usePlannerTournament(null));

      let id: string;
      await act(async () => {
        id = await result.current.createTournament('My Cup', 'org1');
      });

      expect(id!).toBe('mock-id-1');
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      const updates = mockUpdate.mock.calls[0][1];
      expect(updates['tournaments/mock-id-1']).toMatchObject({ name: 'My Cup', format: 'americano' });
      expect(updates['codes/ABC123']).toBe('mock-id-1');
      expect(updates['users/org1/organized/mock-id-1']).toBe(true);
    });

    it('includes telegram entries when telegramUsername provided', async () => {
      const { result } = renderHook(() => usePlannerTournament(null));

      await act(async () => {
        await result.current.createTournament('Cup', 'org1', undefined, 'alice');
      });

      const updates = mockUpdate.mock.calls[0][1];
      expect(updates['telegramUsers/alice/organized/mock-id-1']).toBe(true);
      expect(updates['telegramUsers/alice/currentUid']).toBe('org1');
    });

    it('includes chatRoom link when chatLink provided', async () => {
      const { result } = renderHook(() => usePlannerTournament(null));

      await act(async () => {
        await result.current.createTournament('Cup', 'org1', undefined, undefined, {
          chatInstance: 'chat1',
          organizerName: 'Alice',
        });
      });

      const updates = mockUpdate.mock.calls[0][1];
      expect(updates['chatRooms/chat1/tournaments/mock-id-1']).toMatchObject({
        name: 'Cup',
        code: 'ABC123',
        organizerName: 'Alice',
      });
    });
  });

  describe('updateTournament', () => {
    it('converts undefined values to null for Firebase deletion', async () => {
      const { result } = renderHook(() => usePlannerTournament('t1'));

      await act(async () => {
        await result.current.updateTournament({ name: 'New Name', place: undefined });
      });

      const updates = mockUpdate.mock.calls[0][1];
      expect(updates['tournaments/t1/name']).toBe('New Name');
      expect(updates['tournaments/t1/place']).toBeNull();
    });

    it('does nothing when tournamentId is null', async () => {
      const { result } = renderHook(() => usePlannerTournament(null));

      await act(async () => {
        await result.current.updateTournament({ name: 'X' });
      });

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('loadByCode', () => {
    it('returns tournament ID for valid code', async () => {
      store = { codes: { ABC123: 't1' } };
      const { result } = renderHook(() => usePlannerTournament(null));

      let id: string | null;
      await act(async () => {
        id = await result.current.loadByCode('abc123');
      });

      expect(id!).toBe('t1');
    });

    it('returns null for non-existent code', async () => {
      const { result } = renderHook(() => usePlannerTournament(null));

      let id: string | null;
      await act(async () => {
        id = await result.current.loadByCode('NOPE');
      });

      expect(id!).toBeNull();
    });
  });

  describe('deleteTournament', () => {
    it('deletes tournament, code, organizer index, and player registrations', async () => {
      store = {
        tournaments: {
          t1: {
            code: 'XYZ',
            players: { p1: { name: 'A' }, p2: { name: 'B' } },
          },
        },
      };
      const { result } = renderHook(() => usePlannerTournament('t1'));

      await act(async () => {
        await result.current.deleteTournament('org1');
      });

      const updates = mockUpdate.mock.calls[0][1];
      expect(updates['codes/XYZ']).toBeNull();
      expect(updates['tournaments/t1']).toBeNull();
      expect(updates['users/org1/organized/t1']).toBeNull();
      expect(updates['users/p1/registrations/t1']).toBeNull();
      expect(updates['users/p2/registrations/t1']).toBeNull();
    });

    it('cleans up chatRoom entries on delete', async () => {
      store = {
        tournaments: {
          t1: { code: 'XYZ', chatRooms: { chat1: true } },
        },
      };
      const { result } = renderHook(() => usePlannerTournament('t1'));

      await act(async () => {
        await result.current.deleteTournament('org1');
      });

      const updates = mockUpdate.mock.calls[0][1];
      expect(updates['chatRooms/chat1/tournaments/t1']).toBeNull();
    });
  });

  describe('undoComplete', () => {
    it('sets completedAt to null', async () => {
      const { result } = renderHook(() => usePlannerTournament('t1'));

      await act(async () => {
        await result.current.undoComplete();
      });

      expect(mockSet).toHaveBeenCalledWith({ _path: 'tournaments/t1/completedAt' }, null);
    });
  });

  describe('error paths', () => {
    it('createTournament throws when Firebase update rejects', async () => {
      mockUpdate.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));
      const { result } = renderHook(() => usePlannerTournament(null));

      await expect(
        act(async () => {
          await result.current.createTournament('Cup', 'org1');
        }),
      ).rejects.toThrow('PERMISSION_DENIED');
    });

    it('updateTournament propagates Firebase update errors', async () => {
      mockUpdate.mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => usePlannerTournament('t1'));

      await expect(
        act(async () => {
          await result.current.updateTournament({ name: 'New' });
        }),
      ).rejects.toThrow('Network error');
    });

    it('loadByCode propagates Firebase get errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => usePlannerTournament(null));

      await expect(
        act(async () => {
          await result.current.loadByCode('ABC');
        }),
      ).rejects.toThrow('Network error');
    });

    it('deleteTournament propagates Firebase get errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));
      const { result } = renderHook(() => usePlannerTournament('t1'));

      await expect(
        act(async () => {
          await result.current.deleteTournament('org1');
        }),
      ).rejects.toThrow('PERMISSION_DENIED');
    });

    it('deleteTournament propagates Firebase update errors', async () => {
      store = { tournaments: { t1: { code: 'XYZ' } } };
      mockUpdate.mockRejectedValueOnce(new Error('Write failed'));
      const { result } = renderHook(() => usePlannerTournament('t1'));

      await expect(
        act(async () => {
          await result.current.deleteTournament('org1');
        }),
      ).rejects.toThrow('Write failed');
    });

    it('undoComplete propagates Firebase set errors', async () => {
      mockSet.mockRejectedValueOnce(new Error('Auth expired'));
      const { result } = renderHook(() => usePlannerTournament('t1'));

      await expect(
        act(async () => {
          await result.current.undoComplete();
        }),
      ).rejects.toThrow('Auth expired');
    });

    it('deleteTournamentById propagates errors when get fails', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => usePlannerTournament(null));

      await expect(
        act(async () => {
          await result.current.deleteTournamentById('t1', 'org1');
        }),
      ).rejects.toThrow('Network error');
    });

    it('listener error clears on successful data', () => {
      const { result } = renderHook(() => usePlannerTournament('t1'));

      act(() => {
        fireError('tournaments/t1', 'Permission denied');
      });
      expect(result.current.error).toBe('Permission denied');

      act(() => {
        fireListener('tournaments/t1', {
          name: 'Cup',
          format: 'americano',
          organizerId: 'org1',
          code: 'XYZ',
          createdAt: 1000,
        });
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe('importTournament', () => {
    it('imports tournament with players embedded', async () => {
      const { result } = renderHook(() => usePlannerTournament(null));

      let id: string;
      await act(async () => {
        id = await result.current.importTournament(
          { name: 'Imported', format: 'mexicano' },
          [{ name: 'Alice' }, { name: 'Bob', group: 'A' }],
          'org1',
        );
      });

      expect(id!).toBe('mock-id-1');
      const updates = mockUpdate.mock.calls[0][1];
      const t = updates['tournaments/mock-id-1'] as Record<string, unknown>;
      expect(t.name).toBe('Imported');
      expect(t.format).toBe('mexicano');
      // Players embedded as a map
      const players = t.players as Record<string, Record<string, unknown>>;
      const playerEntries = Object.values(players);
      expect(playerEntries).toHaveLength(2);
      expect(playerEntries.find(p => p.name === 'Alice')).toBeDefined();
      expect(playerEntries.find(p => p.name === 'Bob')!.group).toBe('A');
    });
  });
});
