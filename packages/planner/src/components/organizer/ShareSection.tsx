import { useState, useEffect, useRef } from 'react';
import { Button, Card, useTranslation } from '@padel/common';
import type { PlannerTournament, PlannerRegistration } from '@padel/common';
import styles from '../../screens/OrganizerScreen.module.css';

interface ShareSectionProps {
  tournament: PlannerTournament;
  players: PlannerRegistration[];
  uid: string | null;
  updateTournament: (updates: Record<string, unknown>) => Promise<void>;
  showToast: (msg: string) => void;
}

function deriveDelegateMode(tournament: PlannerTournament): string {
  if (tournament.startDelegateId) return `player:${tournament.startDelegateId}`;
  if (tournament.startDelegateTelegram) return 'telegram';
  return 'me';
}

export function ShareSection({ tournament, players, uid, updateTournament, showToast }: ShareSectionProps) {
  const { t, locale } = useTranslation();
  const [delegateMode, setDelegateMode] = useState<string>(() => deriveDelegateMode(tournament));
  const [tgDelegateInput, setTgDelegateInput] = useState(() => tournament.startDelegateTelegram ?? '');
  const userEditedRef = useRef(false);

  // Re-sync from Firebase when tournament data changes, unless user has edited locally
  useEffect(() => {
    if (userEditedRef.current) return;
    setDelegateMode(deriveDelegateMode(tournament));
    setTgDelegateInput(tournament.startDelegateTelegram ?? '');
  }, [tournament.startDelegateId, tournament.startDelegateTelegram]);

  const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME as string | undefined;
  const isTelegram = !!window.Telegram?.WebApp?.initData;
  const shareUrl = isTelegram && botName
    ? `https://t.me/${botName}?startapp=${tournament.code}`
    : `${window.location.origin}/plan?code=${tournament.code}&lang=${locale}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast(t('organizer.linkCopied'));
    } catch {
      showToast(t('organizer.failedCopy'));
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(tournament.code);
      showToast(t('organizer.codeCopied'));
    } catch {
      showToast(t('organizer.failedCopy'));
    }
  };

  return (
    <Card>
      <h2 className={styles.sectionTitle}>{t('organizer.shareWithPlayers')}</h2>
      <div className={styles.codeDisplay}>
        <span className={styles.code} onClick={handleCopyCode}>{tournament.code}</span>
      </div>
      <p className={styles.hint}>{t('organizer.playersEnterCode')}</p>
      <Button variant="secondary" fullWidth onClick={handleCopyLink}>
        {t('organizer.copyLink')}
      </Button>

      <h3 className={styles.subsectionTitle}>{t('organizer.startDelegate')}</h3>
      <select
        className={styles.select}
        value={delegateMode}
        onChange={e => {
          const val = e.target.value;
          userEditedRef.current = true;
          setDelegateMode(val);
          if (val === 'me') {
            updateTournament({ startDelegateId: undefined, startDelegateTelegram: undefined });
            setTgDelegateInput('');
          } else if (val === 'telegram') {
            updateTournament({ startDelegateId: undefined, startDelegateTelegram: tgDelegateInput || undefined });
          } else if (val.startsWith('player:')) {
            const playerId = val.slice('player:'.length);
            updateTournament({ startDelegateId: playerId, startDelegateTelegram: undefined });
            setTgDelegateInput('');
          }
        }}
      >
        <option value="me">{t('organizer.startDelegateOnlyMe')}</option>
        {players.filter(p => p.id !== uid).map(p => (
          <option key={p.id} value={`player:${p.id}`}>{p.name}</option>
        ))}
        <option value="telegram">{t('organizer.startDelegateTelegram')}</option>
      </select>
      {delegateMode === 'telegram' && (
        <input
          className={styles.configInput}
          type="text"
          value={tgDelegateInput}
          onChange={e => {
            const raw = e.target.value.replace(/^@/, '');
            setTgDelegateInput(raw);
          }}
          onBlur={() => {
            updateTournament({ startDelegateTelegram: tgDelegateInput || undefined });
          }}
          placeholder={t('organizer.startDelegateTelegramPlaceholder')}
          style={{ marginTop: 'var(--space-sm)' }}
        />
      )}
    </Card>
  );
}
