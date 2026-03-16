// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStartGuard } from './useStartGuard';
import type { PlannerTournament, PlannerRegistration } from '@padel/common';

type Listener = { callback: (snap: unknown) => void; error?: (err: Error) => void };
const listeners = new Map<string, Listener>();

const mockRef = vi.fn((_db: unknown, path?: string) => ({ _path: path ?? '' }));
const mockSet = vi.fn(async () => {});
const mockOnValue = vi.fn((refObj: { _path: string }, callback: (snap: unknown) => void, errorCb?: (err: Error) => void) => {
  listeners.set(refObj._path, { callback, error: errorCb });
  return () => { listeners.delete(refObj._path); };
});

const mockLaunchInRunner = vi.fn();

vi.mock('firebase/database', () => ({
  ref: (...args: unknown[]) => mockRef(...args),
  set: (...args: unknown[]) => mockSet(...args),
  onValue: (...args: unknown[]) => mockOnValue(...args),
}));

vi.mock('../firebase', () => ({
  db: { __mock: true },
}));

vi.mock('../utils/exportToRunner', () => ({
  launchInRunner: (...args: unknown[]) => mockLaunchInRunner(...args),
}));

function fireListener(path: string, data: unknown) {
  const listener = listeners.get(path);
  listener?.callback({
    val: () => data,
    exists: () => data !== null && data !== undefined,
  });
}

const tournament = { id: 't1', name: 'Cup' } as PlannerTournament;
const players = [{ name: 'Alice' }] as PlannerRegistration[];

beforeEach(() => {
  listeners.clear();
  vi.clearAllMocks();
});

describe('useStartGuard', () => {
  it('subscribes to startedBy for the tournament', () => {
    renderHook(() => useStartGuard('t1', 'u1', 'Alice'));
    expect(listeners.has('tournaments/t1/startedBy')).toBe(true);
  });

  it('does not subscribe when tournamentId is null', () => {
    renderHook(() => useStartGuard(null, 'u1', 'Alice'));
    expect(listeners.size).toBe(0);
  });

  it('handleLaunch writes startedBy and launches when no one has started', async () => {
    const { result } = renderHook(() => useStartGuard('t1', 'u1', 'Alice'));

    // Fire listener with no startedBy
    act(() => {
      fireListener('tournaments/t1/startedBy', null);
    });

    await act(async () => {
      await result.current.handleLaunch(tournament, players);
    });

    expect(mockSet).toHaveBeenCalled();
    expect(mockLaunchInRunner).toHaveBeenCalledWith(tournament, players, undefined, undefined);
  });

  it('shows warning when someone else already started', async () => {
    const { result } = renderHook(() => useStartGuard('t1', 'u1', 'Alice'));

    act(() => {
      fireListener('tournaments/t1/startedBy', { uid: 'other', name: 'Bob', timestamp: 1000 });
    });

    await act(async () => {
      await result.current.handleLaunch(tournament, players);
    });

    expect(result.current.showWarning).toBe(true);
    expect(result.current.warningReason).toBe('different-user');
    expect(mockLaunchInRunner).not.toHaveBeenCalled();
  });

  it('shows same-user warning when same user already started', async () => {
    const { result } = renderHook(() => useStartGuard('t1', 'u1', 'Alice'));

    act(() => {
      fireListener('tournaments/t1/startedBy', { uid: 'u1', name: 'Alice', timestamp: 1000 });
    });

    await act(async () => {
      await result.current.handleLaunch(tournament, players);
    });

    expect(result.current.showWarning).toBe(true);
    expect(result.current.warningReason).toBe('same-user');
  });

  it('proceedAnyway writes startedBy and launches', async () => {
    const { result } = renderHook(() => useStartGuard('t1', 'u1', 'Alice'));

    act(() => {
      fireListener('tournaments/t1/startedBy', { uid: 'other', name: 'Bob', timestamp: 1000 });
    });

    // First trigger the warning
    await act(async () => {
      await result.current.handleLaunch(tournament, players);
    });

    // Then proceed
    await act(async () => {
      await result.current.proceedAnyway(tournament, players);
    });

    expect(result.current.showWarning).toBe(false);
    expect(mockSet).toHaveBeenCalled();
    expect(mockLaunchInRunner).toHaveBeenCalled();
  });

  it('dismissWarning clears warning state', async () => {
    const { result } = renderHook(() => useStartGuard('t1', 'u1', 'Alice'));

    act(() => {
      fireListener('tournaments/t1/startedBy', { uid: 'other', name: 'Bob', timestamp: 1000 });
    });

    await act(async () => {
      await result.current.handleLaunch(tournament, players);
    });

    act(() => {
      result.current.dismissWarning();
    });

    expect(result.current.showWarning).toBe(false);
  });
});
