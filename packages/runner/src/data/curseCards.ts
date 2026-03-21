import type { CurseCard, ChaosLevel } from '@padel/common';
import { CURSE_CARD_CONTENT } from '@padel/common';

// Map card id to i18n key prefix
const i18nKeyMap: Record<string, string> = {
  'los-mudos': 'losMudos',
  'el-espejo': 'elEspejo',
  'slow-motion': 'slowMotion',
  'el-pegajoso': 'elPegajoso',
  'memoria-de-pez': 'memoriaDePez',
  'high-five': 'highFive',
  'replay': 'replay',
  'echo-mode': 'echoMode',
  'mano-muerta': 'manoMuerta',
  'gigante-y-enano': 'giganteYEnano',
  'el-fantasma': 'elFantasma',
  'sin-bandeja': 'sinBandeja',
  'solo-de-ida': 'soloDeIda',
  'la-diana': 'laDiana',
  'no-winners': 'noWinners',
  'split-roles': 'splitRoles',
  'el-solo': 'elSolo',
  'reversi': 'reversi',
  'la-ruleta': 'laRuleta',
  'mini-pala': 'miniPala',
  'relampago': 'relampago',
  'invisible-rope': 'invisibleRope',
  'shot-clock': 'shotClock',
  'puppet-master': 'puppetMaster',
  'targeted': 'targeted',
  'coach-mode': 'coachMode',
  'victory-swap': 'victorySwap',
  'wall-lover': 'wallLover',
  'freeze-mode': 'freezeMode',
  'cold-start': 'coldStart',
  'sudden-death': 'suddenDeath',
  'double-trouble': 'doubleTrouble',
  'chaos-swap': 'chaosSwap',
  'all-in': 'allIn',
  'doble-o-nada': 'dobleONada',
};

export const CURSE_CARDS: CurseCard[] = CURSE_CARD_CONTENT.map(c => {
  const key = i18nKeyMap[c.id];
  return {
    id: c.id,
    tier: c.tier,
    emoji: c.emoji,
    name: c.name,
    subtitle: `curse.${key}.subtitle`,
    description: `curse.${key}.desc`,
    details: `curse.${key}.details`,
  };
});

export function getCardsForChaosLevel(level: ChaosLevel): CurseCard[] {
  switch (level) {
    case 'lite': return CURSE_CARDS.filter(c => c.tier === 'green');
    case 'medium': return CURSE_CARDS.filter(c => c.tier === 'green' || c.tier === 'yellow');
    case 'hardcore': return CURSE_CARDS;
  }
}
