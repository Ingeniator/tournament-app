import { useState } from 'react';
import styles from './EditableField.module.css';

interface EditableFieldProps {
  label: string;
  value: string;
  onSave: (value: string) => void;
  type?: 'text' | 'number';
  min?: number;
  hint?: string;
}

export function EditableField({ label, value, onSave, type = 'text', min, hint }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className={styles.inlineEdit}>
        <input
          className={styles.editInput}
          type={type}
          inputMode={type === 'number' ? 'numeric' : undefined}
          min={min}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setEditing(false);
          }}
          onBlur={handleSave}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div
      className={styles.tappableField}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
    >
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>
        {value}
        {hint && (
          <>
            {' '}
            <span className={styles.fieldHint}>{hint}</span>
          </>
        )}
      </span>
    </div>
  );
}
