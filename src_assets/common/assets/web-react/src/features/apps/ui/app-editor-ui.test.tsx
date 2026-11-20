import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult, AppsBrowser, AppsPort } from '@/features/apps/application/ports';
import { editDraft, newAppDraft, NEW_APP_TEMPLATE, type AppEntry } from '@/features/apps/domain/app-entry';
import type { AppsListing } from '@/features/apps/domain/app-list';
import type { Platform } from '@/shared/kernel';
import { buildServerConfigDto, createTestI18n, jsonResponse, renderWithProviders } from '@/shared/testing';
import { notify } from '@/shared/ui';
import { AppEditor } from './AppEditor';
import { AppsPage } from './AppsPage';

const LISTING: AppsListing = {
  apps: [{ uuid: 'u-alpha', name: 'Alpha', cmd: 'alpha.exe', 'prep-cmd': [{ do: 'x', undo: 'y', elevated: true }] }],
  currentApp: '',
  hostName: 'My PC',
  hostUuid: 'HOST-1',
};

function mockPlatform(platform: Platform) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    Promise.resolve(jsonResponse(buildServerConfigDto({ platform }))),
  );
}

function fakePort(save: AppsPort['save'] = vi.fn(() => Promise.resolve<ActionResult>({ status: true }))): AppsPort {
  return {
    list: vi.fn(() => Promise.resolve(LISTING)),
    reorder: vi.fn(),
    launch: vi.fn(),
    close: vi.fn(),
    remove: vi.fn(),
    save,
  };
}

const browser: AppsBrowser = { hostname: 'localhost', openLink: vi.fn(), download: vi.fn() };

interface EditorOptions {
  initial?: AppEntry;
  platform?: Platform | null;
  busy?: boolean;
  locale?: 'en' | 'pt_BR';
}

async function showEditor({
  initial = newAppDraft(),
  platform = 'windows',
  busy = false,
  locale = 'en',
}: EditorOptions = {}) {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const onCancel = vi.fn();
  const onExport = vi.fn();
  await renderWithProviders(
    <AppEditor
      initial={initial}
      platform={platform}
      busy={busy}
      onSave={onSave}
      onCancel={onCancel}
      onExport={onExport}
      nameAddon={<span data-testid="addon">cover</span>}
    />,
    { i18n: await createTestI18n(locale) },
  );
  return { user, onSave, onCancel, onExport };
}

/** Replace the value of a field (paste is much faster than typing under a loaded test run). */
async function fill(user: ReturnType<typeof userEvent.setup>, testId: string, value: string) {
  await user.clear(screen.getByTestId(testId));
  await user.paste(value);
}

function lastSaved(onSave: ReturnType<typeof vi.fn>): AppEntry {
  return onSave.mock.calls.at(-1)?.[0] as AppEntry;
}

beforeEach(() => {
  vi.spyOn(notify, 'error').mockReturnValue('t');
  mockPlatform('windows');
});

describe('AppEditor: fields', () => {
  it('shows every field of a new app with the template values (Windows)', async () => {
    await showEditor();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('New App');
    expect(screen.getByTestId('appName')).toHaveValue('New App');
    expect(screen.getByTestId('cover-finder-slot')).toContainElement(screen.getByTestId('addon'));
    expect(screen.getByTestId('appImagePath')).toHaveValue('');
    expect(screen.getByTestId('appCmd')).toHaveValue('');
    expect(screen.getByTestId('gamepad-trigger')).toHaveTextContent('Default (Global)');
    expect(screen.getByRole('switch', { name: /Run as Admin/ })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: /Allow client prepare commands/ })).toBeChecked();
    // Inverse values: exclude-global false = "use global commands" on.
    expect(screen.getByRole('switch', { name: /Global Prep Commands/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Global Resume\/Pause Commands/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Continue streaming if the application exits quickly/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Continue streaming until all app processes exit/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Terminate on Pause/ })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: /Always create Virtual Display/ })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: /Use App Identity/ })).not.toBeChecked();
    expect(screen.queryByRole('switch', { name: /Per Client App Identity/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('exitTimeout')).toHaveValue('5');
    expect(screen.getByTestId('exitTimeout')).toHaveAttribute('placeholder', '5');
    expect(screen.getByTestId('scale-factor-label')).toHaveTextContent('Resolution Scale Factor: 100%');
    expect(screen.getByTestId('appElevation-default')).toHaveTextContent('Default: unchecked');
    expect(screen.getByTestId('clientCommands-default')).toHaveTextContent('Default: checked');
    expect(screen.getByTestId('excludeGlobal_prep-default')).toHaveTextContent('Default: checked');
    expect(screen.getByTestId('env-example')).toHaveTextContent('rtss-cli.exe limit:set %HELIOS_CLIENT_FPS%');
    expect(screen.getByTestId('env-see-more')).toHaveAttribute(
      'href',
      'https://github.com/eumarcodev/Helios-Server/blob/master/docs/app_examples.md',
    );
    expect(within(screen.getByTestId('env-vars-table')).getAllByRole('row')).toHaveLength(15);
    expect(screen.getByTestId('env_sunshine_compatibility')).toBeInTheDocument();
    expect(screen.getByTestId('env_legacy_alias_compatibility')).toBeInTheDocument();
  });

  it('hides the Windows-only fields on Linux and offers the Linux example', async () => {
    await showEditor({ platform: 'linux' });
    expect(screen.queryByRole('switch', { name: /Run as Admin/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('scale-factor')).not.toBeInTheDocument();
    expect(screen.getByTestId('gamepad-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('env-example')).toHaveTextContent('Example - Xrandr for Resolution Automation:');
  });

  it('hides the gamepad override on macOS', async () => {
    await showEditor({ platform: 'macos' });
    expect(screen.queryByTestId('gamepad-trigger')).not.toBeInTheDocument();
    expect(screen.getByTestId('env-example')).toHaveTextContent('displayplacer');
  });

  it('shows no platform example while the platform is unknown', async () => {
    await showEditor({ platform: null });
    expect(screen.queryByTestId('env-example')).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /Run as Admin/ })).not.toBeInTheDocument();
  });

  it('shows the placeholder title and disables save for a blank name', async () => {
    const { user, onSave } = await showEditor();
    await user.clear(screen.getByTestId('appName'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('< NO NAME >');
    await user.type(screen.getByTestId('appName'), '   ');
    expect(screen.getByTestId('editor-save')).toBeDisabled();
    expect(screen.getByTestId('editor-save-bottom')).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('disables save while busy and export without uuid', async () => {
    await showEditor({ busy: true });
    expect(screen.getByTestId('editor-save')).toBeDisabled();
    expect(screen.getByTestId('editor-export')).toBeDisabled();
  });

  it('is translated to Portuguese', async () => {
    await showEditor({ locale: 'pt_BR' });
    expect(screen.getByTestId('editor-general')).toHaveTextContent('Geral');
    expect(screen.getByTestId('editor-save')).toHaveTextContent('Salvar');
    expect(screen.getByTestId('env_legacy_alias_compatibility')).toHaveTextContent('aliases antigos');
  });
});

describe('AppEditor: editing', () => {
  it('edits the text fields and switches and saves the draft', async () => {
    const { user, onSave } = await showEditor();
    await fill(user, 'appName', 'Game');
    await fill(user, 'appImagePath', 'C:\\cover.png');
    await fill(user, 'appCmd', 'game.exe');
    await fill(user, 'appWorkingDir', 'C:\\games');
    await fill(user, 'appOutput', 'out.txt');
    await fill(user, 'exitTimeout', '12');
    await user.tab();
    await user.click(screen.getByRole('switch', { name: /Run as Admin/ }));
    await user.click(screen.getByRole('switch', { name: /Global Prep Commands/ }));
    await user.click(screen.getByRole('switch', { name: /Terminate on Pause/ }));
    await user.click(screen.getByRole('switch', { name: /Use App Identity/ }));
    await user.click(await screen.findByRole('switch', { name: /Per Client App Identity/ }));
    await user.click(screen.getByTestId('editor-save'));
    expect(lastSaved(onSave)).toMatchObject({
      name: 'Game',
      'image-path': 'C:\\cover.png',
      cmd: 'game.exe',
      'working-dir': 'C:\\games',
      output: 'out.txt',
      elevated: true,
      'exclude-global-prep-cmd': true,
      'exclude-global-state-cmd': false,
      'terminate-on-pause': true,
      'use-app-identity': true,
      'per-client-app-identity': true,
      'exit-timeout': 12,
    });
  });

  it('edits the detached and prep/state lists (Windows rows carry elevated: false)', async () => {
    const { user, onSave } = await showEditor();
    // Detached: add two, insert one before the first, remove the last.
    await user.click(screen.getByTestId('detached-add'));
    await user.click(screen.getByTestId('detached-row-0').querySelector('input') as HTMLInputElement);
    await user.paste('a.exe');
    await user.click(screen.getByTestId('detached-add'));
    await user.click(screen.getByTestId('detached-insert-0'));
    await user.click(screen.getByTestId('detached-remove-2'));
    await user.click(screen.getByTestId('prep-cmd-add'));
    await user.click(screen.getByTestId('prep-cmd-row-0').querySelectorAll('input')[0] as HTMLInputElement);
    await user.paste('do.bat');
    await user.click(screen.getByTestId('state-cmd-add'));
    await user.click(screen.getByTestId('editor-save'));
    expect(lastSaved(onSave)).toMatchObject({
      detached: ['', 'a.exe'],
      'prep-cmd': [{ do: 'do.bat', undo: '', elevated: false }],
      'state-cmd': [{ do: '', undo: '', elevated: false }],
    });
  });

  it('adds Linux rows without elevated and keeps the fields it does not show', async () => {
    const initial = editDraft({ uuid: 'u-1', name: 'Old', 'custom-field': 'kept' });
    const { user, onSave } = await showEditor({ initial, platform: 'linux' });
    await user.click(screen.getByTestId('prep-cmd-add'));
    await user.click(screen.getByTestId('prep-cmd-insert-0'));
    await user.click(screen.getByTestId('editor-save-bottom'));
    expect(lastSaved(onSave)).toMatchObject({
      uuid: 'u-1',
      'custom-field': 'kept',
      'prep-cmd': [
        { do: '', undo: '' },
        { do: '', undo: '' },
      ],
    });
    expect((lastSaved(onSave)['prep-cmd'] as object[])[0]).not.toHaveProperty('elevated');
  });

  it('picks a gamepad override and goes back to the global default', async () => {
    const { user, onSave } = await showEditor({ platform: 'linux' });
    await user.click(screen.getByTestId('gamepad-trigger'));
    await user.click(await screen.findByRole('option', { name: 'DS5 (PS5)' }, { timeout: 5000 }));
    await user.click(screen.getByTestId('editor-save'));
    expect(lastSaved(onSave).gamepad).toBe('ds5');
    await user.click(screen.getByTestId('gamepad-trigger'));
    await user.click(await screen.findByRole('option', { name: 'Default (Global)' }, { timeout: 5000 }));
    await user.click(screen.getByTestId('editor-save'));
    expect(lastSaved(onSave).gamepad).toBe('');
  });

  it('moves the scale factor with the keyboard and shows the value', async () => {
    const { user, onSave } = await showEditor();
    act(() => screen.getByRole('slider').focus());
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByTestId('scale-factor-label')).toHaveTextContent('Resolution Scale Factor: 102%');
    await user.click(screen.getByTestId('editor-save'));
    expect(lastSaved(onSave)['scale-factor']).toBe(102);
  });

  it('clears the exit timeout to an empty value', async () => {
    const { user, onSave } = await showEditor();
    await user.clear(screen.getByTestId('exitTimeout'));
    await user.tab();
    await user.click(screen.getByTestId('editor-save'));
    expect(lastSaved(onSave)['exit-timeout']).toBe('');
  });

  it('exports the edited app and cancels', async () => {
    const { user, onExport, onCancel } = await showEditor({ initial: editDraft({ uuid: 'u-1', name: 'Old' }) });
    await user.type(screen.getByTestId('appName'), ' New');
    await user.click(screen.getByTestId('editor-export'));
    expect(onExport).toHaveBeenCalledWith(expect.objectContaining({ uuid: 'u-1', name: 'Old New' }));
    await user.click(screen.getByTestId('editor-cancel-bottom'));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

describe('AppsPage: save flow', () => {
  async function openNew(port: AppsPort) {
    const user = userEvent.setup();
    await renderWithProviders(<AppsPage port={port} browser={browser} />);
    await user.click(await screen.findByTestId('add-app'));
    await screen.findByTestId('app-editor');
    return user;
  }

  it('posts the normalised new app, closes the editor and reloads the list', async () => {
    const port = fakePort();
    const user = await openNew(port);
    await user.clear(screen.getByTestId('appName'));
    await user.type(screen.getByTestId('appName'), '  Game  ');
    await user.click(screen.getByTestId('editor-save'));
    await screen.findByTestId('apps-table');
    expect(port.save).toHaveBeenCalledWith({ ...NEW_APP_TEMPLATE, name: 'Game' });
    expect(port.list).toHaveBeenCalledTimes(2);
  });

  it('keeps the editor open and shows the host error when the save fails', async () => {
    const port = fakePort(vi.fn(() => Promise.resolve<ActionResult>({ status: false, error: 'disk full' })));
    const user = await openNew(port);
    await user.click(screen.getByTestId('editor-save'));
    await waitFor(() => expect(notify.error).toHaveBeenCalledWith('Failed to save app: disk full'));
    expect(screen.getByTestId('app-editor')).toBeInTheDocument();
    expect(port.list).toHaveBeenCalledTimes(1);
  });

  it('reports a request that throws as a failed save', async () => {
    const port = fakePort(vi.fn(() => Promise.reject(new Error('offline'))));
    const user = await openNew(port);
    await user.click(screen.getByTestId('editor-save'));
    await waitFor(() => expect(notify.error).toHaveBeenCalledWith('Failed to save app: offline'));
  });

  it('edits an existing app with its saved values', async () => {
    const port = fakePort();
    const user = userEvent.setup();
    await renderWithProviders(<AppsPage port={port} browser={browser} />);
    await user.click(await screen.findByTestId('app-edit-u-alpha'));
    expect(await screen.findByTestId('appCmd')).toHaveValue('alpha.exe');
    await waitFor(() => expect(screen.getByTestId('prep-cmd-row-0')).toBeInTheDocument());
    await user.click(screen.getByTestId('editor-save'));
    await screen.findByTestId('apps-table');
    expect(port.save).toHaveBeenCalledWith(
      expect.objectContaining({ uuid: 'u-alpha', name: 'Alpha', 'prep-cmd': [{ do: 'x', undo: 'y', elevated: true }] }),
    );
  });
});
