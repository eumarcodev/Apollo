import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigModel } from '@/features/config/domain/config-model';
import { parseLoadedConfig, serializeConfig } from '@/features/config/domain/config-model';
import { visibleTabs } from '@/features/config/domain/config-tabs';
import type { Platform } from '@/shared/kernel';
import { createTestI18n, renderWithProviders } from '@/shared/testing';
import { GeneralTab } from './GeneralTab';

function load(platform: Platform, dto: Record<string, unknown> = {}): ConfigModel {
  return parseLoadedConfig({ status: true, platform, ...dto }, platform, visibleTabs(platform)).config;
}

/** Holds the model like the config editor does and exposes it to the assertions. */
function Harness({
  initial,
  platform,
  onModel,
}: {
  initial: ConfigModel;
  platform: Platform;
  onModel: (m: ConfigModel) => void;
}) {
  const [config, setConfig] = useState(initial);
  return (
    <GeneralTab
      config={config}
      platform={platform}
      vdisplayStatus={0}
      update={(key, value) => {
        const next = { ...config, [key]: value } as ConfigModel;
        setConfig(next);
        onModel(next);
      }}
    />
  );
}

async function renderTab(
  dto: Record<string, unknown> = {},
  platform: Platform = 'windows',
  locale: 'en' | 'pt_BR' = 'en',
) {
  const models: ConfigModel[] = [];
  const initial = load(platform, dto);
  const i18n = await createTestI18n(locale);
  const user = userEvent.setup();
  const view = await renderWithProviders(
    <Harness initial={initial} platform={platform} onModel={(m) => models.push(m)} />,
    {
      i18n,
    },
  );
  return { ...view, user, last: () => models[models.length - 1] };
}

/** The element carrying the option key as id (the input of a switch, the trigger of a select). */
function byId(id: string): HTMLElement {
  return document.getElementById(id) as HTMLElement;
}

async function pick(user: ReturnType<typeof userEvent.setup>, id: string, option: RegExp | string) {
  await user.click(byId(id));
  await user.click(await screen.findByRole('option', { name: option }));
}

beforeEach(() => {
  Element.prototype.getAnimations ??= () => [];
});

describe('GeneralTab', () => {
  it('gives every field its option key as DOM id', async () => {
    await renderTab();
    for (const id of [
      'locale',
      'sunshine_name',
      'min_log_level',
      'global_prep_cmd',
      'global_state_cmd',
      'server_cmd',
      'enable_pairing',
      'enable_discovery',
      'update_channel',
      'system_tray',
      'hide_tray_controls',
    ]) {
      expect(document.getElementById(id), id).not.toBeNull();
    }
  });

  it('shows the defaults of a server that sent nothing (enable_pairing is enabled)', async () => {
    await renderTab();
    expect(byId('enable_pairing')).toBeChecked();
    expect(byId('enable_discovery')).toBeChecked();
    expect(byId('system_tray')).toBeChecked();
    expect(byId('hide_tray_controls')).not.toBeChecked();
    expect(document.getElementById('locale')).toHaveTextContent('English');
    expect(document.getElementById('min_log_level')).toHaveTextContent('Info');
    expect(document.getElementById('update_channel')).toHaveTextContent('Automatic');
  });

  it('shows the default hints of the switches (copied from the legacy defaults)', async () => {
    await renderTab();
    expect(screen.getByTestId('enable_pairing-default')).toHaveTextContent('Default: checked');
    expect(screen.getByTestId('hide_tray_controls-default')).toHaveTextContent('Default: unchecked');
  });

  it('edits the server name with the Helios placeholder', async () => {
    const { user, last } = await renderTab({ sunshine_name: 'Old' });
    const input = screen.getByRole('textbox', { name: 'Server Name' });
    expect(input).toHaveAttribute('placeholder', 'Helios');
    expect(input).toHaveValue('Old');
    await user.clear(input);
    await user.type(input, 'My PC');
    expect(last()?.['sunshine_name']).toBe('My PC');
  });

  it('writes the log level as a string and updates the channel', async () => {
    const { user, last } = await renderTab({ min_log_level: '2' });
    await pick(user, 'min_log_level', 'Warning');
    expect(last()?.['min_log_level']).toBe('3');
    await pick(user, 'update_channel', /^Stable only/);
    expect(last()?.['update_channel']).toBe('stable');
    await pick(user, 'update_channel', /^Automatic/);
    expect(last()?.['update_channel']).toBe('');
  });

  it('offers only English and Portuguese (Brazil) for the locale', async () => {
    const { user, last } = await renderTab();
    await user.click(byId('locale'));
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['English', 'Português (Brasil)']);
    await user.click(options[1] as HTMLElement);
    expect(last()?.['locale']).toBe('pt_BR');
  });

  it('keeps a locale the server accepts as an extra option and does not change it on save', async () => {
    const { user } = await renderTab({ locale: 'de' });
    const root = document.getElementById('locale') as HTMLElement;
    expect(root).toHaveTextContent('de');
    await user.click(root);
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['English', 'Português (Brasil)', 'de']);
    const model = load('windows', { locale: 'de' });
    expect(serializeConfig(model, undefined, visibleTabs('windows')).payload['locale']).toBe('de');
  });

  it('keeps the spelling of the switch values', async () => {
    const { user, last } = await renderTab({ enable_pairing: 'enabled', hide_tray_controls: 'false' });
    await user.click(byId('enable_pairing'));
    expect(last()?.['enable_pairing']).toBe('disabled');
    await user.click(byId('hide_tray_controls'));
    expect(last()?.['hide_tray_controls']).toBe('true');
  });

  it('adds, inserts, edits and removes prep commands on Windows (with elevated)', async () => {
    const { user, last } = await renderTab({}, 'windows');
    const section = document.getElementById('global_prep_cmd') as HTMLElement;
    await user.click(within(section).getByTestId('global_prep_cmd-add'));
    expect(last()?.global_prep_cmd).toEqual([{ do: '', undo: '', elevated: false }]);
    await user.type(within(section).getByRole('textbox', { name: 'Do Command' }), 'echo a');
    await user.type(within(section).getByRole('textbox', { name: 'Undo Command' }), 'echo b');
    await user.click(within(section).getByRole('switch'));
    expect(last()?.global_prep_cmd).toEqual([{ do: 'echo a', undo: 'echo b', elevated: true }]);
    await user.click(within(section).getByTestId('global_prep_cmd-insert-0'));
    expect(last()?.global_prep_cmd).toHaveLength(2);
    expect(last()?.global_prep_cmd[0]).toEqual({ do: '', undo: '', elevated: false });
    await user.click(within(section).getByTestId('global_prep_cmd-remove-0'));
    expect(last()?.global_prep_cmd).toEqual([{ do: 'echo a', undo: 'echo b', elevated: true }]);
    expect(last()?.global_state_cmd).toEqual([]);
  });

  it('adds state commands without elevated outside Windows', async () => {
    const { user, last } = await renderTab({}, 'linux');
    const section = document.getElementById('global_state_cmd') as HTMLElement;
    await user.click(within(section).getByTestId('global_state_cmd-add'));
    expect(last()?.global_state_cmd).toEqual([{ do: '', undo: '' }]);
    expect(within(section).queryByRole('switch')).toBeNull();
  });

  it('edits the server commands (name, monospace command, elevated on Windows only)', async () => {
    const { user, last, unmount } = await renderTab({}, 'windows');
    const section = document.getElementById('server_cmd') as HTMLElement;
    await user.click(within(section).getByTestId('server_cmd-add'));
    expect(last()?.server_cmd).toEqual([{ name: '', cmd: '', elevated: false }]);
    await user.type(within(section).getByRole('textbox', { name: 'Command Name' }), 'Reboot');
    const cmd = within(section).getByRole('textbox', { name: 'Command Value' });
    expect(cmd).toHaveClass('font-mono');
    await user.type(cmd, 'shutdown /r');
    expect(last()?.server_cmd).toEqual([{ name: 'Reboot', cmd: 'shutdown /r', elevated: false }]);
    unmount();

    const linux = await renderTab({}, 'linux');
    const linuxSection = document.getElementById('server_cmd') as HTMLElement;
    await linux.user.click(within(linuxSection).getByTestId('server_cmd-add'));
    expect(linux.last()?.server_cmd).toEqual([{ name: '', cmd: '' }]);
    expect(within(linuxSection).queryByRole('switch')).toBeNull();
  });

  it('links Learn More to the Helios docs in a new tab', async () => {
    await renderTab();
    const link = screen.getByTestId('server_cmd-learn-more');
    expect(link).toHaveAttribute('href', 'https://github.com/eumarcodev/Helios-Server/tree/master/docs');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveTextContent('Learn More');
  });

  it('translates the labels to pt_BR', async () => {
    await renderTab({}, 'windows', 'pt_BR');
    expect(screen.getByRole('textbox', { name: 'Nome do servidor' })).toBeInTheDocument();
    expect(document.getElementById('locale')).toHaveTextContent('English');
  });

  it('scrolls nothing and warns nothing on a valid render', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await renderTab({ enable_pairing: 'enabled' });
    expect(error).not.toHaveBeenCalled();
  });
});
