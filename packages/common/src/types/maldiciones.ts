export type ChaosLevel = 'lite' | 'medium' | 'hardcore';
export type CardTier = 'green' | 'yellow' | 'red';

export interface CurseCard {
  id: string;
  tier: CardTier;
  emoji: string;
  name: string;
  subtitle: string;
  description: string;
  details: string;
}

export interface MatchCurse {
  cardId: string;
  castBy: 'team1' | 'team2';
  targetPlayerId: string;
  shielded: boolean;
}

export interface MaldicionesHands {
  [teamId: string]: {
    cardIds: string[];
    hasShield: boolean;
  };
}
