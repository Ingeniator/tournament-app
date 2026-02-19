import { useMemo } from 'react';
import type { Tournament } from '@padel/common';

export interface PlayerStats {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  sitOuts: number;
  partners: { name: string; count: number }[];
  opponents: { name: string; count: number }[];
  courts: { name: string; count: number }[];
}

export function usePlayerStats(tournament: Tournament | null): PlayerStats[] {
  return useMemo(() => {
    if (!tournament || tournament.phase === 'setup') return [];

    const nameOf = (id: string) => tournament.players.find(p => p.id === id)?.name ?? '?';

    const courtNameMap = new Map(tournament.config.courts.map(c => [c.id, c.name]));

    const statsMap = new Map<string, {
      gamesPlayed: number;
      sitOuts: number;
      partners: Map<string, number>;
      opponents: Map<string, number>;
      courts: Map<string, number>;
    }>();

    const ensure = (id: string) => {
      if (!statsMap.has(id)) {
        statsMap.set(id, { gamesPlayed: 0, sitOuts: 0, partners: new Map(), opponents: new Map(), courts: new Map() });
      }
      return statsMap.get(id)!;
    };

    // Initialize all players
    for (const p of tournament.players) {
      ensure(p.id);
    }

    for (const round of tournament.rounds) {
      // Count sit-outs (regardless of scoring)
      for (const id of round.sitOuts) {
        ensure(id).sitOuts++;
      }

      for (const match of round.matches) {
        const allPlayers = [...match.team1, ...match.team2];
        for (const id of allPlayers) {
          const s = ensure(id);
          s.gamesPlayed++;
          s.courts.set(match.courtId, (s.courts.get(match.courtId) ?? 0) + 1);
        }

        // Partners: teammates
        const addPartner = (a: string, b: string) => {
          const s = ensure(a);
          s.partners.set(b, (s.partners.get(b) ?? 0) + 1);
        };
        addPartner(match.team1[0], match.team1[1]);
        addPartner(match.team1[1], match.team1[0]);
        addPartner(match.team2[0], match.team2[1]);
        addPartner(match.team2[1], match.team2[0]);

        // Opponents: other team
        for (const a of match.team1) {
          for (const b of match.team2) {
            const sa = ensure(a);
            sa.opponents.set(b, (sa.opponents.get(b) ?? 0) + 1);
            const sb = ensure(b);
            sb.opponents.set(a, (sb.opponents.get(a) ?? 0) + 1);
          }
        }
      }
    }

    const sortedEntries = (map: Map<string, number>) =>
      [...map.entries()]
        .map(([id, count]) => ({ name: nameOf(id), count }))
        .sort((a, b) => b.count - a.count);

    const sortedCourtEntries = (map: Map<string, number>) =>
      [...map.entries()]
        .map(([courtId, count]) => ({ name: courtNameMap.get(courtId) ?? courtId, count }))
        .sort((a, b) => b.count - a.count);

    return tournament.players.map(p => {
      const s = statsMap.get(p.id)!;
      return {
        playerId: p.id,
        playerName: p.name,
        gamesPlayed: s.gamesPlayed,
        sitOuts: s.sitOuts,
        partners: sortedEntries(s.partners),
        opponents: sortedEntries(s.opponents),
        courts: sortedCourtEntries(s.courts),
      };
    });
  }, [tournament]);
}
