import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigModel } from '@/features/config/domain/config-model';
import { parseLoadedConfig } from '@/features/config/domain/config-model';
import { visibleTabs } from '@/features/config/domain/config-tabs';
import type { Platform } from '@/shared/kernel';
import { createTestI18n, renderWithProviders } from '@/shared/testing';
import { InputTab } from './InputTab';

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
    <InputTab
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
    { i18n },
  );
  return { ...view, user, last: () => models[models.length - 1] };
}

/** The element carrying the option key as id (the input of a switch, the trigger of a select). */
function byId(id: string): HTMLElement | null {
  return document.getElementById(id);
}

async function pick(user: ReturnType<typeof userEvent.setup>, id: string, option: RegExp | string) {
  await user.click(byId(id) as HTMLElement);
  await user.click(await screen.findByRole('option', { name: option }));
}

beforeEach(() => {
  Element.prototype.getAnimations ??= () => [];
});

describe('InputTab', () => {
  it('shows the defaults of a server that sent nothing on Windows', async () => {
    await renderTab({}, 'windows');
    expect(byId('controller')).toBeChecked();
    expect(byId('keyboard')).toBeChecked();
    expect(byId('mouse')).toBeChecked();
    expect(byId('always_send_scancodes')).toBeChecked();
    expect(byId('key_rightalt_to_key_win')).not.toBeChecked();
    expect(byId('enable_input_only_mode')).not.toBeChecked();
    expect(byId('forward_rumble')).toBeChecked();
    expect(byId('gamepad')).toHaveTextContent('Automatic');
    expect(screen.getByRole('textbox', { name: 'Home/Guide Button Emulation Timeout' })).toHaveValue('-1');
    expect(screen.getByRole('textbox', { name: 'Key Repeat Delay' })).toHaveValue('500');
    expect(screen.getByRole('textbox', { name: 'Key Repeat Frequency' })).toHaveValue('24.9');
  });

  it('gives every field of the platform its option key as DOM id', async () => {
    await renderTab({}, 'windows');
    for (const id of [
      'controller',
      'gamepad',
      'motion_as_ds4',
      'touchpad_as_ds4',
      'ds4_back_as_touchpad_click',
      'back_button_timeout',
      'keyboard',
      'key_repeat_delay',
      'key_repeat_frequency',
      'always_send_scancodes',
      'key_rightalt_to_key_win',
      'mouse',
      'high_resolution_scrolling',
      'native_pen_touch',
      'enable_input_only_mode',
      'forward_rumble',
    ]) {
      expect(byId(id), id).not.toBeNull();
    }
    expect(byId('ds5_inputtino_randomize_mac')).toBeNull();
  });

  it('shows the Linux fields and hides the Windows-only ones on Linux', async () => {
    await renderTab({}, 'linux');
    expect(byId('ds5_inputtino_randomize_mac')).not.toBeNull();
    expect(byId('motion_as_ds4')).not.toBeNull();
    expect(byId('ds4_back_as_touchpad_click')).toBeNull();
    expect(byId('key_repeat_delay')).toBeNull();
    expect(byId('always_send_scancodes')).toBeNull();
    expect(byId('forward_rumble')).toBeNull();
    expect(byId('key_rightalt_to_key_win')).not.toBeNull();
  });

  it('hides the gamepad select on macOS but keeps the rest of the tab', async () => {
    await renderTab({}, 'macos');
    expect(byId('gamepad')).toBeNull();
    expect(byId('controller')).not.toBeNull();
    expect(byId('back_button_timeout')).not.toBeNull();
    expect(byId('motion_as_ds4')).toBeNull();
  });

  it('hides the controller options when the controller is disabled', async () => {
    await renderTab({ controller: 'disabled' }, 'windows');
    expect(byId('gamepad')).toBeNull();
    expect(byId('back_button_timeout')).toBeNull();
    expect(screen.queryByTestId('config-gamepad-section')).toBeNull();
  });

  it('hides the mouse sub-options when the mouse is disabled', async () => {
    await renderTab({ mouse: 'disabled' }, 'windows');
    expect(byId('high_resolution_scrolling')).toBeNull();
    expect(byId('native_pen_touch')).toBeNull();
  });

  it('shows the DS4 section with its option when DS4 is picked on Windows', async () => {
    const { user, last } = await renderTab({}, 'windows');
    await pick(user, 'gamepad', 'DS4 (PS4)');
    expect(last()?.['gamepad']).toBe('ds4');
    expect(screen.getByText('DS4 selection options')).toBeInTheDocument();
    expect(byId('motion_as_ds4')).toBeNull();
    expect(byId('ds4_back_as_touchpad_click')).not.toBeNull();
  });

  it('shows the DS5 section with the MAC option when DS5 is picked on Linux', async () => {
    const { user, last } = await renderTab({}, 'linux');
    await pick(user, 'gamepad', 'DS5 (PS5)');
    expect(last()?.['gamepad']).toBe('ds5');
    expect(screen.getByText('DS5 selection options')).toBeInTheDocument();
    expect(byId('ds5_inputtino_randomize_mac')).not.toBeNull();
    expect(byId('ds4_back_as_touchpad_click')).toBeNull();
  });

  it('writes the back button timeout as typed', async () => {
    const { user, last } = await renderTab({ back_button_timeout: '1500' }, 'windows');
    const input = screen.getByRole('textbox', { name: 'Home/Guide Button Emulation Timeout' });
    expect(input).toHaveValue('1500');
    await user.clear(input);
    await user.type(input, '2000');
    expect(last()?.['back_button_timeout']).toBe('2000');
  });

  it('keeps the spelling of the switch values', async () => {
    const { user, last } = await renderTab({ mouse: 'enabled', enable_input_only_mode: 'disabled' }, 'windows');
    await user.click(byId('mouse') as HTMLElement);
    expect(last()?.['mouse']).toBe('disabled');
    await user.click(byId('enable_input_only_mode') as HTMLElement);
    expect(last()?.['enable_input_only_mode']).toBe('enabled');
  });

  it('shows the default hints of the switches (copied from the legacy defaults)', async () => {
    await renderTab({}, 'windows');
    expect(screen.getByTestId('always_send_scancodes-default')).toHaveTextContent('Default: checked');
    expect(screen.getByTestId('key_rightalt_to_key_win-default')).toHaveTextContent('Default: unchecked');
  });

  it('scrolls nothing and warns nothing on a valid render', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await renderTab({}, 'windows');
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('writes every switch of the Windows tab under its option key', async () => {
    const { user, last } = await renderTab({}, 'windows');
    // Default-on switches flip to disabled, default-off ones to enabled. Parents go last: their children hide.
    const flips: Array<[string, 'disabled' | 'enabled']> = [
      ['motion_as_ds4', 'disabled'],
      ['touchpad_as_ds4', 'disabled'],
      ['ds4_back_as_touchpad_click', 'disabled'],
      ['always_send_scancodes', 'disabled'],
      ['key_rightalt_to_key_win', 'enabled'],
      ['high_resolution_scrolling', 'disabled'],
      ['native_pen_touch', 'disabled'],
      ['enable_input_only_mode', 'enabled'],
      ['forward_rumble', 'disabled'],
      ['keyboard', 'disabled'],
      ['mouse', 'disabled'],
      ['controller', 'disabled'],
    ];
    for (const [id, expected] of flips) {
      await user.click(byId(id) as HTMLElement);
      expect(last()?.[id as keyof ConfigModel], id).toBe(expected);
    }
  });

  it('writes the gamepad type, the MAC option and the key repeat fields on Linux and Windows', async () => {
    const linux = await renderTab({}, 'linux');
    await pick(linux.user, 'gamepad', 'DS5 (PS5)');
    await linux.user.click(byId('ds5_inputtino_randomize_mac') as HTMLElement);
    expect(linux.last()?.['ds5_inputtino_randomize_mac']).toBe('disabled');
    await pick(linux.user, 'gamepad', 'XOne (Xbox One)');
    expect(linux.last()?.['gamepad']).toBe('xone');
    expect(byId('ds5_inputtino_randomize_mac')).toBeNull();
    linux.unmount();

    const windows = await renderTab({}, 'windows');
    const delay = screen.getByRole('textbox', { name: 'Key Repeat Delay' });
    await windows.user.clear(delay);
    await windows.user.type(delay, '300');
    expect(windows.last()?.['key_repeat_delay']).toBe('300');
    const frequency = screen.getByRole('textbox', { name: 'Key Repeat Frequency' });
    await windows.user.clear(frequency);
    await windows.user.type(frequency, '30');
    expect(windows.last()?.['key_repeat_frequency']).toBe('30');
  });

  it('translates the labels to pt_BR', async () => {
    await renderTab({}, 'windows', 'pt_BR');
    expect(screen.getByRole('textbox', { name: 'Tempo limite de emulação do botão Início/Guia' })).toBeInTheDocument();
  });
});
