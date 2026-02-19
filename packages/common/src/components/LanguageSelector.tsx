import { useTranslation } from '../i18n/context';
import type { Locale } from '../i18n/types';
import styles from './LanguageSelector.module.css';

const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'it', label: 'IT' },
  { code: 'pt', label: 'PT' },
  { code: 'sr', label: 'SR' },
  { code: 'fr', label: 'FR' },
  { code: 'sv', label: 'SV' },
];

export function LanguageSelector() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className={styles.selector}>
      {LOCALES.map((loc, i) => (
        <span key={loc.code}>
          {i > 0 && <span className={styles.dot}>&middot;</span>}
          <button
            className={`${styles.option} ${locale === loc.code ? styles.active : ''}`}
            onClick={() => setLocale(loc.code)}
          >
            {loc.label}
          </button>
        </span>
      ))}
    </div>
  );
}
