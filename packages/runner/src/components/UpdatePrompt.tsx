import { useRegisterSW } from 'virtual:pwa-register/react';
import styles from './UpdatePrompt.module.css';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className={styles.banner}>
      <span>A new version is available</span>
      <button className={styles.button} onClick={() => updateServiceWorker(true)}>
        Update
      </button>
    </div>
  );
}
