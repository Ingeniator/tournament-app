export type AwardTier = 'common' | 'rare' | 'legendary';

export interface Nomination {
  id: string;
  title: string;
  emoji: string;
  description: string;
  playerNames: string[];
  stat: string;
  tier?: AwardTier;
  modeTitle?: string;
}
