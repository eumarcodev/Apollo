import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigModel } from '@/features/config/domain/config-model';
import { parseLoadedConfig, serializeConfig } from '@/features/config/domain/config-model';
import { visibleTabs } from '@/features/config/domain/config-tabs';
import type { Platform } from '@/shared/kernel';
import { createTestI18n, renderWithProviders } from '@/shared/testing';
import { AdvancedTab } from './AdvancedTab';

function load(platform: Platform, dto: Record<string, unknown> = {}): ConfigModel {
  return parseLoadedConfig({ status: true, platform, ...dto }, platform, visibleTabs(platform)).config;
}

/** Holds the model like the config editor does and exposes every change to the assertions. */
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
    <AdvancedTab
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

describe('AdvancedTab', () => {
  it('gives every field its option key as DOM id', async () => {
    await renderTab();
    for (const id of [
      'fec_percentage',
      'qp',
      'min_threads',
      'limit_framerate',
      'envvar_compatibility_mode',
      'legacy_ordering',
      'ignore_encoder_probe_failure',
      'hevc_mode',
      'av1_mode',
      'capture',
      'encoder',
    ]) {
      expect(document.getElementById(id), id).not.toBeNull();
    }
  });

  it('shows the verbatim defaults of a server that sent nothing', async () => {
    await renderTab();
    expect(byId('fec_percentage')).toHaveValue('20');
    expect(byId('qp')).toHaveValue(28);
    expect(byId('min_threads')).toHaveValue(2);
    expect(byId('min_threads')).toHaveAttribute('min', '1');
    expect(byId('limit_framerate')).toBeChecked();
    expect(byId('envvar_compatibility_mode')).not.toBeChecked();
    expect(byId('legacy_ordering')).not.toBeChecked();
    expect(byId('ignore_encoder_probe_failure')).not.toBeChecked();
    expect(document.getElementById('hevc_mode')).toHaveTextContent(
      'Helios will advertise support for HEVC based on encoder capabilities',
    );
    expect(document.getElementById('capture')).toHaveTextContent('Autodetect');
    expect(document.getElementById('encoder')).toHaveTextContent('Autodetect');
  });

  it('shows the default hints of the switches', async () => {
    await renderTab();
    expect(screen.getByTestId('limit_framerate-default')).toHaveTextContent('Default: checked');
    expect(screen.getByTestId('legacy_ordering-default')).toHaveTextContent('Default: unchecked');
  });

  it('writes FEC as text and QP and threads as numbers, like the legacy number inputs', async () => {
    const { user, last } = await renderTab();
    const fec = byId('fec_percentage');
    await user.clear(fec);
    await user.type(fec, '35');
    expect(last()?.['fec_percentage']).toBe('35');
    const qp = byId('qp');
    await user.clear(qp);
    await user.type(qp, '30');
    expect(last()?.['qp']).toBe(30);
    const threads = byId('min_threads');
    await user.clear(threads);
    await user.type(threads, '4');
    expect(last()?.['min_threads']).toBe(4);
  });

  it('keeps the spelling of the switch values', async () => {
    const { user, last } = await renderTab({ limit_framerate: 'disabled', legacy_ordering: 'true' });
    await user.click(byId('limit_framerate'));
    expect(last()?.['limit_framerate']).toBe('enabled');
    await user.click(byId('legacy_ordering'));
    expect(last()?.['legacy_ordering']).toBe('false');
  });

  it('writes the codec modes as the option values "0" to "3"', async () => {
    const { user, last } = await renderTab({ hevc_mode: '1' });
    expect(document.getElementById('hevc_mode')).toHaveTextContent('will not advertise support for HEVC');
    await pick(user, 'hevc_mode', /HEVC Main and Main10/);
    expect(last()?.['hevc_mode']).toBe('3');
    await pick(user, 'av1_mode', /AV1 Main 8-bit profile/);
    expect(last()?.['av1_mode']).toBe('2');
  });

  it('offers the Linux capture methods and the Linux encoders', async () => {
    const { user, last } = await renderTab({}, 'linux');
    await user.click(byId('capture'));
    const captureOptions = await screen.findAllByRole('option');
    expect(captureOptions.map((option) => option.textContent)).toEqual([
      'Autodetect (recommended)',
      'NvFBC',
      'wlroots',
      'KMS',
      'X11',
    ]);
    await user.click(captureOptions[3] as HTMLElement);
    expect(last()?.['capture']).toBe('kms');
    await user.click(byId('encoder'));
    const encoderOptions = await screen.findAllByRole('option');
    expect(encoderOptions.map((option) => option.textContent)).toEqual([
      'Autodetect (recommended)',
      'NVIDIA NVENC',
      'VA-API',
      'Software',
    ]);
  });

  it('offers the Windows capture methods (WGC marked beta) and the Windows encoders', async () => {
    const { user, last } = await renderTab({}, 'windows');
    await user.click(byId('capture'));
    const captureOptions = await screen.findAllByRole('option');
    expect(captureOptions.map((option) => option.textContent)).toEqual([
      'Autodetect (recommended)',
      'Desktop Duplication API',
      'Windows.Graphics.Capture (beta)',
    ]);
    await user.click(captureOptions[2] as HTMLElement);
    expect(last()?.['capture']).toBe('wgc');
    await pick(user, 'encoder', 'AMD AMF/VCE');
    expect(last()?.['encoder']).toBe('amdvce');
  });

  it('hides the capture field on macOS and offers VideoToolbox as the encoder', async () => {
    const { user, last } = await renderTab({}, 'macos');
    expect(byId('capture')).toBeNull();
    await pick(user, 'encoder', 'VideoToolbox');
    expect(last()?.['encoder']).toBe('videotoolbox');
  });

  it('keeps a capture or encoder value outside the list without changing it on save', async () => {
    await renderTab({ capture: 'kms', encoder: 'vaapi' }, 'windows');
    const model = load('windows', { capture: 'kms', encoder: 'vaapi' });
    const payload = serializeConfig(model, undefined, visibleTabs('windows')).payload;
    expect(payload['capture']).toBe('kms');
    expect(payload['encoder']).toBe('vaapi');
  });

  it('strips the defaults of the tab on save', async () => {
    const model = load('windows');
    const payload = serializeConfig(model, undefined, visibleTabs('windows')).payload;
    for (const key of ['fec_percentage', 'qp', 'min_threads', 'limit_framerate', 'hevc_mode', 'capture', 'encoder']) {
      expect(payload[key], key).toBeUndefined();
    }
  });

  it('translates the labels to pt_BR', async () => {
    await renderTab({}, 'windows', 'pt_BR');
    expect(screen.getByRole('textbox', { name: 'Porcentagem de FEC' })).toBeInTheDocument();
  });

  it('renders without console errors on a valid load', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await renderTab({ legacy_ordering: 'enabled' });
    expect(error).not.toHaveBeenCalled();
  });
});
