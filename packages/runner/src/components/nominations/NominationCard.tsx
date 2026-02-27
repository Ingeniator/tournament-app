import { useRef, type Ref } from 'react';
import type { Nomination, AwardTier } from '../../hooks/useNominations';
import styles from './NominationCard.module.css';

interface NominationCardProps {
  nomination: Nomination;
  cardRef?: Ref<HTMLDivElement>;
  minHeight?: number;
}

const TIER_LABELS: Record<AwardTier, string> = {
  common: '',
  rare: 'RARE',
  legendary: 'LEGENDARY',
};

const TIER_STYLES: Record<AwardTier, string | undefined> = {
  common: undefined,
  rare: styles.tierRare,
  legendary: styles.tierLegendary,
};

export function NominationCard({ nomination, cardRef, minHeight }: NominationCardProps) {
  const isMultiPlayer = nomination.playerNames.length > 2;
  const fallbackRef = useRef<HTMLDivElement>(null);
  const tier = nomination.tier;
  const tierClass = tier ? TIER_STYLES[tier] : undefined;
  const tierLabel = tier ? TIER_LABELS[tier] : '';

  return (
    <div
      className={`${styles.card}${tierClass ? ` ${tierClass}` : ''}`}
      ref={cardRef ?? fallbackRef}
      style={minHeight ? { minHeight } : undefined}
    >
      {tierLabel && <div className={styles.tierBadge}>{tierLabel}</div>}
      {nomination.modeTitle && <div className={styles.modeTitle}>{nomination.modeTitle}</div>}
      <div className={styles.emoji}>{nomination.emoji}</div>
      <div className={styles.title}>{nomination.title}</div>
      <div className={styles.players}>
        {isMultiPlayer ? (
          <>
            <span>{nomination.playerNames[0]} & {nomination.playerNames[1]}</span>
            <span className={styles.vs}>vs</span>
            <span>{nomination.playerNames[2]} & {nomination.playerNames[3]}</span>
          </>
        ) : (
          nomination.playerNames.join(' & ')
        )}
      </div>
      <div className={styles.stat}>{nomination.stat}</div>
      <div className={styles.description}>{nomination.description}</div>
    </div>
  );
}
