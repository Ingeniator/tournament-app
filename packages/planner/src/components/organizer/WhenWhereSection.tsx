import { useTranslation } from '@padel/common';
import type { PlannerTournament } from '@padel/common';
import { CollapsibleSection } from './CollapsibleSection';
import styles from '../../screens/OrganizerScreen.module.css';

interface WhenWhereSectionProps {
  tournament: PlannerTournament;
  updateTournament: (updates: Record<string, unknown>) => Promise<void>;
}

export function WhenWhereSection({ tournament, updateTournament }: WhenWhereSectionProps) {
  const { t } = useTranslation();

  const hasWhenWhere = !!(tournament.date || tournament.place);

  const whenWhereParts: string[] = [];
  if (tournament.date) {
    const datePart = tournament.date.split('T')[0];
    const timePart = tournament.date.split('T')[1];
    if (datePart) whenWhereParts.push(datePart);
    if (timePart) whenWhereParts.push(timePart);
  }
  if (tournament.duration) whenWhereParts.push(`${tournament.duration} min`);
  if (tournament.place) whenWhereParts.push(tournament.place);
  const whenWhereSummary = whenWhereParts.join(' \u00b7 ');

  return (
    <CollapsibleSection
      title={t('organizer.whenWhere')}
      summary={whenWhereSummary}
      defaultOpen={!hasWhenWhere}
    >
      <div className={styles.configGrid}>
        <label className={styles.configLabel}>{t('organizer.date')}</label>
        <input
          className={styles.configInput}
          type="date"
          value={tournament.date?.split('T')[0] ?? ''}
          onChange={e => {
            const date = e.target.value;
            if (!date) { updateTournament({ date: undefined }); return; }
            const time = tournament.date?.split('T')[1] ?? '12:00';
            updateTournament({ date: `${date}T${time}` });
          }}
        />

        <label className={styles.configLabel}>{t('organizer.time')}</label>
        <input
          className={styles.configInput}
          type="time"
          lang="en-GB"
          value={tournament.date?.split('T')[1] ?? ''}
          onChange={e => {
            const time = e.target.value;
            const date = tournament.date?.split('T')[0] ?? '';
            if (!date) return;
            updateTournament({ date: time ? `${date}T${time}` : `${date}T12:00` });
          }}
        />

        <label className={styles.configLabel}>{t('organizer.durationMin')}</label>
        <input
          className={styles.configInput}
          type="number"
          value={tournament.duration ?? ''}
          onChange={e => {
            const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
            updateTournament({ duration: v && v > 0 ? v : undefined });
          }}
          min={1}
          placeholder={t('organizer.durationPlaceholder')}
        />

        <label className={styles.configLabel}>{t('organizer.place')}</label>
        <input
          className={styles.configInput}
          type="text"
          value={tournament.place ?? ''}
          onChange={e => updateTournament({ place: e.target.value || undefined })}
          placeholder={t('organizer.placePlaceholder')}
        />
      </div>
    </CollapsibleSection>
  );
}
