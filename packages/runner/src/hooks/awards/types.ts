import type { AwardTier, Nomination, StandingsEntry, Competitor } from '@padel/common';

export type { AwardTier, Nomination };

export const AWARD_TIERS: Record<string, AwardTier> = {
  'undefeated': 'legendary',
  'giant-slayer': 'legendary',
  'comeback-king': 'legendary',
  'nemesis': 'legendary',
  'dominator': 'rare',
  'clutch-player': 'rare',
  'iron-wall': 'rare',
  'consistency-champion': 'rare',
  'gatekeeper': 'rare',
  'best-duo': 'rare',
  'hot-streak-duo': 'rare',
  'nearly-there': 'rare',
  'point-machine': 'common',
  'quick-strike': 'common',
  'see-saw': 'common',
  'competitive-game': 'common',
  'battle-tested': 'common',
  'warrior': 'common',
  'offensive-powerhouse': 'common',
  'offensive-duo': 'common',
  'wall-pair': 'common',
  'rubber-match': 'common',
  'peacemaker': 'rare',
  'court-climber': 'rare',
  'social-butterfly': 'common',
  'underdog': 'legendary',
  'club-rivalry': 'rare',
  'club-mvp': 'rare',
  'club-solidarity': 'common',
  'el-brujo': 'rare',
  'el-superviviente': 'rare',
  'escudo-de-oro': 'common',
  'el-maldito': 'common',
  'el-inmune': 'legendary',
  'el-resistente': 'rare',
  'karma': 'common',
  'el-intocable': 'rare',
};

export interface PlayerMatchInfo {
  roundNumber: number;
  pointsScored: number;
  pointsConceded: number;
  won: boolean;
  lost: boolean;
  margin: number;
}

export interface CompetitorMatchInfo {
  roundNumber: number;
  pointsScored: number;
  pointsConceded: number;
  won: boolean;
  lost: boolean;
  margin: number;
}

export interface ScoredMatch {
  roundNumber: number;
  team1: [string, string];
  team2: [string, string];
  t1: number;
  t2: number;
  margin: number;
  totalPoints: number;
}

export interface AwardContext {
  allScored: ScoredMatch[];
  playerMatches: Map<string, PlayerMatchInfo[]>;
  competitorMatches: Map<string, CompetitorMatchInfo[]>;
  playerToCompetitor: Map<string, Competitor>;
  competitors: Competitor[];
  standings: StandingsEntry[];
  closeThreshold: number;
  nameOf: (id: string) => string;
  competitorNameOf: (id: string) => string;
  rankOf: (id: string) => number;
}
