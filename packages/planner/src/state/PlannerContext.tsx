/**
 * Compatibility layer: composes the 4 focused contexts into the original
 * `usePlanner()` hook so existing consumers keep working without changes.
 *
 * New code should prefer the focused hooks:
 *   useAuthCtx()       — identity, profile, telegram, google, theme
 *   useTournamentCtx() — tournament CRUD, navigation, listings
 *   usePlayerCtx()     — player operations
 *   useEventCtx()      — event management
 */
import { type ReactNode } from 'react';
import type { PlannerTournament, PlannerRegistration, TournamentSummary, SkinId, PadelEventSummary } from '@padel/common';
import type { TelegramUser } from '../hooks/useTelegram';
import type { PartnerConstraints, PartnerRejection } from '../utils/partnerLogic';
import { AuthProvider, useAuthCtx } from './AuthContext';
import { TournamentProvider, useTournamentCtx, type Screen } from './TournamentContext';
import { PlayerProvider, usePlayerCtx } from './PlayerContext';
import { EventProvider, useEventCtx } from './EventContext';

export type { Screen };

export interface PlannerContextValue {
  uid: string | null;
  authLoading: boolean;
  authError: string | null;
  dataError: string | null;
  tournament: PlannerTournament | null;
  tournamentLoading: boolean;
  players: PlannerRegistration[];
  screen: Screen;
  setScreen: (screen: Screen) => void;
  createTournament: (name: string) => Promise<void>;
  importTournament: (tournamentData: Partial<PlannerTournament>, players: Array<{ name: string; confirmed?: boolean; group?: 'A' | 'B'; clubId?: string; rankSlot?: number; partnerName?: string; telegramUsername?: string }>) => Promise<void>;
  importEvent: (data: { name: string; date: string; description?: string; tournaments: Array<{ tournament: Partial<PlannerTournament>; players: Array<{ name: string; confirmed?: boolean; group?: 'A' | 'B'; clubId?: string; rankSlot?: number; partnerName?: string; telegramUsername?: string }>; weight: number }> }) => Promise<void>;
  loadByCode: (code: string) => Promise<boolean>;
  updateTournament: (updates: Partial<Pick<PlannerTournament, 'name' | 'format' | 'pointsPerMatch' | 'courts' | 'maxRounds' | 'duration' | 'date' | 'place' | 'extraSpots' | 'chatLink' | 'description' | 'clubs' | 'groupLabels' | 'rankLabels' | 'rankColors' | 'scoringMode' | 'maldiciones' | 'startDelegateId' | 'startDelegateTelegram' | 'minutesPerRound' | 'captainMode'>>) => Promise<void>;
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
  deleteTournamentById: (id: string) => Promise<void>;
  telegramUser: TelegramUser | null;
  chatInstance: string | null;
  chatRoomTournaments: TournamentSummary[];
  isGoogleLinked: boolean;
  googleEmail: string | null;
  linkGoogle: () => Promise<void>;
  googleLinking: boolean;
  chatRoomLoading: boolean;
  listingsError: string | null;
  playersError: string | null;
  skin: SkinId;
  setSkin: (skin: SkinId) => void;
  myEvents: PadelEventSummary[];
  visitedEvents: PadelEventSummary[];
  eventsLoading: boolean;
  activeEventId: string | null;
  setActiveEventId: (id: string | null) => void;
  loadEventByCode: (code: string) => Promise<boolean>;
  joinReturnScreen: Screen;
  openTournamentFromEvent: (tournamentId: string) => void;
}

/**
 * Compatibility hook — merges all 4 focused contexts into one object.
 * Prefer useAuthCtx / useTournamentCtx / usePlayerCtx / useEventCtx for
 * new code to get targeted re-renders.
 */
export function usePlanner(): PlannerContextValue {
  const auth = useAuthCtx();
  const tournament = useTournamentCtx();
  const player = usePlayerCtx();
  const event = useEventCtx();

  return {
    // Auth
    uid: auth.uid,
    authLoading: auth.authLoading,
    authError: auth.authError,
    userName: auth.userName,
    userNameLoading: auth.userNameLoading,
    updateUserName: auth.updateUserName,
    telegramUser: auth.telegramUser,
    chatInstance: auth.chatInstance,
    isGoogleLinked: auth.isGoogleLinked,
    googleEmail: auth.googleEmail,
    linkGoogle: auth.linkGoogle,
    googleLinking: auth.googleLinking,
    skin: auth.skin,
    setSkin: auth.setSkin,
    // Tournament
    screen: tournament.screen,
    setScreen: tournament.setScreen,
    tournament: tournament.tournament,
    tournamentLoading: tournament.tournamentLoading,
    dataError: tournament.dataError || player.playersError,
    organizerName: tournament.organizerName,
    createTournament: tournament.createTournament,
    importTournament: tournament.importTournament,
    updateTournament: tournament.updateTournament,
    loadByCode: tournament.loadByCode,
    openTournament: tournament.openTournament,
    deleteTournament: tournament.deleteTournament,
    deleteTournamentById: tournament.deleteTournamentById,
    completedAt: tournament.completedAt,
    undoComplete: tournament.undoComplete,
    myTournaments: tournament.myTournaments,
    registeredTournaments: tournament.registeredTournaments,
    listingsLoading: tournament.listingsLoading,
    chatRoomTournaments: tournament.chatRoomTournaments,
    chatRoomLoading: tournament.chatRoomLoading,
    listingsError: tournament.listingsError,
    // Player
    players: player.players,
    isRegistered: player.isRegistered,
    registerPlayer: player.registerPlayer,
    removePlayer: player.removePlayer,
    updateConfirmed: player.updateConfirmed,
    addPlayer: player.addPlayer,
    bulkAddPlayers: player.bulkAddPlayers,
    toggleConfirmed: player.toggleConfirmed,
    updatePlayerName: player.updatePlayerName,
    updatePlayerAlias: player.updatePlayerAlias,
    updatePlayerTelegram: player.updatePlayerTelegram,
    updatePlayerGroup: player.updatePlayerGroup,
    updatePlayerClub: player.updatePlayerClub,
    updatePlayerRank: player.updatePlayerRank,
    updatePlayerPartner: player.updatePlayerPartner,
    updateCaptainApproval: player.updateCaptainApproval,
    playersError: player.playersError,
    // Event
    myEvents: event.myEvents,
    visitedEvents: event.visitedEvents,
    eventsLoading: event.eventsLoading,
    activeEventId: event.activeEventId,
    setActiveEventId: event.setActiveEventId,
    loadEventByCode: event.loadEventByCode,
    importEvent: event.importEvent,
    joinReturnScreen: event.joinReturnScreen,
    openTournamentFromEvent: event.openTournamentFromEvent,
  };
}

/**
 * Composed provider tree. Drop-in replacement for the old monolithic provider.
 */
export function PlannerProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TournamentProvider>
        <PlayerProvider>
          <EventProvider>
            {children}
          </EventProvider>
        </PlayerProvider>
      </TournamentProvider>
    </AuthProvider>
  );
}
