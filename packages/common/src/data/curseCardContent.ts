import type { CardTier } from '../types/maldiciones';

export interface CurseCardContent {
  id: string;
  tier: CardTier;
  emoji: string;
  name: string;
  attitude: string;
  howItWorks: string;
  rules: string[];
  noExceptions: string;
  penalty: string;
}

export interface ShieldCardContent {
  emoji: string;
  name: string;
  attitude: string;
  howItWorks: string;
  rules: string[];
}

export const CURSE_CARD_CONTENT: CurseCardContent[] = [
  // ── Green Tier ──
  {
    id: 'los-mudos', tier: 'green', emoji: '🤐', name: 'Los Mudos', attitude: 'No Talking',
    howItWorks: 'Silence. Only gestures.',
    rules: ['No verbal communication', 'No score calling', 'Only hand signals allowed'],
    noExceptions: 'Any word = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'el-espejo', tier: 'green', emoji: '🪞', name: 'El Espejo', attitude: 'Swap Sides',
    howItWorks: 'Partners swap court positions for the entire match.',
    rules: ['Switch sides at the start', 'Stay in swapped position', 'Applies to both players'],
    noExceptions: 'Any return to original side = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'slow-motion', tier: 'green', emoji: '🐢', name: 'Cámara Lenta', attitude: 'No Smashes',
    howItWorks: 'No overhead or smash shots allowed.',
    rules: ['No smashes', 'No overheads', 'Lobs and flat shots only'],
    noExceptions: 'Any overhead swing = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'el-pegajoso', tier: 'green', emoji: '🦠', name: 'El Pegajoso', attitude: 'Stay in Your Half',
    howItWorks: 'Target player is glued to their half of the court.',
    rules: ['Cannot cross the center line', 'Must stay on assigned side', 'Partner covers the rest'],
    noExceptions: 'Any foot over the line = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'memoria-de-pez', tier: 'green', emoji: '🐟', name: 'Memoria de Pez', attitude: 'Announce Score',
    howItWorks: 'Must say the score out loud before every serve.',
    rules: ['Both players must hear it', 'Say it before the ball is hit', 'Full score required'],
    noExceptions: 'Forgetting once = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'high-five', tier: 'green', emoji: '🤝', name: 'Choca Esos Cinco', attitude: 'High Five',
    howItWorks: 'Must high-five after every single point.',
    rules: ['Both players must participate', 'Before the next serve', 'Win or lose'],
    noExceptions: 'Skipping = violation',
    penalty: 'Point goes to opponent',
  },

  // ── Yellow Tier ──
  {
    id: 'mano-muerta', tier: 'yellow', emoji: '✋', name: 'Mano Muerta', attitude: 'Backhand Only',
    howItWorks: 'Only backhand shots allowed. No forehands.',
    rules: ['All shots must be backhand', 'Serve included', 'Both sides of court'],
    noExceptions: 'Any forehand swing = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'gigante-y-enano', tier: 'yellow', emoji: '👨‍🤝‍👦', name: 'Gigante y Enano', attitude: 'Locked Positions',
    howItWorks: 'One player stays at net, one at back. No switching.',
    rules: ['Decide positions before the match', 'No swapping mid-point', 'Applies all game'],
    noExceptions: 'Switching positions = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'el-fantasma', tier: 'yellow', emoji: '👻', name: 'El Fantasma', attitude: 'No Volleys',
    howItWorks: 'Cannot hit the ball before it bounces.',
    rules: ['No volleys allowed', 'Must let ball bounce', 'Applies anywhere on court'],
    noExceptions: 'Any volley = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'sin-bandeja', tier: 'yellow', emoji: '🚫', name: 'Sin Bandeja', attitude: 'No Bandeja',
    howItWorks: 'No bandeja or vibora shots. Flat or lob only.',
    rules: ['No bandeja', 'No vibora', 'Only flat shots or lobs'],
    noExceptions: 'Any sliced overhead = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'solo-de-ida', tier: 'yellow', emoji: '↩️', name: 'Solo de Ida', attitude: 'Underhand Serve',
    howItWorks: 'Must serve underhand for the whole match.',
    rules: ['Racket below waist at contact', 'No overhead toss', 'Standard serve rules apply'],
    noExceptions: 'Any overhead serve = violation',
    penalty: 'Double fault',
  },
  {
    id: 'la-diana', tier: 'yellow', emoji: '🎯', name: 'La Diana', attitude: 'Alternate Hits',
    howItWorks: 'Same player cannot hit two balls in a row.',
    rules: ['Players must alternate', 'Track who hit last', 'Applies to all shots'],
    noExceptions: 'Hitting twice in a row = violation',
    penalty: 'Point goes to opponent',
  },

  // ── Red Tier ──
  {
    id: 'el-solo', tier: 'red', emoji: '🧑', name: 'El Solo', attitude: '1v2 Start',
    howItWorks: 'Partner sits out the first 3 points.',
    rules: ['Only target player on court', 'Partner waits behind the court', 'Rejoin after 3 points'],
    noExceptions: 'Partner cannot touch the ball',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'reversi', tier: 'red', emoji: '🔄', name: 'Al Revés', attitude: 'Wrong Hand',
    howItWorks: 'Must play with your non-dominant hand.',
    rules: ['Switch hand before the match', 'All shots with weak hand', 'Serve included'],
    noExceptions: 'Any dominant hand shot = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'la-ruleta', tier: 'red', emoji: '🎡', name: 'La Ruleta', attitude: 'Rotate Positions',
    howItWorks: 'Both players rotate clockwise every 3 points.',
    rules: ['Rotate after every 3rd point', 'Clockwise direction', 'Both players move'],
    noExceptions: 'Forgetting to rotate = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'mini-pala', tier: 'red', emoji: '🎾', name: 'Mini Pala', attitude: 'Short Grip',
    howItWorks: 'Grip the racket by the head, not the handle.',
    rules: ['Hand on the racket head', 'No sliding back to handle', 'Entire match'],
    noExceptions: 'Gripping the handle = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'relampago', tier: 'red', emoji: '⚡', name: 'Relámpago', attitude: 'Lightning',
    howItWorks: 'Caster gives opponents a 2-point head start.',
    rules: ['Score starts 0–2', 'Normal play from there', 'No extra penalties'],
    noExceptions: 'N/A — automatic',
    penalty: 'None — it\'s the curse itself',
  },
  {
    id: 'doble-o-nada', tier: 'red', emoji: '🎲', name: 'Doble o Nada', attitude: 'Double Points',
    howItWorks: 'Every point lost by the cursed team counts as 2.',
    rules: ['Only points against count double', 'Points won are normal', 'Track carefully'],
    noExceptions: 'N/A — automatic',
    penalty: 'None — it\'s the curse itself',
  },
];

export const SHIELD_CARD_CONTENT: ShieldCardContent = {
  emoji: '🛡️', name: 'Escudo', attitude: 'Shield',
  howItWorks: 'Block one curse. One per team per tournament.',
  rules: ['Play when a curse is cast on you', 'Both curse and shield are consumed', 'Cannot be recovered'],
};
