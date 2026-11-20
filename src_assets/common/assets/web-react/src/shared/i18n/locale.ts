/** The only locales shipped by the React UI. Any other server value falls back to English. */
export const SUPPORTED_LOCALES = ['en', 'pt_BR'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const FALLBACK_LOCALE: SupportedLocale = 'en';

export function resolveLocale(serverLocale: unknown): SupportedLocale {
  return serverLocale === 'pt_BR' ? 'pt_BR' : FALLBACK_LOCALE;
}

/** BCP 47 tag for `<html lang>`. */
export function htmlLang(locale: SupportedLocale): string {
  return locale === 'pt_BR' ? 'pt-BR' : 'en';
}
