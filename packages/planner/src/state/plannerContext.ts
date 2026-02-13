import { createContext, useContext } from 'react';
import type { PlannerTournament, PlannerRegistration, TournamentSummary } from '@padel/common';
import type { TelegramUser } from '../hooks/useTelegram';

export type Screen = 'loading' | 'home' | 'organizer' | 'join' | 'supporters';

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
  updateTournament: (updates: Partial<Pick<PlannerTournament, 'name' | 'format' | 'pointsPerMatch' | 'courts' | 'maxRounds' | 'date' | 'place' | 'extraSpots' | 'chatLink' | 'description'>>) => Promise<void>;
  registerPlayer: (name: string) => Promise<void>;
  removePlayer: (playerId: string) => Promise<void>;
  updateConfirmed: (confirmed: boolean) => Promise<void>;
  addPlayer: (name: string) => Promise<void>;
  bulkAddPlayers: (names: string[]) => Promise<void>;
  toggleConfirmed: (playerId: string, currentConfirmed: boolean) => Promise<void>;
  updatePlayerName: (playerId: string, name: string) => Promise<void>;
  isRegistered: boolean;
  organizerName: string | null;
  userName: string | null;
  userNameLoading: boolean;
  updateUserName: (name: string) => Promise<void>;
  myTournaments: TournamentSummary[];
  registeredTournaments: TournamentSummary[];
  listingsLoading: boolean;
  openTournament: (id: string, screen: 'organizer' | 'join') => void;
  deleteTournament: () => Promise<void>;
  telegramUser: TelegramUser | null;
}

export const PlannerCtx = createContext<PlannerContextValue>(null!);

export function usePlanner() {
  return useContext(PlannerCtx);
}
