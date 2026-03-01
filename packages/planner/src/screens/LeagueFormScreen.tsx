import { useState } from 'react';
import { Button, Card, useTranslation } from '@padel/common';
import { useLeague } from '../hooks/useLeague';
import styles from './LeagueFormScreen.module.css';

interface LeagueFormScreenProps {
  uid: string | null;
  onBack: () => void;
  onCreated: (leagueId: string) => void;
}

export function LeagueFormScreen({ uid, onBack, onCreated }: LeagueFormScreenProps) {
  const { createLeague } = useLeague(null);
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
      const id = await createLeague(name.trim(), date, uid);
      onCreated(id);
    } catch {
      setError(t('league.createFailed'));
      setCreating(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label={t('league.back')}>&larr;</button>
        <h1 className={styles.title}>{t('league.createTitle')}</h1>
      </header>
      <main>
        <Card>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="league-name">{t('league.name')}</label>
            <input
              id="league-name"
              className={styles.input}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('league.namePlaceholder')}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="league-date">{t('league.date')}</label>
            <input
              id="league-date"
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
            {creating ? t('league.creating') : t('league.create')}
          </Button>
        </Card>
      </main>
    </div>
  );
}
