import { useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from 'react';
import type { PlannerRegistration } from '@padel/common';
import { usePlayers } from '../hooks/usePlayers';
import type { PartnerConstraints, PartnerRejection } from '../utils/partnerLogic';
import { useAuthCtx } from './AuthContext';
import { useTournamentCtx } from './TournamentContext';

export interface PlayerContextValue {
  players: PlannerRegistration[];
  isRegistered: boolean;
  registerPlayer: (name: string, extras?: { group?: 'A' | 'B'; clubId?: string; rankSlot?: number }) => Promise<void>;
  removePlayer: (playerId: string) => Promise<void>;
  updateConfirmed: (confirmed: boolean) => Promise<void>;
  addPlayer: (name: string, telegramUsername?: string, extras?: { clubId?: string }) => Promise<void>;
  bulkAddPlayers: (names: string[]) => Promise<void>;
  toggleConfirmed: (playerId: string, currentConfirmed: boolean) => Promise<void>;
  updatePlayerName: (playerId: string, name: string) => Promise<void>;
  updatePlayerAlias: (playerId: string, alias: string | null) => Promise<void>;
  updatePlayerTelegram: (playerId: string, telegramUsername: string | null) => Promise<void>;
  updatePlayerGroup: (playerId: string, group: 'A' | 'B' | null) => Promise<void>;
  updatePlayerClub: (playerId: string, clubId: string | null) => Promise<void>;
  updatePlayerRank: (playerId: string, rankSlot: number | null) => Promise<void>;
  updatePlayerPartner: (playerId: string, partnerName: string | null, partnerTelegram: string | null, constraints?: PartnerConstraints) => Promise<PartnerRejection | null>;
  updateCaptainApproval: (playerId: string, approved: boolean) => Promise<void>;
}

const PlayerCtx = createContext<PlayerContextValue>(null!);

export function usePlayerCtx() {
  return useContext(PlayerCtx);
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { uid, userName, telegramUser } = useAuthCtx();
  const { tournamentId } = useTournamentCtx();

  const {
    players,
    error: playersError,
    registerPlayer: registerInDb,
    removePlayer,
    updateConfirmed: updateConfirmedInDb,
    addPlayer,
    bulkAddPlayers,
    toggleConfirmed,
    updatePlayerName,
    updatePlayerAlias,
    updatePlayerTelegram,
    updatePlayerGroup,
    updatePlayerClub,
    updatePlayerRank,
    updatePlayerPartner,
    updateCaptainApproval,
    isRegistered: checkRegistered,
    claimOrphanRegistration,
  } = usePlayers(tournamentId);

  // Log player errors (previously aggregated in PlannerContext as dataError)
  useEffect(() => {
    if (playersError) console.warn('Players error:', playersError);
  }, [playersError]);

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

  const { updateUserName } = useAuthCtx();

  const registerPlayer = useCallback(async (name: string, extras?: { group?: 'A' | 'B'; clubId?: string; rankSlot?: number }) => {
    if (!uid) return;
    await registerInDb(name, uid, telegramUser?.username, extras);
    // Also write name to user profile if not set yet
    if (!userName) {
      await updateUserName(name);
    }
  }, [uid, userName, telegramUser, registerInDb, updateUserName]);

  const updateConfirmed = useCallback(async (confirmed: boolean) => {
    if (!uid) return;
    await updateConfirmedInDb(uid, confirmed);
  }, [uid, updateConfirmedInDb]);

  const isRegistered = uid ? checkRegistered(uid) : false;

  return (
    <PlayerCtx.Provider value={{
      players,
      isRegistered,
      registerPlayer,
      removePlayer,
      updateConfirmed,
      addPlayer,
      bulkAddPlayers,
      toggleConfirmed,
      updatePlayerName,
      updatePlayerAlias,
      updatePlayerTelegram,
      updatePlayerGroup,
      updatePlayerClub,
      updatePlayerRank,
      updatePlayerPartner,
      updateCaptainApproval,
    }}>
      {children}
    </PlayerCtx.Provider>
  );
}
