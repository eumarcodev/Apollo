import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HostLogPort, ReleasesPort } from '@/features/dashboard/application/ports';
import { buildServerConfigDto, createTestI18n, jsonResponse, renderWithProviders } from '@/shared/testing';
import { DashboardPage } from './DashboardPage';
import { ResourceCard } from './ResourceCard';

const RELEASES = [
  { tag_name: 'v1.2.0', name: 'Helios 1.2.0', body: 'Fixes\n- one\n- two', html_url: 'https://example.test/r/1.2.0' },
  { tag_name: 'v1.1.0', name: 'Helios 1.1.0', body: 'old', html_url: 'https://example.test/r/1.1.0' },
  { tag_name: 'v1.3.0-rc.1', name: 'RC', body: 'rc', html_url: 'https://example.test/r/rc', prerelease: true },
];

function mockConfig(overrides: Record<string, unknown> = {}) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    Promise.resolve(jsonResponse(buildServerConfigDto(overrides as never))),
  );
}

function ports(releases: unknown = RELEASES, log = ''): { releases: ReleasesPort; log: HostLogPort } {
  return {
    releases: { listReleases: vi.fn().mockResolvedValue(releases) },
    log: { readLog: vi.fn().mockResolvedValue(log) },
  };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('DashboardPage: version card', () => {
  it('says an up-to-date stable build is the latest', async () => {
    mockConfig({ version: '1.2.0' });
    await renderWithProviders(<DashboardPage {...ports()} />);
    expect(await screen.findByTestId('notice-latest')).toHaveTextContent(
      'You are running the latest version of Helios',
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hello, Helios!');
    expect(screen.getByTestId('version-card')).toHaveTextContent('Version 1.2.0');
    expect(screen.queryByTestId('channel-badge')).toBeNull();
    expect(screen.queryByTestId('loading-latest')).toBeNull();
  });

  it('shows the loading text until the release check finishes', async () => {
    mockConfig({ version: '1.2.0' });
    const releases = { listReleases: () => new Promise<unknown>(() => undefined) };
    await renderWithProviders(<DashboardPage releases={releases} log={ports().log} />);
    expect(await screen.findByTestId('loading-latest')).toHaveTextContent('Loading latest release...');
    expect(screen.queryByTestId('notice-latest')).toBeNull();
  });

  it('offers the newest stable release with its notes and a download link in a new tab', async () => {
    mockConfig({ version: '1.1.0' });
    await renderWithProviders(<DashboardPage {...ports()} />);
    const update = await screen.findByTestId('notice-update');
    expect(update).toHaveTextContent('A new Stable Version is Available!');
    expect(within(update).getByTestId('release-name')).toHaveTextContent('Helios 1.2.0');
    expect(within(update).getByTestId('release-body').textContent).toBe('Fixes\n- one\n- two');
    const download = within(update).getByTestId('download');
    expect(download).toHaveAttribute('href', 'https://example.test/r/1.2.0');
    expect(download).toHaveAttribute('target', '_blank');
    expect(download).toHaveTextContent('Download');
    expect(screen.queryByTestId('notice-latest')).toBeNull();
  });

  it('follows the rc channel and announces a pre-release as an update', async () => {
    mockConfig({ version: '1.2.0', update_channel: 'rc' });
    await renderWithProviders(<DashboardPage {...ports()} />);
    expect(await screen.findByTestId('notice-update')).toHaveTextContent('A new Pre-Release Version is Available!');
  });

  it('honours the legacy notify_pre_releases flag and a custom update repository', async () => {
    mockConfig({ version: '1.2.0', notify_pre_releases: 'enabled', update_repo: 'fork/helios' });
    const { releases, log } = ports();
    await renderWithProviders(<DashboardPage releases={releases} log={log} />);
    expect(await screen.findByTestId('notice-update')).toBeInTheDocument();
    expect(releases.listReleases).toHaveBeenCalledWith('fork/helios', expect.anything());
  });

  it('falls back to the Helios repository when the host reports none', async () => {
    mockConfig({ version: '1.2.0', update_repo: '' });
    const { releases, log } = ports();
    await renderWithProviders(<DashboardPage releases={releases} log={log} />);
    await screen.findByTestId('notice-latest');
    expect(releases.listReleases).toHaveBeenCalledWith('eumarcodev/Helios-Server', expect.anything());
  });

  it('thanks a dirty build and does not say it is the latest', async () => {
    mockConfig({ version: '0.0.0.830cbec0.dirty' });
    await renderWithProviders(<DashboardPage {...ports([])} />);
    expect(await screen.findByTestId('notice-dirty')).toHaveTextContent(
      'Thank you for helping to make Helios a better software! 🌇',
    );
    expect(screen.queryByTestId('notice-latest')).toBeNull();
  });

  it('warns about an installed pre-release and shows its channel badge', async () => {
    mockConfig({ version: '1.3.0-rc.1' });
    await renderWithProviders(<DashboardPage {...ports([])} />);
    expect(await screen.findByTestId('notice-pre-release')).toHaveTextContent('You are running a pre-release version');
    expect(screen.getByTestId('channel-badge')).toHaveTextContent('RC');
  });

  it('still renders when the release check fails', async () => {
    mockConfig({ version: '1.2.0' });
    const releases = { listReleases: vi.fn().mockRejectedValue(new Error('offline')) };
    await renderWithProviders(<DashboardPage releases={releases} log={ports().log} />);
    expect(await screen.findByTestId('notice-latest')).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
  });

  it('renders an empty card when the host does not report a version', async () => {
    mockConfig({ version: '' });
    const { releases, log } = ports();
    await renderWithProviders(<DashboardPage releases={releases} log={log} />);
    await waitFor(() => expect(log.readLog).toHaveBeenCalled());
    expect(screen.getByTestId('version-card')).toHaveTextContent('…');
    expect(releases.listReleases).not.toHaveBeenCalled();
  });

  it('shows the version label in Portuguese', async () => {
    mockConfig({ version: '1.2.0' });
    await renderWithProviders(<DashboardPage {...ports()} />, { i18n: await createTestI18n('pt_BR') });
    await waitFor(() => expect(screen.getByTestId('version-card')).toHaveTextContent('Versão 1.2.0'));
  });
});

describe('DashboardPage: startup errors', () => {
  const LOG = [
    '[2026-11-20 10:00:00.123]: Info: started',
    '[2026-11-20 10:00:01.456]: Fatal: Unable to find display <img src=x onerror=alert(1)>',
    '[2026-11-20 10:00:02.000]: Warning: minor',
  ].join('\n');

  it('lists only the fatal lines, as text, with a link to the logs', async () => {
    mockConfig({ version: '1.2.0' });
    await renderWithProviders(<DashboardPage {...ports(RELEASES, LOG)} />);
    const alert = await screen.findByTestId('startup-errors');
    expect(alert).toHaveTextContent('Attention! Helios detected these errors during startup.');
    expect(alert.querySelector('b')).toHaveTextContent('Attention!');
    const items = within(screen.getByTestId('startup-error-list')).getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Fatal: Unable to find display <img src=x onerror=alert(1)>');
    expect(alert.querySelector('img')).toBeNull();
    expect(screen.getByTestId('view-logs')).toHaveAttribute('href', './troubleshooting#logs');
    expect(screen.getByTestId('view-logs')).toHaveTextContent('View Logs');
  });

  it('shows nothing when there is no fatal line or the log cannot be read', async () => {
    mockConfig({ version: '1.2.0' });
    const unreadable = { readLog: vi.fn().mockRejectedValue(new Error('401')) };
    await renderWithProviders(<DashboardPage releases={ports().releases} log={unreadable} />);
    await screen.findByTestId('notice-latest');
    await waitFor(() => expect(unreadable.readLog).toHaveBeenCalled());
    expect(screen.queryByTestId('startup-errors')).toBeNull();
  });
});

describe('DashboardPage: clients, resources and legal', () => {
  it('lists Android as available and the other clients as coming soon', async () => {
    mockConfig({ version: '1.2.0' });
    await renderWithProviders(<DashboardPage {...ports()} />);
    const android = await screen.findByTestId('client-android');
    const link = within(android).getByRole('link', { name: 'Selene' });
    expect(link).toHaveAttribute('href', 'https://github.com/eumarcodev/Selene-Game-Streaming');
    expect(link).toHaveAttribute('target', '_blank');
    for (const id of ['ios', 'desktop']) {
      const entry = screen.getByTestId(`client-${id}`);
      expect(entry).toHaveTextContent('Coming soon...');
      expect(within(entry).queryByRole('link')).toBeNull();
    }
    expect(screen.getByTestId('clients-card')).toHaveTextContent(
      'Generic Moonlight clients are still usable with Helios.',
    );
  });

  it('links the resources and the legal documents with the exact URLs, in a new tab', async () => {
    await renderWithProviders(<ResourceCard />);
    const expected: Record<string, string> = {
      'resource-discussions': 'https://github.com/eumarcodev/Helios-Server/discussions',
      'resource-wiki': 'https://github.com/ClassicOldSong/Apollo/wiki',
      'resource-stuttering-clinic': 'https://github.com/ClassicOldSong/Apollo/wiki/Stuttering-Clinic',
      'legal-license': 'https://github.com/eumarcodev/Helios-Server/blob/master/LICENSE',
      'legal-notice': 'https://github.com/eumarcodev/Helios-Server/blob/master/NOTICE',
    };
    for (const [id, href] of Object.entries(expected)) {
      const link = screen.getByTestId(id);
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
    expect(screen.getByTestId('resources')).toHaveTextContent('GitHub Discussions');
    expect(screen.getByTestId('legal')).toHaveTextContent('Third Party Notice');
  });
});
