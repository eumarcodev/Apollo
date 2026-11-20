import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestI18n, jsonResponse } from '@/shared/testing';
import { render } from '@testing-library/react';
import { AppProviders, createQueryClient } from './AppProviders';
import { AppShell } from './AppShell';
import { createPage } from './createPage';
import { PagePlaceholder } from './PagePlaceholder';

function Boom(): never {
  throw new Error('render failure');
}

describe('app composition', () => {
  it('renders a placeholder page inside the providers', async () => {
    const i18n = await createTestI18n('pt_BR');
    render(
      <AppProviders i18n={i18n} queryClient={createQueryClient()}>
        <AppShell layout="shell">
          <PagePlaceholder page="apps" titleKey="navbar.applications" />
        </AppShell>
      </AppProviders>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Aplicativos');
    expect(screen.getByTestId('page-placeholder')).toHaveAttribute('data-page', 'apps');
    expect(screen.getByRole('main')).toHaveAttribute('data-layout', 'shell');
  });

  it('shows the error boundary on render errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const i18n = await createTestI18n();
    render(
      <AppProviders i18n={i18n} queryClient={createQueryClient()}>
        <Boom />
      </AppProviders>,
    );
    expect(screen.getByTestId('error-boundary')).toHaveTextContent('An unexpected error occurred');
  });

  it('createPage mounts the page with translations from the server', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) =>
      String(input).includes('configLocale')
        ? jsonResponse({ status: true, locale: 'en' })
        : jsonResponse({ navbar: { pin: 'PIN' }, react_ui: { page_placeholder: 'Soon' } }),
    );
    await createPage(() => <PagePlaceholder page="pin" titleKey="navbar.pin" />, { layout: 'bare' });
    await waitFor(() => expect(screen.getByTestId('page-placeholder')).toHaveTextContent('Soon'));
    expect(screen.getByRole('main')).toHaveAttribute('data-layout', 'bare');
  });

  it('createPage fails without a root element', async () => {
    document.body.innerHTML = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse({ locale: 'en' }));
    await expect(createPage(() => null)).rejects.toThrow(/root/);
  });
});
