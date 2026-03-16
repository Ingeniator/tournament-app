// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatRoomTournaments } from './useChatRoomTournaments';

type Listener = { callback: (snap: unknown) => void; error?: (err: Error) => void };
const listeners = new Map<string, Listener>();

const mockRef = vi.fn((_db: unknown, path?: string) => ({ _path: path ?? '' }));
const mockOnValue = vi.fn((refObj: { _path: string }, callback: (snap: unknown) => void, errorCb?: (err: Error) => void) => {
  listeners.set(refObj._path, { callback, error: errorCb });
  return () => { listeners.delete(refObj._path); };
});

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => mockRef(...args),
  onValue: (...args: unknown[]) => mockOnValue(...args),
}));

vi.mock('../firebase', () => ({
  db: { __mock: true },
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
  listeners.clear();
  vi.clearAllMocks();
});

describe('useChatRoomTournaments', () => {
  it('returns empty tournaments when chatInstance is null', () => {
    const { result } = renderHook(() => useChatRoomTournaments(null));
    expect(result.current.tournaments).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('loads and sorts tournaments by linkedAt descending', () => {
    const { result } = renderHook(() => useChatRoomTournaments('chat1'));

    act(() => {
      fireListener('chatRooms/chat1/tournaments', {
        t1: { name: 'Old', code: 'A1', linkedAt: 1000, linkedBy: 'u1' },
        t2: { name: 'New', code: 'B2', linkedAt: 2000, linkedBy: 'u2' },
      });
    });

    expect(result.current.tournaments).toHaveLength(2);
    expect(result.current.tournaments[0].name).toBe('New');
    expect(result.current.tournaments[1].name).toBe('Old');
    expect(result.current.loading).toBe(false);
  });

  it('returns empty array when no tournaments in chat room', () => {
    const { result } = renderHook(() => useChatRoomTournaments('chat1'));

    act(() => {
      fireListener('chatRooms/chat1/tournaments', null);
    });

    expect(result.current.tournaments).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('sets error when listener fails', () => {
    const { result } = renderHook(() => useChatRoomTournaments('chat1'));

    act(() => {
      fireError('chatRooms/chat1/tournaments', 'Permission denied');
    });

    expect(result.current.error).toBe('Permission denied');
    expect(result.current.loading).toBe(false);
  });
});
