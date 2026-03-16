// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup, waitFor } from '@testing-library/react';
import { TournamentProvider, useTournamentCtx } from './TournamentContext';

// Mock AuthContext
const mockAuthValue = {
  uid: 'u1',
  userName: 'Alice',
  telegramUser: null as { telegramId: number; displayName: string; username?: string } | null,
  chatInstance: null as string | null,
};

vi.mock('./AuthContext', () => ({
  useAuthCtx: () => mockAuthValue,
}));

// Mock hooks
const mockCreateInDb = vi.fn().mockResolvedValue('new-id');
const mockImportInDb = vi.fn().mockResolvedValue('imported-id');
const mockUpdateTournament = vi.fn();
const mockLoadByCode = vi.fn().mockResolvedValue(null);
const mockDeleteInDb = vi.fn();
const mockDeleteByIdInDb = vi.fn();
const mockUndoComplete = vi.fn();

vi.mock('../hooks/usePlannerTournament', () => ({
  usePlannerTournament: () => ({
    tournament: null,
    completedAt: null,
    loading: false,
    error: null,
    createTournament: mockCreateInDb,
    importTournament: mockImportInDb,
    updateTournament: mockUpdateTournament,
    loadByCode: mockLoadByCode,
    deleteTournament: mockDeleteInDb,
    deleteTournamentById: mockDeleteByIdInDb,
    undoComplete: mockUndoComplete,
  }),
}));

vi.mock('../hooks/useMyTournaments', () => ({
  useMyTournaments: () => ({ tournaments: [], loading: false }),
}));
vi.mock('../hooks/useRegisteredTournaments', () => ({
  useRegisteredTournaments: () => ({ tournaments: [], loading: false }),
}));
vi.mock('../hooks/useChatRoomTournaments', () => ({
  useChatRoomTournaments: () => ({ tournaments: [], loading: false }),
}));
vi.mock('../utils/chatRoom', () => ({
  linkTournamentToChat: vi.fn().mockResolvedValue(undefined),
}));

const mockFirebaseUpdate = vi.fn();
vi.mock('firebase/database', () => ({
  ref: vi.fn((_db: unknown, path?: string) => ({ _path: path ?? '' })),
  get: vi.fn().mockResolvedValue({ exists: () => false, val: () => null }),
  update: (...args: unknown[]) => mockFirebaseUpdate(...args),
}));
vi.mock('../firebase', () => ({
  db: { __mock: true },
}));

vi.mock('@padel/common', () => ({
  useTranslation: () => ({ locale: 'en' }),
}));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthValue.uid = 'u1';
  mockAuthValue.userName = 'Alice';
  mockAuthValue.telegramUser = null;
  mockAuthValue.chatInstance = null;
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <TournamentProvider>{children}</TournamentProvider>;
}

describe('TournamentContext', () => {
  it('provides initial state', () => {
    const { result } = renderHook(() => useTournamentCtx(), { wrapper });
    expect(result.current.screen).toBe('loading');
    expect(result.current.tournament).toBeNull();
    expect(result.current.listingsLoading).toBe(false);
  });

  it('createTournament creates and navigates to organizer', async () => {
    const { result } = renderHook(() => useTournamentCtx(), { wrapper });

    await act(async () => {
      await result.current.createTournament('My Cup');
    });

    expect(mockCreateInDb).toHaveBeenCalledWith('My Cup', 'u1', 'en', undefined, undefined);
    expect(result.current.screen).toBe('organizer');
  });

  it('createTournament includes telegram and chat when available', async () => {
    mockAuthValue.telegramUser = { telegramId: 123, displayName: 'Alice', username: 'alice' };
    mockAuthValue.chatInstance = 'chat1';
    const { result } = renderHook(() => useTournamentCtx(), { wrapper });

    await act(async () => {
      await result.current.createTournament('Cup');
    });

    expect(mockCreateInDb).toHaveBeenCalledWith(
      'Cup', 'u1', 'en', 'alice',
      { chatInstance: 'chat1', organizerName: 'Alice' },
    );
  });

  it('loadByCode sets tournament ID and returns true', async () => {
    mockLoadByCode.mockResolvedValueOnce('found-id');
    const { result } = renderHook(() => useTournamentCtx(), { wrapper });

    let found: boolean;
    await act(async () => {
      found = await result.current.loadByCode('ABC123');
    });

    expect(found!).toBe(true);
  });

  it('loadByCode returns false when code not found', async () => {
    mockLoadByCode.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useTournamentCtx(), { wrapper });

    let found: boolean;
    await act(async () => {
      found = await result.current.loadByCode('NOPE');
    });

    expect(found!).toBe(false);
  });

  it('deleteTournament clears state and navigates home', async () => {
    const { result } = renderHook(() => useTournamentCtx(), { wrapper });

    await act(async () => {
      await result.current.deleteTournament();
    });

    expect(mockDeleteInDb).toHaveBeenCalledWith('u1');
    expect(result.current.screen).toBe('home');
  });

  it('openTournament sets ID and screen', () => {
    const { result } = renderHook(() => useTournamentCtx(), { wrapper });

    act(() => {
      result.current.openTournament('t1', 'join');
    });

    expect(result.current.screen).toBe('join');
  });

  it('setScreen works', () => {
    const { result } = renderHook(() => useTournamentCtx(), { wrapper });

    act(() => {
      result.current.setScreen('home');
    });

    expect(result.current.screen).toBe('home');
  });
});
