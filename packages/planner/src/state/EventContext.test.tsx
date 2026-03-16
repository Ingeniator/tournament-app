// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { EventProvider, useEventCtx } from './EventContext';

const mockImportTournamentRaw = vi.fn().mockResolvedValue('t-new');
const mockSetScreen = vi.fn();
const mockOpenTournament = vi.fn();
const mockImportEventInDb = vi.fn().mockResolvedValue('e-new');
const mockLoadEventByCodeFn = vi.fn().mockResolvedValue(null);
const mockMarkEventVisited = vi.fn();

vi.mock('./AuthContext', () => ({
  useAuthCtx: () => ({ uid: 'u1' }),
}));

vi.mock('./TournamentContext', () => ({
  useTournamentCtx: () => ({
    importTournamentRaw: mockImportTournamentRaw,
    setScreen: mockSetScreen,
    openTournament: mockOpenTournament,
  }),
}));

vi.mock('../hooks/useMyEvents', () => ({
  useMyEvents: () => ({ events: [], loading: false }),
}));

vi.mock('../hooks/useVisitedEvents', () => ({
  useVisitedEvents: () => ({ events: [] }),
  markEventVisited: (...args: unknown[]) => mockMarkEventVisited(...args),
}));

vi.mock('../hooks/useEvent', () => ({
  useEvent: () => ({
    importEvent: mockImportEventInDb,
  }),
  loadEventByCode: (...args: unknown[]) => mockLoadEventByCodeFn(...args),
}));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <EventProvider>{children}</EventProvider>;
}

describe('EventContext', () => {
  it('provides initial state', () => {
    const { result } = renderHook(() => useEventCtx(), { wrapper });
    expect(result.current.myEvents).toEqual([]);
    expect(result.current.activeEventId).toBeNull();
    expect(result.current.joinReturnScreen).toBe('home');
  });

  it('importEvent creates tournaments then event', async () => {
    mockImportTournamentRaw.mockResolvedValueOnce('t1').mockResolvedValueOnce('t2');
    mockImportEventInDb.mockResolvedValueOnce('e1');

    const { result } = renderHook(() => useEventCtx(), { wrapper });

    await act(async () => {
      await result.current.importEvent({
        name: 'Weekend',
        date: '2026-06-15',
        tournaments: [
          { tournament: { name: 'Cup A' }, players: [{ name: 'Alice' }], weight: 1 },
          { tournament: { name: 'Cup B' }, players: [], weight: 2 },
        ],
      });
    });

    expect(mockImportTournamentRaw).toHaveBeenCalledTimes(2);
    expect(mockImportEventInDb).toHaveBeenCalledWith(
      'Weekend', '2026-06-15', 'u1', undefined,
      [{ tournamentId: 't1', weight: 1 }, { tournamentId: 't2', weight: 2 }],
    );
    expect(result.current.activeEventId).toBe('e1');
    expect(mockSetScreen).toHaveBeenCalledWith('event-detail');
  });

  it('loadEventByCode sets activeEventId and marks visited', async () => {
    mockLoadEventByCodeFn.mockResolvedValueOnce('e1');
    const { result } = renderHook(() => useEventCtx(), { wrapper });

    let found: boolean;
    await act(async () => {
      found = await result.current.loadEventByCode('EVT1');
    });

    expect(found!).toBe(true);
    expect(result.current.activeEventId).toBe('e1');
    expect(mockMarkEventVisited).toHaveBeenCalledWith('u1', 'e1');
  });

  it('loadEventByCode returns false when not found', async () => {
    const { result } = renderHook(() => useEventCtx(), { wrapper });

    let found: boolean;
    await act(async () => {
      found = await result.current.loadEventByCode('NOPE');
    });

    expect(found!).toBe(false);
    expect(result.current.activeEventId).toBeNull();
  });

  it('openTournamentFromEvent sets join return and opens tournament', () => {
    const { result } = renderHook(() => useEventCtx(), { wrapper });

    act(() => {
      result.current.openTournamentFromEvent('t1');
    });

    expect(mockOpenTournament).toHaveBeenCalledWith('t1', 'join');
    expect(result.current.joinReturnScreen).toBe('event-join');
  });

  it('setActiveEventId works', () => {
    const { result } = renderHook(() => useEventCtx(), { wrapper });

    act(() => {
      result.current.setActiveEventId('e5');
    });

    expect(result.current.activeEventId).toBe('e5');
  });
});
