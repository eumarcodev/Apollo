export { FALLBACK_LOCALE, SUPPORTED_LOCALES, htmlLang, resolveLocale } from './locale';
export type { SupportedLocale } from './locale';
export { fetchMessages, fetchServerLocale, loadLocale } from './loader';
export type { LoadedLocale, Messages } from './loader';
export { createI18n, initI18n } from './create-i18n';
export { createPlatformTranslator, usePlatformTranslation } from './platform-translation';
export type { PlatformTranslate, TranslatorLike } from './platform-translation';
export { useTranslation, Trans } from 'react-i18next';
