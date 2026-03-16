// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { AuthProvider, useAuthCtx } from './AuthContext';

const mockUseAuth = vi.fn().mockReturnValue({ uid: 'u1', loading: false, authError: null });
const mockUpdateName = vi.fn();
const mockUpdateSkin = vi.fn().mockResolvedValue(undefined);
const mockUpdateTelegramId = vi.fn();
const mockUpdateTelegramUsername = vi.fn();
const mockUseUserProfile = vi.fn().mockReturnValue({
  name: 'Alice',
  skin: null,
  loading: false,
  updateName: mockUpdateName,
  updateSkin: mockUpdateSkin,
  updateTelegramId: mockUpdateTelegramId,
  updateTelegramUsername: mockUpdateTelegramUsername,
});
const mockUseTelegram = vi.fn().mockReturnValue({ user: null, chatInstance: null });
const mockUseTelegramSync = vi.fn();
const mockUseGoogleAuth = vi.fn().mockReturnValue({
  isGoogleLinked: false,
  googleEmail: null,
  linkGoogle: vi.fn(),
  linking: false,
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock('../hooks/useUserProfile', () => ({
  useUserProfile: (...args: unknown[]) => mockUseUserProfile(...args),
}));
vi.mock('../hooks/useTelegram', () => ({
  useTelegram: () => mockUseTelegram(),
}));
vi.mock('../hooks/useTelegramSync', () => ({
  useTelegramSync: (...args: unknown[]) => mockUseTelegramSync(...args),
}));
vi.mock('../hooks/useGoogleAuth', () => ({
  useGoogleAuth: (...args: unknown[]) => mockUseGoogleAuth(...args),
}));
vi.mock('@padel/common', () => ({
  useTheme: (initial: string) => {
    const [skin, setSkin] = React.useState(initial);
    return { skin, setSkin };
  },
  isValidSkin: (val: string) => ['classic', 'neon'].includes(val),
  DEFAULT_SKIN: 'classic',
}));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockUseAuth.mockReturnValue({ uid: 'u1', loading: false, authError: null });
  mockUseUserProfile.mockReturnValue({
    name: 'Alice', skin: null, loading: false,
    updateName: mockUpdateName, updateSkin: mockUpdateSkin,
    updateTelegramId: mockUpdateTelegramId, updateTelegramUsername: mockUpdateTelegramUsername,
  });
  mockUseTelegram.mockReturnValue({ user: null, chatInstance: null });
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  it('provides uid and auth state', () => {
    const { result } = renderHook(() => useAuthCtx(), { wrapper });
    expect(result.current.uid).toBe('u1');
    expect(result.current.authLoading).toBe(false);
    expect(result.current.userName).toBe('Alice');
  });

  it('provides auth error', () => {
    mockUseAuth.mockReturnValue({ uid: null, loading: false, authError: 'Network error' });
    const { result } = renderHook(() => useAuthCtx(), { wrapper });
    expect(result.current.authError).toBe('Network error');
  });

  it('auto-sets profile from Telegram identity when userName is null', () => {
    mockUseUserProfile.mockReturnValue({
      name: null, skin: null, loading: false,
      updateName: mockUpdateName, updateSkin: mockUpdateSkin,
      updateTelegramId: mockUpdateTelegramId, updateTelegramUsername: mockUpdateTelegramUsername,
    });
    mockUseTelegram.mockReturnValue({
      user: { telegramId: 123, displayName: 'Tg User', username: 'tguser' },
      chatInstance: null,
    });

    renderHook(() => useAuthCtx(), { wrapper });
    expect(mockUpdateName).toHaveBeenCalledWith('Tg User');
    expect(mockUpdateTelegramId).toHaveBeenCalledWith(123);
    expect(mockUpdateTelegramUsername).toHaveBeenCalledWith('tguser');
  });

  it('does not override existing userName from Telegram', () => {
    mockUseTelegram.mockReturnValue({
      user: { telegramId: 123, displayName: 'Tg User', username: 'tguser' },
      chatInstance: null,
    });

    renderHook(() => useAuthCtx(), { wrapper });
    expect(mockUpdateName).not.toHaveBeenCalled();
    // But still updates telegramId
    expect(mockUpdateTelegramId).toHaveBeenCalledWith(123);
  });

  it('setSkin persists to localStorage and Firebase', async () => {
    const { result } = renderHook(() => useAuthCtx(), { wrapper });

    act(() => {
      result.current.setSkin('neon' as any);
    });

    expect(result.current.skin).toBe('neon');
    expect(localStorage.getItem('padel-skin')).toBe('neon');
    expect(mockUpdateSkin).toHaveBeenCalledWith('neon');
  });
});
