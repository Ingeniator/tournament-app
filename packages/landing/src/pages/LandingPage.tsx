import { useState } from 'react';
import { useTranslation } from '@padel/common';
import type { SkinId } from '@padel/common';
import { SkinPicker, AppFooter, FeedbackModal } from '@padel/common';
import styles from './LandingPage.module.css';

interface Props {
  skin: SkinId;
  setSkin: (s: SkinId) => void;
  telegramName: string | null;
  onFeedback: (message: string) => Promise<void>;
}

const Logo = () => (
  <svg viewBox="0 0 100 100" width="56" height="56" aria-hidden="true">
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
);

export function LandingPage({ skin, setSkin, telegramName, onFeedback }: Props) {
  const { t } = useTranslation();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      {/* Skin Picker */}
      <div style={{ position: 'absolute', top: 'var(--space-md)', right: 'var(--space-md)', zIndex: 10 }}>
        <SkinPicker skin={skin} onSelect={setSkin} />
      </div>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.logo}><Logo /></div>
        <h1 className={styles.title}>{t('landing.title')}</h1>
        {telegramName && <p className={styles.greeting}>Hello, {telegramName}!</p>}
        <p className={styles.tagline}>{t('landing.tagline')}</p>
        <p className={styles.subtitle}>{t('landing.subtitle')}</p>
        <div className={styles.ctas}>
          <a className={styles.ctaPrimary} href="/plan">{t('landing.ctaStart')} →</a>
          <a className={styles.ctaSecondary} href="/plan">{t('landing.ctaJoin')} →</a>
        </div>
        <div className={styles.phones}>
          <div className={styles.phone}>
            <img src="/play/screenshots/mobile-scoring.png" alt="Live scoring" loading="lazy" width="390" height="844" />
          </div>
          <div className={styles.phone}>
            <img src="/play/screenshots/mobile-standings.png" alt="Standings" loading="lazy" width="390" height="844" />
          </div>
          <div className={styles.phone}>
            <img src="/play/screenshots/mobile-ceremony-champion.png" alt="Awards ceremony" loading="lazy" width="390" height="844" />
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('landing.diffTitle')}</h2>
        <div className={styles.diffCards}>
          <div className={styles.diffCard}>
            <img className={styles.diffImage} src="/play/screenshots/mobile-ceremony-award.png" alt="Awards ceremony" loading="lazy" width="390" height="844" />
            <div className={styles.diffTitle}>{t('landing.diffAwardsTitle')}</div>
            <div className={styles.diffDesc}>{t('landing.diffAwardsDesc')}</div>
          </div>
          <div className={styles.diffCard}>
            <img className={styles.diffImage} src="/play/screenshots/mobile-curse-picker.png" alt="Curse cards" loading="lazy" width="390" height="844" />
            <div className={styles.diffTitle}>{t('landing.diffCursesTitle')}</div>
            <div className={styles.diffDesc}>{t('landing.diffCursesDesc')}</div>
          </div>
          <div className={styles.diffCard}>
            <div className={styles.diffEmoji}>⚖️</div>
            <div className={styles.diffTitle}>{t('landing.diffFairTitle')}</div>
            <div className={styles.diffDesc}>{t('landing.diffFairDesc')}</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('landing.featuresTitle')}</h2>
        <div className={styles.features}>
          {[
            { emoji: '🎾', titleKey: 'landing.feat1Title', descKey: 'landing.feat1Desc' },
            { emoji: '⚡', titleKey: 'landing.feat2Title', descKey: 'landing.feat2Desc' },
            { emoji: '📶', titleKey: 'landing.feat3Title', descKey: 'landing.feat3Desc' },
            { emoji: '🚀', titleKey: 'landing.feat4Title', descKey: 'landing.feat4Desc' },
            { emoji: '🌍', titleKey: 'landing.feat5Title', descKey: 'landing.feat5Desc' },
            { emoji: '🎨', titleKey: 'landing.feat6Title', descKey: 'landing.feat6Desc' },
          ].map(({ emoji, titleKey, descKey }) => (
            <div key={titleKey} className={styles.feature}>
              <div className={styles.featureEmoji}>{emoji}</div>
              <div className={styles.featureTitle}>{t(titleKey)}</div>
              <div className={styles.featureDesc}>{t(descKey)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('landing.stepsTitle')}</h2>
        <div className={styles.steps}>
          {[
            { num: '1', titleKey: 'landing.step1Title', descKey: 'landing.step1Desc' },
            { num: '2', titleKey: 'landing.step2Title', descKey: 'landing.step2Desc' },
            { num: '3', titleKey: 'landing.step3Title', descKey: 'landing.step3Desc' },
          ].map(({ num, titleKey, descKey }) => (
            <div key={num} className={styles.step}>
              <div className={styles.stepNum}>{num}</div>
              <div className={styles.stepContent}>
                <div className={styles.stepTitle}>{t(titleKey)}</div>
                <div className={styles.stepDesc}>{t(descKey)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className={styles.bottomCta}>
        <h2 className={styles.bottomCtaTitle}>{t('landing.ctaTitle')}</h2>
        <div className={styles.ctas}>
          <a className={styles.ctaPrimary} href="/plan">{t('landing.ctaStart')} →</a>
          <a className={styles.ctaSecondary} href="/plan">{t('landing.ctaJoin')} →</a>
        </div>
      </section>

      {/* SEO links */}
      <nav className={styles.seoLinks}>
        <a className={styles.seoLink} href="/formats">Tournament Formats</a>
        <a className={styles.seoLink} href="/americano">Americano Guide</a>
        <a className={styles.seoLink} href="/mexicano">Mexicano Guide</a>
        <a className={styles.seoLink} href="/awards">Awards & Ceremony</a>
        <a className={styles.seoLink} href="/maldiciones">Maldiciones del Padel</a>
      </nav>

      {/* Footer */}
      <AppFooter onFeedbackClick={() => setFeedbackOpen(true)} />

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={onFeedback}
      />
    </>
  );
}
