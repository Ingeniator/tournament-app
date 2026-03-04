import { describe, it, expect } from 'vitest';
import type { PlannerRegistration } from '@padel/common';
import { resolvePartnerUpdate, findPartner, wouldBreakPartnerLink } from './partnerLogic';

function player(overrides: Partial<PlannerRegistration> & { id: string; name: string }): PlannerRegistration {
  return { timestamp: 1000, ...overrides };
}

describe('resolvePartnerUpdate', () => {

  // ─── SET PARTNER: new player (not registered) ───

  describe('set partner — new player auto-add', () => {
    it('creates a new player when partner is not registered', () => {
      const players = [player({ id: 'a', name: 'Alice' })];
      const result = resolvePartnerUpdate('a', 'Bob', null, players);

      expect(result.rejected).toBeNull();
      expect(result.writes).toEqual([
        { playerId: 'a', fields: expect.objectContaining({ partnerName: 'Bob', partnerTelegram: null }) },
      ]);
      expect(result.newPlayer).not.toBeNull();
      expect(result.newPlayer!.data.name).toBe('Bob');
      expect(result.newPlayer!.data.partnerName).toBe('Alice');
      expect(result.newPlayer!.data.confirmed).toBe(true);
      expect(result.newPlayer!.data.addedByPartner).toBe('Alice');
    });

    it('inherits club from source player', () => {
      const players = [player({ id: 'a', name: 'Alice', clubId: 'club1' })];
      const result = resolvePartnerUpdate('a', 'Bob', null, players);

      expect(result.newPlayer!.data.clubId).toBe('club1');
    });

    it('inherits rank from source player', () => {
      const players = [player({ id: 'a', name: 'Alice', rankSlot: 2 })];
      const result = resolvePartnerUpdate('a', 'Bob', null, players);

      expect(result.newPlayer!.data.rankSlot).toBe(2);
    });

    it('inherits rank 0 from source player', () => {
      const players = [player({ id: 'a', name: 'Alice', rankSlot: 0 })];
      const result = resolvePartnerUpdate('a', 'Bob', null, players);

      expect(result.newPlayer!.data.rankSlot).toBe(0);
    });

    it('assigns opposite group (A → B)', () => {
      const players = [player({ id: 'a', name: 'Alice', group: 'A' })];
      const result = resolvePartnerUpdate('a', 'Bob', null, players);

      expect(result.newPlayer!.data.group).toBe('B');
    });

    it('assigns opposite group (B → A)', () => {
      const players = [player({ id: 'a', name: 'Alice', group: 'B' })];
      const result = resolvePartnerUpdate('a', 'Bob', null, players);

      expect(result.newPlayer!.data.group).toBe('A');
    });

    it('sets telegram on new player if provided', () => {
      const players = [player({ id: 'a', name: 'Alice', telegramUsername: 'alice_tg' })];
      const result = resolvePartnerUpdate('a', 'Bob', 'bob_tg', players);

      expect(result.newPlayer!.data.telegramUsername).toBe('bob_tg');
      expect(result.newPlayer!.data.partnerTelegram).toBe('alice_tg');
    });

    it('does not set telegramUsername on new player if not provided', () => {
      const players = [player({ id: 'a', name: 'Alice' })];
      const result = resolvePartnerUpdate('a', 'Bob', null, players);

      expect(result.newPlayer!.data).not.toHaveProperty('telegramUsername');
    });

    it('trims partner name', () => {
      const players = [player({ id: 'a', name: 'Alice' })];
      const result = resolvePartnerUpdate('a', '  Bob  ', null, players);

      expect(result.newPlayer!.data.name).toBe('Bob');
    });
  });

  // ─── SET PARTNER: existing player (bidirectional link) ───

  describe('set partner — existing player bidirectional link', () => {
    it('links bidirectionally when partner exists by name', () => {
      const players = [
        player({ id: 'a', name: 'Alice' }),
        player({ id: 'b', name: 'Bob' }),
      ];
      const result = resolvePartnerUpdate('a', 'Bob', null, players);

      expect(result.rejected).toBeNull();
      expect(result.newPlayer).toBeNull();
      expect(result.writes).toContainEqual({
        playerId: 'a',
        fields: expect.objectContaining({ partnerName: 'Bob', partnerTelegram: null }),
      });
      expect(result.writes).toContainEqual({
        playerId: 'b',
        fields: expect.objectContaining({ partnerName: 'Alice', partnerTelegram: null }),
      });
    });

    it('matches by name case-insensitively', () => {
      const players = [
        player({ id: 'a', name: 'Alice' }),
        player({ id: 'b', name: 'BOB' }),
      ];
      const result = resolvePartnerUpdate('a', 'bob', null, players);

      expect(result.rejected).toBeNull();
      expect(result.newPlayer).toBeNull();
      expect(result.writes).toContainEqual(
        expect.objectContaining({ playerId: 'b' }),
      );
    });

    it('matches by telegram username (case-insensitive)', () => {
      const players = [
        player({ id: 'a', name: 'Alice', telegramUsername: 'alice_tg' }),
        player({ id: 'b', name: 'Roberto', telegramUsername: 'bob_tg' }),
      ];
      const result = resolvePartnerUpdate('a', 'Someone', 'BOB_TG', players);

      expect(result.rejected).toBeNull();
      expect(result.newPlayer).toBeNull();
      expect(result.writes).toContainEqual(
        expect.objectContaining({
          playerId: 'b',
          fields: expect.objectContaining({ partnerName: 'Alice', partnerTelegram: 'alice_tg' }),
        }),
      );
    });

    it('passes source telegram in back-link', () => {
      const players = [
        player({ id: 'a', name: 'Alice', telegramUsername: 'alice_tg' }),
        player({ id: 'b', name: 'Bob' }),
      ];
      const result = resolvePartnerUpdate('a', 'Bob', null, players);

      const backLink = result.writes.find(w => w.playerId === 'b');
      expect(backLink!.fields.partnerTelegram).toBe('alice_tg');
    });

    it('does not match self', () => {
      const players = [player({ id: 'a', name: 'Alice' })];
      const result = resolvePartnerUpdate('a', 'Alice', null, players);

      // Should create new player, not match self
      expect(result.newPlayer).not.toBeNull();
    });
  });

  // ─── REMOVE PARTNER ───

  describe('remove partner', () => {
    it('clears partner on source player', () => {
      const players = [
        player({ id: 'a', name: 'Alice', partnerName: 'Bob', partnerTelegram: 'bob_tg' }),
        player({ id: 'b', name: 'Bob', telegramUsername: 'bob_tg', partnerName: 'Alice' }),
      ];
      const result = resolvePartnerUpdate('a', null, null, players);

      expect(result.rejected).toBeNull();
      expect(result.writes).toContainEqual({
        playerId: 'a',
        fields: expect.objectContaining({ partnerName: null, partnerTelegram: null }),
      });
    });

    it('clears back-link on old partner (matched by name)', () => {
      const players = [
        player({ id: 'a', name: 'Alice', partnerName: 'Bob' }),
        player({ id: 'b', name: 'Bob', partnerName: 'Alice' }),
      ];
      const result = resolvePartnerUpdate('a', null, null, players);

      expect(result.writes).toContainEqual({
        playerId: 'b',
        fields: expect.objectContaining({ partnerName: null, partnerTelegram: null }),
      });
    });

    it('clears back-link on old partner (matched by telegram)', () => {
      const players = [
        player({ id: 'a', name: 'Alice', partnerName: 'Roberto', partnerTelegram: 'bob_tg' }),
        player({ id: 'b', name: 'Roberto', telegramUsername: 'bob_tg', partnerName: 'Alice' }),
      ];
      const result = resolvePartnerUpdate('a', null, null, players);

      expect(result.writes).toContainEqual({
        playerId: 'b',
        fields: expect.objectContaining({ partnerName: null, partnerTelegram: null }),
      });
    });

    it('does not crash when old partner is not found', () => {
      const players = [
        player({ id: 'a', name: 'Alice', partnerName: 'Ghost' }),
      ];
      const result = resolvePartnerUpdate('a', null, null, players);

      expect(result.writes).toHaveLength(1);
      expect(result.writes[0].playerId).toBe('a');
    });

    it('does not crash when source has no existing partner', () => {
      const players = [player({ id: 'a', name: 'Alice' })];
      const result = resolvePartnerUpdate('a', null, null, players);

      expect(result.writes).toHaveLength(1);
      expect(result.newPlayer).toBeNull();
    });

    it('produces no new player on removal', () => {
      const players = [
        player({ id: 'a', name: 'Alice', partnerName: 'Bob' }),
        player({ id: 'b', name: 'Bob', partnerName: 'Alice' }),
      ];
      const result = resolvePartnerUpdate('a', null, null, players);

      expect(result.newPlayer).toBeNull();
    });
  });

  // ─── SWITCHING PARTNER ───

  describe('switch partner', () => {
    it('clears old partner back-link when switching to an unlinked player', () => {
      const players = [
        player({ id: 'a', name: 'Alice', partnerName: 'Bob' }),
        player({ id: 'b', name: 'Bob', partnerName: 'Alice' }),
        player({ id: 'c', name: 'Charlie' }),
      ];
      const result = resolvePartnerUpdate('a', 'Charlie', null, players);

      expect(result.rejected).toBeNull();
      // Old partner Bob should be cleared
      expect(result.writes).toContainEqual({
        playerId: 'b',
        fields: expect.objectContaining({ partnerName: null, partnerTelegram: null }),
      });
      // Alice set to Charlie
      expect(result.writes).toContainEqual({
        playerId: 'a',
        fields: expect.objectContaining({ partnerName: 'Charlie', partnerTelegram: null }),
      });
      // Charlie back-linked to Alice
      expect(result.writes).toContainEqual(
        expect.objectContaining({
          playerId: 'c',
          fields: expect.objectContaining({ partnerName: 'Alice' }),
        }),
      );
    });

    it('does not clear old partner if re-selecting the same partner', () => {
      const players = [
        player({ id: 'a', name: 'Alice', partnerName: 'Bob' }),
        player({ id: 'b', name: 'Bob', partnerName: 'Alice' }),
      ];
      const result = resolvePartnerUpdate('a', 'Bob', null, players);

      expect(result.rejected).toBeNull();
      // Should NOT have a "clear" write for Bob — only the set and back-link
      const bobWrites = result.writes.filter(w => w.playerId === 'b');
      expect(bobWrites).toHaveLength(1);
      expect(bobWrites[0].fields.partnerName).toBe('Alice');
    });
  });

  // ─── REJECTION: target already paired ───

  describe('rejection — target already paired with someone else', () => {
    it('rejects when target has a partner that is not the source', () => {
      const players = [
        player({ id: 'a', name: 'Alice' }),
        player({ id: 'b', name: 'Bob', partnerName: 'Charlie' }),
        player({ id: 'c', name: 'Charlie', partnerName: 'Bob' }),
      ];
      const result = resolvePartnerUpdate('a', 'Bob', null, players);

      expect(result.rejected).toEqual({ reason: 'taken', name: 'Bob' });
      expect(result.writes).toHaveLength(0);
      expect(result.newPlayer).toBeNull();
    });

    it('rejects when target matched by telegram has a different partner', () => {
      const players = [
        player({ id: 'a', name: 'Alice' }),
        player({ id: 'b', name: 'Roberto', telegramUsername: 'bob_tg', partnerName: 'Charlie' }),
        player({ id: 'c', name: 'Charlie', partnerName: 'Roberto' }),
      ];
      const result = resolvePartnerUpdate('a', 'Someone', 'bob_tg', players);

      expect(result.rejected).toEqual({ reason: 'taken', name: 'Roberto' });
    });

    it('allows re-confirming an existing mutual link', () => {
      const players = [
        player({ id: 'a', name: 'Alice', partnerName: 'Bob' }),
        player({ id: 'b', name: 'Bob', partnerName: 'Alice' }),
      ];
      const result = resolvePartnerUpdate('a', 'Bob', null, players);

      expect(result.rejected).toBeNull();
      expect(result.writes.length).toBeGreaterThan(0);
    });

    it('allows linking to a player whose partnerName points to source', () => {
      // Bob has Alice as partner, Alice is setting Bob — should work
      const players = [
        player({ id: 'a', name: 'Alice' }),
        player({ id: 'b', name: 'Bob', partnerName: 'Alice' }),
      ];
      const result = resolvePartnerUpdate('a', 'Bob', null, players);

      expect(result.rejected).toBeNull();
      expect(result.writes).toContainEqual(
        expect.objectContaining({ playerId: 'a' }),
      );
      expect(result.writes).toContainEqual(
        expect.objectContaining({ playerId: 'b' }),
      );
    });

    it('does not reject when target has partnerName but partner player left the tournament', () => {
      // Bob claims partner "Ghost" but Ghost isn't in the list — orphaned link
      const players = [
        player({ id: 'a', name: 'Alice' }),
        player({ id: 'b', name: 'Bob', partnerName: 'Ghost' }),
      ];
      const result = resolvePartnerUpdate('a', 'Bob', null, players);

      // Ghost not found → theirPartner is undefined → not blocking
      expect(result.rejected).toBeNull();
    });
  });

  // ─── REJECTION: constraint violations ───

  describe('rejection — constraint violations', () => {
    it('rejects when players are in different clubs (requireSameClub)', () => {
      const players = [
        player({ id: 'a', name: 'Alice', clubId: 'club1' }),
        player({ id: 'b', name: 'Bob', clubId: 'club2' }),
      ];
      const result = resolvePartnerUpdate('a', 'Bob', null, players, { requireSameClub: true });

      expect(result.rejected).toEqual({ reason: 'different_club', name: 'Bob' });
      expect(result.writes).toHaveLength(0);
    });

    it('allows when players are in the same club', () => {
      const players = [
        player({ id: 'a', name: 'Alice', clubId: 'club1' }),
        player({ id: 'b', name: 'Bob', clubId: 'club1' }),
      ];
      const result = resolvePartnerUpdate('a', 'Bob', null, players, { requireSameClub: true });

      expect(result.rejected).toBeNull();
    });

    it('rejects when players have different ranks (requireSameRank)', () => {
      const players = [
        player({ id: 'a', name: 'Alice', rankSlot: 0 }),
        player({ id: 'b', name: 'Bob', rankSlot: 1 }),
      ];
      const result = resolvePartnerUpdate('a', 'Bob', null, players, { requireSameRank: true });

      expect(result.rejected).toEqual({ reason: 'different_rank', name: 'Bob' });
    });

    it('allows when players have the same rank', () => {
      const players = [
        player({ id: 'a', name: 'Alice', rankSlot: 2 }),
        player({ id: 'b', name: 'Bob', rankSlot: 2 }),
      ];
      const result = resolvePartnerUpdate('a', 'Bob', null, players, { requireSameRank: true });

      expect(result.rejected).toBeNull();
    });

    it('rejects when players are in the same group (requireOppositeGroup)', () => {
      const players = [
        player({ id: 'a', name: 'Alice', group: 'A' }),
        player({ id: 'b', name: 'Bob', group: 'A' }),
      ];
      const result = resolvePartnerUpdate('a', 'Bob', null, players, { requireOppositeGroup: true });

      expect(result.rejected).toEqual({ reason: 'same_group', name: 'Bob' });
    });

    it('allows when players are in opposite groups', () => {
      const players = [
        player({ id: 'a', name: 'Alice', group: 'A' }),
        player({ id: 'b', name: 'Bob', group: 'B' }),
      ];
      const result = resolvePartnerUpdate('a', 'Bob', null, players, { requireOppositeGroup: true });

      expect(result.rejected).toBeNull();
    });

    it('allows when one player has no group (requireOppositeGroup)', () => {
      const players = [
        player({ id: 'a', name: 'Alice', group: 'A' }),
        player({ id: 'b', name: 'Bob' }),
      ];
      const result = resolvePartnerUpdate('a', 'Bob', null, players, { requireOppositeGroup: true });

      expect(result.rejected).toBeNull();
    });

    it('checks multiple constraints simultaneously', () => {
      const players = [
        player({ id: 'a', name: 'Alice', clubId: 'c1', rankSlot: 0, group: 'A' }),
        player({ id: 'b', name: 'Bob', clubId: 'c2', rankSlot: 0, group: 'B' }),
      ];
      // Club mismatch triggers first
      const result = resolvePartnerUpdate('a', 'Bob', null, players, {
        requireSameClub: true,
        requireSameRank: true,
        requireOppositeGroup: true,
      });

      expect(result.rejected).toEqual({ reason: 'different_club', name: 'Bob' });
    });

    it('does not apply constraints to new (non-registered) partners', () => {
      const players = [
        player({ id: 'a', name: 'Alice', clubId: 'club1', group: 'A' }),
      ];
      // "Ghost" is not in the list, so constraints shouldn't apply
      const result = resolvePartnerUpdate('a', 'Ghost', null, players, {
        requireSameClub: true,
        requireOppositeGroup: true,
      });

      expect(result.rejected).toBeNull();
      expect(result.newPlayer).not.toBeNull();
    });

    it('does not apply constraints when none provided', () => {
      const players = [
        player({ id: 'a', name: 'Alice', clubId: 'c1', group: 'A' }),
        player({ id: 'b', name: 'Bob', clubId: 'c2', group: 'A' }),
      ];
      const result = resolvePartnerUpdate('a', 'Bob', null, players);

      expect(result.rejected).toBeNull();
    });

    it('checks "taken" before constraints', () => {
      const players = [
        player({ id: 'a', name: 'Alice', clubId: 'c1' }),
        player({ id: 'b', name: 'Bob', clubId: 'c2', partnerName: 'Charlie' }),
        player({ id: 'c', name: 'Charlie', partnerName: 'Bob' }),
      ];
      // Bob is taken — should reject with 'taken', not 'different_club'
      const result = resolvePartnerUpdate('a', 'Bob', null, players, { requireSameClub: true });

      expect(result.rejected).toEqual({ reason: 'taken', name: 'Bob' });
    });
  });

  // ─── EDGE CASES ───

  describe('edge cases', () => {
    it('source player not found in list — no-op', () => {
      const players = [player({ id: 'b', name: 'Bob' })];
      const result = resolvePartnerUpdate('unknown', 'Bob', null, players);

      // Guard: bail when source player is missing from local state
      expect(result.rejected).toBeNull();
      expect(result.writes).toHaveLength(0);
      expect(result.newPlayer).toBeNull();
    });

    it('empty players list — no-op', () => {
      const result = resolvePartnerUpdate('a', 'Bob', null, []);

      expect(result.rejected).toBeNull();
      expect(result.writes).toHaveLength(0);
      expect(result.newPlayer).toBeNull();
    });

    it('telegram match takes priority over name match', () => {
      const players = [
        player({ id: 'a', name: 'Alice', telegramUsername: 'alice_tg' }),
        player({ id: 'b1', name: 'Bob', telegramUsername: 'real_bob' }),
        player({ id: 'b2', name: 'Bob', telegramUsername: 'other_bob' }),
      ];
      const result = resolvePartnerUpdate('a', 'Bob', 'real_bob', players);

      expect(result.newPlayer).toBeNull();
      expect(result.writes).toContainEqual(
        expect.objectContaining({
          playerId: 'b1',
          fields: expect.objectContaining({ partnerName: 'Alice' }),
        }),
      );
    });

    it('whitespace in names is handled', () => {
      const players = [
        player({ id: 'a', name: 'Alice' }),
        player({ id: 'b', name: '  Bob  ' }),
      ];
      const result = resolvePartnerUpdate('a', 'Bob', null, players);

      expect(result.newPlayer).toBeNull();
      expect(result.writes).toContainEqual(
        expect.objectContaining({ playerId: 'b' }),
      );
    });

    it('mutual removal: both sides call remove independently', () => {
      const players = [
        player({ id: 'a', name: 'Alice', partnerName: 'Bob' }),
        player({ id: 'b', name: 'Bob', partnerName: 'Alice' }),
      ];

      // Alice removes
      const r1 = resolvePartnerUpdate('a', null, null, players);
      expect(r1.writes).toContainEqual({ playerId: 'a', fields: expect.objectContaining({ partnerName: null, partnerTelegram: null }) });
      expect(r1.writes).toContainEqual({ playerId: 'b', fields: expect.objectContaining({ partnerName: null, partnerTelegram: null }) });

      // Simulate state after Alice's removal applied
      const playersAfter = [
        player({ id: 'a', name: 'Alice' }),
        player({ id: 'b', name: 'Bob' }),
      ];

      // Bob also removes (should be a no-op for partner, just clears self)
      const r2 = resolvePartnerUpdate('b', null, null, playersAfter);
      expect(r2.writes).toHaveLength(1);
      expect(r2.writes[0].playerId).toBe('b');
    });
  });

  // ─── AUTO-CANCEL: orphaned partner-added players ───

  describe('auto-cancel orphaned partner-added players', () => {
    it('sets confirmed: false on unclaimed partner when removing link', () => {
      const players = [
        player({ id: 'a', name: 'Alice', partnerName: 'Bob' }),
        player({ id: 'b', name: 'Bob', partnerName: 'Alice', addedByPartner: 'Alice' }),
      ];
      const result = resolvePartnerUpdate('a', null, null, players);

      const bobWrite = result.writes.find(w => w.playerId === 'b');
      expect(bobWrite).toBeDefined();
      expect(bobWrite!.fields.confirmed).toBe(false);
      expect(bobWrite!.fields.partnerName).toBeNull();
    });

    it('does NOT set confirmed: false on claimed partner (no addedByPartner)', () => {
      const players = [
        player({ id: 'a', name: 'Alice', partnerName: 'Bob' }),
        player({ id: 'b', name: 'Bob', partnerName: 'Alice' }),
      ];
      const result = resolvePartnerUpdate('a', null, null, players);

      const bobWrite = result.writes.find(w => w.playerId === 'b');
      expect(bobWrite).toBeDefined();
      expect(bobWrite!.fields).not.toHaveProperty('confirmed');
    });

    it('auto-cancels unclaimed partner when switching to a different partner', () => {
      const players = [
        player({ id: 'a', name: 'Alice', partnerName: 'Bob' }),
        player({ id: 'b', name: 'Bob', partnerName: 'Alice', addedByPartner: 'Alice' }),
        player({ id: 'c', name: 'Charlie' }),
      ];
      const result = resolvePartnerUpdate('a', 'Charlie', null, players);

      expect(result.rejected).toBeNull();
      const bobWrite = result.writes.find(w => w.playerId === 'b');
      expect(bobWrite).toBeDefined();
      expect(bobWrite!.fields.confirmed).toBe(false);
    });

    it('does NOT auto-cancel when switching and old partner has no addedByPartner', () => {
      const players = [
        player({ id: 'a', name: 'Alice', partnerName: 'Bob' }),
        player({ id: 'b', name: 'Bob', partnerName: 'Alice' }),
        player({ id: 'c', name: 'Charlie' }),
      ];
      const result = resolvePartnerUpdate('a', 'Charlie', null, players);

      const bobWrite = result.writes.find(w => w.playerId === 'b');
      expect(bobWrite).toBeDefined();
      expect(bobWrite!.fields).not.toHaveProperty('confirmed');
    });

    it('handles addedByPartner: true (boolean fallback)', () => {
      const players = [
        player({ id: 'a', name: 'Alice', partnerName: 'Bob' }),
        player({ id: 'b', name: 'Bob', partnerName: 'Alice', addedByPartner: true as unknown as string }),
      ];
      const result = resolvePartnerUpdate('a', null, null, players);

      const bobWrite = result.writes.find(w => w.playerId === 'b');
      expect(bobWrite!.fields.confirmed).toBe(false);
    });
  });
});

describe('findPartner', () => {
  it('finds partner by name', () => {
    const alice = player({ id: 'a', name: 'Alice', partnerName: 'Bob' });
    const bob = player({ id: 'b', name: 'Bob' });
    expect(findPartner(alice, [alice, bob])).toBe(bob);
  });

  it('finds partner by telegram', () => {
    const alice = player({ id: 'a', name: 'Alice', partnerName: 'Roberto', partnerTelegram: 'bob_tg' });
    const bob = player({ id: 'b', name: 'Roberto', telegramUsername: 'bob_tg' });
    expect(findPartner(alice, [alice, bob])).toBe(bob);
  });

  it('returns undefined when no partner set', () => {
    const alice = player({ id: 'a', name: 'Alice' });
    expect(findPartner(alice, [alice])).toBeUndefined();
  });

  it('returns undefined when partner not in list', () => {
    const alice = player({ id: 'a', name: 'Alice', partnerName: 'Ghost' });
    expect(findPartner(alice, [alice])).toBeUndefined();
  });
});

describe('resolvePartnerUpdate — pairedAt handling', () => {
  it('sets pairedAt on both players when linking to an existing player', () => {
    const players = [
      player({ id: 'a', name: 'Alice' }),
      player({ id: 'b', name: 'Bob' }),
    ];
    const before = Date.now();
    const result = resolvePartnerUpdate('a', 'Bob', null, players);
    const after = Date.now();

    const aliceWrite = result.writes.find(w => w.playerId === 'a');
    const bobWrite = result.writes.find(w => w.playerId === 'b');
    expect(aliceWrite!.fields.pairedAt).toBeGreaterThanOrEqual(before);
    expect(aliceWrite!.fields.pairedAt).toBeLessThanOrEqual(after);
    expect(bobWrite!.fields.pairedAt).toBe(aliceWrite!.fields.pairedAt);
  });

  it('sets pairedAt on source and auto-created partner', () => {
    const players = [player({ id: 'a', name: 'Alice' })];
    const before = Date.now();
    const result = resolvePartnerUpdate('a', 'NewGuy', null, players);
    const after = Date.now();

    const aliceWrite = result.writes.find(w => w.playerId === 'a');
    expect(aliceWrite!.fields.pairedAt).toBeGreaterThanOrEqual(before);
    expect(aliceWrite!.fields.pairedAt).toBeLessThanOrEqual(after);
    expect(result.newPlayer!.data.pairedAt).toBe(aliceWrite!.fields.pairedAt);
  });

  it('clears pairedAt on both players when removing partner', () => {
    const players = [
      player({ id: 'a', name: 'Alice', partnerName: 'Bob', pairedAt: 999 }),
      player({ id: 'b', name: 'Bob', partnerName: 'Alice', pairedAt: 999 }),
    ];
    const result = resolvePartnerUpdate('a', null, null, players);

    const aliceWrite = result.writes.find(w => w.playerId === 'a');
    const bobWrite = result.writes.find(w => w.playerId === 'b');
    expect(aliceWrite!.fields.pairedAt).toBeNull();
    expect(bobWrite!.fields.pairedAt).toBeNull();
  });

  it('clears pairedAt on old partner and sets pairedAt on new when switching', () => {
    const players = [
      player({ id: 'a', name: 'Alice', partnerName: 'Bob', pairedAt: 500 }),
      player({ id: 'b', name: 'Bob', partnerName: 'Alice', pairedAt: 500 }),
      player({ id: 'c', name: 'Charlie' }),
    ];
    const result = resolvePartnerUpdate('a', 'Charlie', null, players);

    const bobWrite = result.writes.find(w => w.playerId === 'b');
    expect(bobWrite!.fields.pairedAt).toBeNull();

    const aliceWrite = result.writes.find(w => w.playerId === 'a');
    const charlieWrite = result.writes.find(w => w.playerId === 'c');
    expect(aliceWrite!.fields.pairedAt).toBeTypeOf('number');
    expect(charlieWrite!.fields.pairedAt).toBe(aliceWrite!.fields.pairedAt);
  });

  it('uses the same pairedAt timestamp for both partners in a single call', () => {
    const players = [
      player({ id: 'a', name: 'Alice' }),
      player({ id: 'b', name: 'Bob' }),
    ];
    const result = resolvePartnerUpdate('a', 'Bob', null, players);

    const alicePairedAt = result.writes.find(w => w.playerId === 'a')!.fields.pairedAt;
    const bobPairedAt = result.writes.find(w => w.playerId === 'b')!.fields.pairedAt;
    expect(alicePairedAt).toBe(bobPairedAt);
  });
});

describe('wouldBreakPartnerLink', () => {
  it('returns null when club change is compatible', () => {
    const partner = player({ id: 'b', name: 'Bob', clubId: 'c1' });
    expect(wouldBreakPartnerLink({ clubId: 'c1' }, partner, { requireSameClub: true })).toBeNull();
  });

  it('returns different_club when club changes to a different one', () => {
    const partner = player({ id: 'b', name: 'Bob', clubId: 'c1' });
    expect(wouldBreakPartnerLink({ clubId: 'c2' }, partner, { requireSameClub: true })).toBe('different_club');
  });

  it('returns different_club when club cleared (null vs set)', () => {
    const partner = player({ id: 'b', name: 'Bob', clubId: 'c1' });
    expect(wouldBreakPartnerLink({ clubId: null }, partner, { requireSameClub: true })).toBe('different_club');
  });

  it('returns null when requireSameClub is false', () => {
    const partner = player({ id: 'b', name: 'Bob', clubId: 'c1' });
    expect(wouldBreakPartnerLink({ clubId: 'c2' }, partner, { requireSameClub: false })).toBeNull();
  });

  it('returns different_rank when rank changes', () => {
    const partner = player({ id: 'b', name: 'Bob', rankSlot: 0 });
    expect(wouldBreakPartnerLink({ rankSlot: 1 }, partner, { requireSameRank: true })).toBe('different_rank');
  });

  it('returns null when rank stays the same', () => {
    const partner = player({ id: 'b', name: 'Bob', rankSlot: 2 });
    expect(wouldBreakPartnerLink({ rankSlot: 2 }, partner, { requireSameRank: true })).toBeNull();
  });

  it('returns same_group when group changes to match partner', () => {
    const partner = player({ id: 'b', name: 'Bob', group: 'A' });
    expect(wouldBreakPartnerLink({ group: 'A' }, partner, { requireOppositeGroup: true })).toBe('same_group');
  });

  it('returns null when group is opposite', () => {
    const partner = player({ id: 'b', name: 'Bob', group: 'A' });
    expect(wouldBreakPartnerLink({ group: 'B' }, partner, { requireOppositeGroup: true })).toBeNull();
  });

  it('returns null when group cleared (null) — not enforced', () => {
    const partner = player({ id: 'b', name: 'Bob', group: 'A' });
    expect(wouldBreakPartnerLink({ group: null }, partner, { requireOppositeGroup: true })).toBeNull();
  });

  it('returns null when partner has no group', () => {
    const partner = player({ id: 'b', name: 'Bob' });
    expect(wouldBreakPartnerLink({ group: 'A' }, partner, { requireOppositeGroup: true })).toBeNull();
  });

  it('ignores fields not in the change object', () => {
    const partner = player({ id: 'b', name: 'Bob', clubId: 'c1', rankSlot: 0 });
    // Only changing group — should not check club or rank
    expect(wouldBreakPartnerLink({ group: 'B' }, partner, {
      requireSameClub: true,
      requireSameRank: true,
      requireOppositeGroup: true,
    })).toBeNull();
  });
});
