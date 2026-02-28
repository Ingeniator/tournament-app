import type { FormatPreset } from './formatPresets';
import { getPresetsByCategory } from './formatPresets';
import styles from './FormatPicker.module.css';

interface FormatListProps {
  value: string;
  onChange: (preset: FormatPreset) => void;
  t: (key: string) => string;
}

const CATEGORIES = [
  { id: 'social' as const, labelKey: 'format.categorySocial' },
  { id: 'competitive' as const, labelKey: 'format.categoryCompetitive' },
  { id: 'team' as const, labelKey: 'format.categoryTeam' },
  { id: 'club' as const, labelKey: 'format.categoryClub' },
];

export function FormatList({ value, onChange, t }: FormatListProps) {
  return (
    <div className={styles.list}>
      {CATEGORIES.map(cat => {
        const presets = getPresetsByCategory(cat.id);
        if (presets.length === 0) return null;
        return (
          <div key={cat.id} className={styles.category}>
            <div className={styles.categoryLabel}>{t(cat.labelKey)}</div>
            {presets.map(preset => (
              <label
                key={preset.id}
                className={`${styles.presetRow} ${value === preset.id ? styles.presetRowSelected : ''}`}
              >
                <input
                  type="radio"
                  name="format-preset"
                  className={styles.radio}
                  checked={value === preset.id}
                  onChange={() => onChange(preset)}
                />
                <div className={styles.presetInfo}>
                  <span className={styles.presetName}>{t(preset.nameKey)}</span>
                  <span className={styles.presetDesc}>{t(preset.descKey)}</span>
                </div>
              </label>
            ))}
          </div>
        );
      })}
    </div>
  );
}
