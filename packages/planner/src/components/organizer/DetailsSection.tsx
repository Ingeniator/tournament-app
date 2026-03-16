import { useTranslation } from '@padel/common';
import type { PlannerTournament } from '@padel/common';
import { CollapsibleSection } from './CollapsibleSection';
import styles from '../../screens/OrganizerScreen.module.css';

interface DetailsSectionProps {
  tournament: PlannerTournament;
  updateTournament: (updates: Record<string, unknown>) => Promise<void>;
}

export function DetailsSection({ tournament, updateTournament }: DetailsSectionProps) {
  const { t } = useTranslation();

  const hasDetails = !!(tournament.chatLink || tournament.description);

  const detailsParts: string[] = [];
  if (tournament.chatLink) detailsParts.push(t('organizer.groupChat'));
  if (tournament.description) {
    const desc = tournament.description.length > 30
      ? tournament.description.slice(0, 30) + '...'
      : tournament.description;
    detailsParts.push(desc);
  }
  const detailsSummary = detailsParts.join(' \u00b7 ');

  return (
    <CollapsibleSection
      title={t('organizer.details')}
      summary={detailsSummary}
      defaultOpen={!hasDetails}
    >
      <div className={styles.configGrid}>
        <label className={styles.configLabel}>{t('organizer.groupChat')}</label>
        <input
          className={styles.configInput}
          type="url"
          value={tournament.chatLink ?? ''}
          onChange={e => updateTournament({ chatLink: e.target.value || undefined })}
          placeholder={t('organizer.groupChatPlaceholder')}
        />

        <label className={styles.configLabel}>{t('organizer.description')}</label>
        <textarea
          className={styles.configTextarea}
          value={tournament.description ?? ''}
          onChange={e => updateTournament({ description: e.target.value || undefined })}
          placeholder={t('organizer.descriptionPlaceholder')}
          rows={3}
          maxLength={2000}
        />
      </div>
    </CollapsibleSection>
  );
}
