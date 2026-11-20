import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult, AppsBrowser, AppsPort } from '@/features/apps/application/ports';
import type { AppsListing } from '@/features/apps/domain/app-list';
import { createTestI18n, renderWithProviders } from '@/shared/testing';
import { notify } from '@/shared/ui';
import { AppsPage } from './AppsPage';

const LISTING: AppsListing = {
  apps: [
    { uuid: 'u-cyber', name: 'Cyberpunk' },
    { uuid: 'u-alpha', name: 'Alpha' },
    { uuid: 'u-beta', name: 'Beta' },
  ],
  currentApp: '',
  hostName: 'My PC',
  hostUuid: 'HOST-1',
};

const OK: ActionResult = { status: true };

interface Fakes {
  port: AppsPort;
  browser: AppsBrowser;
  listings: AppsListing[];
}

/** Port whose `list` answers the queued listings (the last one repeats). */
function fakes(first: AppsListing = LISTING, hostname = 'localhost'): Fakes {
  const listings = [first];
  let calls = 0;
  const port: AppsPort = {
    list: vi.fn(() => Promise.resolve(listings[Math.min(calls++, listings.length - 1)] as AppsListing)),
    reorder: vi.fn(() => Promise.resolve(OK)),
    launch: vi.fn(() => Promise.resolve(OK)),
    close: vi.fn(() => Promise.resolve(OK)),
    remove: vi.fn(() => Promise.resolve(OK)),
  };
  const browser: AppsBrowser = { hostname, openLink: vi.fn(), download: vi.fn() };
  return { port, browser, listings };
}

async function show(f: Fakes, locale: 'en' | 'pt_BR' = 'en') {
  const user = userEvent.setup();
  const view = await renderWithProviders(<AppsPage port={f.port} browser={f.browser} />, {
    i18n: await createTestI18n(locale),
  });
  await screen.findByTestId('apps-table');
  await screen.findByText('Alpha');
  return { user, ...view };
}

const names = () => screen.getAllByTestId(/^app-name-/).map((cell) => cell.textContent);

async function accept(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByTestId('confirm-accept'));
}

beforeEach(() => {
  vi.spyOn(notify, 'error').mockReturnValue('t');
  vi.spyOn(notify, 'info').mockReturnValue('t');
});

describe('AppsPage: list', () => {
  it('shows the header texts and the apps in the saved order', async () => {
    await show(fakes());
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Applications');
    expect(screen.getByText('Applications are refreshed when a session is terminated.')).toBeInTheDocument();
    expect(screen.getByTestId('apps-tips')).toHaveClass('whitespace-pre-wrap');
    expect(names()).toEqual(['Cyberpunk', 'Alpha', 'Beta']);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
  });

  it('is translated to Portuguese', async () => {
    await show(fakes(), 'pt_BR');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Aplicativos');
    expect(screen.getByTestId('add-app')).toHaveTextContent('Adicionar Novo');
    expect(screen.getByTestId('alphabetize-apps')).toHaveTextContent('Ordem alfabética');
  });

  it('shows the close button only on the running app, and a launch link on the others', async () => {
    await show(fakes({ ...LISTING, currentApp: 'u-alpha' }));
    expect(screen.getByTestId('app-close-u-alpha')).toBeInTheDocument();
    expect(screen.queryByTestId('app-launch-u-alpha')).toBeNull();
    expect(screen.queryByTestId('app-close-u-cyber')).toBeNull();
    expect(screen.getByTestId('app-launch-u-cyber')).toHaveAttribute(
      'href',
      'art://launch?host_uuid=HOST-1&host_name=My PC&app_uuid=u-cyber&app_name=Cyberpunk',
    );
  });

  it('shows an empty state and the load error', async () => {
    const empty = fakes({ ...LISTING, apps: [] });
    await renderWithProviders(<AppsPage port={empty.port} browser={empty.browser} />);
    expect(await screen.findByTestId('apps-empty')).toHaveTextContent('No applications yet.');
  });

  it('shows the error when the list cannot be loaded', async () => {
    const f = fakes();
    f.port.list = vi.fn(() => Promise.reject(new Error('boom')));
    await renderWithProviders(<AppsPage port={f.port} browser={f.browser} />);
    expect(await screen.findByTestId('apps-error')).toHaveTextContent('Could not load the applications: boom');
  });
});

describe('AppsPage: order', () => {
  it('alphabetizes without saving, then offers Save Order', async () => {
    const f = fakes();
    const { user } = await show(f);
    await user.click(screen.getByTestId('alphabetize-apps'));
    expect(names()).toEqual(['Alpha', 'Beta', 'Cyberpunk']);
    expect(screen.queryByTestId('alphabetize-apps')).toBeNull();
    expect(screen.getByTestId('save-order')).toHaveTextContent('Save Order');
    expect(f.port.reorder).not.toHaveBeenCalled();
  });

  it('says so when the list is already alphabetical and does not mark it reordered', async () => {
    const sorted = { ...LISTING, apps: [...LISTING.apps].sort((a, b) => a.name.localeCompare(b.name)) };
    const { user } = await show(fakes(sorted));
    await user.click(screen.getByTestId('alphabetize-apps'));
    expect(notify.info).toHaveBeenCalledWith('Apps are already alphabetized.');
    expect(screen.queryByTestId('save-order')).toBeNull();
  });

  it('saves the shown order, reloads the list and drops the reordered state', async () => {
    const f = fakes();
    const { user } = await show(f);
    await user.click(screen.getByTestId('alphabetize-apps'));
    f.listings.push({ ...LISTING, apps: [LISTING.apps[1], LISTING.apps[2], LISTING.apps[0]] as AppsListing['apps'] });
    await user.click(screen.getByTestId('save-order'));
    await waitFor(() => expect(f.port.reorder).toHaveBeenCalledWith(['u-alpha', 'u-beta', 'u-cyber']));
    await waitFor(() => expect(screen.getByTestId('alphabetize-apps')).toBeInTheDocument());
    expect(f.port.list).toHaveBeenCalledTimes(2);
    expect(names()).toEqual(['Alpha', 'Beta', 'Cyberpunk']);
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('reports a failed save with the host error and reloads anyway', async () => {
    const f = fakes();
    f.port.reorder = vi.fn(() => Promise.resolve({ status: false, error: 'disk full' }));
    const { user } = await show(f);
    await user.click(screen.getByTestId('alphabetize-apps'));
    await user.click(screen.getByTestId('save-order'));
    await waitFor(() => expect(notify.error).toHaveBeenCalledWith('Failed to reorder apps: disk full'));
    await waitFor(() => expect(f.port.list).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(names()).toEqual(['Cyberpunk', 'Alpha', 'Beta']));
  });

  it('reports a request that threw as a failed save', async () => {
    const f = fakes();
    f.port.reorder = vi.fn(() => Promise.reject(new Error('offline')));
    const { user } = await show(f);
    await user.click(screen.getByTestId('alphabetize-apps'));
    await user.click(screen.getByTestId('save-order'));
    await waitFor(() => expect(notify.error).toHaveBeenCalledWith('Failed to reorder apps: offline'));
  });
});

describe('AppsPage: launch', () => {
  it('on this machine asks to launch and posts the uuid', async () => {
    const f = fakes();
    const { user } = await show(f);
    await user.click(screen.getByTestId('app-launch-u-alpha'));
    expect(await screen.findByText(/Are you sure you want to launch this app/)).toBeInTheDocument();
    await accept(user);
    await waitFor(() => expect(f.port.launch).toHaveBeenCalledWith('u-alpha'));
    await waitFor(() => expect(f.port.list).toHaveBeenCalledTimes(2));
    expect(f.browser.openLink).not.toHaveBeenCalled();
  });

  it('does nothing when the launch is cancelled', async () => {
    const f = fakes();
    const { user } = await show(f);
    await user.click(screen.getByTestId('app-launch-u-alpha'));
    await user.click(await screen.findByTestId('confirm-cancel'));
    expect(f.port.launch).not.toHaveBeenCalled();
    expect(f.port.list).toHaveBeenCalledTimes(1);
  });

  it('shows the host error when the launch fails', async () => {
    const f = fakes();
    f.port.launch = vi.fn(() => Promise.resolve({ status: false, error: 'No display' }));
    const { user } = await show(f);
    await user.click(screen.getByTestId('app-launch-u-alpha'));
    await accept(user);
    await waitFor(() => expect(notify.error).toHaveBeenCalledWith('App launch failed: No display'));
  });

  it('from another machine offers the local client first and opens the art:// link', async () => {
    const f = fakes(LISTING, '192.168.0.10');
    const { user } = await show(f);
    await user.click(screen.getByTestId('app-launch-u-alpha'));
    expect(
      await screen.findByText('Do you want to launch the app from local client on this device?'),
    ).toBeInTheDocument();
    await accept(user);
    expect(f.browser.openLink).toHaveBeenCalledWith(
      'art://launch?host_uuid=HOST-1&host_name=My PC&app_uuid=u-alpha&app_name=Alpha',
    );
    expect(f.port.launch).not.toHaveBeenCalled();
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  it('from another machine falls back to launching on the host when the local client is declined', async () => {
    const f = fakes(LISTING, 'helios.lan');
    const { user } = await show(f);
    await user.click(screen.getByTestId('app-launch-u-alpha'));
    await user.click(await screen.findByTestId('confirm-cancel'));
    expect(await screen.findByText(/Are you sure you want to launch this app/)).toBeInTheDocument();
    await accept(user);
    await waitFor(() => expect(f.port.launch).toHaveBeenCalledWith('u-alpha'));
    expect(f.browser.openLink).not.toHaveBeenCalled();
  });
});

describe('AppsPage: close and delete', () => {
  it('closes the running app after confirming', async () => {
    const f = fakes({ ...LISTING, currentApp: 'u-beta' });
    const { user } = await show(f);
    await user.click(screen.getByTestId('app-close-u-beta'));
    expect(await screen.findByText('Are you sure to terminate the current running app?')).toBeInTheDocument();
    await accept(user);
    await waitFor(() => expect(f.port.close).toHaveBeenCalledOnce());
    await waitFor(() => expect(f.port.list).toHaveBeenCalledTimes(2));
  });

  it('translates the close failure (the legacy page showed the raw key)', async () => {
    const f = fakes({ ...LISTING, currentApp: 'u-beta' });
    f.port.close = vi.fn(() => Promise.resolve({ status: false }));
    const { user } = await show(f);
    await user.click(screen.getByTestId('app-close-u-beta'));
    await accept(user);
    await waitFor(() => expect(notify.error).toHaveBeenCalledWith('App termination failed.'));
  });

  it('asks with the app name and deletes by uuid', async () => {
    const f = fakes();
    const { user } = await show(f);
    await user.click(screen.getByTestId('app-delete-u-cyber'));
    const dialog = await screen.findByTestId('confirm-dialog');
    expect(within(dialog).getByText('Are you sure you want to delete Cyberpunk?')).toBeInTheDocument();
    await accept(user);
    await waitFor(() => expect(f.port.remove).toHaveBeenCalledWith('u-cyber'));
    await waitFor(() => expect(f.port.list).toHaveBeenCalledTimes(2));
  });

  it('keeps names with markup characters as text in the question', async () => {
    const f = fakes({ ...LISTING, apps: [{ uuid: 'u-x', name: 'A & <b>B</b>' }] });
    const user = userEvent.setup();
    await renderWithProviders(<AppsPage port={f.port} browser={f.browser} />);
    await user.click(await screen.findByTestId('app-delete-u-x'));
    expect(await screen.findByText('Are you sure you want to delete A & <b>B</b>?')).toBeInTheDocument();
  });

  it('shows the delete error', async () => {
    const f = fakes();
    f.port.remove = vi.fn(() => Promise.resolve({ status: false, error: 'locked' }));
    const { user } = await show(f);
    await user.click(screen.getByTestId('app-delete-u-cyber'));
    await accept(user);
    await waitFor(() => expect(notify.error).toHaveBeenCalledWith('App delete failed: locked'));
  });

  it('does not delete when cancelled', async () => {
    const f = fakes();
    const { user } = await show(f);
    await user.click(screen.getByTestId('app-delete-u-cyber'));
    await user.click(await screen.findByTestId('confirm-cancel'));
    expect(f.port.remove).not.toHaveBeenCalled();
  });
});

describe('AppsPage: export and editor', () => {
  it('exports the launcher file on a double click of the name', async () => {
    const f = fakes();
    const { user } = await show(f);
    await user.dblClick(screen.getByTestId('app-name-u-alpha'));
    expect(f.browser.download).toHaveBeenCalledOnce();
    const file = vi.mocked(f.browser.download).mock.calls[0]?.[0];
    expect(file?.fileName).toBe('Alpha.art');
    expect(decodeURIComponent(file?.href.split(',')[1] ?? '')).toContain('# Selene app entry');
    expect(decodeURIComponent(file?.href.split(',')[1] ?? '')).toContain('[app_uuid] u-alpha');
  });

  it('opens the editor for a new app with export disabled, and goes back with Cancel', async () => {
    const { user } = await show(fakes());
    await user.click(screen.getByTestId('add-app'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('New App');
    expect(screen.getByTestId('editor-export')).toBeDisabled();
    expect(screen.getByTestId('editor-pending')).toBeInTheDocument();
    await user.click(screen.getByTestId('editor-cancel'));
    expect(await screen.findByTestId('apps-table')).toBeInTheDocument();
  });

  it('opens the editor for an existing app and exports it from there', async () => {
    const f = fakes();
    const { user } = await show(f);
    await user.click(screen.getByTestId('app-edit-u-beta'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Beta');
    await user.click(screen.getByTestId('editor-export'));
    expect(vi.mocked(f.browser.download).mock.calls[0]?.[0].fileName).toBe('Beta.art');
  });

  it('shows a placeholder title for an app without a name', async () => {
    const f = fakes({ ...LISTING, apps: [{ uuid: 'u-empty', name: '' }] });
    const user = userEvent.setup();
    await renderWithProviders(<AppsPage port={f.port} browser={f.browser} />);
    await user.click(await screen.findByTestId('app-edit-u-empty'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('< NO NAME >');
  });
});
