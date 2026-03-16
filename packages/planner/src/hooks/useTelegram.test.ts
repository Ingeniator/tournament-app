// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTelegram } from './useTelegram';

beforeEach(() => {
  Object.defineProperty(window, 'Telegram', { value: undefined, writable: true, configurable: true });
});

describe('useTelegram', () => {
  it('returns null user when Telegram is not available', () => {
    const { result } = renderHook(() => useTelegram());
    expect(result.current.user).toBeNull();
    expect(result.current.chatInstance).toBeNull();
  });

  it('returns null user when WebApp has no user', () => {
    Object.defineProperty(window, 'Telegram', {
      value: {
        WebApp: {
          initDataUnsafe: {},
          ready: vi.fn(),
          expand: vi.fn(),
        },
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useTelegram());
    expect(result.current.user).toBeNull();
  });

  it('returns user data when Telegram WebApp is available', () => {
    const mockReady = vi.fn();
    const mockExpand = vi.fn();
    Object.defineProperty(window, 'Telegram', {
      value: {
        WebApp: {
          initData: 'test',
          initDataUnsafe: {
            user: { id: 12345, first_name: 'Alice', last_name: 'Smith', username: 'asmith' },
            chat_instance: 'chat42',
          },
          ready: mockReady,
          expand: mockExpand,
        },
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useTelegram());
    expect(result.current.user).toEqual({
      telegramId: 12345,
      displayName: 'Alice Smith',
      username: 'asmith',
    });
    expect(result.current.chatInstance).toBe('chat42');
    expect(mockReady).toHaveBeenCalled();
    expect(mockExpand).toHaveBeenCalled();
  });

  it('handles user with only first name', () => {
    Object.defineProperty(window, 'Telegram', {
      value: {
        WebApp: {
          initData: 'test',
          initDataUnsafe: {
            user: { id: 1, first_name: 'Bob' },
          },
          ready: vi.fn(),
          expand: vi.fn(),
        },
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useTelegram());
    expect(result.current.user!.displayName).toBe('Bob');
    expect(result.current.user!.username).toBeUndefined();
  });
});
