import { createContext, useContext, type ReactNode } from 'react';
import type { Player, Court, TournamentFormat, MaldicionesHands, Team } from '@padel/common';

export interface MatchConfig {
  players: Player[];
  courts: Court[];
  pointsPerMatch: number;
  scoringMode?: 'points' | 'games' | 'sets' | 'timed';
  format?: TournamentFormat;
  maldicionesEnabled?: boolean;
  maldicionesHands?: MaldicionesHands;
  teams?: Team[];
}

const MatchConfigCtx = createContext<MatchConfig | null>(null);

export function MatchConfigProvider({ config, children }: { config: MatchConfig; children: ReactNode }) {
  return <MatchConfigCtx.Provider value={config}>{children}</MatchConfigCtx.Provider>;
}

export function useMatchConfig(): MatchConfig {
  const ctx = useContext(MatchConfigCtx);
  if (!ctx) throw new Error('useMatchConfig must be used within MatchConfigProvider');
  return ctx;
}
