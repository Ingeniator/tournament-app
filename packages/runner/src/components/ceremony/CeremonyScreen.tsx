import { useState, useCallback } from 'react';
import type { Nomination, AwardTier } from '@padel/common';
import { useTranslation } from '@padel/common';
import styles from './CeremonyScreen.module.css';

interface CeremonyScreenProps {
  nominations: Nomination[];
  onComplete: (nominations: Nomination[]) => void;
}

/**
 * Full-screen awards ceremony with tap-to-reveal flow.
 *
 * Reveal order:
 *   1. Non-podium awards (shuffled pool)
 *   2. Lucky One
 *   3. Bronze → Silver → Champion (podium from bottom up)
 *
 * Each card has two taps:
 *   Tap 1 – show category (emoji + title + description)
 *   Tap 2 – reveal the winner (player name + stat)
 */
export function CeremonyScreen({ nominations, onComplete }: CeremonyScreenProps) {
  const { t } = useTranslation();

  // Build the ceremony order: non-podium → lucky → podium reversed (bronze, silver, gold)
  const ceremonyOrder = buildCeremonyOrder(nominations);

  const [currentIndex, setCurrentIndex] = useState(0);
  // false = showing category, true = showing winner
  const [revealed, setRevealed] = useState(false);

  const handleTap = useCallback(() => {
    if (!revealed) {
      // First tap: reveal the winner
      setRevealed(true);
    } else {
      // Second tap: advance to next card
      const nextIndex = currentIndex + 1;
      if (nextIndex >= ceremonyOrder.length) {
        // Ceremony complete
        onComplete(nominations);
      } else {
        setCurrentIndex(nextIndex);
        setRevealed(false);
      }
    }
  }, [revealed, currentIndex, ceremonyOrder.length, nominations, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete(nominations);
  }, [nominations, onComplete]);

  const current = ceremonyOrder[currentIndex];
  if (!current) return null;

  const isChampion = current.id === 'podium-1';
  const isPodium = current.id.startsWith('podium-');
  const isMultiPlayer = current.playerNames.length > 2;
  const tier = current.tier;

  return (
    <div className={styles.overlay} onClick={handleTap}>
      <button className={styles.skipButton} onClick={e => { e.stopPropagation(); handleSkip(); }}>
        {t('ceremony.skip')}
      </button>

      <div className={styles.content}>
        <div className={styles.progress}>
          {currentIndex + 1} / {ceremonyOrder.length}
        </div>

        <div
          className={`${styles.categoryReveal}${isChampion ? ` ${styles.championReveal}` : ''}`}
          key={`${current.id}-${revealed ? 'full' : 'cat'}`}
        >
          <div className={styles.categoryEmoji}>{current.emoji}</div>
          <div className={styles.categoryTitle}>{current.title}</div>

          {!revealed && (
            <>
              <div className={styles.categoryDescription}>{current.description}</div>
              {tier && tier !== 'common' && (
                <div className={`${styles.tierBadge} ${tier === 'legendary' ? styles.tierLegendary : styles.tierRare}`}>
                  {tier === 'legendary' ? 'LEGENDARY' : 'RARE'}
                </div>
              )}
            </>
          )}

          {revealed && (
            <div className={styles.cardReveal}>
              {isMultiPlayer ? (
                <div className={`${styles.playerName} ${styles.playerNameMulti}`}>
                  <span>{current.playerNames[0]} & {current.playerNames[1]}</span>
                  <div className={styles.vs}>vs</div>
                  <span>{current.playerNames[2]} & {current.playerNames[3]}</span>
                </div>
              ) : (
                <div className={`${styles.playerName}${isPodium ? '' : ` ${styles.playerNameMulti}`}`}>
                  {current.playerNames.join(' & ')}
                </div>
              )}
              <div className={styles.statLine}>{current.stat}</div>
              {tier && tier !== 'common' && (
                <div className={`${styles.tierBadge} ${tier === 'legendary' ? styles.tierLegendary : styles.tierRare}`}>
                  {tier === 'legendary' ? 'LEGENDARY' : 'RARE'}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.tapHint}>
          {!revealed ? t('ceremony.tapToReveal') : (
            currentIndex < ceremonyOrder.length - 1 ? t('ceremony.tapForNext') : t('ceremony.tapToFinish')
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Arranges nominations into ceremony reveal order:
 * non-podium awards → lucky → bronze → silver → champion
 */
function buildCeremonyOrder(nominations: Nomination[]): Nomination[] {
  const podium: Nomination[] = [];
  const lucky: Nomination[] = [];
  const awards: Nomination[] = [];

  for (const nom of nominations) {
    if (nom.id.startsWith('podium-')) {
      podium.push(nom);
    } else if (nom.id === 'lucky') {
      lucky.push(nom);
    } else {
      awards.push(nom);
    }
  }

  // Podium in reverse order: 3rd → 2nd → 1st
  const podiumReversed = [...podium].sort((a, b) => {
    const aNum = parseInt(a.id.split('-')[1]) || 0;
    const bNum = parseInt(b.id.split('-')[1]) || 0;
    return bNum - aNum;
  });

  return [...awards, ...lucky, ...podiumReversed];
}
