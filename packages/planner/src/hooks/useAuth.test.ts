// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';

let authCallback: ((user: { uid: string } | null) => void) | null = null;
const mockSignIn = vi.fn().mockResolvedValue(undefined);

vi.mock('@padel/common', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth: unknown, callback: (user: unknown) => void) => {
    authCallback = callback;
    return () => { authCallback = null; };
  }),
}));

vi.mock('../firebase', () => ({
  auth: { __mock: true },
  signIn: (...args: unknown[]) => mockSignIn(...args),
  firebaseConfigured: true,
}));

beforeEach(() => {
  vi.useFakeTimers();
  authCallback = null;
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAuth', () => {
  it('returns loading=true initially', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
    expect(result.current.uid).toBeNull();
    expect(result.current.authError).toBeNull();
  });

  it('sets uid when user is authenticated', () => {
    const { result } = renderHook(() => useAuth());
    act(() => {
      authCallback?.({ uid: 'user123' });
    });
    expect(result.current.uid).toBe('user123');
    expect(result.current.loading).toBe(false);
    expect(result.current.authError).toBeNull();
  });

  it('calls signIn when user is null', () => {
    renderHook(() => useAuth());
    act(() => {
      authCallback?.(null);
    });
    expect(mockSignIn).toHaveBeenCalled();
  });

  it('sets authError after MAX_RETRIES failed signIn attempts', async () => {
    mockSignIn.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useAuth());

    // Trigger auth with null user
    act(() => {
      authCallback?.(null);
    });

    // Wait for first signIn rejection
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Advance through exponential backoff: 1s, 2s, 4s, 8s, 16s
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000 * 2 ** i);
      });
    }

    expect(result.current.authError).toBe('auth.connectionFailed');
    expect(result.current.loading).toBe(false);
  });

  it('resets error when user authenticates after retries', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => useAuth());

    act(() => {
      authCallback?.(null);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Now user authenticates
    act(() => {
      authCallback?.({ uid: 'recovered' });
    });
    expect(result.current.uid).toBe('recovered');
    expect(result.current.authError).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
