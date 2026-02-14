import { Modal } from './Modal';
import { LanguageSelector } from './LanguageSelector';
import { useTranslation } from '../i18n/context';
import styles from './OptionsModal.module.css';

interface OptionsModalProps {
  open: boolean;
  onClose: () => void;
}

export function OptionsModal({ open, onClose }: OptionsModalProps) {
  const { t } = useTranslation();
  return (
    <Modal open={open} title={t('options.title')} onClose={onClose}>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>{t('options.language')}</div>
        <LanguageSelector />
      </div>
    </Modal>
  );
}
