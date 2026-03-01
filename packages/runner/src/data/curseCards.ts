import type { CurseCard, ChaosLevel } from '@padel/common';

export const CURSE_CARDS: CurseCard[] = [
  // Green tier (6)
  {
    id: 'los-mudos', tier: 'green', emoji: '\uD83E\uDD10', name: 'Los Mudos',
    subtitle: 'curse.losMudos.subtitle',
    description: 'curse.losMudos.desc',
    details: 'curse.losMudos.details',
  },
  {
    id: 'el-espejo', tier: 'green', emoji: '\uD83E\uDE9E', name: 'El Espejo',
    subtitle: 'curse.elEspejo.subtitle',
    description: 'curse.elEspejo.desc',
    details: 'curse.elEspejo.details',
  },
  {
    id: 'slow-motion', tier: 'green', emoji: '\uD83D\uDC22', name: 'C\u00e1mara Lenta',
    subtitle: 'curse.slowMotion.subtitle',
    description: 'curse.slowMotion.desc',
    details: 'curse.slowMotion.details',
  },
  {
    id: 'el-pegajoso', tier: 'green', emoji: '\uD83E\uDDA0', name: 'El Pegajoso',
    subtitle: 'curse.elPegajoso.subtitle',
    description: 'curse.elPegajoso.desc',
    details: 'curse.elPegajoso.details',
  },
  {
    id: 'memoria-de-pez', tier: 'green', emoji: '\uD83D\uDC1F', name: 'Memoria de Pez',
    subtitle: 'curse.memoriaDePez.subtitle',
    description: 'curse.memoriaDePez.desc',
    details: 'curse.memoriaDePez.details',
  },
  {
    id: 'high-five', tier: 'green', emoji: '\uD83E\uDD1D', name: 'Choca Esos Cinco',
    subtitle: 'curse.highFive.subtitle',
    description: 'curse.highFive.desc',
    details: 'curse.highFive.details',
  },

  // Yellow tier (6)
  {
    id: 'mano-muerta', tier: 'yellow', emoji: '\u270B', name: 'Mano Muerta',
    subtitle: 'curse.manoMuerta.subtitle',
    description: 'curse.manoMuerta.desc',
    details: 'curse.manoMuerta.details',
  },
  {
    id: 'gigante-y-enano', tier: 'yellow', emoji: '\uD83E\uDDD1\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1', name: 'Gigante y Enano',
    subtitle: 'curse.giganteYEnano.subtitle',
    description: 'curse.giganteYEnano.desc',
    details: 'curse.giganteYEnano.details',
  },
  {
    id: 'el-fantasma', tier: 'yellow', emoji: '\uD83D\uDC7B', name: 'El Fantasma',
    subtitle: 'curse.elFantasma.subtitle',
    description: 'curse.elFantasma.desc',
    details: 'curse.elFantasma.details',
  },
  {
    id: 'sin-bandeja', tier: 'yellow', emoji: '\uD83D\uDEAB', name: 'Sin Bandeja',
    subtitle: 'curse.sinBandeja.subtitle',
    description: 'curse.sinBandeja.desc',
    details: 'curse.sinBandeja.details',
  },
  {
    id: 'solo-de-ida', tier: 'yellow', emoji: '\u21A9\uFE0F', name: 'Solo de Ida',
    subtitle: 'curse.soloDeIda.subtitle',
    description: 'curse.soloDeIda.desc',
    details: 'curse.soloDeIda.details',
  },
  {
    id: 'la-diana', tier: 'yellow', emoji: '\uD83C\uDFAF', name: 'La Diana',
    subtitle: 'curse.laDiana.subtitle',
    description: 'curse.laDiana.desc',
    details: 'curse.laDiana.details',
  },

  // Red tier (5)
  {
    id: 'el-solo', tier: 'red', emoji: '\uD83E\uDDD1', name: 'El Solo',
    subtitle: 'curse.elSolo.subtitle',
    description: 'curse.elSolo.desc',
    details: 'curse.elSolo.details',
  },
  {
    id: 'reversi', tier: 'red', emoji: '\uD83D\uDD04', name: 'Al Rev\u00e9s',
    subtitle: 'curse.reversi.subtitle',
    description: 'curse.reversi.desc',
    details: 'curse.reversi.details',
  },
  {
    id: 'la-ruleta', tier: 'red', emoji: '\uD83C\uDFA0', name: 'La Ruleta',
    subtitle: 'curse.laRuleta.subtitle',
    description: 'curse.laRuleta.desc',
    details: 'curse.laRuleta.details',
  },
  {
    id: 'mini-pala', tier: 'red', emoji: '\uD83C\uDFBE', name: 'Mini Pala',
    subtitle: 'curse.miniPala.subtitle',
    description: 'curse.miniPala.desc',
    details: 'curse.miniPala.details',
  },
  {
    id: 'relampago', tier: 'red', emoji: '\u26A1', name: 'Rel\u00E1mpago',
    subtitle: 'curse.relampago.subtitle',
    description: 'curse.relampago.desc',
    details: 'curse.relampago.details',
  },
];

export function getCardsForChaosLevel(level: ChaosLevel): CurseCard[] {
  switch (level) {
    case 'lite': return CURSE_CARDS.filter(c => c.tier === 'green');
    case 'medium': return CURSE_CARDS.filter(c => c.tier === 'green' || c.tier === 'yellow');
    case 'hardcore': return CURSE_CARDS;
  }
}
