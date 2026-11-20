import './styles.css';
import type { ComponentType } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initI18n } from '@/shared/i18n';
import { initTheme } from '@/shared/ui';
import { AppProviders, createQueryClient } from './AppProviders';
import { AppShell, type ShellLayout } from './AppShell';

export interface CreatePageOptions {
  layout?: ShellLayout;
  rootId?: string;
}

/** Composition root of every HTML entry: theme, translations, providers and shell around the page component. */
export async function createPage(Page: ComponentType, options: CreatePageOptions = {}): Promise<void> {
  initTheme();
  const i18n = await initI18n();
  const container = document.getElementById(options.rootId ?? 'root');
  if (!container) {
    throw new Error('Missing #root element');
  }
  createRoot(container).render(
    <StrictMode>
      <AppProviders i18n={i18n} queryClient={createQueryClient()}>
        <AppShell layout={options.layout ?? 'shell'}>
          <Page />
        </AppShell>
      </AppProviders>
    </StrictMode>,
  );
}
