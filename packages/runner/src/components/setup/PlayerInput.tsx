import { useState, type FormEvent, type ClipboardEvent } from 'react';
import { Button, useTranslation } from '@padel/common';
import { parsePlayerList } from '@padel/common';
import styles from './PlayerInput.module.css';

interface PlayerInputProps {
  onAdd: (name: string) => void;
  onBulkAdd?: (names: string[]) => void;
}

export function PlayerInput({ onAdd, onBulkAdd }: PlayerInputProps) {
  const [name, setName] = useState('');
  const { t } = useTranslation();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName('');
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\n') || !onBulkAdd) return;

    e.preventDefault();
    const names = parsePlayerList(text);
    if (names.length > 0) {
      onBulkAdd(names);
    }
  };

  return (
    <form className={styles.wrapper} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        type="text"
        placeholder={t('playerInput.placeholder')}
        value={name}
        onChange={e => setName(e.target.value)}
        onPaste={handlePaste}
        autoComplete="off"
        aria-label={t('playerInput.placeholder')}
      />
      <Button type="submit" disabled={!name.trim()}>
        {t('playerInput.add')}
      </Button>
    </form>
  );
}
