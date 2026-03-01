import { useState } from 'react';
import { Button, Card, useTranslation } from '@padel/common';
import { useEvent } from '../hooks/useLeague';
import styles from './LeagueFormScreen.module.css';

interface EventFormScreenProps {
  uid: string | null;
  onBack: () => void;
  onCreated: (eventId: string) => void;
}

export function EventFormScreen({ uid, onBack, onCreated }: EventFormScreenProps) {
  const { createEvent } = useEvent(null);
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!uid || !name.trim() || !date) return;
    setCreating(true);
    setError(null);
    try {
      const id = await createEvent(name.trim(), date, uid);
      onCreated(id);
    } catch {
      setError(t('event.createFailed'));
      setCreating(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label={t('event.back')}>&larr;</button>
        <h1 className={styles.title}>{t('event.createTitle')}</h1>
      </header>
      <main>
        <Card>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="event-name">{t('event.name')}</label>
            <input
              id="event-name"
              className={styles.input}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('event.namePlaceholder')}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="event-date">{t('event.date')}</label>
            <input
              id="event-date"
              className={styles.input}
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {error && (
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>{error}</div>
          )}

          <Button
            fullWidth
            onClick={handleCreate}
            disabled={creating || !name.trim() || !date || !uid}
          >
            {creating ? t('event.creating') : t('event.create')}
          </Button>
        </Card>
      </main>
    </div>
  );
}
