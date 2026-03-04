/**
 * Dev-time script to generate precomputed baseline schedules.
 * Run with: npx -w @padel/runner vitest run scripts/generate-baselines.ts
 *
 * Generates optimal schedules for target configurations by running
 * many iterations and keeping the best result, then prints the
 * template data to paste into baselines.ts.
 */
import { describe, it } from 'vitest';
import { americanoStrategy } from '../src/strategies/americano';
import { scoreSchedule, partnerKey } from '../src/strategies/shared';
import type { Player, TournamentConfig } from '@padel/common';

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
}

function makeConfig(numCourts: number, maxRounds: number): TournamentConfig {
  return {
    format: 'americano',
    pointsPerMatch: 21,
    courts: Array.from({ length: numCourts }, (_, i) => ({ id: `c${i}`, name: `C${i}` })),
    maxRounds,
  };
}

function isBetter(a: [number, number, number, number], b: [number, number, number, number]): boolean {
  for (let i = 0; i < 4; i++) {
    if (a[i] < b[i]) return true;
    if (a[i] > b[i]) return false;
  }
  return false;
}

interface TargetConfig {
  players: number;
  courts: number;
  rounds: number;
  iterations: number;
}

const TARGETS: TargetConfig[] = [
  { players: 10, courts: 2, rounds: 9,  iterations: 30 },
  { players: 14, courts: 3, rounds: 14, iterations: 30 },
  { players: 20, courts: 4, rounds: 19, iterations: 100 },
];

describe('generate baselines', () => {
  for (const target of TARGETS) {
    it(`${target.players}p/${target.courts}c/${target.rounds}r`, () => {
      const players = makePlayers(target.players);
      const config = makeConfig(target.courts, target.rounds);
      const courtIds = config.courts.map(c => c.id);

      let bestScore: [number, number, number, number] = [Infinity, Infinity, Infinity, Infinity];
      let bestRounds: ReturnType<typeof americanoStrategy.generateSchedule>['rounds'] | null = null;

      for (let i = 0; i < target.iterations; i++) {
        const result = americanoStrategy.generateSchedule(players, config);
        const score = scoreSchedule(result.rounds);

        if (isBetter(score, bestScore)) {
          bestScore = score;
          bestRounds = result.rounds;
        }
      }

      // Build player index map
      const playerIndex = new Map(players.map((p, i) => [p.id, i]));
      const courtIndex = new Map(courtIds.map((c, i) => [c, i]));

      // Output the template
      const roundTemplates = bestRounds!.map(round => {
        const matches = round.matches.map(m => {
          const t1: [number, number] = [playerIndex.get(m.team1[0])!, playerIndex.get(m.team1[1])!];
          const t2: [number, number] = [playerIndex.get(m.team2[0])!, playerIndex.get(m.team2[1])!];
          const ci = courtIndex.get(m.courtId)!;
          return `[[${t1}], [${t2}], ${ci}]`;
        });
        const sitOuts = round.sitOuts.map(id => playerIndex.get(id)!);
        return `    { matches: [${matches.join(', ')}], sitOuts: [${sitOuts.join(', ')}] }`;
      });

      console.log(`\nBest score: [${bestScore.join(', ')}]`);
      console.log(`\n// Paste into baselines.ts:`);
      console.log(`BASELINES['${target.players}:${target.courts}'] = {`);
      console.log(`  players: ${target.players},`);
      console.log(`  courts: ${target.courts},`);
      console.log(`  score: [${bestScore.join(', ')}],`);
      console.log(`  rounds: [`);
      console.log(roundTemplates.join(',\n'));
      console.log(`  ],`);
      console.log(`};`);

      // Print quality
      const pc = new Map<string, number>();
      const oc = new Map<string, number>();
      for (const round of bestRounds!) {
        for (const match of round.matches) {
          const k1 = partnerKey(match.team1[0], match.team1[1]);
          const k2 = partnerKey(match.team2[0], match.team2[1]);
          pc.set(k1, (pc.get(k1) ?? 0) + 1);
          pc.set(k2, (pc.get(k2) ?? 0) + 1);
          for (const a of match.team1) {
            for (const b of match.team2) {
              const ok = partnerKey(a, b);
              oc.set(ok, (oc.get(ok) ?? 0) + 1);
            }
          }
        }
      }
      let repeats = 0;
      for (const c of pc.values()) if (c > 1) repeats += c - 1;
      const oppVals = [...oc.values()];
      const oppMax = Math.max(...oppVals);
      const totalPairs = target.players * (target.players - 1) / 2;
      const oppMin = oc.size < totalPairs ? 0 : Math.min(...oppVals);
      console.log(`\nQuality: repeats=${repeats}, oppSpread=${oppMax - oppMin}`);
    }, 600000);
  }
});
