import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { ref, get } from 'firebase/database';
import type { PlannerTournament, PlannerRegistration, TournamentSummary } from '@padel/common';
import { useAuth } from '../hooks/useAuth';
import { usePlannerTournament } from '../hooks/usePlannerTournament';
import { db } from '../firebase';
import { usePlayers } from '../hooks/usePlayers';
import { useUserProfile } from '../hooks/useUserProfile';
import { useMyTournaments } from '../hooks/useMyTournaments';
import { useRegisteredTournaments } from '../hooks/useRegisteredTournaments';

export type Screen = 'loading' | 'home' | 'organizer' | 'join';

interface PlannerContextValue {
  uid: string | null;
  authLoading: boolean;
  tournament: PlannerTournament | null;
  tournamentLoading: boolean;
  players: PlannerRegistration[];
  screen: Screen;
  setScreen: (screen: Screen) => void;
  createTournament: (name: string) => Promise<void>;
  loadByCode: (code: string) => Promise<boolean>;
  updateTournament: (updates: Partial<Pick<PlannerTournament, 'name' | 'format' | 'pointsPerMatch' | 'courts' | 'maxRounds' | 'date' | 'place' | 'extraSpots'>>) => Promise<void>;
  registerPlayer: (name: string) => Promise<void>;
  removePlayer: (playerId: string) => Promise<void>;
  updateConfirmed: (confirmed: boolean) => Promise<void>;
  addPlayer: (name: string) => Promise<void>;
  toggleConfirmed: (playerId: string, currentConfirmed: boolean) => Promise<void>;
  isRegistered: boolean;
  organizerName: string | null;
  userName: string | null;
  userNameLoading: boolean;
  updateUserName: (name: string) => Promise<void>;
  myTournaments: TournamentSummary[];
  registeredTournaments: TournamentSummary[];
  listingsLoading: boolean;
  openTournament: (id: string, screen: 'organizer' | 'join') => void;
}

const PlannerCtx = createContext<PlannerContextValue>(null!);

export function usePlanner() {
  return useContext(PlannerCtx);
}

export function PlannerProvider({ children }: { children: ReactNode }) {
  const { uid, loading: authLoading } = useAuth();
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('loading');

  const {
    tournament,
    loading: tournamentLoading,
    createTournament: createInDb,
    updateTournament: updateInDb,
    loadByCode: loadByCodeFromDb,
  } = usePlannerTournament(tournamentId);

  const { players, registerPlayer: registerInDb, removePlayer: removeInDb, updateConfirmed: updateConfirmedInDb, addPlayer: addPlayerInDb, toggleConfirmed: toggleConfirmedInDb, isRegistered: checkRegistered } = usePlayers(tournamentId);

  const { name: userName, loading: userNameLoading, updateName: updateUserName } = useUserProfile(uid);
  const { tournaments: myTournaments, loading: myLoading } = useMyTournaments(uid);
  const { tournaments: registeredTournaments, loading: regLoading } = useRegisteredTournaments(uid);

  const listingsLoading = myLoading || regLoading;

  // Fetch organizer name for active tournament
  const [organizerName, setOrganizerName] = useState<string | null>(null);
  useEffect(() => {
    if (!tournament || !db) {
      setOrganizerName(null);
      return;
    }
    // If current user is organizer, use their profile name
    if (tournament.organizerId === uid && userName) {
      setOrganizerName(userName);
      return;
    }
    get(ref(db, `users/${tournament.organizerId}/name`)).then((snap) => {
      setOrganizerName(snap.exists() ? (snap.val() as string) : null);
    });
  }, [tournament?.organizerId, uid, userName]);

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

  const updateTournament = useCallback(async (updates: Partial<Pick<PlannerTournament, 'name' | 'format' | 'pointsPerMatch' | 'courts' | 'maxRounds' | 'date' | 'place' | 'extraSpots'>>) => {
    await updateInDb(updates);
  }, [updateInDb]);

  const registerPlayer = useCallback(async (name: string) => {
    if (!uid) return;
    await registerInDb(name, uid);
    // Also write name to user profile if not set yet
    if (!userName) {
      await updateUserName(name);
    }
  }, [uid, userName, registerInDb, updateUserName]);

  const removePlayer = useCallback(async (playerId: string) => {
    await removeInDb(playerId);
  }, [removeInDb]);

  const addPlayer = useCallback(async (name: string) => {
    await addPlayerInDb(name);
  }, [addPlayerInDb]);

  const toggleConfirmed = useCallback(async (playerId: string, currentConfirmed: boolean) => {
    await toggleConfirmedInDb(playerId, currentConfirmed);
  }, [toggleConfirmedInDb]);

  const updateConfirmed = useCallback(async (confirmed: boolean) => {
    if (!uid) return;
    await updateConfirmedInDb(uid, confirmed);
  }, [uid, updateConfirmedInDb]);

  const openTournament = useCallback((id: string, targetScreen: 'organizer' | 'join') => {
    setTournamentId(id);
    setScreen(targetScreen);
  }, []);

  const isRegistered = uid ? checkRegistered(uid) : false;

  return (
    <PlannerCtx.Provider value={{
      uid,
      authLoading,
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
      toggleConfirmed,
      isRegistered,
      organizerName,
      userName,
      userNameLoading,
      updateUserName,
      myTournaments,
      registeredTournaments,
      listingsLoading,
      openTournament,
    }}>
      {children}
    </PlannerCtx.Provider>
  );
}
