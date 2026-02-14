import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Locale, TranslationMap } from './types';

const STORAGE_KEY = 'padel-locale';
const SUPPORTED_LOCALES: Locale[] = ['en', 'es', 'it', 'pt'];

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LOCALES.includes(saved as Locale)) {
      return saved as Locale;
    }
  } catch {}

  const lang = navigator.language?.toLowerCase() ?? '';
  for (const loc of SUPPORTED_LOCALES) {
    if (lang === loc || lang.startsWith(`${loc}-`)) return loc;
  }
  return 'en';
}

interface I18nContextValue {
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  translations: TranslationMap;
  children: ReactNode;
}

export function I18nProvider({ translations, children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((loc: Locale) => {
    setLocaleState(loc);
    try {
      localStorage.setItem(STORAGE_KEY, loc);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {}
  }, [locale]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let text = translations[locale]?.[key] ?? translations.en?.[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return text;
  }, [locale, translations]);

  return (
    <I18nContext.Provider value={{ t, locale, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return ctx;
}
