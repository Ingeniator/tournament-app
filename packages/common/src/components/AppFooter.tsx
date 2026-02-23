import { useState } from 'react';
import { useTranslation } from '../i18n/context';
import { OptionsModal } from './OptionsModal';
import { SupportOverlay } from './SupportOverlay';
import styles from './AppFooter.module.css';

interface AppFooterProps {
  onFeedbackClick: () => void;
  auth?: { currentUser: { getIdToken: (forceRefresh?: boolean) => Promise<string> } | null } | null;
}

export function AppFooter({ onFeedbackClick, auth }: AppFooterProps) {
  const { t } = useTranslation();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <>
      <footer className={styles.footer}>
        <div>{t('footer.freeOpenSource')} {'\u00b7'} {t('footer.madeWithCare')}</div>
        <div>
          <button className={styles.footerLink} onClick={() => setSupportOpen(true)}>
            {t('footer.supportUs')}
          </button>
          {' \u00b7 '}
          <button className={styles.footerLink} onClick={onFeedbackClick}>
            {t('footer.sendFeedback')}
          </button>
          {' \u00b7 '}
          <button className={styles.footerLink} onClick={() => setOptionsOpen(true)}>
            {t('footer.options')}
          </button>
        </div>
        <div className={styles.version}>v.{__COMMIT_HASH__}</div>
      </footer>
      <OptionsModal open={optionsOpen} onClose={() => setOptionsOpen(false)} />
      <SupportOverlay open={supportOpen} onClose={() => setSupportOpen(false)} auth={auth} />
    </>
  );
}
