import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { ref, get } from 'firebase/database';
import type { PlannerTournament } from '@padel/common';
import { useAuth } from '../hooks/useAuth';
import { usePlannerTournament } from '../hooks/usePlannerTournament';
import { db } from '../firebase';
import { usePlayers } from '../hooks/usePlayers';
import { useUserProfile } from '../hooks/useUserProfile';
import { useMyTournaments } from '../hooks/useMyTournaments';
import { useRegisteredTournaments } from '../hooks/useRegisteredTournaments';
import { useTelegram } from '../hooks/useTelegram';
import { useTelegramSync } from '../hooks/useTelegramSync';
import { PlannerCtx, type Screen } from './plannerContext';

export function PlannerProvider({ children }: { children: ReactNode }) {
  const { uid, loading: authLoading, authError } = useAuth();
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('loading');

  const {
    tournament,
    loading: tournamentLoading,
    createTournament: createInDb,
    updateTournament: updateInDb,
    loadByCode: loadByCodeFromDb,
    deleteTournament: deleteInDb,
  } = usePlannerTournament(tournamentId);

  const { players, registerPlayer: registerInDb, removePlayer: removeInDb, updateConfirmed: updateConfirmedInDb, addPlayer: addPlayerInDb, bulkAddPlayers: bulkAddPlayersInDb, toggleConfirmed: toggleConfirmedInDb, updatePlayerName: updatePlayerNameInDb, isRegistered: checkRegistered } = usePlayers(tournamentId);

  const { name: userName, loading: userNameLoading, updateName: updateUserName, updateTelegramId, updateTelegramUsername } = useUserProfile(uid);
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

  const createTournament = useCallback(async (name: string) => {
    if (!uid) return;
    const id = await createInDb(name, uid);
    setTournamentId(id);
    setScreen('organizer');
  }, [uid, createInDb]);

  const loadByCode = useCallback(async (code: string): Promise<boolean> => {
    const id = await loadByCodeFromDb(code);
    if (id) {
      setTournamentId(id);
      return true;
    }
    return false;
  }, [loadByCodeFromDb]);

  const updateTournament = useCallback(async (updates: Partial<Pick<PlannerTournament, 'name' | 'format' | 'pointsPerMatch' | 'courts' | 'maxRounds' | 'date' | 'place' | 'extraSpots' | 'chatLink' | 'description'>>) => {
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

  const addPlayer = useCallback(async (name: string) => {
    await addPlayerInDb(name);
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
      isRegistered,
      organizerName,
      userName,
      userNameLoading,
      updateUserName,
      myTournaments,
      registeredTournaments,
      listingsLoading,
      openTournament,
      deleteTournament,
      telegramUser,
    }}>
      {children}
    </PlannerCtx.Provider>
  );
}
