import { Button, useTranslation, generateId } from '@padel/common';
import type { PlannerTournament, Court } from '@padel/common';
import { CollapsibleSection } from './CollapsibleSection';
import { EditableItem } from './EditableItem';
import styles from '../../screens/OrganizerScreen.module.css';

interface CourtsSectionProps {
  tournament: PlannerTournament;
  updateTournament: (updates: Record<string, unknown>) => Promise<void>;
}

export function CourtsSection({ tournament, updateTournament }: CourtsSectionProps) {
  const { t } = useTranslation();

  const isKOTC = tournament.format === 'king-of-the-court';
  const hasCourtsConfig = tournament.courts.length > 1 || (tournament.extraSpots ?? 0) > 0;
  const courtsSummary = `${t('organizer.courts', { count: tournament.courts.length })} \u00b7 ${tournament.courts.length * 4 + (tournament.extraSpots ?? 0)} spots`;

  const handleAddCourt = async () => {
    const newIndex = tournament.courts.length;
    const courts: Court[] = [...tournament.courts, { id: generateId(), name: `Court ${newIndex + 1}` }];
    await updateTournament({ courts });
  };

  const handleRemoveCourt = async (courtId: string) => {
    if (tournament.courts.length <= 1) return;
    if (isKOTC && tournament.courts.length <= 2) return;
    const courts = tournament.courts.filter(c => c.id !== courtId);
    await updateTournament({ courts });
  };

  return (
    <CollapsibleSection
      title={t('organizer.courts_section')}
      summary={courtsSummary}
      defaultOpen={!hasCourtsConfig}
    >
      <div className={styles.courtsSection}>
        <div className={styles.courtsHeader}>
          <span>{t('organizer.courts', { count: tournament.courts.length })}</span>
          <Button variant="ghost" size="small" onClick={handleAddCourt}>{t('organizer.addCourt')}</Button>
        </div>
        {tournament.courts.map((court, courtIdx) => (
          <EditableItem
            key={court.id}
            name={court.name}
            onChange={name => {
              const courts = tournament.courts.map(c =>
                c.id === court.id ? { ...c, name } : c
              );
              updateTournament({ courts });
            }}
            onRemove={
              tournament.courts.length > 1 && !(isKOTC && tournament.courts.length <= 2)
                ? () => handleRemoveCourt(court.id)
                : undefined
            }
            subtitle={isKOTC ? (
              <span className={styles.courtBonusLabel}>
                +{tournament.courts.length - 1 - courtIdx} {t('organizer.courtBonusAuto')}
              </span>
            ) : undefined}
          />
        ))}
      </div>

      <div className={styles.capacitySection}>
        <label className={styles.configLabel}>{t('organizer.extraSpots')}</label>
        <input
          className={styles.configInput}
          type="number"
          value={tournament.extraSpots || ''}
          onChange={e => {
            const v = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
            updateTournament({ extraSpots: isNaN(v) ? 0 : Math.max(0, v) });
          }}
          min={0}
          placeholder="0"
        />
        <span className={styles.capacityTotal}>
          {t('organizer.totalSpots', {
            total: tournament.courts.length * 4 + (tournament.extraSpots ?? 0),
            courts: tournament.courts.length,
            extra: (tournament.extraSpots ?? 0) > 0 ? t('organizer.extraSuffix', { count: tournament.extraSpots ?? 0 }) : '',
          })}
        </span>
      </div>
    </CollapsibleSection>
  );
}
