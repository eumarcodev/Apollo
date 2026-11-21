import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LogsPort, MaintenancePort } from '@/features/troubleshooting/application/ports';
import { buildServerConfigDto, createTestI18n, jsonResponse, renderWithProviders } from '@/shared/testing';
import { TroubleshootingPage } from './TroubleshootingPage';

function mockConfig(platform: 'windows' | 'linux' | 'macos') {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    Promise.resolve(jsonResponse(buildServerConfigDto({ platform }))),
  );
}

function maintenancePort(overrides: Partial<MaintenancePort> = {}): MaintenancePort {
  return {
    closeApps: vi.fn().mockResolvedValue(true),
    restart: vi.fn().mockResolvedValue('accepted'),
    quit: vi.fn().mockResolvedValue('unreachable'),
    resetDisplayPersistence: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

const LOG = ['Info: started', 'Warning: slow', 'info: lower', 'Info: ready'].join('\n');

function logsPort(text = LOG): LogsPort {
  return { readLogs: vi.fn().mockResolvedValue(text) };
}

async function renderPage(
  platform: 'windows' | 'linux' | 'macos' = 'windows',
  ports: { maintenance?: MaintenancePort; logs?: LogsPort } = {},
  locale: 'en' | 'pt_BR' = 'en',
) {
  mockConfig(platform);
  const maintenance = ports.maintenance ?? maintenancePort();
  const logs = ports.logs ?? logsPort();
  const view = await renderWithProviders(
    <TroubleshootingPage maintenance={maintenance} logs={logs} logPollIntervalMs={60000} />,
    { i18n: await createTestI18n(locale) },
  );
  return { ...view, maintenance, logs };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  window.location.hash = '';
});

describe('TroubleshootingPage: layout', () => {
  it('shows the title and a card with an anchor for each action and for the logs', async () => {
    await renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Troubleshooting');
    await screen.findByTestId('card-dd_reset');
    for (const id of ['close_apps', 'restart', 'quit', 'dd_reset', 'logs']) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it('offers the display reset on Windows only', async () => {
    await renderPage('windows');
    expect(await screen.findByTestId('card-dd_reset')).toBeInTheDocument();
  });

  for (const platform of ['linux', 'macos'] as const) {
    it(`hides the display reset on ${platform}`, async () => {
      await renderPage(platform);
      await screen.findByTestId('card-logs');
      await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
      expect(screen.queryByTestId('card-dd_reset')).toBeNull();
      expect(screen.getByTestId('card-quit')).toBeInTheDocument();
    });
  }

  it('is translated to Portuguese', async () => {
    await renderPage('windows', {}, 'pt_BR');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Solução de Problemas');
    expect(await screen.findByTestId('close_apps-button')).toHaveTextContent('Forçar fechamento');
  });

  it('scrolls to the card named by the URL hash', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    window.location.hash = '#logs';
    await renderPage('linux');
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('logs'));
  });
});

describe('TroubleshootingPage: actions', () => {
  it('force close: calls the host and reports the result', async () => {
    const user = userEvent.setup();
    const { maintenance } = await renderPage();
    await user.click(screen.getByTestId('close_apps-button'));
    expect(await screen.findByTestId('close_apps-notice')).toHaveTextContent('Application Closed Successfully!');
    expect(maintenance.closeApps).toHaveBeenCalledOnce();
  });

  it('force close: reports an error', async () => {
    const user = userEvent.setup();
    await renderPage('windows', { maintenance: maintenancePort({ closeApps: vi.fn().mockResolvedValue(false) }) });
    await user.click(screen.getByTestId('close_apps-button'));
    const notice = await screen.findByTestId('close_apps-notice');
    expect(notice).toHaveTextContent('Error while closing Application');
    expect(notice).toHaveAttribute('data-status', 'danger');
  });

  it('restart: shows the message and disables restart and quit', async () => {
    const user = userEvent.setup();
    const { maintenance } = await renderPage();
    await user.click(screen.getByTestId('restart-button'));
    expect(await screen.findByTestId('restart-notice')).toHaveTextContent('Helios is restarting');
    expect(maintenance.restart).toHaveBeenCalledOnce();
    expect(screen.getByTestId('restart-button')).toBeDisabled();
    expect(screen.getByTestId('quit-button')).toBeDisabled();
  });

  it('display reset: reports the result', async () => {
    const user = userEvent.setup();
    const { maintenance } = await renderPage();
    await user.click(await screen.findByTestId('dd_reset-button'));
    expect(await screen.findByTestId('dd_reset-notice')).toHaveTextContent('Success resetting persistence!');
    expect(maintenance.resetDisplayPersistence).toHaveBeenCalledOnce();
  });

  it('display reset: keeps the line breaks of the description', async () => {
    await renderPage();
    const card = await screen.findByTestId('card-dd_reset');
    expect(card.querySelector('p')).toHaveClass('whitespace-pre-line');
  });
});

describe('TroubleshootingPage: quit', () => {
  it('does nothing when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const { maintenance } = await renderPage();
    await user.click(screen.getByTestId('quit-button'));
    const dialog = await screen.findByTestId('confirm-dialog');
    expect(dialog).toHaveTextContent('Do you really want to quit Helios?');
    await user.click(within(dialog).getByTestId('confirm-cancel'));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(maintenance.quit).not.toHaveBeenCalled();
    expect(screen.queryByTestId('quit-notice')).toBeNull();
  });

  it('a request that fails is the host exiting: success message', async () => {
    const user = userEvent.setup();
    const { maintenance } = await renderPage();
    await user.click(screen.getByTestId('quit-button'));
    await user.click(await screen.findByTestId('confirm-accept'));
    expect(await screen.findByTestId('quit-notice')).toHaveTextContent('Helios has exited.');
    expect(maintenance.quit).toHaveBeenCalledOnce();
  });

  it('shows the ongoing message while waiting', async () => {
    const user = userEvent.setup();
    const quit = vi.fn().mockReturnValue(new Promise(() => undefined));
    await renderPage('windows', { maintenance: maintenancePort({ quit }) });
    await user.click(screen.getByTestId('quit-button'));
    await user.click(await screen.findByTestId('confirm-accept'));
    expect(await screen.findByTestId('quit-notice')).toHaveTextContent('Helios is quitting...');
    expect(screen.getByTestId('restart-button')).toBeDisabled();
    expect(screen.getByTestId('quit-button')).toBeDisabled();
  });

  it('an answer from the host means the exit failed: no success message', async () => {
    const user = userEvent.setup();
    const quit = vi.fn().mockResolvedValue('answered');
    await renderPage('windows', { maintenance: maintenancePort({ quit }) });
    await user.click(screen.getByTestId('quit-button'));
    await user.click(await screen.findByTestId('confirm-accept'));
    await waitFor(() => expect(quit).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('quit-button')).toBeEnabled());
    expect(screen.queryByTestId('quit-notice')).toBeNull();
  });
});

describe('TroubleshootingPage: logs', () => {
  it('shows the loading text, then the log', async () => {
    const logs = { readLogs: vi.fn().mockReturnValue(new Promise<string>(() => undefined)) };
    await renderPage('linux', { logs });
    expect(screen.getByTestId('logs-output')).toHaveTextContent('Loading...');
  });

  it('shows the log text as text', async () => {
    await renderPage('linux', { logs: logsPort('<b>bold</b>\nline 2') });
    await waitFor(() => expect(screen.getByTestId('logs-output').textContent).toBe('<b>bold</b>\nline 2'));
  });

  it('filters the lines that contain the text, case-sensitive', async () => {
    const user = userEvent.setup();
    await renderPage('linux');
    await waitFor(() => expect(screen.getByTestId('logs-output').textContent).toBe(LOG));
    await user.type(screen.getByTestId('logs-filter-input'), 'Info');
    expect(screen.getByTestId('logs-output').textContent).toBe('Info: started\nInfo: ready');
    await user.clear(screen.getByTestId('logs-filter-input'));
    expect(screen.getByTestId('logs-output').textContent).toBe(LOG);
  });

  it('copies the filtered text', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    await renderPage('linux');
    await waitFor(() => expect(screen.getByTestId('logs-output').textContent).toBe(LOG));
    await user.type(screen.getByTestId('logs-filter-input'), 'Warning');
    await user.click(screen.getByTestId('logs-copy'));
    expect(writeText).toHaveBeenCalledWith('Warning: slow');
  });

  it('labels the copy button and the filter', async () => {
    await renderPage('linux');
    expect(screen.getByRole('button', { name: 'Copy logs' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Find...')).toBeInTheDocument();
  });
});
