import { useState, useEffect } from 'react';
import { ref, push, set } from 'firebase/database';
import { ErrorBoundary, I18nProvider, AppFooter, FeedbackModal, useTranslation } from '@padel/common';
import { translations } from './i18n';
import { db } from './firebase';
import styles from './App.module.css';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        initDataUnsafe?: {
          user?: {
            first_name: string;
            last_name?: string;
          };
        };
      };
    };
  }
}

function LandingContent() {
  const { t } = useTranslation();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [telegramName, setTelegramName] = useState<string | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    tg.ready();

    const user = tg.initDataUnsafe?.user;
    if (user) {
      setTelegramName(user.first_name + (user.last_name ? ' ' + user.last_name : ''));
    }

    // Forward hash fragment to card links
    const hash = window.location.hash;
    if (hash) {
      const links = document.querySelectorAll<HTMLAnchorElement>('a[data-card]');
      links.forEach(link => {
        link.href = link.getAttribute('href') + hash;
      });
    }
  }, []);

  const handleFeedback = async (message: string) => {
    if (!db) return;
    const feedbackRef = push(ref(db, 'feedback'));
    await set(feedbackRef, { message, source: 'landing', createdAt: Date.now() });
  };

  return (
    <main className={styles.container}>
      <div className={styles.logo}>
        <svg viewBox="0 0 100 100" width="48" height="48" aria-hidden="true">
          <defs>
            <radialGradient id="ball" cx="40%" cy="38%" r="50%">
              <stop offset="0%" stopColor="#d4e142"/>
              <stop offset="100%" stopColor="#b8c230"/>
            </radialGradient>
            <clipPath id="bc"><circle cx="50" cy="50" r="24"/></clipPath>
          </defs>
          <circle cx="50" cy="50" r="24" fill="url(#ball)"/>
          <g clipPath="url(#bc)">
            <path d="M38 23 C26 38, 26 62, 38 77" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M62 23 C74 38, 74 62, 62 77" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round"/>
          </g>
        </svg>
      </div>
      <h1 className={styles.title}>{t('landing.title')}</h1>
      {telegramName && (
        <p className={styles.greeting}>Hello, {telegramName}!</p>
      )}
      <p className={styles.subtitle}>{t('landing.subtitle')}</p>

      <div className={styles.cards}>
        <a className={styles.card} href="/plan" data-card>
          <div className={styles.cardTitle}>
            {t('landing.planner')} <span className={styles.arrow}>&rarr;</span>
          </div>
          <div className={styles.cardDesc}>{t('landing.plannerDesc')}</div>
        </a>
        <a className={styles.card} href="/play" data-card>
          <div className={styles.cardTitle}>
            {t('landing.runner')} <span className={styles.arrow}>&rarr;</span>
          </div>
          <div className={styles.cardDesc}>{t('landing.runnerDesc')}</div>
        </a>
      </div>

      <AppFooter
        onFeedbackClick={() => setFeedbackOpen(true)}
      />

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={handleFeedback}
      />
    </main>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <I18nProvider translations={translations}>
        <LandingContent />
      </I18nProvider>
    </ErrorBoundary>
  );
}
