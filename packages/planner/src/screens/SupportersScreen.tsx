import { useState } from 'react';
import { Button, Card } from '@padel/common';
import { usePlanner } from '../state/plannerContext';
import { useSupporters } from '../hooks/useSupporters';
import styles from './SupportersScreen.module.css';

const AMOUNTS = [
  { value: 0, label: '\u2764\uFE0F' },
  { value: 3, label: '3\u20AC' },
  { value: 5, label: '5\u20AC' },
  { value: 10, label: '10\u20AC' },
];

export function SupportersScreen() {
  const { setScreen, userName } = usePlanner();
  const { supporters, grouped, loading, sayThanks } = useSupporters();
  const [amount, setAmount] = useState(0);
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSupport = async () => {
    if (!userName) return;
    setSending(true);
    await sayThanks(userName, amount, message.trim() || undefined);
    setSending(false);
    setMessage('');
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 3000);
  };

  const totalAmount = grouped.reduce((sum, s) => sum + s.totalAmount, 0);
  const heartCount = supporters.filter(s => (s.amount ?? 0) === 0).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => setScreen('home')}>&larr;</button>
        <h1 className={styles.title}>Support Us</h1>
      </div>

      <div className={styles.hero}>
        <div className={styles.heroEmoji}>&#x2764;&#xFE0F;</div>
        <h2 className={styles.heroTitle}>Help keep it free</h2>
        <p className={styles.heroSub}>
          Tournament Manager is free and open source. Your support helps us keep it that way.
        </p>
      </div>

      {confirmed ? (
        <div className={styles.confirmation}>
          <div className={styles.confirmEmoji}>&#x1F389;</div>
          <p className={styles.confirmTitle}>Thank you, {userName}!</p>
          <p className={styles.confirmSub}>
            We're testing this support flow. Real payment options coming soon!
          </p>
        </div>
      ) : (
        <div className={styles.supportForm}>
          <div className={styles.amounts}>
            {AMOUNTS.map(a => (
              <button
                key={a.value}
                className={`${styles.amountBtn} ${amount === a.value ? styles.amountSelected : ''}`}
                onClick={() => setAmount(a.value)}
              >
                {a.label}
              </button>
            ))}
          </div>
          <input
            className={styles.messageInput}
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value.slice(0, 50))}
            placeholder="Leave a message (optional)"
            maxLength={50}
          />
          <Button fullWidth onClick={handleSupport} disabled={!userName || sending}>
            {sending ? 'Sending...' : 'Support'}
          </Button>
        </div>
      )}

      <Card>
        <h3 className={styles.wallTitle}>
          Supporters{grouped.length > 0 && (totalAmount > 0 || heartCount > 0) ? ` \u00B7 ${[totalAmount > 0 ? `${totalAmount}\u20AC` : '', heartCount > 0 ? `${heartCount} \u2764\uFE0F` : ''].filter(Boolean).join(' and ')} raised` : ''}
        </h3>
        {loading ? (
          <p className={styles.empty}>Loading...</p>
        ) : grouped.length === 0 ? (
          <p className={styles.empty}>Be the first!</p>
        ) : (
          <div className={styles.supporterList}>
            {grouped.map(s => (
              <div key={s.name} className={styles.supporterItem}>
                <span className={styles.supporterName}>{s.name}</span>
                {s.message && <span className={styles.supporterMessage}>{s.message}</span>}
                <span className={styles.supporterAmount}>
                  {s.totalAmount > 0 ? `${s.totalAmount}\u20AC` : '\u2764\uFE0F'}
                  {s.count > 1 ? ` \u00D7${s.count}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
