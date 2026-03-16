// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { linkTournamentToChat } from './chatRoom';

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
  current[parts[parts.length - 1]] = value;
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
const mockUpdate = vi.fn(async (_refObj: { _path: string }, updates: Record<string, unknown>) => {
  for (const [path, value] of Object.entries(updates)) {
    setNestedValue(path, value);
  }
});

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => mockRef(...args),
  get: (...args: unknown[]) => mockGet(...args),
  update: (...args: unknown[]) => mockUpdate(...args),
}));

vi.mock('../firebase', () => ({
  db: { __mock: true },
}));

beforeEach(() => {
  store = {};
  vi.clearAllMocks();
});

describe('linkTournamentToChat', () => {
  it('skips when tournament already linked', async () => {
    store = {
      chatRooms: { chat1: { tournaments: { t1: { name: 'Existing' } } } },
    };
    await linkTournamentToChat('t1', 'chat1', 'user1');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('links tournament to chat room with organizer name', async () => {
    store = {
      tournaments: {
        t1: { name: 'Sunday Cup', date: '2026-06-15', code: 'ABC123', organizerId: 'org1' },
      },
      users: { org1: { name: 'Alice' } },
    };

    await linkTournamentToChat('t1', 'chat1', 'user1');
    expect(mockUpdate).toHaveBeenCalledTimes(1);

    // Check the multi-path update was called
    const updates = mockUpdate.mock.calls[0][1];
    expect(updates[`chatRooms/chat1/tournaments/t1`]).toMatchObject({
      name: 'Sunday Cup',
      date: '2026-06-15',
      code: 'ABC123',
      organizerId: 'org1',
      organizerName: 'Alice',
      linkedBy: 'user1',
    });
    expect(updates[`tournaments/t1/chatRooms/chat1`]).toBe(true);
  });

  it('links tournament without organizer name when not available', async () => {
    store = {
      tournaments: {
        t1: { name: 'Cup', code: 'XYZ789', organizerId: 'org1' },
      },
    };

    await linkTournamentToChat('t1', 'chat1', 'user1');
    const updates = mockUpdate.mock.calls[0][1];
    expect(updates[`chatRooms/chat1/tournaments/t1`].organizerName).toBeUndefined();
  });

  it('does nothing when tournament does not exist', async () => {
    await linkTournamentToChat('nonexistent', 'chat1', 'user1');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  describe('error paths', () => {
    it('propagates error when checking existing link fails', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));
      await expect(linkTournamentToChat('t1', 'chat1', 'user1')).rejects.toThrow('Network error');
    });

    it('propagates error when reading tournament metadata fails', async () => {
      // First get (entryRef check) succeeds with non-existing, second get (tournament) fails
      let callCount = 0;
      mockGet.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { val: () => null, exists: () => false };
        }
        throw new Error('Permission denied');
      });

      await expect(linkTournamentToChat('t1', 'chat1', 'user1')).rejects.toThrow('Permission denied');
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('propagates error when multi-path update fails', async () => {
      store = {
        tournaments: {
          t1: { name: 'Cup', code: 'ABC', organizerId: 'org1' },
        },
        users: { org1: { name: 'Alice' } },
      };
      mockGet.mockImplementation(async (refObj: { _path: string }) => makeSnapshot(refObj._path));
      mockUpdate.mockRejectedValueOnce(new Error('Write failed'));

      await expect(linkTournamentToChat('t1', 'chat1', 'user1')).rejects.toThrow('Write failed');
    });
  });
});
