import { useState, useMemo, useCallback, createContext, useContext, type ReactNode } from 'react';
import type { PlannerTournament, PadelEventSummary } from '@padel/common';
import { useMyEvents } from '../hooks/useMyEvents';
import { useVisitedEvents, markEventVisited } from '../hooks/useVisitedEvents';
import { loadEventByCode as loadEventByCodeFn, useEvent } from '../hooks/useEvent';
import { useAuthCtx } from './AuthContext';
import { useTournamentCtx, type Screen } from './TournamentContext';

export interface EventContextValue {
  myEvents: PadelEventSummary[];
  visitedEvents: PadelEventSummary[];
  eventsLoading: boolean;
  activeEventId: string | null;
  setActiveEventId: (id: string | null) => void;
  loadEventByCode: (code: string) => Promise<boolean>;
  importEvent: (data: {
    name: string;
    date: string;
    description?: string;
    tournaments: Array<{
      tournament: Partial<PlannerTournament>;
      players: Array<{ name: string; confirmed?: boolean; group?: 'A' | 'B'; clubId?: string; rankSlot?: number; partnerName?: string; telegramUsername?: string }>;
      weight: number;
    }>;
  }) => Promise<void>;
  joinReturnScreen: Screen;
  openTournamentFromEvent: (tournamentId: string) => void;
}

const EventCtx = createContext<EventContextValue>(null!);

export function useEventCtx() {
  return useContext(EventCtx);
}

export function EventProvider({ children }: { children: ReactNode }) {
  const { uid } = useAuthCtx();
  const { importTournamentRaw, setScreen, openTournament } = useTournamentCtx();
  const { importEvent: importEventInDb } = useEvent(null);
  const { events: myEvents, loading: eventsLoading } = useMyEvents(uid);
  const createdEventIds = useMemo(() => new Set(myEvents.map(e => e.id)), [myEvents]);
  const { events: visitedEvents } = useVisitedEvents(uid, createdEventIds);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [joinReturnScreen, setJoinReturnScreen] = useState<Screen>('home');

  const importEvent = useCallback(async (data: {
    name: string;
    date: string;
    description?: string;
    tournaments: Array<{
      tournament: Partial<PlannerTournament>;
      players: Array<{ name: string; confirmed?: boolean; group?: 'A' | 'B'; clubId?: string; rankSlot?: number; partnerName?: string; telegramUsername?: string }>;
      weight: number;
    }>;
  }) => {
    if (!uid) return;
    // Create all tournaments first
    const tournamentLinks: Array<{ tournamentId: string; weight: number }> = [];
    for (const t of data.tournaments) {
      const id = await importTournamentRaw(t.tournament, t.players);
      tournamentLinks.push({ tournamentId: id, weight: t.weight });
    }
    // Create the event linking them
    const eventId = await importEventInDb(data.name, data.date, uid, data.description, tournamentLinks);
    setActiveEventId(eventId);
    setScreen('event-detail');
  }, [uid, importTournamentRaw, importEventInDb, setScreen]);

  const loadEventByCode = useCallback(async (code: string): Promise<boolean> => {
    const id = await loadEventByCodeFn(code);
    if (id) {
      setActiveEventId(id);
      if (uid) markEventVisited(uid, id);
      return true;
    }
    return false;
  }, [uid]);

  const openTournamentFromEvent = useCallback((tournamentId: string) => {
    setJoinReturnScreen('event-join');
    openTournament(tournamentId, 'join');
  }, [openTournament]);

  return (
    <EventCtx.Provider value={{
      myEvents,
      visitedEvents,
      eventsLoading,
      activeEventId,
      setActiveEventId,
      loadEventByCode,
      importEvent,
      joinReturnScreen,
      openTournamentFromEvent,
    }}>
      {children}
    </EventCtx.Provider>
  );
}
