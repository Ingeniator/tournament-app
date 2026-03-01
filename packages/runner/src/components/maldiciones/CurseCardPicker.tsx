import { useState } from 'react';
import type { Player } from '@padel/common';
import { Modal, useTranslation } from '@padel/common';
import { CURSE_CARDS } from '../../data/curseCards';
import styles from './CurseCardPicker.module.css';

interface CurseCardPickerProps {
  open: boolean;
  cardIds: string[];
  opponents: Player[];
  onCast: (cardId: string, targetPlayerId: string) => void;
  onClose: () => void;
}

export function CurseCardPicker({ open, cardIds, opponents, onCast, onClose }: CurseCardPickerProps) {
  const { t } = useTranslation();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const cards = cardIds
    .map(id => CURSE_CARDS.find(c => c.id === id))
    .filter((c): c is NonNullable<typeof c> => c != null);

  const handleClose = () => {
    setSelectedCardId(null);
    onClose();
  };

  const handlePickTarget = (playerId: string) => {
    if (!selectedCardId) return;
    onCast(selectedCardId, playerId);
    setSelectedCardId(null);
  };

  if (!open) return null;

  return (
    <Modal open={open} title={selectedCardId ? t('play.pickTarget') : t('play.castCurse')} onClose={handleClose}>
      {!selectedCardId ? (
        <div className={styles.cardGrid}>
          {cards.map(card => (
            <button
              key={card.id}
              className={`${styles.card} ${styles[card.tier]}`}
              onClick={() => setSelectedCardId(card.id)}
            >
              <span className={styles.cardEmoji}>{card.emoji}</span>
              <span className={styles.cardNameText}>{card.name}</span>
              <span className={styles.cardDesc}>{t(card.description)}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.targetList}>
          <p className={styles.targetHint}>
            {CURSE_CARDS.find(c => c.id === selectedCardId)?.emoji}{' '}
            {CURSE_CARDS.find(c => c.id === selectedCardId)?.name}
          </p>
          {opponents.map(p => (
            <button key={p.id} className={styles.targetBtn} onClick={() => handlePickTarget(p.id)}>
              {'\u2620\uFE0F'} {p.name}
            </button>
          ))}
          <button className={styles.backBtn} onClick={() => setSelectedCardId(null)}>
            {'\u2190'} {t('play.back')}
          </button>
        </div>
      )}
    </Modal>
  );
}
