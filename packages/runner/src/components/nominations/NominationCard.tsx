import type { Nomination } from '../../hooks/useNominations';
import styles from './NominationCard.module.css';

interface NominationCardProps {
  nomination: Nomination;
}

export function NominationCard({ nomination }: NominationCardProps) {
  const isMultiPlayer = nomination.playerNames.length > 2;

  return (
    <div className={styles.card}>
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
