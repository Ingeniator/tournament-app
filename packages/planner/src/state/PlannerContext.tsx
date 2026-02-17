import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from 'react';
import { ref, get } from 'firebase/database';
import type { PlannerTournament, PlannerRegistration, TournamentSummary, SkinId } from '@padel/common';
import { useTranslation, useTheme, isValidSkin, DEFAULT_SKIN } from '@padel/common';
import { useAuth } from '../hooks/useAuth';
import { usePlannerTournament } from '../hooks/usePlannerTournament';
import { db } from '../firebase';
import { usePlayers } from '../hooks/usePlayers';
import { useUserProfile } from '../hooks/useUserProfile';
import { useMyTournaments } from '../hooks/useMyTournaments';
import { useRegisteredTournaments } from '../hooks/useRegisteredTournaments';
import { useTelegram, type TelegramUser } from '../hooks/useTelegram';
import { useTelegramSync } from '../hooks/useTelegramSync';

export type Screen = 'loading' | 'home' | 'organizer' | 'join' | 'analytics' | 'supporters';

export interface PlannerContextValue {
  uid: string | null;
  authLoading: boolean;
  authError: string | null;
  tournament: PlannerTournament | null;
  tournamentLoading: boolean;
  players: PlannerRegistration[];
  screen: Screen;
  setScreen: (screen: Screen) => void;
  createTournament: (name: string) => Promise<void>;
  loadByCode: (code: string) => Promise<boolean>;
  updateTournament: (updates: Partial<Pick<PlannerTournament, 'name' | 'format' | 'pointsPerMatch' | 'courts' | 'maxRounds' | 'duration' | 'date' | 'place' | 'extraSpots' | 'chatLink' | 'description'>>) => Promise<void>;
  registerPlayer: (name: string) => Promise<void>;
  removePlayer: (playerId: string) => Promise<void>;
  updateConfirmed: (confirmed: boolean) => Promise<void>;
  addPlayer: (name: string, telegramUsername?: string) => Promise<void>;
  bulkAddPlayers: (names: string[]) => Promise<void>;
  toggleConfirmed: (playerId: string, currentConfirmed: boolean) => Promise<void>;
  updatePlayerName: (playerId: string, name: string) => Promise<void>;
  updatePlayerTelegram: (playerId: string, telegramUsername: string | null) => Promise<void>;
  isRegistered: boolean;
  organizerName: string | null;
  userName: string | null;
  userNameLoading: boolean;
  updateUserName: (name: string) => Promise<void>;
  myTournaments: TournamentSummary[];
  registeredTournaments: TournamentSummary[];
  listingsLoading: boolean;
  openTournament: (id: string, screen: 'organizer' | 'join') => void;
  completedAt: number | null;
  undoComplete: () => Promise<void>;
  deleteTournament: () => Promise<void>;
  telegramUser: TelegramUser | null;
  skin: SkinId;
  setSkin: (skin: SkinId) => void;
}

const PlannerCtx = createContext<PlannerContextValue>(null!);

export function usePlanner() {
  return useContext(PlannerCtx);
}

const SKIN_KEY = 'padel-skin';

function loadLocalSkin(): SkinId {
  try {
    const data = localStorage.getItem(SKIN_KEY);
    if (data && isValidSkin(data)) return data;
    return DEFAULT_SKIN;
  } catch {
    return DEFAULT_SKIN;
  }
}

const initialSkin = loadLocalSkin();

export function PlannerProvider({ children }: { children: ReactNode }) {
  const { uid, loading: authLoading, authError } = useAuth();
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('loading');

  const {
    tournament,
    completedAt,
    loading: tournamentLoading,
    createTournament: createInDb,
    updateTournament: updateInDb,
    loadByCode: loadByCodeFromDb,
    deleteTournament: deleteInDb,
    undoComplete,
  } = usePlannerTournament(tournamentId);

  const { players, registerPlayer: registerInDb, removePlayer: removeInDb, updateConfirmed: updateConfirmedInDb, addPlayer: addPlayerInDb, bulkAddPlayers: bulkAddPlayersInDb, toggleConfirmed: toggleConfirmedInDb, updatePlayerName: updatePlayerNameInDb, updatePlayerTelegram: updatePlayerTelegramInDb, isRegistered: checkRegistered, claimOrphanRegistration } = usePlayers(tournamentId);

  const { name: userName, skin: userSkin, loading: userNameLoading, updateName: updateUserName, updateSkin: updateUserSkin, updateTelegramId, updateTelegramUsername } = useUserProfile(uid);

  const { skin, setSkin: rawSetSkin } = useTheme(initialSkin);

  // Firebase is source of truth — sync to local state and localStorage cache
  useEffect(() => {
    if (userSkin) {
      rawSetSkin(userSkin);
      try { localStorage.setItem(SKIN_KEY, userSkin); } catch {}
    }
  }, [userSkin, rawSetSkin]);

  const setSkin = useCallback((s: SkinId) => {
    rawSetSkin(s);
    updateUserSkin(s).catch(() => {});
    try { localStorage.setItem(SKIN_KEY, s); } catch {}
  }, [rawSetSkin, updateUserSkin]);

  const telegramUser = useTelegram();
  const { tournaments: myTournaments, loading: myLoading } = useMyTournaments(uid);
  const { tournaments: registeredTournaments, loading: regLoading } = useRegisteredTournaments(uid);

  const listingsLoading = myLoading || regLoading;

  // Auto-set profile from Telegram identity
  useEffect(() => {
    if (!uid || !telegramUser || userNameLoading) return;
    if (!userName) {
      updateUserName(telegramUser.displayName);
    }
    updateTelegramId(telegramUser.telegramId);
    if (telegramUser.username) {
      updateTelegramUsername(telegramUser.username);
    }
  }, [uid, telegramUser, userName, userNameLoading, updateUserName, updateTelegramId, updateTelegramUsername]);

  // Cross-device sync: claim registrations from previous device UID
  useTelegramSync(uid, telegramUser?.username);

  // Auto-claim: when a Telegram user views a tournament where the organizer
  // manually added them (by telegramUsername), move the orphan record to their
  // real UID so they can manage their own participation.
  const claimingRef = useRef(false);
  useEffect(() => {
    if (!uid || !telegramUser?.username || players.length === 0 || claimingRef.current) return;
    const tgUsername = telegramUser.username;
    const orphan = players.find(p => p.telegramUsername === tgUsername && p.id !== uid);
    if (!orphan) return;
    claimingRef.current = true;
    claimOrphanRegistration(orphan.id, uid, tgUsername).finally(() => {
      claimingRef.current = false;
    });
  }, [uid, telegramUser, players, claimOrphanRegistration]);

  // Fetch organizer name for active tournament
  const [organizerName, setOrganizerName] = useState<string | null>(null);
  useEffect(() => {
    if (!tournament || !db) return;
    // If current user is organizer, use their profile name
    if (tournament.organizerId === uid && userName) {
      queueMicrotask(() => setOrganizerName(userName));
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

  const { locale } = useTranslation();

  const createTournament = useCallback(async (name: string) => {
    if (!uid) return;
    const id = await createInDb(name, uid, locale, telegramUser?.username);
    setTournamentId(id);
    setScreen('organizer');
  }, [uid, locale, telegramUser, createInDb]);

  const loadByCode = useCallback(async (code: string): Promise<boolean> => {
    const id = await loadByCodeFromDb(code);
    if (id) {
      setTournamentId(id);
      return true;
    }
    return false;
  }, [loadByCodeFromDb]);

  const updateTournament = useCallback(async (updates: Partial<Pick<PlannerTournament, 'name' | 'format' | 'pointsPerMatch' | 'courts' | 'maxRounds' | 'duration' | 'date' | 'place' | 'extraSpots' | 'chatLink' | 'description'>>) => {
    await updateInDb(updates);
  }, [updateInDb]);

  const registerPlayer = useCallback(async (name: string) => {
    if (!uid) return;
    await registerInDb(name, uid, telegramUser?.username);
    // Also write name to user profile if not set yet
    if (!userName) {
      await updateUserName(name);
    }
  }, [uid, userName, telegramUser, registerInDb, updateUserName]);

  const removePlayer = useCallback(async (playerId: string) => {
    await removeInDb(playerId);
  }, [removeInDb]);

  const addPlayer = useCallback(async (name: string, telegramUsername?: string) => {
    await addPlayerInDb(name, telegramUsername);
  }, [addPlayerInDb]);

  const bulkAddPlayers = useCallback(async (names: string[]) => {
    await bulkAddPlayersInDb(names);
  }, [bulkAddPlayersInDb]);

  const toggleConfirmed = useCallback(async (playerId: string, currentConfirmed: boolean) => {
    await toggleConfirmedInDb(playerId, currentConfirmed);
  }, [toggleConfirmedInDb]);

  const updatePlayerName = useCallback(async (playerId: string, name: string) => {
    await updatePlayerNameInDb(playerId, name);
  }, [updatePlayerNameInDb]);

  const updatePlayerTelegram = useCallback(async (playerId: string, telegramUsername: string | null) => {
    await updatePlayerTelegramInDb(playerId, telegramUsername);
  }, [updatePlayerTelegramInDb]);

  const updateConfirmed = useCallback(async (confirmed: boolean) => {
    if (!uid) return;
    await updateConfirmedInDb(uid, confirmed);
  }, [uid, updateConfirmedInDb]);

  const deleteTournament = useCallback(async () => {
    if (!uid) return;
    await deleteInDb(uid);
    setTournamentId(null);
    setScreen('home');
  }, [uid, deleteInDb]);

  const openTournament = useCallback((id: string, targetScreen: 'organizer' | 'join') => {
    setTournamentId(id);
    setScreen(targetScreen);
  }, []);

  const isRegistered = uid ? checkRegistered(uid) : false;

  return (
    <PlannerCtx.Provider value={{
      uid,
      authLoading,
      authError,
      tournament,
      tournamentLoading,
      players,
      screen,
      setScreen,
      createTournament,
      loadByCode,
      updateTournament,
      registerPlayer,
      removePlayer,
      updateConfirmed,
      addPlayer,
      bulkAddPlayers,
      toggleConfirmed,
      updatePlayerName,
      updatePlayerTelegram,
      isRegistered,
      organizerName,
      userName,
      userNameLoading,
      updateUserName,
      myTournaments,
      registeredTournaments,
      listingsLoading,
      openTournament,
      completedAt,
      undoComplete,
      deleteTournament,
      telegramUser,
      skin,
      setSkin,
    }}>
      {children}
    </PlannerCtx.Provider>
  );
}
