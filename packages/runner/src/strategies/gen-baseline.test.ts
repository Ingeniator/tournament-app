/**
 * Construct BWT(12) then SA over court assignments to minimize court spread.
 */
import { it, expect } from 'vitest';

const N = 12;
const COURTS = 3;
const ROUNDS = 11;
const INF = 11;

function umod(x: number): number {
  const d = ((x % 11) + 11) % 11;
  return d <= 5 ? d : 11 - d;
}
function udiff(a: number, b: number): number { return umod(b - a); }
type Split = [[number,number],[number,number]];
function allSplits4(e: number[]): Split[] {
  const [a,b,c,d] = e;
  return [[[a,b],[c,d]], [[a,c],[b,d]], [[a,d],[b,c]]];
}
function popcount(n: number): number { let c=0; while(n){c+=n&1;n>>=1;} return c; }

function findBWTs(): number[][] {
  const results: number[][] = [];
  for (let a = 1; a <= 10; a++) for (let b = a+1; b <= 10; b++) {
    const t0pd = udiff(a, b);
    const t0od = [umod(a), umod(b)];
    const rem: number[] = [];
    for (let x = 1; x <= 10; x++) if (x !== a && x !== b) rem.push(x);
    for (let mask = 0; mask < 256; mask++) {
      if (popcount(mask) !== 4) continue;
      const g1: number[] = [], g2: number[] = [];
      for (let i = 0; i < 8; i++) (mask & (1<<i) ? g1 : g2).push(rem[i]);
      if (g1[0] > g2[0]) continue;
      for (const s1 of allSplits4(g1)) for (const s2 of allSplits4(g2)) {
        const pds = [t0pd, udiff(s1[0][0],s1[0][1]), udiff(s1[1][0],s1[1][1]), udiff(s2[0][0],s2[0][1]), udiff(s2[1][0],s2[1][1])];
        if (new Set(pds).size !== 5 || ![1,2,3,4,5].every(d => pds.includes(d))) continue;
        const ods = [...t0od,
          udiff(s1[0][0],s1[1][0]), udiff(s1[0][0],s1[1][1]), udiff(s1[0][1],s1[1][0]), udiff(s1[0][1],s1[1][1]),
          udiff(s2[0][0],s2[1][0]), udiff(s2[0][0],s2[1][1]), udiff(s2[0][1],s2[1][0]), udiff(s2[0][1],s2[1][1]),
        ];
        const oc = new Map<number,number>();
        for (const d of ods) oc.set(d, (oc.get(d)??0)+1);
        if (![1,2,3,4,5].every(d => oc.get(d) === 2)) continue;

        // Build schedule (courts=0 for all, will optimize later)
        const sched = new Array(ROUNDS * 15);
        for (let r = 0; r < ROUNDS; r++) {
          const dev = (x: number) => x === INF ? INF : (x + r) % 11;
          let o = r * 15;
          sched[o]=dev(INF); sched[o+1]=dev(0); sched[o+2]=dev(a); sched[o+3]=dev(b); sched[o+4]=0;
          o += 5;
          sched[o]=dev(s1[0][0]); sched[o+1]=dev(s1[0][1]); sched[o+2]=dev(s1[1][0]); sched[o+3]=dev(s1[1][1]); sched[o+4]=1;
          o += 5;
          sched[o]=dev(s2[0][0]); sched[o+1]=dev(s2[0][1]); sched[o+2]=dev(s2[1][0]); sched[o+3]=dev(s2[1][1]); sched[o+4]=2;
        }
        results.push(sched);
      }
    }
  }
  return results;
}

function courtSpread(sched: number[]): number {
  const cc = new Int8Array(N * COURTS);
  for (let r = 0; r < ROUNDS; r++) for (let m = 0; m < 3; m++) {
    const o = r * 15 + m * 5;
    const court = sched[o+4];
    cc[sched[o]*COURTS+court]++; cc[sched[o+1]*COURTS+court]++;
    cc[sched[o+2]*COURTS+court]++; cc[sched[o+3]*COURTS+court]++;
  }
  let spread = 0;
  for (let c = 0; c < COURTS; c++) {
    let mn = 99, mx = 0;
    for (let p = 0; p < N; p++) { const v = cc[p*COURTS+c]; mn=Math.min(mn,v); mx=Math.max(mx,v); }
    spread = Math.max(spread, mx - mn);
  }
  return spread;
}

function courtCost(sched: number[]): number {
  const cc = new Int8Array(N * COURTS);
  for (let r = 0; r < ROUNDS; r++) for (let m = 0; m < 3; m++) {
    const o = r * 15 + m * 5;
    const court = sched[o+4];
    cc[sched[o]*COURTS+court]++; cc[sched[o+1]*COURTS+court]++;
    cc[sched[o+2]*COURTS+court]++; cc[sched[o+3]*COURTS+court]++;
  }
  let cost = 0;
  for (let p = 0; p < N; p++) for (let c = 0; c < COURTS; c++) {
    const dev = cc[p*COURTS+c] - 11/3;
    cost += dev * dev;
  }
  return cost;
}

function evaluate(sched: number[]): [number, number, number, number] {
  const pk = (a: number, b: number) => a < b ? a * N + b : b * N + a;
  const pcArr = new Int8Array(N * N);
  const ocArr = new Int8Array(N * N);
  for (let r = 0; r < ROUNDS; r++) for (let m = 0; m < 3; m++) {
    const o = r * 15 + m * 5;
    const a = sched[o], b = sched[o+1], c = sched[o+2], d = sched[o+3];
    pcArr[pk(a,b)]++; pcArr[pk(c,d)]++;
    ocArr[pk(a,c)]++; ocArr[pk(a,d)]++; ocArr[pk(b,c)]++; ocArr[pk(b,d)]++;
  }
  let repeats = 0, neverPlayed = 0, oppMin = 999, oppMax = 0;
  for (let i = 0; i < N; i++) for (let j = i+1; j < N; j++) {
    const k = i*N+j;
    if (pcArr[k] > 1) repeats += pcArr[k] - 1;
    if (pcArr[k] === 0 && ocArr[k] === 0) { neverPlayed++; continue; }
    oppMin = Math.min(oppMin, ocArr[k]); oppMax = Math.max(oppMax, ocArr[k]);
  }
  if (neverPlayed > 0) oppMin = 0;
  return [repeats, oppMax <= 0 ? 0 : oppMax - (oppMin===999?0:oppMin), neverPlayed, courtSpread(sched)];
}

it('BWT(12) + court SA', () => {
  const bwts = findBWTs();
  console.log(`Found ${bwts.length} BWT(12) initial rounds`);

  let globalBest: number[] | null = null;
  let globalBestSpread = Infinity;
  let globalBestCost = Infinity;
  const perms = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
  const deadline = performance.now() + 60_000;

  for (const baseSched of bwts) {
    // SA over court assignments only
    const current = [...baseSched];

    // Initialize with greedy court assignment
    const cc = new Int8Array(N * COURTS);
    for (let r = 0; r < ROUNDS; r++) {
      const base = r * 15;
      const groups: number[][] = [];
      for (let m = 0; m < 3; m++) {
        const o = base + m * 5;
        groups.push([current[o], current[o+1], current[o+2], current[o+3]]);
      }
      let bestPerm = perms[0], bestC = Infinity;
      for (const perm of perms) {
        const tmp = new Int8Array(cc);
        for (let g = 0; g < 3; g++) for (const p of groups[g]) tmp[p*COURTS+perm[g]]++;
        let c = 0;
        for (let p = 0; p < N; p++) for (let ci = 0; ci < COURTS; ci++) {
          const dev = tmp[p*COURTS+ci] - 11/3;
          c += dev * dev;
        }
        if (c < bestC) { bestC = c; bestPerm = perm; }
      }
      for (let m = 0; m < 3; m++) {
        current[base + m*5 + 4] = bestPerm[m];
        for (const p of groups[m]) cc[p*COURTS+bestPerm[m]]++;
      }
    }

    let curCost = courtCost(current);
    let curSpread = courtSpread(current);

    if (curSpread < globalBestSpread || (curSpread === globalBestSpread && curCost < globalBestCost)) {
      globalBestSpread = curSpread;
      globalBestCost = curCost;
      globalBest = [...current];
    }

    // SA: randomly change court perm of one round
    let temp = 10;
    for (let step = 0; step < 1000000 && performance.now() < deadline; step++) {
      const r = Math.floor(Math.random() * ROUNDS);
      const base = r * 15;
      const perm = perms[Math.floor(Math.random() * 6)];

      // Save old courts
      const oldCourts = [current[base+4], current[base+9], current[base+14]];
      current[base+4] = perm[0]; current[base+9] = perm[1]; current[base+14] = perm[2];

      const newCost = courtCost(current);
      const delta = newCost - curCost;

      if (delta <= 0 || Math.random() < Math.exp(-delta / temp)) {
        curCost = newCost;
        curSpread = courtSpread(current);
        if (curSpread < globalBestSpread || (curSpread === globalBestSpread && curCost < globalBestCost)) {
          globalBestSpread = curSpread;
          globalBestCost = curCost;
          globalBest = [...current];
          if (curSpread <= 1) break;
        }
      } else {
        current[base+4] = oldCourts[0]; current[base+9] = oldCourts[1]; current[base+14] = oldCourts[2];
      }

      temp *= 0.99999;
    }

    if (globalBestSpread <= 1) break;
  }

  console.log(`Best court spread: ${globalBestSpread}`);
  const finalScore = evaluate(globalBest!);
  console.log(`Final score: [${finalScore}]`);

  expect(finalScore[0]).toBe(0);
  expect(finalScore[1]).toBe(0);
  expect(finalScore[2]).toBe(0);
  expect(finalScore[3]).toBeLessThanOrEqual(1);

  console.log(`\n  '12:3': {`);
  console.log(`    players: 12,`);
  console.log(`    courts: 3,`);
  console.log(`    score: [${finalScore}],`);
  console.log(`    rounds: [`);
  for (let r = 0; r < ROUNDS; r++) {
    const base = r * 15;
    const matches: string[] = [];
    for (let m = 0; m < 3; m++) {
      const o = base + m * 5;
      matches.push(`[[${globalBest![o]},${globalBest![o+1]}], [${globalBest![o+2]},${globalBest![o+3]}], ${globalBest![o+4]}]`);
    }
    console.log(`      { matches: [${matches.join(', ')}], sitOuts: [] },`);
  }
  console.log(`    ],`);
  console.log(`  },`);
}, 120_000);
