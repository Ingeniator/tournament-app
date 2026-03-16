// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { PlayerProvider, usePlayerCtx } from './PlayerContext';

const mockUpdateUserName = vi.fn();
const mockRegisterInDb = vi.fn();
const mockUpdateConfirmedInDb = vi.fn();
const mockClaimOrphan = vi.fn().mockResolvedValue(undefined);

const mockAuthValue = {
  uid: 'u1' as string | null,
  userName: 'Alice' as string | null,
  telegramUser: null as { telegramId: number; displayName: string; username?: string } | null,
  updateUserName: mockUpdateUserName,
};

const mockTournamentValue = {
  tournamentId: 't1' as string | null,
};

const mockPlayersReturn = {
  players: [] as Array<{ id: string; name: string; telegramUsername?: string; confirmed?: boolean; timestamp: number }>,
  error: null as string | null,
  registerPlayer: mockRegisterInDb,
  removePlayer: vi.fn(),
  updateConfirmed: mockUpdateConfirmedInDb,
  addPlayer: vi.fn(),
  bulkAddPlayers: vi.fn(),
  toggleConfirmed: vi.fn(),
  updatePlayerName: vi.fn(),
  updatePlayerAlias: vi.fn(),
  updatePlayerTelegram: vi.fn(),
  updatePlayerGroup: vi.fn(),
  updatePlayerClub: vi.fn(),
  updatePlayerRank: vi.fn(),
  updatePlayerPartner: vi.fn(),
  updateCaptainApproval: vi.fn(),
  isRegistered: vi.fn().mockReturnValue(false),
  claimOrphanRegistration: mockClaimOrphan,
};

vi.mock('./AuthContext', () => ({
  useAuthCtx: () => mockAuthValue,
}));

vi.mock('./TournamentContext', () => ({
  useTournamentCtx: () => mockTournamentValue,
}));

vi.mock('../hooks/usePlayers', () => ({
  usePlayers: () => mockPlayersReturn,
}));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthValue.uid = 'u1';
  mockAuthValue.userName = 'Alice';
  mockAuthValue.telegramUser = null;
  mockPlayersReturn.players = [];
  mockPlayersReturn.error = null;
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <PlayerProvider>{children}</PlayerProvider>;
}

describe('PlayerContext', () => {
  it('provides players and isRegistered', () => {
    const { result } = renderHook(() => usePlayerCtx(), { wrapper });
    expect(result.current.players).toEqual([]);
    expect(result.current.isRegistered).toBe(false);
  });

  it('registerPlayer calls DB and does not update profile when userName already set', async () => {
    const { result } = renderHook(() => usePlayerCtx(), { wrapper });

    await act(async () => {
      await result.current.registerPlayer('Bob');
    });

    expect(mockRegisterInDb).toHaveBeenCalledWith('Bob', 'u1', undefined, undefined);
    expect(mockUpdateUserName).not.toHaveBeenCalled();
  });

  it('registerPlayer updates user profile when userName is null', async () => {
    mockAuthValue.userName = null;
    const { result } = renderHook(() => usePlayerCtx(), { wrapper });

    await act(async () => {
      await result.current.registerPlayer('Bob');
    });

    expect(mockRegisterInDb).toHaveBeenCalled();
    expect(mockUpdateUserName).toHaveBeenCalledWith('Bob');
  });

  it('registerPlayer passes telegram username when available', async () => {
    mockAuthValue.telegramUser = { telegramId: 123, displayName: 'Alice', username: 'alice_tg' };
    const { result } = renderHook(() => usePlayerCtx(), { wrapper });

    await act(async () => {
      await result.current.registerPlayer('Alice', { group: 'A' });
    });

    expect(mockRegisterInDb).toHaveBeenCalledWith('Alice', 'u1', 'alice_tg', { group: 'A' });
  });

  it('registerPlayer does nothing when uid is null', async () => {
    mockAuthValue.uid = null;
    const { result } = renderHook(() => usePlayerCtx(), { wrapper });

    await act(async () => {
      await result.current.registerPlayer('Bob');
    });

    expect(mockRegisterInDb).not.toHaveBeenCalled();
  });

  it('auto-claims orphan registration for Telegram user', () => {
    mockAuthValue.telegramUser = { telegramId: 123, displayName: 'Alice', username: 'alice_tg' };
    mockPlayersReturn.players = [
      { id: 'orphan-id', name: 'Alice', telegramUsername: 'alice_tg', confirmed: true, timestamp: 1000 },
    ];

    renderHook(() => usePlayerCtx(), { wrapper });

    expect(mockClaimOrphan).toHaveBeenCalledWith('orphan-id', 'u1', 'alice_tg');
  });

  it('does not claim when player ID matches uid', () => {
    mockAuthValue.telegramUser = { telegramId: 123, displayName: 'Alice', username: 'alice_tg' };
    mockPlayersReturn.players = [
      { id: 'u1', name: 'Alice', telegramUsername: 'alice_tg', confirmed: true, timestamp: 1000 },
    ];

    renderHook(() => usePlayerCtx(), { wrapper });

    expect(mockClaimOrphan).not.toHaveBeenCalled();
  });

  it('updateConfirmed passes uid', async () => {
    const { result } = renderHook(() => usePlayerCtx(), { wrapper });

    await act(async () => {
      await result.current.updateConfirmed(true);
    });

    expect(mockUpdateConfirmedInDb).toHaveBeenCalledWith('u1', true);
  });
});
