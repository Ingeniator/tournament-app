import { useState } from 'react';
import { useTranslation } from '@padel/common';
import { isIOSInstallDismissed, dismissIOSInstall } from '../state/persistence';
import styles from './IOSInstallBanner.module.css';

function shouldShow(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // Must be iOS (iPhone or iPad)
  if (!/(iPhone|iPad)/.test(ua)) return false;
  // Exclude Chrome/Firefox/other browsers on iOS (they can't add to home screen)
  if (/CriOS|FxiOS/.test(ua)) return false;
  // Not already running as standalone PWA
  if ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone) return false;
  // Not dismissed recently
  if (isIOSInstallDismissed()) return false;
  return true;
}

const ShareIcon = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12M12 3l4 4M12 3 8 7" />
    <path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
  </svg>
);

export function IOSInstallBanner() {
  const [visible, setVisible] = useState(shouldShow);
  const { t } = useTranslation();

  if (!visible) return null;

  const handleDismiss = () => {
    dismissIOSInstall();
    setVisible(false);
  };

  return (
    <div className={styles.banner} role="banner">
      <ShareIcon />
      <span className={styles.text}>{t('ios.installHint')}</span>
      <button className={styles.close} onClick={handleDismiss} aria-label="Close">
        &times;
      </button>
    </div>
  );
}
