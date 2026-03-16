import { createContext, useContext, type ReactNode } from 'react';
import type { Player, Court, TournamentFormat, MaldicionesHands, Team } from '@padel/common';

export interface MatchConfig {
  players: Player[];
  courts: Court[];
  pointsPerMatch: number;
  scoringMode?: 'points' | 'games' | 'sets' | 'timed';
  format?: TournamentFormat;
  maldicionesEnabled?: boolean;
  teams?: Team[];
}

export interface MaldicionesConfig {
  maldicionesHands?: MaldicionesHands;
}

const MatchConfigCtx = createContext<MatchConfig | null>(null);
const MaldicionesCtx = createContext<MaldicionesConfig>({});

export function MatchConfigProvider({ config, maldiciones, children }: { config: MatchConfig; maldiciones?: MaldicionesConfig; children: ReactNode }) {
  return (
    <MatchConfigCtx.Provider value={config}>
      <MaldicionesCtx.Provider value={maldiciones ?? {}}>
        {children}
      </MaldicionesCtx.Provider>
    </MatchConfigCtx.Provider>
  );
}

export function useMatchConfig(): MatchConfig {
  const ctx = useContext(MatchConfigCtx);
  if (!ctx) throw new Error('useMatchConfig must be used within MatchConfigProvider');
  return ctx;
}

export function useMaldicionesConfig(): MaldicionesConfig {
  return useContext(MaldicionesCtx);
}
