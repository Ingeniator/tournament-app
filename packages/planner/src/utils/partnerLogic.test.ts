import { describe, it, expect } from 'vitest';
import type { PlannerRegistration } from '@padel/common';
import { resolvePartnerUpdate } from './partnerLogic';

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
        { playerId: 'a', fields: { partnerName: 'Bob', partnerTelegram: null } },
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
        fields: { partnerName: 'Bob', partnerTelegram: null },
      });
      expect(result.writes).toContainEqual({
        playerId: 'b',
        fields: { partnerName: 'Alice', partnerTelegram: null },
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
          fields: { partnerName: 'Alice', partnerTelegram: 'alice_tg' },
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
        fields: { partnerName: null, partnerTelegram: null },
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
        fields: { partnerName: null, partnerTelegram: null },
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
        fields: { partnerName: null, partnerTelegram: null },
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
        fields: { partnerName: null, partnerTelegram: null },
      });
      // Alice set to Charlie
      expect(result.writes).toContainEqual({
        playerId: 'a',
        fields: { partnerName: 'Charlie', partnerTelegram: null },
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
    it('source player not found in list (defensive)', () => {
      const players = [player({ id: 'b', name: 'Bob' })];
      const result = resolvePartnerUpdate('unknown', 'Bob', null, players);

      // Should still produce writes
      expect(result.rejected).toBeNull();
      expect(result.writes).toContainEqual({
        playerId: 'unknown',
        fields: { partnerName: 'Bob', partnerTelegram: null },
      });
      expect(result.writes).toContainEqual({
        playerId: 'b',
        fields: { partnerName: null, partnerTelegram: null },
      });
    });

    it('empty players list — creates new partner', () => {
      const result = resolvePartnerUpdate('a', 'Bob', null, []);

      expect(result.rejected).toBeNull();
      expect(result.newPlayer).not.toBeNull();
      expect(result.newPlayer!.data.name).toBe('Bob');
      expect(result.newPlayer!.data.partnerName).toBeNull();
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
      expect(r1.writes).toContainEqual({ playerId: 'a', fields: { partnerName: null, partnerTelegram: null } });
      expect(r1.writes).toContainEqual({ playerId: 'b', fields: { partnerName: null, partnerTelegram: null } });

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
});
