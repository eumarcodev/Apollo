import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { i18n as I18n } from 'i18next';
import type { ReactElement, ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { createI18n, type Messages, type SupportedLocale } from '@/shared/i18n';
import type { ServerConfigDto } from '@/shared/infrastructure/server-config';
import { ConfirmProvider } from '@/shared/ui';

const LOCALE_DIR = resolve(__dirname, '../../../public/assets/locale');

export function readLocaleFile(locale: SupportedLocale): Messages {
  return JSON.parse(readFileSync(resolve(LOCALE_DIR, `${locale}.json`), 'utf8')) as Messages;
}

/** i18next instance with the real locale files, as the app loads them. */
export async function createTestI18n(locale: SupportedLocale = 'en'): Promise<I18n> {
  const resources: Partial<Record<SupportedLocale, Messages>> = { en: readLocaleFile('en') };
  if (locale !== 'en') {
    resources[locale] = readLocaleFile(locale);
  }
  return createI18n({ locale, resources });
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

export interface ProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  i18n?: I18n;
  queryClient?: QueryClient;
}

/** Render with the same providers createPage mounts (QueryClient, i18n, confirm dialog). */
export async function renderWithProviders(
  ui: ReactElement,
  { i18n, queryClient, ...options }: ProvidersOptions = {},
): Promise<RenderResult & { i18n: I18n; queryClient: QueryClient }> {
  const instance = i18n ?? (await createTestI18n());
  const client = queryClient ?? createTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={instance}>
        <ConfirmProvider>{children}</ConfirmProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
  return { ...render(ui, { wrapper: Wrapper, ...options }), i18n: instance, queryClient: client };
}

/** `GET /api/config` response with synthetic values (same shape as getConfig in src/confighttp.cpp). */
export function buildServerConfigDto(overrides: Partial<ServerConfigDto> = {}): ServerConfigDto {
  return {
    status: true,
    platform: 'windows',
    version: '1.0.0-test',
    update_repo: 'eumarcodev/Helios-Server',
    vdisplayStatus: 0,
    locale: 'en',
    ...overrides,
  };
}

/** Minimal `Response` for mocked fetch calls. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
