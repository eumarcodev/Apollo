import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigPort, PageEnvironment, RestartOutcome, SaveOutcome } from '@/features/config/application/ports';
import { AppError } from '@/shared/kernel';
import { createTestI18n, renderWithProviders } from '@/shared/testing';
import { ConfigPage } from './ConfigPage';
import { TAB_COMPONENTS } from './tabs/registry';
import type { ConfigTabProps } from './tabs/types';

function fakePort(body: Record<string, unknown> = {}, save: SaveOutcome = 'saved', restart: RestartOutcome = 'ok') {
  return {
    load: vi.fn(async (_signal?: AbortSignal): Promise<Record<string, unknown>> => ({
      status: true,
      platform: 'windows',
      version: '1.0.0',
      vdisplayStatus: 0,
      ...body,
    })),
    save: vi.fn(async (_payload: Readonly<Record<string, unknown>>) => save),
    restart: vi.fn(async () => restart),
  } satisfies ConfigPort;
}

function fakeEnv() {
  return {
    reload: vi.fn(),
    setTimeout: vi.fn(() => 1),
    clearTimeout: vi.fn(),
  } satisfies PageEnvironment;
}

async function renderPage(port: ConfigPort = fakePort(), locale: 'en' | 'pt_BR' = 'en') {
  const env = fakeEnv();
  const i18n = await createTestI18n(locale);
  const view = await renderWithProviders(<ConfigPage port={port} env={env} />, { i18n });
  await screen.findByTestId('config-tabs');
  return { ...view, env };
}

const tabIds = () =>
  screen.getAllByRole('tab').map((tab) => tab.getAttribute('data-testid')?.replace('config-tab-', ''));

/** A tab component like the tab issues will write: fields with the option key as id. */
function TestAdvancedTab({ config, platform, update, vdisplayStatus }: ConfigTabProps) {
  return (
    <div data-testid="test-tab" data-platform={platform} data-vdisplay={String(vdisplayStatus)}>
      <label htmlFor="qp">qp</label>
      <input id="qp" value={String(config['qp'])} onChange={(event) => update('qp', Number(event.target.value))} />
    </div>
  );
}

beforeEach(() => {
  window.history.replaceState(null, '', '/config');
  Element.prototype.scrollIntoView = vi.fn();
  // jsdom has no Web Animations API; the HeroUI tab indicator (SelectionIndicator) reads it on selection changes.
  Element.prototype.getAnimations ??= () => [];
});

afterEach(() => {
  delete TAB_COMPONENTS.advanced;
  window.history.replaceState(null, '', '/config');
});

describe('ConfigPage', () => {
  it('shows a spinner while loading, then the Windows tabs with the General tab selected', async () => {
    const port = fakePort();
    let resolve: (value: Record<string, unknown>) => void = () => undefined;
    port.load.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const env = fakeEnv();
    await renderWithProviders(<ConfigPage port={port} env={env} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Configuration' })).toBeInTheDocument();
    expect(screen.getByTestId('config-loading')).toBeInTheDocument();
    act(() => resolve({ platform: 'windows' }));
    await screen.findByTestId('config-tabs');
    expect(tabIds()).toEqual([
      'general',
      'input',
      'av',
      'network',
      'files',
      'advanced',
      'nv',
      'qsv',
      'amd',
      'pyrowave',
      'sw',
    ]);
    expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByRole('heading', { level: 2, name: 'General' })).toBeInTheDocument();
    expect(within(panel).getByTestId('config-general')).toBeInTheDocument();
  });

  it('shows the Linux and macOS tabs', async () => {
    const linux = await renderPage(fakePort({ platform: 'linux' }));
    expect(tabIds()).toEqual(['general', 'input', 'av', 'network', 'files', 'advanced', 'nv', 'vaapi', 'sw']);
    linux.unmount();
    await renderPage(fakePort({ platform: 'macos' }));
    expect(tabIds()).toEqual(['general', 'input', 'av', 'network', 'files', 'advanced', 'vt', 'sw']);
  });

  it('translates the tab names', async () => {
    await renderPage(fakePort(), 'pt_BR');
    expect(screen.getByRole('heading', { level: 1, name: 'Configuração' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Geral',
      'Entrada',
      'Áudio/Vídeo',
      'Rede',
      'Arquivos de configuração',
      'Avançado',
      'Codificador NVIDIA NVENC',
      'Codificador Intel QuickSync',
      'Codificador AMD AMF',
      'Codificador PyroWave (experimental)',
      'Codificador de software',
    ]);
  });

  it('shows the load error and retries', async () => {
    const port = fakePort();
    port.load.mockRejectedValueOnce(new AppError('http', 'Server returned 500'));
    await renderWithProviders(<ConfigPage port={port} env={fakeEnv()} />);
    const alert = await screen.findByTestId('config-load-error');
    expect(alert).toHaveTextContent('Could not load the configuration.');
    expect(alert).toHaveTextContent('Server returned 500');
    await userEvent.click(within(alert).getByRole('button', { name: 'Reload' }));
    await screen.findByTestId('config-tabs');
    expect(port.load).toHaveBeenCalledTimes(2);
  });

  it('switches tabs on click and drops the hash', async () => {
    window.history.replaceState(null, '', '/config#network');
    await renderPage();
    expect(screen.getByRole('tab', { name: 'Network' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: 'Software Encoder' }));
    expect(screen.getByRole('tab', { name: 'Software Encoder' })).toHaveAttribute('aria-selected', 'true');
    expect(within(screen.getByRole('tabpanel')).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Software Encoder',
    );
    expect(window.location.hash).toBe('');
  });

  it('opens the tab of an option from the hash and scrolls to its field', async () => {
    TAB_COMPONENTS.advanced = TestAdvancedTab;
    window.history.replaceState(null, '', '/config#qp');
    await renderPage();
    expect(screen.getByRole('tab', { name: 'Advanced' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('test-tab')).toHaveAttribute('data-platform', 'windows');
    expect(screen.getByTestId('test-tab')).toHaveAttribute('data-vdisplay', '0');
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
    expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts[0]).toBe(document.getElementById('qp'));
  });

  it('follows hashchange events and ignores unknown or hidden targets', async () => {
    await renderPage();
    act(() => {
      window.location.hash = '#input';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.getByRole('tab', { name: 'Input' })).toHaveAttribute('aria-selected', 'true');
    act(() => {
      window.location.hash = '#vt';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.getByRole('tab', { name: 'Input' })).toHaveAttribute('aria-selected', 'true');
    act(() => {
      window.location.hash = '#sw_preset';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.getByRole('tab', { name: 'Software Encoder' })).toHaveAttribute('aria-selected', 'true');
  });

  it('saves what the tabs changed and shows the apply note and button', async () => {
    TAB_COMPONENTS.advanced = TestAdvancedTab;
    const port = fakePort({ sunshine_name: 'Host' });
    await renderPage(port);
    await userEvent.click(screen.getByRole('tab', { name: 'Advanced' }));
    fireEvent.change(screen.getByLabelText('qp'), { target: { value: '30' } });
    expect(screen.queryByTestId('config-apply')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('config-save'));
    expect(port.save).toHaveBeenCalledWith({ sunshine_name: 'Host', qp: 30 });
    expect(await screen.findByTestId('config-apply-note')).toHaveTextContent(
      "Success! Click 'Apply' to restart Helios and apply changes.",
    );
    expect(screen.getByTestId('config-apply')).toBeInTheDocument();
  });

  it('applies: restart note, no apply button, restart request', async () => {
    const port = fakePort();
    await renderPage(port);
    await userEvent.click(screen.getByTestId('config-save'));
    await userEvent.click(await screen.findByTestId('config-apply'));
    expect(await screen.findByTestId('config-restart-note')).toHaveTextContent(
      'Success! Helios is restarting to apply changes.',
    );
    expect(screen.queryByTestId('config-apply')).not.toBeInTheDocument();
    expect(port.save).toHaveBeenCalledTimes(2);
    expect(port.restart).toHaveBeenCalledOnce();
  });

  it('shows an error with the server message when the save fails', async () => {
    const port = fakePort({}, { status: 'failed', error: 'disk full' });
    await renderPage(port);
    await userEvent.click(screen.getByTestId('config-save'));
    await waitFor(() => expect(port.save).toHaveBeenCalledOnce());
    expect(await screen.findByTestId('config-save-error')).toHaveTextContent(
      'Could not save the configuration. disk full',
    );
    expect(screen.queryByTestId('config-apply-note')).not.toBeInTheDocument();
    expect(screen.queryByTestId('config-apply')).not.toBeInTheDocument();
  });
});
