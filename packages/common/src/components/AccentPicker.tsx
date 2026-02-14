import { ACCENT_COLORS, type AccentColor } from '../hooks/useTheme';
import styles from './AccentPicker.module.css';

interface AccentPickerProps {
  accent: AccentColor;
  onSelect: (accent: AccentColor) => void;
}

const ACCENT_META: Record<AccentColor, { label: string }> = {
  crimson: { label: 'Crimson' },
  indigo: { label: 'Indigo' },
  teal: { label: 'Teal' },
  orange: { label: 'Orange' },
  violet: { label: 'Violet' },
};

export function AccentPicker({ accent, onSelect }: AccentPickerProps) {
  return (
    <div className={styles.picker}>
      {ACCENT_COLORS.map(color => (
        <button
          key={color}
          className={`${styles.swatch} ${styles[color]} ${accent === color ? styles.active : ''}`}
          onClick={() => onSelect(color)}
          aria-label={ACCENT_META[color].label}
          title={ACCENT_META[color].label}
        />
      ))}
    </div>
  );
}
