import i18next, { type i18n as I18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { FALLBACK_LOCALE, htmlLang } from './locale';
import { loadLocale, type LoadedLocale } from './loader';

/** Build an initialized i18next instance from loaded messages and set `<html lang>`. */
export async function createI18n(loaded: LoadedLocale, doc: Document = document): Promise<I18n> {
  const instance = i18next.createInstance();
  const resources = Object.fromEntries(
    Object.entries(loaded.resources).map(([locale, messages]) => [locale, { translation: messages }]),
  );
  await instance.use(initReactI18next).init({
    lng: loaded.locale,
    fallbackLng: FALLBACK_LOCALE,
    resources,
    // The legacy files use `.` for nesting only; `:` appears in message text, never as a namespace.
    nsSeparator: false,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  doc.documentElement.setAttribute('lang', htmlLang(loaded.locale));
  return instance;
}

export async function initI18n(): Promise<I18n> {
  return createI18n(await loadLocale());
}
