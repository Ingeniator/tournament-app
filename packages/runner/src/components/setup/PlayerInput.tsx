import { useState, type FormEvent } from 'react';
import { Button } from '@padel/common';
import styles from './PlayerInput.module.css';

interface PlayerInputProps {
  onAdd: (name: string) => void;
}

export function PlayerInput({ onAdd }: PlayerInputProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName('');
  };

  return (
    <form className={styles.wrapper} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        type="text"
        placeholder="Player name"
        value={name}
        onChange={e => setName(e.target.value)}
        autoComplete="off"
      />
      <Button type="submit" disabled={!name.trim()}>
        Add
      </Button>
    </form>
  );
}
