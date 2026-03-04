import type { PartnerRejection, RejectionReason } from './partnerLogic';

const REASON_KEYS: Record<RejectionReason, string> = {
  taken: 'join.partnerTaken',
  different_club: 'join.partnerDifferentClub',
  different_rank: 'join.partnerDifferentRank',
  same_group: 'join.partnerSameGroup',
};

export function rejectionMessage(
  rejection: PartnerRejection,
  t: (key: string, params?: Record<string, string>) => string,
): string {
  return t(REASON_KEYS[rejection.reason], { name: rejection.name });
}
