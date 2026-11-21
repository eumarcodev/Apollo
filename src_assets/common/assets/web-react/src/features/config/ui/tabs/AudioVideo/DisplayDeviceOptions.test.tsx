import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIG_TABS } from '@/features/config/domain/config-tabs';
import type { ConfigModel } from '@/features/config/domain/config-model';
import type { Platform } from '@/shared/kernel';
import { createTestI18n, renderWithProviders } from '@/shared/testing';
import { DisplayDeviceOptions } from './DisplayDeviceOptions';

const AV_DEFAULTS = CONFIG_TABS.find((tab) => tab.id === 'av')!.options;

function modelOf(overrides: Record<string, unknown> = {}): ConfigModel {
  return {
    global_prep_cmd: [],
    global_state_cmd: [],
    server_cmd: [],
    ...JSON.parse(JSON.stringify(AV_DEFAULTS)),
    ...overrides,
  } as ConfigModel;
}

interface Harness {
  platform?: Platform;
  overrides?: Record<string, unknown>;
  locale?: 'en' | 'pt_BR';
  onUpdate?: (key: string, value: unknown) => void;
}

function Stateful({ platform = 'windows', overrides, onUpdate }: Harness) {
  const [config, setConfig] = useState(() => modelOf(overrides));
  return (
    <DisplayDeviceOptions
      config={config}
      platform={platform}
      update={(key, value) => {
        onUpdate?.(key, value);
        setConfig((prev) => ({ ...prev, [key]: value }) as ConfigModel);
      }}
    />
  );
}

async function renderOptions(harness: Harness = {}) {
  const i18n = await createTestI18n(harness.locale ?? 'en');
  return renderWithProviders(<Stateful {...harness} />, { i18n });
}

const byId = (id: string) => document.getElementById(id);

async function openAccordion() {
  await userEvent.click(screen.getByRole('button', { name: 'Advanced display device options' }));
}

async function pick(label: RegExp | string, option: RegExp | string) {
  await userEvent.click(screen.getByRole('button', { name: label }));
  await userEvent.click(await screen.findByRole('option', { name: option }));
}

const ACTIVE = { dd_configuration_option: 'ensure_active' };

beforeEach(() => {
  Element.prototype.getAnimations ??= () => [];
});

describe('DisplayDeviceOptions on Windows', () => {
  it('shows only the configuration and the HDR selects while the configuration is disabled', async () => {
    await renderOptions();
    await openAccordion();
    expect(byId('dd_configuration_option')).not.toBeNull();
    expect(byId('dd_hdr_option')).not.toBeNull();
    for (const id of [
      'dd_resolution_option',
      'dd_refresh_rate_option',
      'dd_manual_resolution',
      'dd_manual_refresh_rate',
      'dd_config_revert_delay',
      'dd_config_revert_on_disconnect',
      'dd_mode_remapping',
    ]) {
      expect(byId(id), id).toBeNull();
    }
    expect(screen.getByText(/Not recommended to use this option on usual circumstances/)).toBeInTheDocument();
    expect(byId('dd_wa_hdr_toggle_delay')).toBeNull();
  });

  it('reveals the options of an active configuration', async () => {
    await renderOptions({ overrides: ACTIVE });
    await openAccordion();
    for (const id of [
      'dd_resolution_option',
      'dd_refresh_rate_option',
      'dd_config_revert_delay',
      'dd_config_revert_on_disconnect',
    ]) {
      expect(byId(id), id).not.toBeNull();
    }
    expect(byId('dd_config_revert_delay')).toHaveAttribute('placeholder', '3000');
    expect(byId('dd_config_revert_delay')).toHaveAttribute('min', '0');
    expect(byId('dd_config_revert_delay')).toHaveValue(3000);
    expect(screen.getByTestId('dd_config_revert_on_disconnect-default')).toHaveTextContent('Default: unchecked');
    expect(
      screen.getByText('"Optimize game settings" option must be enabled on the Moonlight client for this to work.'),
    ).toBeInTheDocument();
  });

  it('shows the manual fields with their placeholders', async () => {
    const onUpdate = vi.fn();
    await renderOptions({
      overrides: { ...ACTIVE, dd_resolution_option: 'manual', dd_refresh_rate_option: 'manual' },
      onUpdate,
    });
    await openAccordion();
    expect(byId('dd_manual_resolution')).toHaveAttribute('placeholder', '2560x1440');
    expect(byId('dd_manual_refresh_rate')).toHaveAttribute('placeholder', '59.9558');
    await userEvent.type(byId('dd_manual_refresh_rate')!, '60');
    expect(onUpdate).toHaveBeenLastCalledWith('dd_manual_refresh_rate', '60');
    await userEvent.clear(byId('dd_config_revert_delay')!);
    await userEvent.type(byId('dd_config_revert_delay')!, '500');
    expect(onUpdate).toHaveBeenLastCalledWith('dd_config_revert_delay', 500);
  });

  it('updates the selects and the HDR option', async () => {
    const onUpdate = vi.fn();
    await renderOptions({ onUpdate });
    await openAccordion();
    await pick(/Device configuration/, 'Verify that the display is enabled');
    expect(onUpdate).toHaveBeenLastCalledWith('dd_configuration_option', 'verify_only');
    expect(byId('dd_resolution_option')).not.toBeNull();
    await pick(/HDR/, 'Do not change HDR settings');
    expect(onUpdate).toHaveBeenLastCalledWith('dd_hdr_option', 'disabled');
  });

  it('shows the mixed remapping table and adds and removes entries', async () => {
    const onUpdate = vi.fn();
    await renderOptions({ overrides: ACTIVE, onUpdate });
    await openAccordion();
    const remapping = screen.getByTestId('dd-remapping');
    expect(remapping).toHaveAttribute('data-remapping-type', 'mixed');
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText(/At least one "Final" field must be specified/)).toBeInTheDocument();
    expect(
      screen.getByText(/"Optimize game settings" option must be enabled in the Moonlight client, otherwise entries/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('dd-remapping-add'));
    expect(onUpdate).toHaveBeenLastCalledWith('dd_mode_remapping', {
      mixed: [{ requested_fps: '', final_refresh_rate: '', requested_resolution: '', final_resolution: '' }],
      resolution_only: [],
      refresh_rate_only: [],
    });
    const row = screen.getByTestId('dd-remapping-row-0');
    expect(within(row).getAllByRole('textbox')).toHaveLength(4);
    expect(screen.getByTestId('dd-remapping-0-final_refresh_rate')).toHaveAttribute('placeholder', '119.95');
    await userEvent.type(screen.getByTestId('dd-remapping-0-requested_fps'), '60');
    expect(onUpdate).toHaveBeenLastCalledWith(
      'dd_mode_remapping',
      expect.objectContaining({ mixed: [expect.objectContaining({ requested_fps: '60' })] }),
    );
    await userEvent.click(screen.getByTestId('dd-remapping-remove-0'));
    expect(onUpdate).toHaveBeenLastCalledWith('dd_mode_remapping', {
      mixed: [],
      resolution_only: [],
      refresh_rate_only: [],
    });
  });

  it('uses the resolution-only and refresh-rate-only columns', async () => {
    const { unmount } = await renderOptions({
      overrides: { ...ACTIVE, dd_refresh_rate_option: 'manual', dd_mode_remapping: { mixed: [] } },
    });
    await openAccordion();
    expect(screen.getByTestId('dd-remapping')).toHaveAttribute('data-remapping-type', 'resolution_only');
    await userEvent.click(screen.getByTestId('dd-remapping-add'));
    expect(within(screen.getByTestId('dd-remapping-row-0')).getAllByRole('textbox')).toHaveLength(2);
    expect(screen.getByText(/otherwise the mapping is skipped/)).toBeInTheDocument();
    unmount();

    await renderOptions({ overrides: { ...ACTIVE, dd_resolution_option: 'manual' } });
    await openAccordion();
    expect(screen.getByTestId('dd-remapping')).toHaveAttribute('data-remapping-type', 'refresh_rate_only');
    await userEvent.click(screen.getByTestId('dd-remapping-add'));
    const row = screen.getByTestId('dd-remapping-row-0');
    expect(within(row).getAllByRole('textbox')).toHaveLength(2);
    expect(screen.getByTestId('dd-remapping-0-requested_fps')).toBeInTheDocument();
  });

  it('hides the remapping when nothing is requested from the client', async () => {
    await renderOptions({
      overrides: { ...ACTIVE, dd_resolution_option: 'manual', dd_refresh_rate_option: 'disabled' },
    });
    await openAccordion();
    expect(screen.queryByTestId('dd-remapping')).toBeNull();
  });

  it('shows the pt_BR texts', async () => {
    await renderOptions({ locale: 'pt_BR' });
    expect(screen.getByRole('button', { name: 'Opções avançadas da tela' })).toBeInTheDocument();
  });
});

describe('DisplayDeviceOptions on Linux and macOS', () => {
  it.each(['linux', 'macos'] as const)('renders nothing on %s', async (platform) => {
    await renderOptions({ platform });
    expect(screen.queryByTestId('av-display-device')).toBeNull();
    expect(byId('dd_hdr_option')).toBeNull();
  });
});
