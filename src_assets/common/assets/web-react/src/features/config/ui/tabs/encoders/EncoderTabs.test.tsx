import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ComponentType } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIG_TABS, type ConfigTabId } from '@/features/config/domain/config-tabs';
import type { ConfigModel } from '@/features/config/domain/config-model';
import type { Platform } from '@/shared/kernel';
import { createTestI18n, renderWithProviders } from '@/shared/testing';
import { TAB_COMPONENTS } from '@/features/config/ui/tabs/registry';
import type { ConfigTabProps } from '@/features/config/ui/tabs/types';

function modelOf(tab: ConfigTabId, overrides: Record<string, unknown> = {}): ConfigModel {
  const defaults = CONFIG_TABS.find((entry) => entry.id === tab)!.options;
  return {
    global_prep_cmd: [],
    global_state_cmd: [],
    server_cmd: [],
    ...JSON.parse(JSON.stringify(defaults)),
    ...overrides,
  } as ConfigModel;
}

interface Harness {
  tab: ConfigTabId;
  platform?: Platform;
  overrides?: Record<string, unknown>;
  locale?: 'en' | 'pt_BR';
  onUpdate?: (key: string, value: unknown) => void;
}

function Stateful({ tab, platform = 'windows', overrides, onUpdate }: Harness) {
  const [config, setConfig] = useState(() => modelOf(tab, overrides));
  const Tab = TAB_COMPONENTS[tab] as ComponentType<ConfigTabProps>;
  return (
    <Tab
      config={config}
      platform={platform}
      vdisplayStatus={0}
      update={(key, value) => {
        onUpdate?.(key, value);
        setConfig((prev) => ({ ...prev, [key]: value }) as ConfigModel);
      }}
    />
  );
}

async function renderTab(harness: Harness) {
  const i18n = await createTestI18n(harness.locale ?? 'en');
  return renderWithProviders(<Stateful {...harness} />, { i18n });
}

const byId = (id: string) => document.getElementById(id);

beforeEach(() => {
  Element.prototype.getAnimations ??= () => [];
});

describe('NVENC tab', () => {
  const WINDOWS_ONLY = ['nvenc_realtime_hags', 'nvenc_latency_over_power', 'nvenc_opengl_vulkan_on_dxgi'];
  const ALWAYS = [
    'nvenc_preset',
    'nvenc_twopass',
    'nvenc_spatial_aq',
    'nvenc_vbv_increase',
    'nvenc_h264_cavlc',
    'nvenc_intra_refresh',
  ];

  it('renders every option with its own DOM id on Windows (intra refresh no longer reuses the CAVLC id)', async () => {
    await renderTab({ tab: 'nv' });
    for (const id of [...ALWAYS, ...WINDOWS_ONLY]) {
      expect(byId(id), id).not.toBeNull();
    }
    expect(document.querySelectorAll('[id="nvenc_h264_cavlc"]')).toHaveLength(1);
    expect(byId('nvenc_intra_refresh')).not.toBe(byId('nvenc_h264_cavlc'));
  });

  it('hides the Windows-only options elsewhere', async () => {
    await renderTab({ tab: 'nv', platform: 'linux' });
    for (const id of WINDOWS_ONLY) {
      expect(byId(id), id).toBeNull();
    }
    for (const id of ALWAYS) {
      expect(byId(id), id).not.toBeNull();
    }
  });

  it('shows the defaults and the preset labels', async () => {
    await renderTab({ tab: 'nv' });
    expect(byId('nvenc_vbv_increase')).toHaveValue(0);
    expect(byId('nvenc_vbv_increase')).toHaveAttribute('min', '0');
    expect(byId('nvenc_vbv_increase')).toHaveAttribute('max', '400');
    expect(screen.getByTestId('nvenc_spatial_aq-default')).toHaveTextContent('Default: unchecked');
    expect(screen.getByTestId('nvenc_realtime_hags-default')).toHaveTextContent('Default: checked');
    await userEvent.click(byId('nvenc_preset')!);
    expect(await screen.findByRole('option', { name: 'P1 (fastest, default)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'P4' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'P7 (slowest)' })).toBeInTheDocument();
  });

  it('updates the selects, the number and the switches', async () => {
    const onUpdate = vi.fn();
    await renderTab({ tab: 'nv', onUpdate });
    await userEvent.click(byId('nvenc_preset')!);
    await userEvent.click(await screen.findByRole('option', { name: 'P4' }));
    expect(onUpdate).toHaveBeenCalledWith('nvenc_preset', '4');
    await userEvent.click(byId('nvenc_intra_refresh')!);
    await userEvent.click(await screen.findByRole('option', { name: 'Enabled' }));
    expect(onUpdate).toHaveBeenCalledWith('nvenc_intra_refresh', 'enabled');
    await userEvent.clear(byId('nvenc_vbv_increase')!);
    await userEvent.type(byId('nvenc_vbv_increase')!, '150');
    expect(onUpdate).toHaveBeenLastCalledWith('nvenc_vbv_increase', 150);
    await userEvent.click(screen.getByRole('switch', { name: /Spatial AQ/ }));
    expect(onUpdate).toHaveBeenCalledWith('nvenc_spatial_aq', 'enabled');
  });
});

describe('QuickSync, AMF, VideoToolbox, VA-API and software tabs', () => {
  it('renders the options of each tab', async () => {
    const expected: Record<string, string[]> = {
      qsv: ['qsv_preset', 'qsv_coder', 'qsv_slow_hevc'],
      amd: ['amd_usage', 'amd_rc', 'amd_enforce_hrd', 'amd_quality', 'amd_preanalysis', 'amd_vbaq', 'amd_coder'],
      vt: ['vt_coder', 'vt_software', 'vt_realtime'],
      vaapi: ['vaapi_strict_rc_buffer'],
      sw: ['sw_preset', 'sw_tune'],
    };
    for (const [tab, ids] of Object.entries(expected)) {
      const view = await renderTab({ tab: tab as ConfigTabId });
      for (const id of ids) {
        expect(byId(id), `${tab}:${id}`).not.toBeNull();
      }
      view.unmount();
    }
  });

  it('shows the default hints of the AMF and VideoToolbox switches', async () => {
    const amd = await renderTab({ tab: 'amd' });
    expect(screen.getByTestId('amd_vbaq-default')).toHaveTextContent('Default: checked');
    expect(screen.getByTestId('amd_preanalysis-default')).toHaveTextContent('Default: unchecked');
    amd.unmount();
    await renderTab({ tab: 'vt' });
    expect(screen.getByTestId('vt_realtime-default')).toHaveTextContent('Default: checked');
  });

  it('lists the nine software presets and picks one', async () => {
    const onUpdate = vi.fn();
    await renderTab({ tab: 'sw', onUpdate });
    await userEvent.click(byId('sw_preset')!);
    expect(await screen.findAllByRole('option')).toHaveLength(9);
    await userEvent.click(screen.getByRole('option', { name: /veryslow/ }));
    expect(onUpdate).toHaveBeenCalledWith('sw_preset', 'veryslow');
  });

  it('keeps an enabled spelling when toggling a switch', async () => {
    const onUpdate = vi.fn();
    await renderTab({ tab: 'qsv', onUpdate });
    await userEvent.click(screen.getByRole('switch', { name: /Slow HEVC/i }));
    expect(onUpdate).toHaveBeenCalledWith('qsv_slow_hevc', 'enabled');
  });
});

describe('PyroWave tab', () => {
  it('shows the note, the ranges and the defaults', async () => {
    await renderTab({ tab: 'pyrowave' });
    expect(screen.getByTestId('pyrowave-note')).toHaveTextContent(/Experimental/);
    expect(byId('pyrowave_packet_size')).toHaveValue(1200);
    expect(byId('pyrowave_packet_size')).toHaveAttribute('min', '400');
    expect(byId('pyrowave_packet_size')).toHaveAttribute('max', '1300');
    expect(byId('pyrowave_min_frame_kb')).toHaveAttribute('min', '1');
    expect(byId('pyrowave_min_frame_kb')).toHaveAttribute('max', '4096');
    expect(byId('pyrowave_simulated_loss')).toHaveAttribute('step', '0.5');
    expect(byId('pyrowave_simulated_loss')).toHaveAttribute('max', '100');
    expect(screen.getByTestId('pyrowave-default')).toHaveTextContent('Default: unchecked');
    expect(screen.getByTestId('pyrowave_static_boost-default')).toHaveTextContent('Default: checked');
  });

  it('stores numbers as numbers and picks the priority', async () => {
    const onUpdate = vi.fn();
    await renderTab({ tab: 'pyrowave', onUpdate });
    await userEvent.clear(byId('pyrowave_min_frame_kb')!);
    await userEvent.type(byId('pyrowave_min_frame_kb')!, '32');
    expect(onUpdate).toHaveBeenLastCalledWith('pyrowave_min_frame_kb', 32);
    await userEvent.click(byId('pyrowave_priority')!);
    await userEvent.click(await screen.findByRole('option', { name: /realtime|Realtime/ }));
    expect(onUpdate).toHaveBeenCalledWith('pyrowave_priority', 'realtime');
  });

  it('renders in Portuguese', async () => {
    await renderTab({ tab: 'pyrowave', locale: 'pt_BR' });
    expect(screen.getByTestId('pyrowave-note')).toHaveTextContent(/Experimental/);
  });
});
