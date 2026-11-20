import { createHttpClient, type HttpClient } from '@/shared/infrastructure/http';
import { FALLBACK_LOCALE, resolveLocale, type SupportedLocale } from './locale';

export type Messages = Record<string, unknown>;

export interface LoadedLocale {
  locale: SupportedLocale;
  resources: Partial<Record<SupportedLocale, Messages>>;
}

interface LocaleDto {
  locale?: unknown;
}

const defaultHttp = createHttpClient({ onUnauthorized: () => undefined });

/** Ask the server which locale is configured (`GET /api/configLocale`, no auth needed). */
export async function fetchServerLocale(http: HttpClient = defaultHttp): Promise<SupportedLocale> {
  try {
    const dto = await http.getJson<LocaleDto>('./api/configLocale', { redirectOnUnauthorized: false });
    return resolveLocale(dto.locale);
  } catch (error) {
    console.error('Failed to read the configured locale', error);
    return FALLBACK_LOCALE;
  }
}

export function fetchMessages(locale: SupportedLocale, http: HttpClient = defaultHttp): Promise<Messages> {
  return http.getJson<Messages>(`./assets/locale/${locale}.json`, { redirectOnUnauthorized: false });
}

/**
 * Load the configured locale plus the English fallback. A failure to download a non-English file is logged and
 * the UI falls back to English, as the legacy UI did.
 */
export async function loadLocale(http: HttpClient = defaultHttp): Promise<LoadedLocale> {
  const locale = await fetchServerLocale(http);
  const en = await fetchMessages(FALLBACK_LOCALE, http);
  if (locale === FALLBACK_LOCALE) {
    return { locale, resources: { en } };
  }
  try {
    const messages = await fetchMessages(locale, http);
    return { locale, resources: { en, [locale]: messages } };
  } catch (error) {
    console.error('Failed to download translations', error);
    return { locale: FALLBACK_LOCALE, resources: { en } };
  }
}
