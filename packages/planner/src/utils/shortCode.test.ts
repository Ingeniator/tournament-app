// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => mockRef(...args),
  get: (...args: unknown[]) => mockGet(...args),
}));

vi.mock('../firebase', () => ({
  db: { __mock: true },
}));

beforeEach(() => {
  store = {};
  vi.clearAllMocks();
});

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

describe('generateUniqueCode', () => {
  it('returns a 6-character code from the valid alphabet', async () => {
    const { generateUniqueCode } = await import('./shortCode');
    const code = await generateUniqueCode();
    expect(code).toHaveLength(6);
    for (const char of code) {
      expect(ALPHABET).toContain(char);
    }
  });

  it('returns code when it does not exist in the database', async () => {
    const { generateUniqueCode } = await import('./shortCode');
    const code = await generateUniqueCode();
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(code).toHaveLength(6);
  });

  it('retries when code already exists', async () => {
    // Make first code exist, second doesn't
    let callCount = 0;
    mockGet.mockImplementation(async () => {
      callCount++;
      return {
        val: () => (callCount === 1 ? true : null),
        exists: () => callCount === 1,
      };
    });

    const { generateUniqueCode } = await import('./shortCode');
    const code = await generateUniqueCode();
    expect(callCount).toBe(2);
    expect(code).toHaveLength(6);
  });

  it('throws after 10 failed attempts', async () => {
    mockGet.mockImplementation(async () => ({
      val: () => true,
      exists: () => true,
    }));

    const { generateUniqueCode } = await import('./shortCode');
    await expect(generateUniqueCode()).rejects.toThrow('Failed to generate unique code after 10 attempts');
    expect(mockGet).toHaveBeenCalledTimes(10);
  });

  describe('error paths', () => {
    it('propagates network errors from get()', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));
      const { generateUniqueCode } = await import('./shortCode');
      await expect(generateUniqueCode()).rejects.toThrow('Network error');
    });

    it('propagates permission denied errors from get()', async () => {
      mockGet.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));
      const { generateUniqueCode } = await import('./shortCode');
      await expect(generateUniqueCode()).rejects.toThrow('PERMISSION_DENIED');
    });

    it('supports custom basePath', async () => {
      mockGet.mockImplementation(async () => ({
        val: () => null,
        exists: () => false,
      }));
      const { generateUniqueCode } = await import('./shortCode');
      await generateUniqueCode('eventCodes');
      expect(mockRef).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('eventCodes/'));
    });
  });
});
