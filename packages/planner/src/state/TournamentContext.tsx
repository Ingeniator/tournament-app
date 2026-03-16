import { useState, useEffect, useCallback, createContext, useContext, useRef, type ReactNode } from 'react';
import { ref, get, update as firebaseUpdate } from 'firebase/database';
import type { PlannerTournament, TournamentSummary } from '@padel/common';
import { useTranslation } from '@padel/common';
import { db } from '../firebase';
import { usePlannerTournament } from '../hooks/usePlannerTournament';
import { useMyTournaments } from '../hooks/useMyTournaments';
import { useRegisteredTournaments } from '../hooks/useRegisteredTournaments';
import { useChatRoomTournaments } from '../hooks/useChatRoomTournaments';
import { linkTournamentToChat } from '../utils/chatRoom';
import { useAuthCtx } from './AuthContext';

export type Screen = 'loading' | 'home' | 'organizer' | 'join' | 'event-detail' | 'event-create' | 'event-join' | 'auto-create';

export interface TournamentContextValue {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  tournamentId: string | null;
  tournament: PlannerTournament | null;
  tournamentLoading: boolean;
  dataError: string | null;
  organizerName: string | null;
  createTournament: (name: string) => Promise<void>;
  importTournament: (tournamentData: Partial<PlannerTournament>, players: Array<{ name: string; confirmed?: boolean; group?: 'A' | 'B'; clubId?: string; rankSlot?: number; partnerName?: string; telegramUsername?: string }>) => Promise<void>;
  /** Creates a tournament and returns its ID without navigating. Used by EventContext. */
  importTournamentRaw: (tournamentData: Partial<PlannerTournament>, players: Array<{ name: string; confirmed?: boolean; group?: 'A' | 'B'; clubId?: string; rankSlot?: number; partnerName?: string; telegramUsername?: string }>) => Promise<string>;
  updateTournament: (updates: Partial<Pick<PlannerTournament, 'name' | 'format' | 'pointsPerMatch' | 'courts' | 'maxRounds' | 'duration' | 'date' | 'place' | 'extraSpots' | 'chatLink' | 'description' | 'clubs' | 'groupLabels' | 'rankLabels' | 'rankColors' | 'scoringMode' | 'maldiciones' | 'startDelegateId' | 'startDelegateTelegram' | 'minutesPerRound' | 'captainMode'>>) => Promise<void>;
  loadByCode: (code: string) => Promise<boolean>;
  openTournament: (id: string, screen: 'organizer' | 'join') => void;
  deleteTournament: () => Promise<void>;
  deleteTournamentById: (id: string) => Promise<void>;
  completedAt: number | null;
  undoComplete: () => Promise<void>;
  myTournaments: TournamentSummary[];
  registeredTournaments: TournamentSummary[];
  listingsLoading: boolean;
  chatRoomTournaments: TournamentSummary[];
  chatRoomLoading: boolean;
}

const TournamentCtx = createContext<TournamentContextValue>(null!);

export function useTournamentCtx() {
  return useContext(TournamentCtx);
}

export function TournamentProvider({ children }: { children: ReactNode }) {
  const { uid, userName, telegramUser, chatInstance } = useAuthCtx();
  const { locale } = useTranslation();
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('loading');

  const {
    tournament,
    completedAt,
    loading: tournamentLoading,
    error: tournamentError,
    createTournament: createInDb,
    importTournament: importInDb,
    updateTournament,
    loadByCode: loadByCodeFromDb,
    deleteTournament: deleteInDb,
    deleteTournamentById: deleteByIdInDb,
    undoComplete,
  } = usePlannerTournament(tournamentId);

  const { tournaments: myTournaments, loading: myLoading } = useMyTournaments(uid);
  const { tournaments: registeredTournaments, loading: regLoading } = useRegisteredTournaments(uid);
  const { tournaments: chatRoomTournaments, loading: chatRoomLoading } = useChatRoomTournaments(chatInstance);

  const listingsLoading = myLoading || regLoading;

  // Wrap updateTournament to sync name/date changes to chat room entries
  const wrappedUpdateTournament = useCallback(async (updates: Parameters<typeof updateTournament>[0]) => {
    await updateTournament(updates);
    if (chatInstance && tournamentId && db && (updates.name !== undefined || updates.date !== undefined)) {
      const chatUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) chatUpdates[`chatRooms/${chatInstance}/tournaments/${tournamentId}/name`] = updates.name;
      if (updates.date !== undefined) chatUpdates[`chatRooms/${chatInstance}/tournaments/${tournamentId}/date`] = updates.date ?? null;
      firebaseUpdate(ref(db), chatUpdates).catch(e => console.warn('Failed to sync chat room:', e));
    }
  }, [updateTournament, chatInstance, tournamentId]);

  // Auto-link tournament to chat room when opened from a Telegram group
  const linkedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!tournamentId || !chatInstance || !uid) return;
    if (linkedRef.current === tournamentId) return;
    linkedRef.current = tournamentId;
    linkTournamentToChat(tournamentId, chatInstance, uid).catch(e => console.warn('Failed to link tournament to chat:', e));
  }, [tournamentId, chatInstance, uid]);

  // Fetch organizer name for active tournament
  const [organizerName, setOrganizerName] = useState<string | null>(null);
  useEffect(() => {
    if (!tournament || !db) return;
    if (tournament.organizerId === uid && userName) {
      setOrganizerName(userName);
      return;
    }
    let cancelled = false;
    get(ref(db, `users/${tournament.organizerId}/name`)).then((snap) => {
      if (!cancelled) {
        setOrganizerName(snap.exists() ? (snap.val() as string) : null);
      }
    });
    return () => { cancelled = true; };
  }, [tournament, uid, userName]);

  const createTournament = useCallback(async (name: string) => {
    if (!uid) return;
    const chat = chatInstance ? { chatInstance, organizerName: userName ?? undefined } : undefined;
    const id = await createInDb(name, uid, locale, telegramUser?.username, chat);
    setTournamentId(id);
    setScreen('organizer');
  }, [uid, locale, telegramUser, chatInstance, userName, createInDb]);

  const importTournament = useCallback(async (
    tournamentData: Partial<PlannerTournament>,
    players: Array<{ name: string; confirmed?: boolean; group?: 'A' | 'B'; clubId?: string; rankSlot?: number; partnerName?: string; telegramUsername?: string }>,
  ) => {
    if (!uid) return;
    const chat = chatInstance ? { chatInstance, organizerName: userName ?? undefined } : undefined;
    const id = await importInDb(tournamentData, players, uid, locale, telegramUser?.username, chat);
    setTournamentId(id);
    setScreen('organizer');
  }, [uid, locale, telegramUser, chatInstance, userName, importInDb]);

  const importTournamentRaw = useCallback(async (
    tournamentData: Partial<PlannerTournament>,
    players: Array<{ name: string; confirmed?: boolean; group?: 'A' | 'B'; clubId?: string; rankSlot?: number; partnerName?: string; telegramUsername?: string }>,
  ): Promise<string> => {
    if (!uid) throw new Error('Not authenticated');
    const chat = chatInstance ? { chatInstance, organizerName: userName ?? undefined } : undefined;
    return importInDb(tournamentData, players, uid, locale, telegramUser?.username, chat);
  }, [uid, locale, telegramUser, chatInstance, userName, importInDb]);

  const loadByCode = useCallback(async (code: string): Promise<boolean> => {
    const id = await loadByCodeFromDb(code);
    if (id) {
      setTournamentId(id);
      return true;
    }
    return false;
  }, [loadByCodeFromDb]);

  const deleteTournament = useCallback(async () => {
    if (!uid) return;
    await deleteInDb(uid);
    setTournamentId(null);
    setScreen('home');
  }, [uid, deleteInDb]);

  const deleteTournamentById = useCallback(async (id: string) => {
    if (!uid) return;
    await deleteByIdInDb(id, uid);
  }, [uid, deleteByIdInDb]);

  const openTournament = useCallback((id: string, targetScreen: 'organizer' | 'join') => {
    setTournamentId(id);
    setScreen(targetScreen);
  }, []);

  // Players error is now in PlayerContext, but tournament error still contributes
  const dataError = tournamentError;

  return (
    <TournamentCtx.Provider value={{
      screen,
      setScreen,
      tournamentId,
      tournament,
      tournamentLoading,
      dataError,
      organizerName,
      createTournament,
      importTournament,
      importTournamentRaw,
      updateTournament: wrappedUpdateTournament,
      loadByCode,
      openTournament,
      deleteTournament,
      deleteTournamentById,
      completedAt,
      undoComplete,
      myTournaments,
      registeredTournaments,
      listingsLoading,
      chatRoomTournaments,
      chatRoomLoading,
    }}>
      {children}
    </TournamentCtx.Provider>
  );
}
