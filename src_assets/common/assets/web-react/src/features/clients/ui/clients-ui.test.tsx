import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientsPort, UpdateResult } from '@/features/clients/application/ports';
import { REFRESH_DELAY_MS, UNPAIR_ALL_STATUS_MS } from '@/features/clients/application/use-clients';
import type { PairedClient, UpdateClientPayload } from '@/features/clients/domain/client';
import { buildServerConfigDto, createTestI18n, jsonResponse, renderWithProviders } from '@/shared/testing';
import { PinPage } from './PinPage';

const TABLET: PairedClient = {
  uuid: 'tablet',
  name: 'Tablet',
  displayMode: '',
  perm: 0x03000000,
  connected: true,
  doCmds: [{ cmd: 'echo up', elevated: false }],
  undoCmds: [],
  allowClientCommands: true,
  enableLegacyOrdering: true,
  alwaysUseVirtualDisplay: false,
};

const PHONE: PairedClient = {
  ...TABLET,
  uuid: 'phone',
  name: '',
  perm: 0x07000000,
  connected: false,
  doCmds: [],
};

interface Setup {
  clients?: PairedClient[];
  platform?: 'windows' | 'linux' | 'macos';
  locale?: 'en' | 'pt_BR';
  update?: ClientsPort['update'];
  unpairAll?: ClientsPort['unpairAll'];
  list?: ClientsPort['list'];
}

async function setup({
  clients = [TABLET, PHONE],
  platform = 'windows',
  locale = 'en',
  update = async () => ({ ok: true }),
  unpairAll = async () => true,
  list,
}: Setup = {}) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse(buildServerConfigDto({ platform })));
  const port = {
    list: vi.fn(list ?? (async () => clients)),
    update: vi.fn(update),
    disconnect: vi.fn(async () => undefined),
    unpair: vi.fn(async () => undefined),
    unpairAll: vi.fn(unpairAll),
  } satisfies ClientsPort;
  const reload = vi.fn();
  const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
  await renderWithProviders(
    <PinPage
      port={port}
      reload={reload}
      renderPairing={(onPaired) => (
        <button type="button" data-testid="paired" onClick={onPaired}>
          paired
        </button>
      )}
    />,
    { i18n: await createTestI18n(locale) },
  );
  return { port, reload, user };
}

async function openEditor(user: ReturnType<typeof userEvent.setup>, uuid = 'tablet') {
  await user.click(await within(await screen.findByTestId(`client-${uuid}`)).findByTestId('client-edit'));
  return screen.findByTestId('client-editor');
}

function advance(ms: number) {
  return act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PinPage: list', () => {
  it('shows the title, the management header and one row per device', async () => {
    await setup();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('PIN');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Device Management');
    expect(screen.getByTestId('unpair-all')).toHaveTextContent('Unpair All');
    const tablet = await screen.findByTestId('client-tablet');
    expect(within(tablet).getByTestId('client-perm')).toHaveTextContent('[ 03 00 00 ]');
    expect(within(tablet).getByTestId('client-perm')).toHaveAttribute('data-danger', 'false');
    expect(within(tablet).getByTestId('client-name')).toHaveTextContent('Tablet');
    expect(within(tablet).getByTestId('client-connected')).toBeInTheDocument();
    expect(within(tablet).getByTestId('client-disconnect')).toBeInTheDocument();
    const phone = screen.getByTestId('client-phone');
    expect(within(phone).getByTestId('client-perm')).toHaveTextContent('[ 07 00 00 ]');
    expect(within(phone).getByTestId('client-perm')).toHaveAttribute('data-danger', 'true');
    expect(within(phone).getByTestId('client-name')).toHaveTextContent('Unknown Client');
    expect(within(phone).queryByTestId('client-disconnect')).toBeNull();
    expect(within(phone).queryByTestId('client-connected')).toBeNull();
  });

  it('points the permission documentation link at the Helios docs', async () => {
    await setup();
    await screen.findByTestId('client-tablet');
    const link = screen.getByTestId('permissions-docs');
    expect(link).toHaveAttribute('href', 'https://github.com/eumarcodev/Helios-Server/tree/master/docs');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows the empty state for an empty list', async () => {
    await setup({ clients: [] });
    expect(await screen.findByTestId('clients-empty')).toHaveTextContent('There are no paired devices.');
    expect(screen.queryByTestId('client-list')).toBeNull();
  });

  it('reloads the page when the list cannot be read', async () => {
    const { reload } = await setup({
      list: async () => {
        throw new Error('offline');
      },
    });
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('clients-empty')).toBeNull();
  });

  it('reads the list again when a pairing finishes', async () => {
    const { port, user } = await setup();
    await screen.findByTestId('client-tablet');
    expect(port.list).toHaveBeenCalledTimes(1);
    await user.click(screen.getByTestId('paired'));
    await waitFor(() => expect(port.list).toHaveBeenCalledTimes(2));
  });

  it('renders in Brazilian Portuguese', async () => {
    await setup({ locale: 'pt_BR' });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Gerenciamento de Dispositivos');
    expect(await screen.findByTestId('client-phone')).toHaveTextContent('Cliente desconhecido');
  });
});

describe('PinPage: editor', () => {
  it('opens the editor with the current values and the three permission groups', async () => {
    const { user } = await setup();
    const editor = await openEditor(user);
    expect(within(editor).getByTestId('edit-name')).toHaveValue('Tablet');
    expect(within(editor).getByTestId('edit-perm-badge')).toHaveTextContent('[ 03 00 00 ]');
    expect(
      within(screen.getByTestId('edit-permissions'))
        .getAllByTestId(/^perm-group-/)
        .map((group) => group.dataset['testid']),
    ).toEqual(['perm-group-action', 'perm-group-operation', 'perm-group-input']);
    expect(screen.queryByTestId('perm-file_upload')).toBeNull();
    expect(screen.queryByTestId('perm-file_dwnload')).toBeNull();
    expect(screen.getByTestId('edit-display-mode')).toHaveValue('');
    expect(screen.getByTestId('edit-display-mode')).toHaveAttribute('placeholder', '1920x1080x59.94');
    expect(screen.queryByTestId('client-tablet')).toBeNull();
  });

  it('shows implied permissions as granted and disabled, and toggles the others with XOR', async () => {
    const { user } = await setup();
    await openEditor(user);
    // 0x03000000 = list + view: list is implied by view; launch is off.
    expect(screen.getByTestId('perm-list')).toBeDisabled();
    expect(screen.getByTestId('perm-list')).toHaveAttribute('data-granted', 'true');
    expect(screen.getByTestId('perm-view')).toBeEnabled();
    expect(screen.getByTestId('perm-view')).toHaveAttribute('data-granted', 'true');
    expect(screen.getByTestId('perm-launch')).toHaveAttribute('data-granted', 'false');

    await user.click(screen.getByTestId('perm-launch'));
    expect(screen.getByTestId('edit-perm-badge')).toHaveTextContent('[ 07 00 00 ]');
    expect(screen.getByTestId('edit-perm-badge')).toHaveAttribute('data-danger', 'true');
    expect(screen.getByTestId('perm-view')).toBeDisabled();

    await user.click(screen.getByTestId('perm-launch'));
    expect(screen.getByTestId('edit-perm-badge')).toHaveTextContent('[ 03 00 00 ]');

    await user.click(screen.getByTestId('perm-input_kbd'));
    expect(screen.getByTestId('edit-perm-badge')).toHaveTextContent('[ 03 00 10 ]');
    await user.click(screen.getByTestId('perm-clipboard_set'));
    expect(screen.getByTestId('edit-perm-badge')).toHaveTextContent('[ 03 01 10 ]');
  });

  it('keeps one editor open: opening another device replaces it', async () => {
    const { user } = await setup();
    await openEditor(user);
    await user.type(screen.getByTestId('edit-name'), ' edited');
    await user.click(within(screen.getByTestId('client-phone')).getByTestId('client-edit'));
    expect(screen.getAllByTestId('client-editor')).toHaveLength(1);
    expect(screen.getByTestId('edit-name')).toHaveValue('');
    // The first device is back in the list with its original name.
    expect(within(screen.getByTestId('client-tablet')).getByTestId('client-name')).toHaveTextContent('Tablet');
  });

  it('restores every edited field on cancel', async () => {
    const { port, user } = await setup();
    await openEditor(user);
    await user.type(screen.getByTestId('edit-name'), ' x');
    await user.click(screen.getByTestId('perm-launch'));
    await user.type(screen.getByTestId('edit-display-mode'), '1x1x1');
    await user.click(screen.getByTestId('edit-cancel'));
    expect(screen.queryByTestId('client-editor')).toBeNull();
    expect(port.update).not.toHaveBeenCalled();
    const row = screen.getByTestId('client-tablet');
    expect(within(row).getByTestId('client-name')).toHaveTextContent('Tablet');
    expect(within(row).getByTestId('client-perm')).toHaveTextContent('[ 03 00 00 ]');
    await user.click(within(row).getByTestId('client-edit'));
    expect(screen.getByTestId('edit-name')).toHaveValue('Tablet');
    expect(screen.getByTestId('edit-display-mode')).toHaveValue('');
    expect(screen.getByTestId('edit-perm-badge')).toHaveTextContent('[ 03 00 00 ]');
  });

  it('closes the editor when the list is read again', async () => {
    const { user } = await setup();
    await openEditor(user);
    await user.click(screen.getByTestId('paired'));
    await waitFor(() => expect(screen.queryByTestId('client-editor')).toBeNull());
  });

  it('hides the Windows-only fields on other platforms', async () => {
    const { user } = await setup({ platform: 'linux' });
    await openEditor(user);
    await screen.findByTestId('allow_client_commands-default');
    expect(screen.queryByText('Always create virtual display')).toBeNull();
    expect(screen.getByText('Enable legacy ordering')).toBeInTheDocument();
    expect(screen.queryByText('Elevated')).toBeNull();
    expect(screen.queryByText('Run as Admin')).toBeNull();
  });

  it('shows the Windows-only fields on Windows', async () => {
    const { user } = await setup({ platform: 'windows' });
    await openEditor(user);
    expect(await screen.findByText('Always create virtual display')).toBeInTheDocument();
    expect(await screen.findByText('Run as Admin')).toBeInTheDocument();
    expect(screen.getAllByText('Elevated').length).toBeGreaterThan(0);
  });

  it('hides the command lists when client commands are not allowed', async () => {
    const { user } = await setup();
    await openEditor(user);
    expect(screen.getByTestId('client-do-field')).toBeInTheDocument();
    expect(screen.getByTestId('client-undo-field')).toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: /Allow client commands/ }));
    expect(screen.queryByTestId('client-commands')).toBeNull();
    await user.click(screen.getByRole('switch', { name: /Allow client commands/ }));
    expect(screen.getByTestId('client-do-field')).toBeInTheDocument();
  });

  it('adds, inserts after the clicked row and removes command rows', async () => {
    const { port, user } = await setup();
    await openEditor(user);
    await user.click(screen.getByTestId('client-do-cmd-insert-0'));
    await user.click(screen.getByTestId('client-undo-cmd-add'));
    const second = within(screen.getByTestId('client-do-cmd-row-1')).getByRole('textbox');
    await user.type(second, 'echo second');
    await user.click(screen.getByTestId('client-do-cmd-insert-0'));
    await user.type(within(screen.getByTestId('client-do-cmd-row-1')).getByRole('textbox'), 'echo middle');
    await user.type(within(screen.getByTestId('client-undo-cmd-row-0')).getByRole('textbox'), 'echo bye');
    await user.click(screen.getByTestId('client-do-cmd-add'));
    await user.click(screen.getByTestId('client-do-cmd-remove-3'));
    await user.click(screen.getByTestId('edit-save'));
    await waitFor(() => expect(port.update).toHaveBeenCalledTimes(1));
    const payload = port.update.mock.calls[0]![0];
    expect(payload.do.map((row) => row.cmd)).toEqual(['echo up', 'echo middle', 'echo second']);
    expect(payload.undo).toEqual([{ cmd: 'echo bye', elevated: 'false' }]);
  });
});

describe('PinPage: display mode', () => {
  it('flags an invalid override, blocks the save and accepts a valid one', async () => {
    const { port, user } = await setup();
    await openEditor(user);
    const input = screen.getByTestId('edit-display-mode');
    await user.type(input, '1920x1080');
    expect(await screen.findByTestId('edit-display-mode-error')).toHaveTextContent(
      'Invalid mode override. Format: [Width]x[Height]x[FPS]',
    );
    expect(screen.getByTestId('edit-save')).toBeDisabled();
    await user.type(screen.getByTestId('edit-name'), '{Enter}');
    expect(port.update).not.toHaveBeenCalled();
    await user.type(input, 'x59.94');
    await waitFor(() => expect(screen.queryByTestId('edit-display-mode-error')).toBeNull());
    expect(screen.getByTestId('edit-save')).toBeEnabled();
  });
});

describe('PinPage: save', () => {
  it('sends the exact payload, drops empty commands, closes the editor and refreshes after 1 s', async () => {
    const { port, user } = await setup();
    await openEditor(user);
    await user.clear(screen.getByTestId('edit-name'));
    await user.type(screen.getByTestId('edit-name'), 'Living room');
    await user.click(screen.getByTestId('perm-launch'));
    await user.type(screen.getByTestId('edit-display-mode'), ' 1920x1080x59.94 ');
    await user.click(screen.getByRole('switch', { name: /Enable legacy ordering/ }));
    await user.click(screen.getByRole('switch', { name: /Always create virtual display/ }));
    await user.click(screen.getByTestId('client-do-cmd-add'));
    await user.type(within(screen.getByTestId('client-do-cmd-row-1')).getByRole('textbox'), '   ');
    await user.click(screen.getByTestId('client-undo-cmd-add'));
    await user.type(within(screen.getByTestId('client-undo-cmd-row-0')).getByRole('textbox'), '  stop  ');
    expect(port.list).toHaveBeenCalledTimes(1);
    await user.click(screen.getByTestId('edit-save'));

    await waitFor(() => expect(port.update).toHaveBeenCalledTimes(1));
    expect(port.update).toHaveBeenCalledWith({
      uuid: 'tablet',
      name: 'Living room',
      display_mode: '1920x1080x59.94',
      allow_client_commands: true,
      enable_legacy_ordering: false,
      always_use_virtual_display: true,
      perm: 0x07000000,
      do: [{ cmd: 'echo up', elevated: false }],
      undo: [{ cmd: 'stop', elevated: 'false' }],
    } satisfies UpdateClientPayload);
    expect(screen.queryByTestId('client-editor')).toBeNull();
    // Refreshed right after the answer and again one second later.
    await waitFor(() => expect(port.list).toHaveBeenCalledTimes(2));
    await advance(REFRESH_DELAY_MS);
    expect(port.list).toHaveBeenCalledTimes(3);
    expect(screen.queryByTestId('save-error')).toBeNull();
  });

  it('saves with Enter in the name field', async () => {
    const { port, user } = await setup();
    await openEditor(user);
    await user.type(screen.getByTestId('edit-name'), '2{Enter}');
    await waitFor(() => expect(port.update).toHaveBeenCalledTimes(1));
    expect(port.update.mock.calls[0]![0].name).toBe('Tablet2');
  });

  it('shows the error title with the host message when the update is refused, and still refreshes', async () => {
    const refused: UpdateResult = { ok: false, message: 'unknown client' };
    const { port, user } = await setup({ update: async () => refused });
    await openEditor(user);
    await user.click(screen.getByTestId('edit-save'));
    expect(await screen.findByTestId('save-error')).toHaveTextContent('Error while saving client: unknown client');
    await advance(REFRESH_DELAY_MS);
    expect(port.list.mock.calls.length).toBeGreaterThanOrEqual(2);
    await user.click(screen.getByTestId('save-error-dismiss'));
    expect(screen.queryByTestId('save-error')).toBeNull();
  });

  it('shows the error when the request itself fails', async () => {
    await setup({
      update: async () => {
        throw new Error('offline');
      },
    }).then(async ({ user }) => {
      await openEditor(user);
      await user.click(screen.getByTestId('edit-save'));
      expect(await screen.findByTestId('save-error')).toHaveTextContent('Error while saving client: Error: offline');
    });
  });
});

describe('PinPage: disconnect and unpair', () => {
  it('disconnects a device and refreshes after 1 s', async () => {
    const { port, user } = await setup();
    await user.click(await within(await screen.findByTestId('client-tablet')).findByTestId('client-disconnect'));
    await waitFor(() => expect(port.disconnect).toHaveBeenCalledWith('tablet'));
    expect(port.list).toHaveBeenCalledTimes(1);
    await advance(REFRESH_DELAY_MS);
    expect(port.list).toHaveBeenCalledTimes(2);
  });

  it('unpairs one device, shows the notice until dismissed and refreshes', async () => {
    const { port, user } = await setup();
    await user.click(await within(await screen.findByTestId('client-phone')).findByTestId('client-unpair'));
    await waitFor(() => expect(port.unpair).toHaveBeenCalledWith('phone'));
    expect(await screen.findByTestId('unpair-notice')).toHaveTextContent('However, the device(s) may still be in');
    await waitFor(() => expect(port.list).toHaveBeenCalledTimes(2));
    await user.click(screen.getByTestId('unpair-notice-dismiss'));
    expect(screen.queryByTestId('unpair-notice')).toBeNull();
  });
});

describe('PinPage: unpair all', () => {
  it('asks first and does nothing when cancelled', async () => {
    const { port, user } = await setup();
    await screen.findByTestId('client-tablet');
    await user.click(screen.getByTestId('unpair-all'));
    expect(await screen.findByTestId('confirm-dialog')).toHaveTextContent('Unpair all devices?');
    await user.click(screen.getByTestId('confirm-cancel'));
    expect(port.unpairAll).not.toHaveBeenCalled();
    expect(screen.queryByTestId('unpair-all-status')).toBeNull();
  });

  it('unpairs everything, disables the button meanwhile, reports and clears the banner after 5 s', async () => {
    let finish: (status: boolean) => void = () => undefined;
    const { port, user } = await setup({
      unpairAll: () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    });
    await screen.findByTestId('client-tablet');
    await user.click(screen.getByTestId('unpair-all'));
    await user.click(await screen.findByTestId('confirm-accept'));
    await waitFor(() => expect(port.unpairAll).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('unpair-all')).toBeDisabled();
    await act(async () => finish(true));
    expect(await screen.findByTestId('unpair-all-status')).toHaveTextContent('All devices unpaired.');
    expect(screen.getByTestId('unpair-all-status')).toHaveAttribute('data-status', 'success');
    expect(screen.getByTestId('unpair-all')).toBeEnabled();
    await waitFor(() => expect(port.list).toHaveBeenCalledTimes(2));
    await advance(UNPAIR_ALL_STATUS_MS);
    expect(screen.queryByTestId('unpair-all-status')).toBeNull();
  });

  it('reports a refused or failed unpair-all and enables the button again', async () => {
    const { user } = await setup({ unpairAll: async () => false });
    await screen.findByTestId('client-tablet');
    await user.click(screen.getByTestId('unpair-all'));
    await user.click(await screen.findByTestId('confirm-accept'));
    expect(await screen.findByTestId('unpair-all-status')).toHaveTextContent('Error while unpairing');
    expect(screen.getByTestId('unpair-all-status')).toHaveAttribute('data-status', 'error');
    expect(screen.getByTestId('unpair-all')).toBeEnabled();
  });

  it('treats a request that throws as an error', async () => {
    const { user } = await setup({
      unpairAll: async () => {
        throw new Error('offline');
      },
    });
    await screen.findByTestId('client-tablet');
    await user.click(screen.getByTestId('unpair-all'));
    await user.click(await screen.findByTestId('confirm-accept'));
    expect(await screen.findByTestId('unpair-all-status')).toHaveAttribute('data-status', 'error');
    expect(screen.getByTestId('unpair-all')).toBeEnabled();
  });
});
