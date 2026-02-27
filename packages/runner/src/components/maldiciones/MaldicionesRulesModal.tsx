import type { MaldicionesHands, ChaosLevel, Team } from '@padel/common';
import { Modal, useTranslation } from '@padel/common';
import { getCardsForChaosLevel } from '../../data/curseCards';
import styles from './MaldicionesRulesModal.module.css';

interface MaldicionesRulesModalProps {
  open: boolean;
  chaosLevel: ChaosLevel;
  hands?: MaldicionesHands;
  teams?: Team[];
  nameOf: (id: string) => string;
  onClose: () => void;
}

export function MaldicionesRulesModal({ open, chaosLevel, hands, teams, nameOf, onClose }: MaldicionesRulesModalProps) {
  const { t } = useTranslation();
  const eligibleCards = getCardsForChaosLevel(chaosLevel);

  const teamName = (team: Team) =>
    team.name ?? `${nameOf(team.player1Id)} & ${nameOf(team.player2Id)}`;

  return (
    <Modal open={open} title={t('play.maldicionesInfo')} onClose={onClose}>
      <div className={styles.content}>
        <div className={styles.levelBadge} data-level={chaosLevel}>
          {chaosLevel === 'lite' ? t('config.chaosLite') :
           chaosLevel === 'medium' ? t('config.chaosMedium') :
           t('config.chaosHardcore')}
        </div>

        <div className={styles.rules}>
          <p>{t('play.maldicionesRule1')}</p>
          <p>{t('play.maldicionesRule2')}</p>
          <p>{t('play.maldicionesRule3')}</p>
        </div>

        {hands && teams && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>{t('play.teamHands')}</h4>
            {teams.map(team => {
              const hand = hands[team.id];
              if (!hand) return null;
              return (
                <div key={team.id} className={styles.teamHand}>
                  <span className={styles.teamName}>{teamName(team)}</span>
                  <span className={styles.handInfo}>
                    {hand.cardIds.length} {t('play.cardsLeft')}
                    {hand.hasShield && ' \u00b7 \uD83D\uDEE1\uFE0F'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('play.cardCatalog')}</h4>
          {['green' as const, 'yellow' as const, 'red' as const].map(tier => {
            const tierCards = eligibleCards.filter(c => c.tier === tier);
            if (tierCards.length === 0) return null;
            return (
              <div key={tier} className={styles.tierGroup}>
                <div className={`${styles.tierLabel} ${styles[tier]}`}>
                  {tier === 'green' ? '\uD83D\uDFE2' : tier === 'yellow' ? '\uD83D\uDFE1' : '\uD83D\uDD34'}{' '}
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </div>
                {tierCards.map(card => (
                  <div key={card.id} className={styles.catalogCard}>
                    <span className={styles.catalogEmoji}>{card.emoji}</span>
                    <div className={styles.catalogInfo}>
                      <span className={styles.catalogName}>{card.name}</span>
                      <span className={styles.catalogDesc}>{t(card.details)}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
