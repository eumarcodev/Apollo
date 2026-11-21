import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIG_TABS } from '@/features/config/domain/config-tabs';
import type { ConfigModel } from '@/features/config/domain/config-model';
import type { Platform } from '@/shared/kernel';
import { createTestI18n, renderWithProviders } from '@/shared/testing';
import { AudioVideoTab } from './AudioVideoTab';

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
  vdisplayStatus?: unknown;
  overrides?: Record<string, unknown>;
  locale?: 'en' | 'pt_BR';
  onUpdate?: (key: string, value: unknown) => void;
}

function Stateful({ platform = 'windows', vdisplayStatus = 0, overrides, onUpdate }: Harness) {
  const [config, setConfig] = useState(() => modelOf(overrides));
  return (
    <AudioVideoTab
      config={config}
      platform={platform}
      vdisplayStatus={vdisplayStatus}
      update={(key, value) => {
        onUpdate?.(key, value);
        setConfig((prev) => ({ ...prev, [key]: value }) as ConfigModel);
      }}
    />
  );
}

async function renderTab(harness: Harness = {}) {
  const i18n = await createTestI18n(harness.locale ?? 'en');
  return renderWithProviders(<Stateful {...harness} />, { i18n });
}

const byId = (id: string) => document.getElementById(id);

beforeEach(() => {
  Element.prototype.getAnimations ??= () => [];
});

describe('AudioVideoTab on Windows', () => {
  it('renders every option with its key as DOM id', async () => {
    await renderTab();
    for (const id of [
      'audio_sink',
      'virtual_sink',
      'install_steam_audio_drivers',
      'keep_sink_default',
      'auto_capture_sink',
      'stream_audio',
      'adapter_name',
      'output_name',
      'max_bitrate',
      'minimum_fps_target',
      'fallback_mode',
      'headless_mode',
      'double_refreshrate',
      'isolated_virtual_display_option',
    ]) {
      expect(byId(id), id).not.toBeNull();
    }
    expect(screen.getByLabelText('Audio Sink')).toBe(byId('audio_sink'));
    expect(screen.getByLabelText('Display Device Id')).toBe(byId('output_name'));
  });

  it('shows the Windows texts, placeholders and help blocks', async () => {
    await renderTab();
    expect(byId('audio_sink')).toHaveAttribute('placeholder', 'Speakers (High Definition Audio Device)');
    expect(byId('virtual_sink')).toHaveAttribute('placeholder', 'Steam Streaming Speakers');
    expect(byId('adapter_name')).toHaveAttribute('placeholder', 'Radeon RX 580 Series');
    expect(byId('output_name')).toHaveAttribute('placeholder', '{de9bb7e2-186e-505b-9e93-f48793333810}');
    expect(screen.getByText(/The audio device to be used when audio output is allowed/)).toBeInTheDocument();
    expect(screen.getByText('tools\\audio-info.exe')).toBeInTheDocument();
    expect(screen.getByText('tools\\dxgi-info.exe')).toBeInTheDocument();
    expect(screen.getByText(/"friendly_name": "ROG PG279Q"/)).toBeInTheDocument();
    expect(screen.queryByText(/pacmd/)).not.toBeInTheDocument();
  });

  it('shows the "enabled/disabled by default" hints of the switches (legacy default props)', async () => {
    await renderTab();
    for (const id of ['install_steam_audio_drivers', 'keep_sink_default', 'auto_capture_sink', 'stream_audio']) {
      expect(screen.getByTestId(`${id}-default`)).toHaveTextContent('Default: checked');
    }
    for (const id of ['headless_mode', 'double_refreshrate', 'isolated_virtual_display_option']) {
      expect(screen.getByTestId(`${id}-default`)).toHaveTextContent('Default: unchecked');
    }
  });

  it('keeps the value representation of a switch that was toggled', async () => {
    const onUpdate = vi.fn();
    await renderTab({ onUpdate });
    await userEvent.click(screen.getByRole('switch', { name: /Stream Audio/ }));
    expect(onUpdate).toHaveBeenCalledWith('stream_audio', 'disabled');
    await userEvent.click(screen.getByRole('switch', { name: /Headless Mode/ }));
    expect(onUpdate).toHaveBeenCalledWith('headless_mode', 'enabled');
  });

  it('edits the text options', async () => {
    const onUpdate = vi.fn();
    await renderTab({ onUpdate });
    await userEvent.type(byId('audio_sink')!, 'Spk');
    expect(onUpdate).toHaveBeenLastCalledWith('audio_sink', 'Spk');
    expect(byId('audio_sink')).toHaveValue('Spk');
    await userEvent.type(byId('output_name')!, 'x');
    expect(onUpdate).toHaveBeenLastCalledWith('output_name', 'x');
  });

  it('stores the number options as numbers (and keeps non-numeric text as typed)', async () => {
    const onUpdate = vi.fn();
    await renderTab({ onUpdate });
    const bitrate = byId('max_bitrate')!;
    expect(bitrate).toHaveAttribute('type', 'number');
    expect(bitrate).toHaveValue(0);
    await userEvent.clear(bitrate);
    expect(onUpdate).toHaveBeenLastCalledWith('max_bitrate', '');
    await userEvent.type(bitrate, '5000');
    expect(onUpdate).toHaveBeenLastCalledWith('max_bitrate', 5000);
    const fps = byId('minimum_fps_target')!;
    expect(fps).toHaveAttribute('min', '0');
    expect(fps).toHaveAttribute('max', '1000');
    await userEvent.clear(fps);
    await userEvent.type(fps, '60');
    expect(onUpdate).toHaveBeenLastCalledWith('minimum_fps_target', 60);
  });
});

describe('fallback mode validation', () => {
  it('flags nothing before the user types, then validates live with the permissive pattern', async () => {
    await renderTab();
    const input = byId('fallback_mode')!;
    expect(input).toHaveAttribute('placeholder', '1920x1080x60');
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
    await userEvent.type(input, '1920x1080');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Invalid fallback mode. Format: [Width]x[Height]x[FPS]')).toBeInTheDocument();
    await userEvent.type(input, 'x59.94');
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText(/Invalid fallback mode/)).not.toBeInTheDocument();
  });

  it('flags the field again when it is cleared after typing', async () => {
    await renderTab();
    const input = byId('fallback_mode')!;
    await userEvent.type(input, '1920x1080x60');
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
    await userEvent.clear(input);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('translates the error to pt_BR', async () => {
    await renderTab({ locale: 'pt_BR' });
    await userEvent.type(byId('fallback_mode')!, '1');
    expect(screen.getByText('Modo de reserva inválido. Formato: [Largura]x[Altura]x[FPS]')).toBeInTheDocument();
  });
});

describe('SudoVDA status', () => {
  it('is a success alert for the status number 0 (Ready), without the hint', async () => {
    await renderTab({ vdisplayStatus: 0 });
    const alert = screen.getByTestId('vdisplay-status');
    expect(alert).toHaveAttribute('data-state', 'ok');
    expect(alert).toHaveTextContent('SudoVDA Driver status: Ready');
    expect(screen.queryByText(/Please ensure SudoVDA driver/)).not.toBeInTheDocument();
  });

  it.each([
    [1, 'Unknown'],
    [-1, 'Uninitialized'],
    [-2, 'Version Incompatible'],
    [-3, 'Watchdog Failed'],
  ])('is a warning with the hint for status %s', async (status, text) => {
    await renderTab({ vdisplayStatus: status });
    const alert = screen.getByTestId('vdisplay-status');
    expect(alert).toHaveAttribute('data-state', 'warning');
    expect(alert).toHaveTextContent(`SudoVDA Driver status: ${text}`);
    expect(
      within(alert).getByText('Please ensure SudoVDA driver is installed to the latest version and enabled properly.'),
    ).toBeInTheDocument();
  });

  it('keeps the legacy quirk: the string "0" is Ready but colored as a warning', async () => {
    await renderTab({ vdisplayStatus: '0' });
    const alert = screen.getByTestId('vdisplay-status');
    expect(alert).toHaveAttribute('data-state', 'warning');
    expect(alert).toHaveTextContent('SudoVDA Driver status: Ready');
  });

  it('shows an empty status when the host sends none or an unknown code', async () => {
    for (const status of [null, 7]) {
      const { unmount } = await renderTab({ vdisplayStatus: status });
      expect(screen.getByTestId('vdisplay-status')).toHaveTextContent(/^SudoVDA Driver status:\s*(Please.*)?$/);
      unmount();
    }
  });

  it('translates to pt_BR', async () => {
    await renderTab({ vdisplayStatus: -2, locale: 'pt_BR' });
    expect(screen.getByTestId('vdisplay-status')).toHaveTextContent('Status do driver SudoVDA: Versão incompatível');
  });
});

describe('AudioVideoTab on Linux', () => {
  it('hides the Windows-only options and shows the Linux texts', async () => {
    await renderTab({ platform: 'linux' });
    for (const id of [
      'virtual_sink',
      'install_steam_audio_drivers',
      'keep_sink_default',
      'auto_capture_sink',
      'headless_mode',
      'double_refreshrate',
      'isolated_virtual_display_option',
    ]) {
      expect(byId(id), id).toBeNull();
    }
    expect(screen.queryByTestId('vdisplay-status')).not.toBeInTheDocument();
    expect(byId('stream_audio')).not.toBeNull();
    expect(byId('audio_sink')).toHaveAttribute('placeholder', 'alsa_output.pci-0000_09_00.3.analog-stereo');
    expect(byId('adapter_name')).toHaveAttribute('placeholder', '/dev/dri/renderD128');
    expect(byId('output_name')).toHaveAttribute('placeholder', '0');
    expect(screen.getByLabelText('Display number')).toBe(byId('output_name'));
    expect(screen.getByText('pacmd list-sinks | grep "name:"')).toBeInTheDocument();
    expect(screen.getByText('pactl info | grep Source')).toBeInTheDocument();
    expect(screen.getByText(/ls \/dev\/dri\/renderD\*/)).toBeInTheDocument();
    expect(screen.getByText(/vainfo --display drm/)).toBeInTheDocument();
    expect(screen.getByText(/VAProfileH264High\s+: VAEntrypointEncSlice/)).toBeInTheDocument();
    expect(screen.getByText(/Detected display: HDMI-0 \(id: 1\) connected: true/)).toBeInTheDocument();
  });
});

describe('AudioVideoTab on macOS', () => {
  it('hides the adapter name and shows the audio loopback links and the display list', async () => {
    await renderTab({ platform: 'macos' });
    expect(byId('adapter_name')).toBeNull();
    expect(byId('virtual_sink')).toBeNull();
    expect(byId('audio_sink')).toHaveAttribute('placeholder', 'BlackHole 2ch');
    expect(screen.getByRole('link', { name: 'Soundflower' })).toHaveAttribute(
      'href',
      'https://github.com/mattingalls/Soundflower',
    );
    expect(screen.getByRole('link', { name: 'BlackHole' })).toHaveAttribute(
      'href',
      'https://github.com/ExistentialAudio/BlackHole',
    );
    expect(screen.getByText(/Detected display: Monitor-0 \(id: 3\) connected: true/)).toBeInTheDocument();
    expect(byId('output_name')).toHaveAttribute('placeholder', '0');
  });
});
