import type { Tournament, Nomination } from '@padel/common';
import { getStrategy } from '../../strategies';

/** Stable key for an ad-hoc pair (order-independent) */
function pairKey(pair: [string, string]): string {
  return [pair[0], pair[1]].sort().join('+');
}

export function computeMaldicionesAwards(tournament: Tournament): Nomination[] {
  if (!tournament.config.maldiciones?.enabled) return [];

  const strategy = getStrategy(tournament.config.format);
  const fixedPartners = strategy.hasFixedPartners;
  const nameOf = (id: string) => tournament.players.find(p => p.id === id)?.name ?? '?';

  // For fixed-partner formats, use team id as key; otherwise use sorted player pair key
  const keyOf = (pair: [string, string]): string => {
    if (fixedPartners && tournament.teams?.length) {
      const team = tournament.teams.find(t =>
        (t.player1Id === pair[0] && t.player2Id === pair[1]) ||
        (t.player1Id === pair[1] && t.player2Id === pair[0])
      );
      if (team) return team.id;
    }
    return pairKey(pair);
  };

  const labelOf = (key: string): string => {
    if (fixedPartners && tournament.teams?.length) {
      const team = tournament.teams.find(t => t.id === key);
      if (team) return team.name ?? `${nameOf(team.player1Id)} & ${nameOf(team.player2Id)}`;
    }
    const [a, b] = key.split('+');
    return `${nameOf(a)} & ${nameOf(b)}`;
  };

  const awards: Nomination[] = [];

  // Stats per key (team or pair)
  const cursesCast = new Map<string, number>();
  const cursesWonWith = new Map<string, number>();
  const cursesLostWith = new Map<string, number>();
  const winsWhileCursed = new Map<string, number>();
  const cursedGamesPlayed = new Map<string, number>();
  const cursesReceived = new Map<string, number>();
  const shieldsUsed = new Map<string, number>();
  const consecutiveCursedWins = new Map<string, number>();
  const maxConsecutiveCursedWins = new Map<string, number>();
  const gamesPlayed = new Map<string, number>();

  const inc = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);

  for (const round of tournament.rounds) {
    for (const match of round.matches) {
      if (!match.score) continue;

      const k1 = keyOf(match.team1);
      const k2 = keyOf(match.team2);
      inc(gamesPlayed, k1);
      inc(gamesPlayed, k2);

      if (!match.curse) continue;
      const curse = match.curse;

      const casterKey = curse.castBy === 'team1' ? k1 : k2;
      const victimKey = curse.castBy === 'team1' ? k2 : k1;

      inc(cursesCast, casterKey);
      inc(cursesReceived, victimKey);

      if (curse.shielded) {
        inc(shieldsUsed, victimKey);
        continue;
      }

      inc(cursedGamesPlayed, victimKey);

      const casterPoints = curse.castBy === 'team1' ? match.score.team1Points : match.score.team2Points;
      const victimPoints = curse.castBy === 'team1' ? match.score.team2Points : match.score.team1Points;

      if (casterPoints > victimPoints) {
        inc(cursesWonWith, casterKey);
      }

      if (victimPoints > casterPoints) {
        inc(cursesLostWith, casterKey);
        inc(winsWhileCursed, victimKey);
        const streak = (consecutiveCursedWins.get(victimKey) ?? 0) + 1;
        consecutiveCursedWins.set(victimKey, streak);
        if (streak > (maxConsecutiveCursedWins.get(victimKey) ?? 0)) {
          maxConsecutiveCursedWins.set(victimKey, streak);
        }
      } else {
        consecutiveCursedWins.set(victimKey, 0);
      }
    }
  }

  const allKeys = [...gamesPlayed.keys()];

  // EL BRUJO — Most curses cast that led to opponent losing (min 2)
  let bestBrujo: { key: string; count: number } | null = null;
  for (const key of allKeys) {
    const count = cursesWonWith.get(key) ?? 0;
    if (count >= 2 && (!bestBrujo || count > bestBrujo.count)) {
      bestBrujo = { key, count };
    }
  }
  if (bestBrujo) {
    awards.push({
      id: 'el-brujo',
      title: 'El Brujo',
      emoji: '🧙',
      description: 'Master of curses',
      playerNames: [labelOf(bestBrujo.key)],
      stat: `${bestBrujo.count} effective curses`,
    });
  }

  // EL SUPERVIVIENTE — Most games won while cursed (min 2)
  let bestSurvivor: { key: string; count: number } | null = null;
  for (const key of allKeys) {
    const count = winsWhileCursed.get(key) ?? 0;
    if (count >= 2 && (!bestSurvivor || count > bestSurvivor.count)) {
      bestSurvivor = { key, count };
    }
  }
  if (bestSurvivor) {
    awards.push({
      id: 'el-superviviente',
      title: 'El Superviviente',
      emoji: '💪',
      description: 'Won while cursed',
      playerNames: [labelOf(bestSurvivor.key)],
      stat: `${bestSurvivor.count} wins under a curse`,
    });
  }

  // ESCUDO DE ORO — Most successful shield blocks (min 1)
  let bestShield: { key: string; count: number } | null = null;
  for (const key of allKeys) {
    const count = shieldsUsed.get(key) ?? 0;
    if (count >= 1 && (!bestShield || count > bestShield.count)) {
      bestShield = { key, count };
    }
  }
  if (bestShield) {
    awards.push({
      id: 'escudo-de-oro',
      title: 'Escudo de Oro',
      emoji: '🛡️',
      description: 'Shield master',
      playerNames: [labelOf(bestShield.key)],
      stat: `${bestShield.count} block(s)`,
    });
  }

  // EL MALDITO — Most curses received (min 2)
  let mostCursed: { key: string; count: number } | null = null;
  for (const key of allKeys) {
    const count = cursesReceived.get(key) ?? 0;
    if (count >= 2 && (!mostCursed || count > mostCursed.count)) {
      mostCursed = { key, count };
    }
  }
  if (mostCursed) {
    awards.push({
      id: 'el-maldito',
      title: 'El Maldito',
      emoji: '☠️',
      description: 'Most cursed pair',
      playerNames: [labelOf(mostCursed.key)],
      stat: `${mostCursed.count} curses received`,
    });
  }

  // EL INMUNE — Won 3+ cursed games in a row
  let bestImmune: { key: string; streak: number } | null = null;
  for (const key of allKeys) {
    const streak = maxConsecutiveCursedWins.get(key) ?? 0;
    if (streak >= 3 && (!bestImmune || streak > bestImmune.streak)) {
      bestImmune = { key, streak };
    }
  }
  if (bestImmune) {
    awards.push({
      id: 'el-inmune',
      title: 'El Inmune',
      emoji: '🦠',
      description: 'Unstoppable under curses',
      playerNames: [labelOf(bestImmune.key)],
      stat: `${bestImmune.streak} consecutive cursed wins`,
    });
  }

  // EL RESISTENTE — Best win rate while cursed (min 2 non-shielded cursed games)
  let bestResistente: { key: string; wins: number; total: number; rate: number } | null = null;
  for (const key of allKeys) {
    const total = cursedGamesPlayed.get(key) ?? 0;
    const wins = winsWhileCursed.get(key) ?? 0;
    if (total >= 2 && wins > 0) {
      const rate = wins / total;
      if (!bestResistente || rate > bestResistente.rate || (rate === bestResistente.rate && wins > bestResistente.wins)) {
        bestResistente = { key, wins, total, rate };
      }
    }
  }
  if (bestResistente) {
    const pct = Math.round(bestResistente.rate * 100);
    awards.push({
      id: 'el-resistente',
      title: 'El Resistente',
      emoji: '🦾',
      description: 'Best win rate under curses',
      playerNames: [labelOf(bestResistente.key)],
      stat: `${bestResistente.wins}/${bestResistente.total} wins (${pct}%)`,
    });
  }

  // KARMA — Most backfired curses: cast but lost (min 2)
  let bestKarma: { key: string; count: number } | null = null;
  for (const key of allKeys) {
    const count = cursesLostWith.get(key) ?? 0;
    if (count >= 2 && (!bestKarma || count > bestKarma.count)) {
      bestKarma = { key, count };
    }
  }
  if (bestKarma) {
    awards.push({
      id: 'karma',
      title: 'Karma',
      emoji: '🔄',
      description: 'Curses that backfired',
      playerNames: [labelOf(bestKarma.key)],
      stat: `${bestKarma.count} curses backfired`,
    });
  }

  // EL INTOCABLE — Never cursed throughout the tournament (min 3 games played, exactly 1 qualifies)
  const intocables: string[] = [];
  for (const key of allKeys) {
    const received = cursesReceived.get(key) ?? 0;
    const played = gamesPlayed.get(key) ?? 0;
    if (received === 0 && played >= 3) {
      intocables.push(key);
    }
  }
  if (intocables.length === 1) {
    awards.push({
      id: 'el-intocable',
      title: 'El Intocable',
      emoji: '👼',
      description: 'Never cursed',
      playerNames: [labelOf(intocables[0])],
      stat: `${gamesPlayed.get(intocables[0])} games, 0 curses received`,
    });
  }

  return awards;
}
