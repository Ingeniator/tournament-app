import type { PlannerRegistration } from '@padel/common';

export interface PartnerWrite {
  /** Player ID → fields to update (merge semantics) */
  playerId: string;
  fields: Record<string, unknown>;
}

export interface PartnerNewPlayer {
  /** Full data for a new player record to create */
  data: Record<string, unknown>;
}

export type RejectionReason = 'taken' | 'different_club' | 'different_rank' | 'same_group';

export interface PartnerRejection {
  reason: RejectionReason;
  /** Name of the player that caused the rejection */
  name: string;
}

export interface PartnerUpdateResult {
  /** Updates to existing player records */
  writes: PartnerWrite[];
  /** New player to add (partner not yet registered) */
  newPlayer: PartnerNewPlayer | null;
  /** If set, the update was rejected */
  rejected: PartnerRejection | null;
}

/** Which constraints to enforce for existing-player pairing */
export interface PartnerConstraints {
  requireSameClub?: boolean;
  requireSameRank?: boolean;
  requireOppositeGroup?: boolean;
}

function findPlayerByNameOrTelegram(
  players: PlannerRegistration[],
  name: string | null,
  telegram: string | null,
  excludeId: string,
): PlannerRegistration | undefined {
  if (!name && !telegram) return undefined;
  return players.find(p => {
    if (p.id === excludeId) return false;
    if (telegram && p.telegramUsername &&
        telegram.toLowerCase() === p.telegramUsername.toLowerCase()) return true;
    if (name && p.name.trim().toLowerCase() === name.trim().toLowerCase()) return true;
    return false;
  });
}

/**
 * Pure function that computes all DB writes needed for a partner update.
 * Returns writes for existing players + optional new player to create.
 * If the target player is already paired with someone else or violates
 * constraints, the update is rejected.
 */
export function resolvePartnerUpdate(
  playerId: string,
  partnerName: string | null,
  partnerTelegram: string | null,
  players: PlannerRegistration[],
  constraints?: PartnerConstraints,
): PartnerUpdateResult {
  const srcPlayer = players.find(p => p.id === playerId);
  const writes: PartnerWrite[] = [];
  const reject = (reason: RejectionReason, name: string): PartnerUpdateResult =>
    ({ writes: [], newPlayer: null, rejected: { reason, name } });

  // === REMOVE PARTNER ===
  if (!partnerName) {
    // Clear partner on the source player
    writes.push({
      playerId,
      fields: { partnerName: null, partnerTelegram: null },
    });

    // Find and clear the old partner's back-link
    if (srcPlayer?.partnerName) {
      const oldPartner = findPlayerByNameOrTelegram(
        players,
        srcPlayer.partnerName,
        srcPlayer.partnerTelegram ?? null,
        playerId,
      );
      if (oldPartner) {
        writes.push({
          playerId: oldPartner.id,
          fields: { partnerName: null, partnerTelegram: null },
        });
      }
    }

    return { writes, newPlayer: null, rejected: null };
  }

  // === SET PARTNER ===

  // Check if the target is already a participant
  const existingPartner = findPlayerByNameOrTelegram(players, partnerName, partnerTelegram, playerId);

  if (existingPartner) {
    // Reject if the target already has a partner that isn't the source player
    if (existingPartner.partnerName) {
      const theirPartner = findPlayerByNameOrTelegram(
        players,
        existingPartner.partnerName,
        existingPartner.partnerTelegram ?? null,
        existingPartner.id,
      );
      // Allow if their partner IS the source player (re-confirming existing link)
      // Also allow if their partner left the tournament (orphaned link)
      if (theirPartner && theirPartner.id !== playerId) {
        return reject('taken', existingPartner.name);
      }
    }

    // Validate constraints between source and existing partner
    if (srcPlayer && constraints) {
      if (constraints.requireSameClub && srcPlayer.clubId !== existingPartner.clubId) {
        return reject('different_club', existingPartner.name);
      }
      if (constraints.requireSameRank && srcPlayer.rankSlot !== existingPartner.rankSlot) {
        return reject('different_rank', existingPartner.name);
      }
      if (constraints.requireOppositeGroup) {
        if (srcPlayer.group && existingPartner.group && srcPlayer.group === existingPartner.group) {
          return reject('same_group', existingPartner.name);
        }
      }
    }
  }

  // Clear old partner's back-link if switching to a different partner
  if (srcPlayer?.partnerName) {
    const oldPartner = findPlayerByNameOrTelegram(
      players,
      srcPlayer.partnerName,
      srcPlayer.partnerTelegram ?? null,
      playerId,
    );
    if (oldPartner && oldPartner.id !== existingPartner?.id) {
      writes.push({
        playerId: oldPartner.id,
        fields: { partnerName: null, partnerTelegram: null },
      });
    }
  }

  // Set partner on the source player
  writes.push({
    playerId,
    fields: { partnerName, partnerTelegram: partnerTelegram || null },
  });

  if (existingPartner) {
    // Bidirectional link: update existing partner to point back
    writes.push({
      playerId: existingPartner.id,
      fields: {
        partnerName: srcPlayer?.name ?? null,
        partnerTelegram: srcPlayer?.telegramUsername ?? null,
      },
    });

    return { writes, newPlayer: null, rejected: null };
  }

  // Auto-add partner to the player list, inheriting club/rank/opposite group.
  // Mark as addedByPartner so the organizer knows this player didn't register
  // themselves and may need to be notified externally.
  const partnerData: Record<string, unknown> = {
    name: partnerName.trim(),
    timestamp: Date.now(),
    confirmed: true,
    addedByPartner: srcPlayer?.name ?? true,
    partnerName: srcPlayer?.name ?? null,
    ...(partnerTelegram ? { telegramUsername: partnerTelegram } : {}),
    ...(srcPlayer?.telegramUsername ? { partnerTelegram: srcPlayer.telegramUsername } : {}),
  };
  if (srcPlayer?.clubId) partnerData.clubId = srcPlayer.clubId;
  if (srcPlayer?.rankSlot != null) partnerData.rankSlot = srcPlayer.rankSlot;
  if (srcPlayer?.group) partnerData.group = srcPlayer.group === 'A' ? 'B' : 'A';

  return { writes, newPlayer: { data: partnerData }, rejected: null };
}
