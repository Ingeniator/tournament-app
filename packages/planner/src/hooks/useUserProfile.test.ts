// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserProfile } from './useUserProfile';

type Listener = { callback: (snap: unknown) => void; error?: (err: Error) => void };
const listeners = new Map<string, Listener>();

const mockRef = vi.fn((_db: unknown, path?: string) => ({ _path: path ?? '' }));
const mockSet = vi.fn(async () => {});
const mockOnValue = vi.fn((refObj: { _path: string }, callback: (snap: unknown) => void, errorCb?: (err: Error) => void) => {
  listeners.set(refObj._path, { callback, error: errorCb });
  return () => { listeners.delete(refObj._path); };
});

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => mockRef(...args),
  set: (...args: unknown[]) => mockSet(...args),
  onValue: (...args: unknown[]) => mockOnValue(...args),
}));

vi.mock('../firebase', () => ({
  db: { __mock: true },
}));

vi.mock('@padel/common', () => ({
  isValidSkin: (val: string) => ['classic', 'neon', 'retro'].includes(val),
}));

function fireListener(path: string, value: unknown) {
  const listener = listeners.get(path);
  listener?.callback({
    val: () => value,
    exists: () => value !== null && value !== undefined,
  });
}

beforeEach(() => {
  listeners.clear();
  vi.clearAllMocks();
});

describe('useUserProfile', () => {
  it('returns loading=true initially', () => {
    const { result } = renderHook(() => useUserProfile('u1'));
    expect(result.current.loading).toBe(true);
    expect(result.current.name).toBeNull();
    expect(result.current.skin).toBeNull();
  });

  it('sets name when listener fires', () => {
    const { result } = renderHook(() => useUserProfile('u1'));

    act(() => {
      fireListener('users/u1/name', 'Alice');
    });

    expect(result.current.name).toBe('Alice');
    expect(result.current.loading).toBe(false);
  });

  it('sets skin when valid skin listener fires', () => {
    const { result } = renderHook(() => useUserProfile('u1'));

    act(() => {
      fireListener('users/u1/name', 'Alice');
      fireListener('users/u1/skin', 'neon');
    });

    expect(result.current.skin).toBe('neon');
  });

  it('does not set skin for invalid values', () => {
    const { result } = renderHook(() => useUserProfile('u1'));

    act(() => {
      fireListener('users/u1/skin', 'invalid-skin');
    });

    expect(result.current.skin).toBeNull();
  });

  it('updateName calls Firebase set', async () => {
    const { result } = renderHook(() => useUserProfile('u1'));

    await act(async () => {
      await result.current.updateName('Bob');
    });

    expect(mockSet).toHaveBeenCalledWith({ _path: 'users/u1/name' }, 'Bob');
  });

  it('updateSkin calls Firebase set', async () => {
    const { result } = renderHook(() => useUserProfile('u1'));

    await act(async () => {
      await result.current.updateSkin('retro' as any);
    });

    expect(mockSet).toHaveBeenCalledWith({ _path: 'users/u1/skin' }, 'retro');
  });

  it('updateTelegramId calls Firebase set', async () => {
    const { result } = renderHook(() => useUserProfile('u1'));

    await act(async () => {
      await result.current.updateTelegramId(12345);
    });

    expect(mockSet).toHaveBeenCalledWith({ _path: 'users/u1/telegramId' }, 12345);
  });

  it('does nothing when uid is null', () => {
    const { result } = renderHook(() => useUserProfile(null));
    expect(result.current.loading).toBe(true);
    expect(mockOnValue).not.toHaveBeenCalled();
  });

  describe('error paths', () => {
    it('sets loading=false and warns when name listener errors', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useUserProfile('u1'));

      act(() => {
        const listener = listeners.get('users/u1/name');
        listener?.error?.(new Error('Permission denied'));
      });

      expect(result.current.loading).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith('User name listener failed:', 'Permission denied');
      warnSpy.mockRestore();
    });

    it('warns when skin listener errors', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      renderHook(() => useUserProfile('u1'));

      act(() => {
        const listener = listeners.get('users/u1/skin');
        listener?.error?.(new Error('Network error'));
      });

      expect(warnSpy).toHaveBeenCalledWith('User skin listener failed:', 'Network error');
      warnSpy.mockRestore();
    });

    it('updateName propagates Firebase write errors', async () => {
      mockSet.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));
      const { result } = renderHook(() => useUserProfile('u1'));

      await expect(
        act(async () => {
          await result.current.updateName('Bob');
        }),
      ).rejects.toThrow('PERMISSION_DENIED');
    });

    it('updateSkin propagates Firebase write errors', async () => {
      mockSet.mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => useUserProfile('u1'));

      await expect(
        act(async () => {
          await result.current.updateSkin('retro' as any);
        }),
      ).rejects.toThrow('Network error');
    });

    it('updateTelegramId propagates Firebase write errors', async () => {
      mockSet.mockRejectedValueOnce(new Error('Quota exceeded'));
      const { result } = renderHook(() => useUserProfile('u1'));

      await expect(
        act(async () => {
          await result.current.updateTelegramId(12345);
        }),
      ).rejects.toThrow('Quota exceeded');
    });

    it('updateTelegramUsername propagates Firebase write errors', async () => {
      mockSet.mockRejectedValueOnce(new Error('Auth expired'));
      const { result } = renderHook(() => useUserProfile('u1'));

      await expect(
        act(async () => {
          await result.current.updateTelegramUsername('alice');
        }),
      ).rejects.toThrow('Auth expired');
    });

    it('update functions are no-ops when uid is null', async () => {
      const { result } = renderHook(() => useUserProfile(null));

      await act(async () => {
        await result.current.updateName('Bob');
        await result.current.updateSkin('retro' as any);
        await result.current.updateTelegramId(123);
        await result.current.updateTelegramUsername('alice');
      });

      expect(mockSet).not.toHaveBeenCalled();
    });
  });
});
