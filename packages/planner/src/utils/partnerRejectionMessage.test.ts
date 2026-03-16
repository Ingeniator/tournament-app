import { describe, it, expect } from 'vitest';
import { rejectionMessage } from './partnerRejectionMessage';
import type { PartnerRejection, RejectionReason } from './partnerLogic';

const mockT = (key: string, params?: Record<string, string>) =>
  `${key}:${JSON.stringify(params)}`;

function makeRejection(reason: RejectionReason, name: string): PartnerRejection {
  return { reason, name } as PartnerRejection;
}

describe('rejectionMessage', () => {
  it('maps "taken" reason to join.partnerTaken', () => {
    expect(rejectionMessage(makeRejection('taken', 'Alice'), mockT))
      .toBe('join.partnerTaken:{"name":"Alice"}');
  });

  it('maps "different_club" reason to join.partnerDifferentClub', () => {
    expect(rejectionMessage(makeRejection('different_club', 'Bob'), mockT))
      .toBe('join.partnerDifferentClub:{"name":"Bob"}');
  });

  it('maps "different_rank" reason to join.partnerDifferentRank', () => {
    expect(rejectionMessage(makeRejection('different_rank', 'Charlie'), mockT))
      .toBe('join.partnerDifferentRank:{"name":"Charlie"}');
  });

  it('maps "same_group" reason to join.partnerSameGroup', () => {
    expect(rejectionMessage(makeRejection('same_group', 'Diana'), mockT))
      .toBe('join.partnerSameGroup:{"name":"Diana"}');
  });
});
