import { describe, it, expect } from 'vitest';
import type { Nomination } from '@padel/common';
import { assignTiers, selectAwards } from './selection';

function makeAward(id: string, playerNames: string[] = ['Alice']): Nomination {
  return {
    id,
    title: id,
    emoji: '🏆',
    description: `Award ${id}`,
    playerNames,
    stat: 'stat',
  };
}

describe('assignTiers', () => {
  it('assigns legendary tier to known legendary awards', () => {
    const awards = [makeAward('undefeated')];
    assignTiers(awards);
    expect(awards[0].tier).toBe('legendary');
  });

  it('assigns rare tier to known rare awards', () => {
    const awards = [makeAward('dominator')];
    assignTiers(awards);
    expect(awards[0].tier).toBe('rare');
  });

  it('assigns common tier to known common awards', () => {
    const awards = [makeAward('point-machine')];
    assignTiers(awards);
    expect(awards[0].tier).toBe('common');
  });

  it('defaults to common for unknown award ids', () => {
    const awards = [makeAward('unknown-award')];
    assignTiers(awards);
    expect(awards[0].tier).toBe('common');
  });

  it('assigns tiers to multiple awards at once', () => {
    const awards = [
      makeAward('undefeated'),
      makeAward('iron-wall'),
      makeAward('quick-strike'),
    ];
    assignTiers(awards);
    expect(awards[0].tier).toBe('legendary');
    expect(awards[1].tier).toBe('rare');
    expect(awards[2].tier).toBe('common');
  });
});

describe('selectAwards', () => {
  function makePool(): Nomination[] {
    const legendary = ['undefeated', 'giant-slayer', 'comeback-king', 'underdog'].map(id => {
      const a = makeAward(id, [`Player-${id}`]);
      a.tier = 'legendary';
      return a;
    });
    const rare = ['dominator', 'clutch-player', 'iron-wall', 'best-duo', 'nearly-there'].map(id => {
      const a = makeAward(id, [`Player-${id}`]);
      a.tier = 'rare';
      return a;
    });
    const common = ['point-machine', 'quick-strike', 'see-saw', 'warrior', 'battle-tested', 'offensive-duo', 'rubber-match'].map(id => {
      const a = makeAward(id, [`Player-${id}`]);
      a.tier = 'common';
      return a;
    });
    return [...legendary, ...rare, ...common];
  }

  it('returns at most maxAwards items', () => {
    const pool = makePool();
    const result = selectAwards(pool, 5, 42);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('is deterministic with the same seed', () => {
    const pool = makePool();
    const r1 = selectAwards(pool, 6, 123);
    const r2 = selectAwards(pool, 6, 123);
    expect(r1.map(a => a.id)).toEqual(r2.map(a => a.id));
  });

  it('produces different results with different seeds', () => {
    const pool = makePool();
    const r1 = selectAwards(pool, 8, 42);
    const r2 = selectAwards(pool, 8, 999);
    const ids1 = r1.map(a => a.id).join(',');
    const ids2 = r2.map(a => a.id).join(',');
    expect(ids1).not.toBe(ids2);
  });

  it('includes a mix of tiers', () => {
    const pool = makePool();
    const result = selectAwards(pool, 10, 42);
    const tiers = new Set(result.map(a => a.tier));
    expect(tiers.size).toBeGreaterThanOrEqual(2);
  });

  it('respects soft per-player cap of 2', () => {
    const pool: Nomination[] = [];
    for (let i = 0; i < 8; i++) {
      const a = makeAward(`award-${i}`, ['Alice']);
      a.tier = 'common';
      pool.push(a);
    }
    for (let i = 0; i < 4; i++) {
      const a = makeAward(`other-${i}`, [`Player-${i}`]);
      a.tier = 'common';
      pool.push(a);
    }
    const result = selectAwards(pool, 6, 42);
    const aliceCount = result.filter(a => a.playerNames.includes('Alice')).length;
    expect(aliceCount).toBeLessThanOrEqual(3);
  });

  it('relaxes cap when not enough awards from other players', () => {
    const pool: Nomination[] = [];
    for (let i = 0; i < 5; i++) {
      const a = makeAward(`award-${i}`, ['Alice']);
      a.tier = 'common';
      pool.push(a);
    }
    const result = selectAwards(pool, 4, 42);
    expect(result.length).toBeGreaterThan(2);
  });

  it('returns empty array when pool is empty', () => {
    const result = selectAwards([], 5, 42);
    expect(result).toEqual([]);
  });

  it('handles maxAwards larger than pool size', () => {
    const pool = [makeAward('a'), makeAward('b')];
    pool[0].tier = 'common';
    pool[1].tier = 'common';
    const result = selectAwards(pool, 10, 42);
    expect(result).toHaveLength(2);
  });
});
