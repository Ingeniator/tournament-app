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
  id: string;
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
    id: 'el-espejo', tier: 'green', emoji: '🪞', name: 'El Espejo', attitude: 'Not Your Side Anymore',
    howItWorks: 'Swap positions with your partner.',
    rules: ['Play from swapped sides', 'Stay like this for entire match'],
    noExceptions: 'No switching back',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'slow-motion', tier: 'green', emoji: '🐢', name: 'Cámara Lenta', attitude: 'No Power Game',
    howItWorks: 'No overhead or smash shots allowed.',
    rules: ['No smashes', 'No overheads', 'Lobs and flat shots only'],
    noExceptions: 'Any overhead swing = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'el-pegajoso', tier: 'green', emoji: '🦠', name: 'El Pegajoso', attitude: 'Stay in Your Lane',
    howItWorks: 'You are locked to your side.',
    rules: ['No crossing center line', 'Stay on your half'],
    noExceptions: 'Any step over line = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'memoria-de-pez', tier: 'green', emoji: '🐟', name: 'Memoria de Pez', attitude: "Don't Forget",
    howItWorks: 'Say the score before every serve.',
    rules: ['Must call score clearly', 'Every single serve'],
    noExceptions: 'Missed or wrong score = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'high-five', tier: 'green', emoji: '🤝', name: 'Choca Esos Cinco', attitude: 'Respect the Game',
    howItWorks: 'High-five after every point.',
    rules: ['Both players must do it', 'Win or lose'],
    noExceptions: 'Skipped high-five = violation',
    penalty: 'Point goes to opponent',
  },

  {
    id: 'replay', tier: 'green', emoji: '🔁', name: 'Replay', attitude: 'Keep It Going',
    howItWorks: 'Win too fast and the point replays.',
    rules: ['Rally must last 3+ hits', 'Under 3 hits = replay the point'],
    noExceptions: 'Aces and winners under 3 hits don\'t count',
    penalty: 'Point is replayed',
  },
  {
    id: 'echo-mode', tier: 'green', emoji: '🎧', name: 'Echo Mode', attitude: 'Say It Twice',
    howItWorks: 'Every call must be repeated twice.',
    rules: ['"Mine! Mine!"', '"Yours! Yours!"', 'All calls doubled'],
    noExceptions: 'Single call = violation',
    penalty: 'Point goes to opponent',
  },

  // ── Yellow Tier ──
  {
    id: 'mano-muerta', tier: 'yellow', emoji: '✋', name: 'Mano Muerta', attitude: 'No Forehand',
    howItWorks: 'Backhand only.',
    rules: ['No forehand shots', 'Any situation'],
    noExceptions: 'Forehand = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'gigante-y-enano', tier: 'yellow', emoji: '👨‍🤝‍👦', name: 'Gigante y Enano', attitude: 'No Switching',
    howItWorks: 'One at net, one at baseline.',
    rules: ['Positions are fixed', 'No switching during play'],
    noExceptions: 'Any position change = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'el-fantasma', tier: 'yellow', emoji: '👻', name: 'El Fantasma', attitude: 'Let It Bounce',
    howItWorks: 'No volleys allowed.',
    rules: ['Ball must bounce first', 'Even at the net'],
    noExceptions: 'Volley = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'sin-bandeja', tier: 'yellow', emoji: '🚫', name: 'Sin Bandeja', attitude: 'No Control Shots',
    howItWorks: 'No bandeja or vibora.',
    rules: ['Flat shots or lobs only'],
    noExceptions: 'Any sliced overhead = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'solo-de-ida', tier: 'yellow', emoji: '↩️', name: 'Solo de Ida', attitude: 'Soft Serve Only',
    howItWorks: 'Underhand serve only.',
    rules: ['Racket swings upward', 'No flat or slice serve'],
    noExceptions: 'Any overhand motion = violation',
    penalty: 'Double fault',
  },
  {
    id: 'la-diana', tier: 'yellow', emoji: '🎯', name: 'La Diana', attitude: 'No Hero Mode',
    howItWorks: 'Alternate every shot.',
    rules: ['Players must alternate hits', 'No double touches'],
    noExceptions: 'Same player twice = violation',
    penalty: 'Point goes to opponent',
  },

  {
    id: 'shot-clock', tier: 'yellow', emoji: '⏱️', name: 'Shot Clock', attitude: 'Beat the Clock',
    howItWorks: '5 touches max per rally. After that, you lose the point.',
    rules: ['Count your team\'s touches', 'Max 5 touches total', 'Must win before the 6th'],
    noExceptions: '6th touch = automatic point loss',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'puppet-master', tier: 'yellow', emoji: '🎭', name: 'Puppet Master', attitude: 'Follow Orders',
    howItWorks: 'One player calls every shot for their partner.',
    rules: ['Partner must shout direction before each hit', 'Player cannot decide on their own', 'No shot without a command'],
    noExceptions: 'Hitting without command = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'targeted', tier: 'yellow', emoji: '👉', name: 'Targeted', attitude: 'Return to Sender',
    howItWorks: 'Must return the ball to the player who hit it.',
    rules: ['Track who sent the ball', 'Return to same player', 'No switching target'],
    noExceptions: 'Returning to wrong player = violation',
    penalty: 'Point goes to opponent',
  },

  // ── Red Tier ──
  {
    id: 'no-winners', tier: 'red', emoji: '🚷', name: 'No Winners', attitude: 'Wait for Errors',
    howItWorks: 'Cursed team only scores from opponent errors.',
    rules: ['Winners don\'t count for you', 'Only opponent errors count', 'Forced and unforced errors both count'],
    noExceptions: 'N/A — automatic',
    penalty: 'None — it\'s the curse itself',
  },
  {
    id: 'split-roles', tier: 'red', emoji: '🧩', name: 'Split Roles', attitude: 'Defense Only',
    howItWorks: 'Cursed player can only return balls.',
    rules: ['No attacking shots', 'No winners allowed', 'Only defensive returns'],
    noExceptions: 'Attack or winner by cursed player = replay',
    penalty: 'Point is replayed',
  },
  {
    id: 'el-solo', tier: 'red', emoji: '🧑', name: 'El Solo', attitude: "You're on Your Own",
    howItWorks: 'Start 1 vs 2.',
    rules: ['One player sits out', 'First 3 points only', 'Partner waits behind the court'],
    noExceptions: 'Partner cannot touch the ball',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'reversi', tier: 'red', emoji: '🔄', name: 'Al Revés', attitude: 'Wrong Hand',
    howItWorks: 'Play with non-dominant hand.',
    rules: ['All shots with weak hand', 'Serve included'],
    noExceptions: 'Switching back = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'la-ruleta', tier: 'red', emoji: '🎡', name: 'La Ruleta', attitude: 'Keep Moving',
    howItWorks: 'Rotate positions constantly.',
    rules: ['Rotate every 3 points', 'Clockwise only'],
    noExceptions: 'Missed rotation = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'mini-pala', tier: 'red', emoji: '🎾', name: 'Mini Pala', attitude: 'Choke Up',
    howItWorks: 'Grip at the middle of the racket.',
    rules: ['Hand on the shaft, not the handle', 'No sliding back down'],
    noExceptions: 'Normal grip = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'relampago', tier: 'red', emoji: '⚡', name: 'Relámpago', attitude: 'High Risk',
    howItWorks: 'Give opponents a 2-point head start.',
    rules: ['Score starts 0–2', 'Normal play from there'],
    noExceptions: 'N/A — automatic',
    penalty: 'None — it\'s the curse itself',
  },
  {
    id: 'invisible-rope', tier: 'yellow', emoji: '🪢', name: 'Invisible Rope', attitude: 'Stay Together',
    howItWorks: 'Players must stay within 3 meters of each other.',
    rules: ['Both players move as a unit', 'Max ~3m apart at all times'],
    noExceptions: 'Too far apart = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'coach-mode', tier: 'green', emoji: '📣', name: 'Coach Mode', attitude: 'Sideline Boss',
    howItWorks: 'A sit-out player becomes your team coach.',
    rules: ['Any sitting-out player coaches your team', 'Team must follow their commands', 'Coach calls shots from the sideline'],
    noExceptions: 'Ignoring the coach = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'victory-swap', tier: 'green', emoji: '🔃', name: 'Victory Swap', attitude: 'Win and Move',
    howItWorks: 'Switch sides after every point you win.',
    rules: ['Win a point = swap positions', 'Lose a point = stay put'],
    noExceptions: 'Forgetting to swap = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'wall-lover', tier: 'yellow', emoji: '🧱', name: 'Wall Lover', attitude: 'Use the Glass',
    howItWorks: 'Must play off the glass at least once per rally.',
    rules: ['At least one glass shot per point', 'No glass = point doesn\'t count for you', 'Opponent errors still count normally'],
    noExceptions: 'Winning without glass = point void',
    penalty: 'Point doesn\'t count',
  },
  {
    id: 'freeze-mode', tier: 'yellow', emoji: '🧊', name: 'Freeze Mode', attitude: 'Stay Where You Failed',
    howItWorks: 'After an unforced error, player freezes in place.',
    rules: ['Unforced error = frozen on that spot', 'Cannot move until next point ends', 'Clears after one frozen point'],
    noExceptions: 'Moving while frozen = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'cold-start', tier: 'yellow', emoji: '🧊', name: 'Cold Start', attitude: 'Warm Up First',
    howItWorks: 'No attacking shots for the first 3 hits.',
    rules: ['First 3 ball contacts must be defensive', 'No smashes, winners, or hard shots'],
    noExceptions: 'Any aggressive shot in first 3 = violation',
    penalty: 'Point goes to opponent',
  },
  {
    id: 'sudden-death', tier: 'red', emoji: '⏳', name: 'Sudden Death', attitude: 'Every Point Counts',
    howItWorks: 'Golden point mode. Last point wins the match.',
    rules: ['Score doesn\'t matter', 'When organizer calls time — last point decides', 'Winner gets max score, loser gets zero'],
    noExceptions: 'N/A — automatic',
    penalty: 'None — it\'s the curse itself',
  },
  {
    id: 'double-trouble', tier: 'red', emoji: '💣', name: 'Double Trouble', attitude: 'No Shield Allowed',
    howItWorks: 'Play 2 curse cards at once. Shield is blocked.',
    rules: ['Pick any 2 cards from your hand', 'Both apply simultaneously', 'Opponent cannot use shield'],
    noExceptions: 'N/A — shield is disabled',
    penalty: 'None — it\'s the curse itself',
  },
  {
    id: 'chaos-swap', tier: 'red', emoji: '🃏', name: 'Chaos Swap', attitude: 'Trade Cards',
    howItWorks: 'Each team picks one card from opponent\'s hand.',
    rules: ['Opponent shows their hand', 'You pick one card to take', 'They pick one from yours'],
    noExceptions: 'N/A — both teams must swap',
    penalty: 'None — it\'s the curse itself',
  },
  {
    id: 'all-in', tier: 'red', emoji: '🎰', name: 'All In', attitude: 'Gamble Every Point',
    howItWorks: 'Call "double" before any rally to bet the point.',
    rules: ['Say "double" before serve', 'Win = 2 points for you', 'Lose = 2 points for opponent'],
    noExceptions: 'N/A — voluntary each point',
    penalty: 'None — it\'s the gamble',
  },
  {
    id: 'doble-o-nada', tier: 'red', emoji: '🎲', name: 'Doble o Nada', attitude: 'Double Points',
    howItWorks: 'Every point lost counts as 2.',
    rules: ['Only points against count double', 'Points won are normal'],
    noExceptions: 'N/A — automatic',
    penalty: 'None — it\'s the curse itself',
  },
];

export const SHIELD_CARDS: ShieldCardContent[] = [
  {
    id: 'escudo', emoji: '🛡️', name: 'Escudo', attitude: 'Shield',
    howItWorks: 'Block one curse.',
    rules: ['Play when a curse is cast on you', 'Both curse and shield are consumed', 'Cannot be recovered'],
  },
  {
    id: 'reverse-shield', emoji: '🔀', name: 'Reverse Shield', attitude: 'Right Back at You',
    howItWorks: 'Block a curse and reflect it on the caster.',
    rules: ['Blocks the curse completely', 'Curse applies to the caster instead', 'Both shield and curse are consumed'],
  },
  {
    id: 'elite-shield', emoji: '⭐', name: 'Elite Shield', attitude: 'Unbreakable',
    howItWorks: 'Blocks any curse — even Double Trouble.',
    rules: ['Cannot be bypassed', 'Works against Double Trouble', 'Both shield and curse are consumed'],
  },
];

/** @deprecated Use SHIELD_CARDS instead */
export const SHIELD_CARD_CONTENT: ShieldCardContent = SHIELD_CARDS[0];
