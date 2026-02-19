export type Locale = 'en' | 'es' | 'it' | 'pt' | 'sr' | 'fr' | 'sv';

export type Translations = Record<string, string>;

export type TranslationMap = Record<Locale, Translations>;
