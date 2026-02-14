import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import styles from './FeedbackModal.module.css';

const MAX_LENGTH = 500;

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (message: string) => Promise<void>;
}

export function FeedbackModal({ open, onClose, onSubmit }: FeedbackModalProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const trimmed = message.trim();
  const overLimit = message.length > MAX_LENGTH;

  const handleSubmit = async () => {
    if (!trimmed || overLimit || sending) return;
    setSending(true);
    try {
      await onSubmit(trimmed);
      setMessage('');
      onClose();
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setMessage('');
      onClose();
    }
  };

  return (
    <Modal open={open} title="Send Feedback" onClose={handleClose}>
      <div className={styles.form}>
        <textarea
          className={styles.textarea}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Bug report, feature request, or just say thanks..."
          rows={5}
          autoFocus
        />
        <div className={`${styles.counter} ${message.length > MAX_LENGTH * 0.9 ? styles.counterWarn : ''}`}>
          {message.length} / {MAX_LENGTH}
        </div>
        <Button
          fullWidth
          onClick={handleSubmit}
          disabled={!trimmed || overLimit || sending}
        >
          {sending ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </Modal>
  );
}
