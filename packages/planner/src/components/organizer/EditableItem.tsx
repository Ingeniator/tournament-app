import type { ReactNode } from 'react';
import styles from '../../screens/OrganizerScreen.module.css';

interface EditableItemProps {
  name: string;
  onChange: (name: string) => void;
  onRemove?: () => void;
  icon?: ReactNode;
  subtitle?: ReactNode;
}

export function EditableItem({ name, onChange, onRemove, icon, subtitle }: EditableItemProps) {
  return (
    <div className={subtitle ? styles.courtItemKotc : styles.courtItem}>
      <div className={styles.courtMainRow}>
        {icon}
        <input
          className={styles.courtNameInput}
          value={name}
          onChange={e => onChange(e.target.value)}
        />
        {onRemove && (
          <button className={styles.removeBtn} onClick={onRemove}>
            &times;
          </button>
        )}
      </div>
      {subtitle && <div className={styles.courtKotcFields}>{subtitle}</div>}
    </div>
  );
}
