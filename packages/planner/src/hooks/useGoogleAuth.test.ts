// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// In-memory Firebase store (same pattern as useTelegramSync.test.ts)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Hoisted mocks — vi.hoisted ensures these are available inside vi.mock factories
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  type MockUser = { uid: string; providerData: Array<{ providerId: string; email?: string }> };
  const authObj = { currentUser: null as MockUser | null };
  return {
    authObj,
    linkWithGoogle: vi.fn(),
    signInWithGoogle: vi.fn(),
    signInWithGoogleCredential: vi.fn(),
    getGoogleRedirectResult: vi.fn().mockResolvedValue(null),
    credentialFromError: vi.fn(() => null),
  };
});

// ---------------------------------------------------------------------------
// Firebase database mocks
// ---------------------------------------------------------------------------
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

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => mockRef(...args),
  get: (...args: unknown[]) => mockGet(...args),
  set: (...args: unknown[]) => mockSet(...args),
  update: (...args: unknown[]) => mockUpdate(...args),
}));

vi.mock('../firebase', () => ({
  db: { __mock: true },
  auth: mocks.authObj,
  linkWithGoogle: (...args: unknown[]) => mocks.linkWithGoogle(...args),
  signInWithGoogle: (...args: unknown[]) => mocks.signInWithGoogle(...args),
  signInWithGoogleCredential: (...args: unknown[]) => mocks.signInWithGoogleCredential(...args),
  getGoogleRedirectResult: (...args: unknown[]) => mocks.getGoogleRedirectResult(...args),
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: {
    credentialFromError: (...args: unknown[]) => mocks.credentialFromError(...args),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setCurrentUser(uid: string, providers: Array<{ providerId: string; email?: string }> = []) {
  mocks.authObj.currentUser = { uid, providerData: providers };
}

function clearCurrentUser() {
  mocks.authObj.currentUser = null;
}

beforeEach(() => {
  store = {};
  clearCurrentUser();
  sessionStorage.clear();
  vi.clearAllMocks();
  // Default: no redirect result
  mocks.getGoogleRedirectResult.mockResolvedValue(null);
});

// Now import the hook AFTER mocks are set up
import { useGoogleAuth } from './useGoogleAuth';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useGoogleAuth', () => {
  describe('isGoogleLinked / googleEmail', () => {
    it('returns false when no user is logged in', () => {
      const { result } = renderHook(() => useGoogleAuth(null));
      expect(result.current.isGoogleLinked).toBe(false);
      expect(result.current.googleEmail).toBeNull();
    });

    it('returns false when user has no Google provider', () => {
      setCurrentUser('uid1', []);
      const { result } = renderHook(() => useGoogleAuth('uid1'));
      expect(result.current.isGoogleLinked).toBe(false);
      expect(result.current.googleEmail).toBeNull();
    });

    it('returns true and email when Google provider is linked', () => {
      setCurrentUser('uid1', [{ providerId: 'google.com', email: 'test@gmail.com' }]);
      const { result } = renderHook(() => useGoogleAuth('uid1'));
      expect(result.current.isGoogleLinked).toBe(true);
      expect(result.current.googleEmail).toBe('test@gmail.com');
    });
  });

  describe('linkGoogle — successful link (popup)', () => {
    it('links Google and stores email in profile', async () => {
      setCurrentUser('uid1', []);
      mocks.linkWithGoogle.mockImplementation(async () => {
        // Simulate Firebase updating providerData after successful link
        mocks.authObj.currentUser!.providerData = [{ providerId: 'google.com', email: 'user@gmail.com' }];
        return { user: { uid: 'uid1' } };
      });

      const { result } = renderHook(() => useGoogleAuth('uid1'));

      await act(async () => {
        await result.current.linkGoogle();
      });

      expect(mocks.linkWithGoogle).toHaveBeenCalled();
      expect(result.current.linking).toBe(false);
      expect(result.current.error).toBeNull();
      expect(getNestedValue('users/uid1/googleEmail')).toBe('user@gmail.com');
    });

    it('does nothing when uid is null', async () => {
      const { result } = renderHook(() => useGoogleAuth(null));
      await act(async () => {
        await result.current.linkGoogle();
      });
      expect(mocks.linkWithGoogle).not.toHaveBeenCalled();
    });

    it('does nothing when auth.currentUser is null', async () => {
      // uid is set but auth has no currentUser
      const { result } = renderHook(() => useGoogleAuth('uid1'));
      await act(async () => {
        await result.current.linkGoogle();
      });
      expect(mocks.linkWithGoogle).not.toHaveBeenCalled();
    });
  });

  describe('linkGoogle — credential-already-in-use (popup)', () => {
    it('falls back to signInWithCredential and sweeps data', async () => {
      setCurrentUser('anon-uid', []);
      store = {
        users: {
          'anon-uid': {
            name: 'Alice',
            organized: { t1: true },
            registrations: { t2: true },
          },
        },
        tournaments: {
          t1: { organizerId: 'anon-uid' },
          t2: { players: { 'anon-uid': { name: 'Alice', timestamp: 1000 } } },
        },
      };

      mocks.credentialFromError.mockReturnValueOnce({ accessToken: 'tok' });
      mocks.linkWithGoogle.mockRejectedValueOnce({ code: 'auth/credential-already-in-use' });
      mocks.signInWithGoogleCredential.mockImplementation(async () => {
        setCurrentUser('google-uid', [{ providerId: 'google.com', email: 'user@gmail.com' }]);
      });

      const { result } = renderHook(() => useGoogleAuth('anon-uid'));

      await act(async () => {
        await result.current.linkGoogle();
      });

      expect(result.current.linking).toBe(false);
      expect(result.current.error).toBeNull();

      // Organized tournament should be swept
      expect(getNestedValue('tournaments/t1/organizerId')).toBe('google-uid');
      expect(getNestedValue('users/anon-uid/organized/t1')).toBeUndefined();
      expect(getNestedValue('users/google-uid/organized/t1')).toBe(true);

      // Player registration should be swept
      expect(getNestedValue('tournaments/t2/players/anon-uid')).toBeUndefined();
      expect(getNestedValue('tournaments/t2/players/google-uid')).toEqual({ name: 'Alice', timestamp: 1000 });
      expect(getNestedValue('users/anon-uid/registrations/t2')).toBeUndefined();
      expect(getNestedValue('users/google-uid/registrations/t2')).toBe(true);

      // Profile name should be copied
      expect(getNestedValue('users/google-uid/name')).toBe('Alice');
    });

    it('falls back to signInWithGoogle when credential is null', async () => {
      setCurrentUser('anon-uid', []);

      mocks.credentialFromError.mockReturnValueOnce(null);
      mocks.linkWithGoogle.mockRejectedValueOnce({ code: 'auth/credential-already-in-use' });
      mocks.signInWithGoogle.mockImplementation(async () => {
        setCurrentUser('google-uid', [{ providerId: 'google.com', email: 'u@g.com' }]);
      });

      const { result } = renderHook(() => useGoogleAuth('anon-uid'));

      await act(async () => {
        await result.current.linkGoogle();
      });

      expect(mocks.signInWithGoogle).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });
  });

  describe('linkGoogle — popup closed by user', () => {
    it('does not set error when user cancels', async () => {
      setCurrentUser('uid1', []);
      mocks.linkWithGoogle.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' });

      const { result } = renderHook(() => useGoogleAuth('uid1'));

      await act(async () => {
        await result.current.linkGoogle();
      });

      expect(result.current.linking).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('linkGoogle — other errors', () => {
    it('sets error for unexpected failures', async () => {
      setCurrentUser('uid1', []);
      mocks.linkWithGoogle.mockRejectedValueOnce({ code: 'auth/network-request-failed' });

      const { result } = renderHook(() => useGoogleAuth('uid1'));

      await act(async () => {
        await result.current.linkGoogle();
      });

      expect(result.current.linking).toBe(false);
      expect(result.current.error).toBe('Failed to link Google account');
    });
  });

  describe('claim sweep details', () => {
    it('does not overwrite existing registrations in new account', async () => {
      setCurrentUser('anon-uid', []);
      store = {
        users: {
          'anon-uid': { registrations: { t1: true } },
        },
        tournaments: {
          t1: {
            players: {
              'anon-uid': { name: 'Old', timestamp: 1000 },
              'google-uid': { name: 'Existing', timestamp: 2000 },
            },
          },
        },
      };

      mocks.credentialFromError.mockReturnValueOnce({ accessToken: 'tok' });
      mocks.linkWithGoogle.mockRejectedValueOnce({ code: 'auth/credential-already-in-use' });
      mocks.signInWithGoogleCredential.mockImplementation(async () => {
        setCurrentUser('google-uid', [{ providerId: 'google.com', email: 'u@g.com' }]);
      });

      const { result } = renderHook(() => useGoogleAuth('anon-uid'));

      await act(async () => {
        await result.current.linkGoogle();
      });

      // Old registration should NOT be moved since google-uid already has one
      expect(getNestedValue('tournaments/t1/players/anon-uid')).toEqual({ name: 'Old', timestamp: 1000 });
      expect(getNestedValue('tournaments/t1/players/google-uid')).toEqual({ name: 'Existing', timestamp: 2000 });
    });

    it('does not overwrite existing name in new account', async () => {
      setCurrentUser('anon-uid', []);
      store = {
        users: {
          'anon-uid': { name: 'OldName' },
          'google-uid': { name: 'ExistingName' },
        },
      };

      mocks.credentialFromError.mockReturnValueOnce({ accessToken: 'tok' });
      mocks.linkWithGoogle.mockRejectedValueOnce({ code: 'auth/credential-already-in-use' });
      mocks.signInWithGoogleCredential.mockImplementation(async () => {
        setCurrentUser('google-uid', [{ providerId: 'google.com', email: 'u@g.com' }]);
      });

      const { result } = renderHook(() => useGoogleAuth('anon-uid'));

      await act(async () => {
        await result.current.linkGoogle();
      });

      expect(getNestedValue('users/google-uid/name')).toBe('ExistingName');
    });

    it('skips organized tournaments where organizerId does not match old uid', async () => {
      setCurrentUser('anon-uid', []);
      store = {
        users: {
          'anon-uid': { organized: { t1: true } },
        },
        tournaments: {
          t1: { organizerId: 'someone-else' },
        },
      };

      mocks.credentialFromError.mockReturnValueOnce({ accessToken: 'tok' });
      mocks.linkWithGoogle.mockRejectedValueOnce({ code: 'auth/credential-already-in-use' });
      mocks.signInWithGoogleCredential.mockImplementation(async () => {
        setCurrentUser('google-uid', [{ providerId: 'google.com', email: 'u@g.com' }]);
      });

      const { result } = renderHook(() => useGoogleAuth('anon-uid'));

      await act(async () => {
        await result.current.linkGoogle();
      });

      expect(getNestedValue('tournaments/t1/organizerId')).toBe('someone-else');
    });

    it('skips registrations where old player record no longer exists', async () => {
      setCurrentUser('anon-uid', []);
      store = {
        users: {
          'anon-uid': { registrations: { t1: true, t2: true } },
        },
        tournaments: {
          t1: { players: {} }, // Player already removed
          t2: { players: { 'anon-uid': { name: 'Alice', timestamp: 1000 } } },
        },
      };

      mocks.credentialFromError.mockReturnValueOnce({ accessToken: 'tok' });
      mocks.linkWithGoogle.mockRejectedValueOnce({ code: 'auth/credential-already-in-use' });
      mocks.signInWithGoogleCredential.mockImplementation(async () => {
        setCurrentUser('google-uid', [{ providerId: 'google.com', email: 'u@g.com' }]);
      });

      const { result } = renderHook(() => useGoogleAuth('anon-uid'));

      await act(async () => {
        await result.current.linkGoogle();
      });

      // t1 should be untouched, t2 should be claimed
      expect(getNestedValue('tournaments/t2/players/google-uid')).toEqual({ name: 'Alice', timestamp: 1000 });
      expect(getNestedValue('tournaments/t2/players/anon-uid')).toBeUndefined();
    });
  });

  describe('redirect flow', () => {
    it('stores pre-link UID in sessionStorage before linkGoogle', async () => {
      setCurrentUser('uid1', []);
      // linkWithGoogle returns undefined (redirect — page navigates away)
      mocks.linkWithGoogle.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useGoogleAuth('uid1'));

      await act(async () => {
        await result.current.linkGoogle();
      });

      expect(result.current.linking).toBe(false);
    });

    it('handles redirect result and performs claim sweep', async () => {
      sessionStorage.setItem('google-link-pre-uid', 'old-anon-uid');
      store = {
        users: {
          'old-anon-uid': {
            name: 'RedirectUser',
            organized: { t1: true },
          },
        },
        tournaments: {
          t1: { organizerId: 'old-anon-uid' },
        },
      };

      setCurrentUser('google-uid', [{ providerId: 'google.com', email: 'redir@gmail.com' }]);
      mocks.getGoogleRedirectResult.mockResolvedValueOnce({
        user: {
          uid: 'google-uid',
          providerData: [{ providerId: 'google.com', email: 'redir@gmail.com' }],
        },
      });

      renderHook(() => useGoogleAuth('google-uid'));

      await waitFor(() => {
        expect(getNestedValue('users/google-uid/googleEmail')).toBe('redir@gmail.com');
      });

      // Claim sweep should have run
      expect(getNestedValue('tournaments/t1/organizerId')).toBe('google-uid');
      expect(getNestedValue('users/google-uid/organized/t1')).toBe(true);
      expect(getNestedValue('users/old-anon-uid/organized/t1')).toBeUndefined();
      expect(getNestedValue('users/google-uid/name')).toBe('RedirectUser');

      // Pre-link uid cleaned up
      expect(sessionStorage.getItem('google-link-pre-uid')).toBeNull();
    });

    it('skips redirect handling when no redirect result', async () => {
      setCurrentUser('uid1', []);
      mocks.getGoogleRedirectResult.mockResolvedValueOnce(null);

      renderHook(() => useGoogleAuth('uid1'));

      await waitFor(() => {
        expect(mocks.getGoogleRedirectResult).toHaveBeenCalled();
      });

      // No writes should have been made
      expect(mockSet).not.toHaveBeenCalled();
    });

    it('retries with signInWithGoogle on redirect credential-already-in-use', async () => {
      sessionStorage.setItem('google-link-pre-uid', 'old-uid');
      setCurrentUser('old-uid', []);
      mocks.getGoogleRedirectResult.mockRejectedValueOnce({ code: 'auth/credential-already-in-use' });
      mocks.signInWithGoogle.mockResolvedValueOnce(undefined);

      renderHook(() => useGoogleAuth('old-uid'));

      await waitFor(() => {
        expect(mocks.signInWithGoogle).toHaveBeenCalled();
      });

      // Pre-link uid should be preserved for the next redirect return
      expect(sessionStorage.getItem('google-link-pre-uid')).toBe('old-uid');
    });

    it('skips sweep when redirect uid matches pre-link uid', async () => {
      sessionStorage.setItem('google-link-pre-uid', 'same-uid');
      setCurrentUser('same-uid', [{ providerId: 'google.com', email: 'u@g.com' }]);
      mocks.getGoogleRedirectResult.mockResolvedValueOnce({
        user: {
          uid: 'same-uid',
          providerData: [{ providerId: 'google.com', email: 'u@g.com' }],
        },
      });

      renderHook(() => useGoogleAuth('same-uid'));

      await waitFor(() => {
        expect(getNestedValue('users/same-uid/googleEmail')).toBe('u@g.com');
      });

      // No sweep calls for organized/registrations
      const getPaths = mockGet.mock.calls.map(([r]: [{ _path: string }]) => r._path);
      expect(getPaths.filter((p: string) => p.includes('organized'))).toHaveLength(0);
    });
  });
});
