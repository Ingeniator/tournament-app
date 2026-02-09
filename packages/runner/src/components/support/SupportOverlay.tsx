import { useState } from 'react';
import { useSupporters, getSavedName } from '../../hooks/useSupporters';
import { Button } from '@padel/common';
import styles from './SupportOverlay.module.css';

const AMOUNTS = [
  { value: 0, label: '\u2764\uFE0F' },
  { value: 3, label: '3\u20AC' },
  { value: 5, label: '5\u20AC' },
  { value: 10, label: '10\u20AC' },
];

interface SupportOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SupportOverlay({ open, onClose }: SupportOverlayProps) {
  const { supporters, grouped, loading, sayThanks } = useSupporters();
  const [name, setName] = useState(() => getSavedName());
  const [amount, setAmount] = useState(0);
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  if (!open) return null;

  const totalAmount = grouped.reduce((sum, s) => sum + s.totalAmount, 0);
  const heartCount = supporters.filter(s => (s.amount ?? 0) === 0).length;

  const handleSupport = async () => {
    if (!name.trim()) return;
    await sayThanks(name.trim(), amount, message.trim() || undefined);
    setMessage('');
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 3000);
  };

  const handleClose = () => {
    setConfirmed(false);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Support Us</h3>
          <button className={styles.closeBtn} onClick={handleClose}>
            &#x2715;
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.hero}>
            <div className={styles.heroEmoji}>&#x2764;&#xFE0F;</div>
            <p className={styles.heroTitle}>Help keep it free</p>
            <p className={styles.heroSub}>
              Tournament Manager is free and open source. Your support helps us keep it that way.
            </p>
          </div>

          {confirmed ? (
            <div className={styles.confirmation}>
              <div className={styles.confirmEmoji}>&#x1F389;</div>
              <p className={styles.confirmTitle}>Thank you!</p>
              <p className={styles.confirmSub}>
                We're testing this support flow. Real payment options coming soon!
              </p>
            </div>
          ) : (
            <div className={styles.form}>
              <input
                className={styles.input}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
              />
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
                className={styles.input}
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, 50))}
                placeholder="Leave a message (optional)"
                maxLength={50}
              />
              <Button fullWidth onClick={handleSupport} disabled={!name.trim()}>
                Support
              </Button>
            </div>
          )}

          <div className={styles.wallHeader}>
            Supporters{grouped.length > 0 && (totalAmount > 0 || heartCount > 0) ? ` \u00B7 ${[totalAmount > 0 ? `${totalAmount}\u20AC` : '', heartCount > 0 ? `${heartCount} \u2764\uFE0F` : ''].filter(Boolean).join(' and ')} raised` : ''}
          </div>
          {loading || grouped.length === 0 ? (
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
        </div>
      </div>
    </div>
  );
}
