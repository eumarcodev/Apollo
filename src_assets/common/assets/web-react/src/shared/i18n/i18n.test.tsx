import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@/shared/infrastructure/http';
import { createTestI18n } from '@/shared/testing';
import {
  createI18n,
  createPlatformTranslator,
  fetchServerLocale,
  htmlLang,
  initI18n,
  loadLocale,
  resolveLocale,
  usePlatformTranslation,
} from './index';

const EN = { greeting: 'Hello', only_en: 'English only' };
const PT = { greeting: 'Olá' };

function fakeHttp(routes: Record<string, unknown>): HttpClient {
  return {
    getJson: vi.fn(async (path: string) => {
      const body = routes[path];
      if (body instanceof Error) {
        throw body;
      }
      if (body === undefined) {
        throw new Error(`unexpected ${path}`);
      }
      return body;
    }) as HttpClient['getJson'],
    getText: vi.fn(),
    postJson: vi.fn(),
  };
}

describe('locale resolution', () => {
  it('keeps pt_BR and falls back to en for everything else', () => {
    expect(resolveLocale('pt_BR')).toBe('pt_BR');
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale('de')).toBe('en');
    expect(resolveLocale('pt')).toBe('en');
    expect(resolveLocale(undefined)).toBe('en');
    expect(htmlLang('pt_BR')).toBe('pt-BR');
    expect(htmlLang('en')).toBe('en');
  });
});

describe('loadLocale', () => {
  it('loads only English when the server locale is en or unsupported', async () => {
    const http = fakeHttp({ './api/configLocale': { locale: 'fr' }, './assets/locale/en.json': EN });
    await expect(loadLocale(http)).resolves.toEqual({ locale: 'en', resources: { en: EN } });
  });

  it('loads pt_BR plus the English fallback', async () => {
    const http = fakeHttp({
      './api/configLocale': { locale: 'pt_BR' },
      './assets/locale/en.json': EN,
      './assets/locale/pt_BR.json': PT,
    });
    await expect(loadLocale(http)).resolves.toEqual({ locale: 'pt_BR', resources: { en: EN, pt_BR: PT } });
  });

  it('falls back to English when the translation download fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const http = fakeHttp({
      './api/configLocale': { locale: 'pt_BR' },
      './assets/locale/en.json': EN,
      './assets/locale/pt_BR.json': new Error('404'),
    });
    await expect(loadLocale(http)).resolves.toEqual({ locale: 'en', resources: { en: EN } });
    expect(error).toHaveBeenCalled();
  });

  it('uses English when the locale endpoint fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(fetchServerLocale(fakeHttp({ './api/configLocale': new Error('down') }))).resolves.toBe('en');
  });

  it('uses the default client', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) =>
        String(input).includes('configLocale')
          ? new Response(JSON.stringify({ locale: 'en' }))
          : new Response(JSON.stringify(EN)),
      );
    const i18n = await initI18n();
    expect(i18n.t('greeting')).toBe('Hello');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe('createI18n', () => {
  it('translates, falls back to English and sets <html lang>', async () => {
    const i18n = await createI18n({ locale: 'pt_BR', resources: { en: EN, pt_BR: PT } });
    expect(i18n.t('greeting')).toBe('Olá');
    expect(i18n.t('only_en')).toBe('English only');
    expect(document.documentElement.lang).toBe('pt-BR');
  });

  it('works with the real locale files', async () => {
    const i18n = await createTestI18n('pt_BR');
    expect(i18n.t('navbar.home')).not.toBe('navbar.home');
    expect(i18n.t('_common.cancel')).toBe('Cancelar');
  });
});

describe('platform translation (tp)', () => {
  const messages = new Map([
    ['a_windows', 'A on Windows'],
    ['a_linux', 'A on Linux'],
    ['b_unix', 'B on Unix'],
  ]);
  const translator = { t: (key: string) => messages.get(key) ?? key, exists: (key: string) => messages.has(key) };

  it('uses the platform key first', () => {
    expect(createPlatformTranslator(translator, 'windows')('a')).toBe('A on Windows');
    expect(createPlatformTranslator(translator, 'linux')('a')).toBe('A on Linux');
  });

  it('never falls back to unix on Windows', () => {
    const tp = createPlatformTranslator(translator, 'windows');
    expect(tp('b')).toBe('b_windows');
    expect(tp('b', 'Default')).toBe('Default');
  });

  it('falls back to the unix key, then the default, on Linux and macOS', () => {
    const tp = createPlatformTranslator(translator, 'macos');
    expect(tp('b')).toBe('B on Unix');
    expect(tp('c', 'Default')).toBe('Default');
    expect(tp('c')).toBe('c_unix');
  });

  it('is available as a hook bound to i18next', async () => {
    const i18n = await createI18n({
      locale: 'en',
      resources: { en: { x_unix: 'unix text', x_windows: 'windows text' } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    );
    const { result } = renderHook(() => usePlatformTranslation('linux'), { wrapper });
    expect(result.current('x')).toBe('unix text');
  });
});
