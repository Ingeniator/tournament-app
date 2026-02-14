export type Locale = 'en' | 'es' | 'it' | 'pt';

export type Translations = Record<string, string>;

export type TranslationMap = Record<Locale, Translations>;
