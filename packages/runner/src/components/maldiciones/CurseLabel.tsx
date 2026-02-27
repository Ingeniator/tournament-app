import type { MatchCurse } from '@padel/common';
import { useTranslation } from '@padel/common';
import { CURSE_CARDS } from '../../data/curseCards';
import styles from './CurseLabel.module.css';

interface CurseLabelProps {
  curse: MatchCurse;
  canShield: boolean;
  onShield: () => void;
  onVeto: () => void;
}

export function CurseLabel({ curse, canShield, onShield, onVeto }: CurseLabelProps) {
  const { t } = useTranslation();
  const card = CURSE_CARDS.find(c => c.id === curse.cardId);
  if (!card) return null;

  return (
    <div className={styles.container}>
      <span className={`${styles.cardName} ${curse.shielded ? styles.shielded : ''}`}>
        {card.emoji} {card.name}
      </span>
      <div className={styles.actions}>
        {!curse.shielded && canShield && (
          <button className={styles.shieldBtn} onClick={onShield} title={t('play.blocked')}>
            {'\uD83D\uDEE1\uFE0F'}
          </button>
        )}
        {curse.shielded && <span className={styles.shieldedIcon}>{'\uD83D\uDEE1\uFE0F'}</span>}
        {!curse.shielded && (
          <button className={styles.vetoBtn} onClick={onVeto} title="Veto">
            {'\uD83D\uDE45'}
          </button>
        )}
      </div>
    </div>
  );
}
