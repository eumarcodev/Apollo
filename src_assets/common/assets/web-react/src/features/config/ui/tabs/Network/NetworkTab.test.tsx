import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ConfigModel } from '@/features/config/domain/config-model';
import { parseLoadedConfig } from '@/features/config/domain/config-model';
import { visibleTabs } from '@/features/config/domain/config-tabs';
import type { Platform } from '@/shared/kernel';
import { createTestI18n, renderWithProviders } from '@/shared/testing';
import { NetworkTab } from './NetworkTab';

function load(platform: Platform, dto: Record<string, unknown> = {}): ConfigModel {
  return parseLoadedConfig({ status: true, platform, ...dto }, platform, visibleTabs(platform)).config;
}

/** Holds the model like the config editor does and exposes it to the assertions. */
function Harness({ initial, onModel }: { initial: ConfigModel; onModel: (m: ConfigModel) => void }) {
  const [config, setConfig] = useState(initial);
  return (
    <NetworkTab
      config={config}
      platform="windows"
      vdisplayStatus={0}
      update={(key, value) => {
        const next = { ...config, [key]: value } as ConfigModel;
        setConfig(next);
        onModel(next);
      }}
    />
  );
}

async function renderTab(dto: Record<string, unknown> = {}) {
  const models: ConfigModel[] = [];
  const i18n = await createTestI18n('en');
  const user = userEvent.setup();
  const view = await renderWithProviders(<Harness initial={load('windows', dto)} onModel={(m) => models.push(m)} />, {
    i18n,
  });
  return { ...view, user, last: () => models[models.length - 1] };
}

function byId(id: string): HTMLElement {
  return document.getElementById(id) as HTMLElement;
}

const portInput = () => screen.getByRole('spinbutton', { name: 'Port' });
const pingInput = () => screen.getByRole('textbox', { name: 'Ping Timeout' });

async function pick(user: ReturnType<typeof userEvent.setup>, id: string, option: RegExp | string) {
  await user.click(byId(id));
  await user.click(await screen.findByRole('option', { name: option }));
}

beforeEach(() => {
  Element.prototype.getAnimations ??= () => [];
});

describe('NetworkTab', () => {
  it('gives every field its option key as DOM id', async () => {
    await renderTab();
    for (const id of [
      'upnp',
      'address_family',
      'port',
      'origin_web_ui_allowed',
      'external_ip',
      'lan_encryption_mode',
      'wan_encryption_mode',
      'ping_timeout',
      'audio_qos',
    ]) {
      expect(document.getElementById(id), id).not.toBeNull();
    }
  });

  it('shows the verbatim defaults and the derived port table of 47989', async () => {
    await renderTab();
    expect(byId('upnp')).not.toBeChecked();
    expect(portInput()).toHaveValue(47989);
    expect(portInput()).toHaveAttribute('placeholder', '47989');
    expect(pingInput()).toHaveValue('10000');
    expect(pingInput()).toHaveAttribute('placeholder', '10000');
    const table = screen.getByTestId('port-table');
    for (const port of ['47984', '47989', '47990', '48010', '47998 - 48000']) {
      expect(within(table).getByText(port)).toBeInTheDocument();
    }
    expect(within(table).queryByText('Use this port to connect with Moonlight.')).not.toBeInTheDocument();
    expect(screen.queryByTestId('port-alert-low')).not.toBeInTheDocument();
    expect(screen.queryByTestId('port-alert-high')).not.toBeInTheDocument();
    expect(screen.queryByTestId('web-ui-wan-warning')).not.toBeInTheDocument();
  });

  it('warns when port - 5 is below 1024 and when port + 21 is above 65535', async () => {
    const low = await renderTab({ port: '1028' });
    expect(screen.getByTestId('port-alert-low')).toHaveTextContent('Helios cannot use ports below 1024!');
    expect(screen.queryByTestId('port-alert-high')).not.toBeInTheDocument();
    low.unmount();

    await renderTab({ port: '65515' });
    expect(screen.getByTestId('port-alert-high')).toHaveTextContent('Ports above 65535 are not available!');
    expect(screen.queryByTestId('port-alert-low')).not.toBeInTheDocument();
  });

  it('notes the HTTP port when the port differs from 47989 and saves the port as text', async () => {
    const { user, last } = await renderTab();
    const input = portInput();
    await user.clear(input);
    await user.type(input, '47990');
    expect(last()?.['port']).toBe(47990);
    expect(screen.getByText('Use this port to connect with Moonlight.')).toBeInTheDocument();
    expect(screen.getByTestId('port-table')).toHaveTextContent('47991');
  });

  it('shows the WAN warning only when the web UI is open to the internet', async () => {
    const { user, last } = await renderTab();
    await pick(user, 'origin_web_ui_allowed', /Anyone may access Web UI/);
    expect(last()?.['origin_web_ui_allowed']).toBe('wan');
    expect(screen.getByTestId('web-ui-wan-warning')).toHaveTextContent('Exposing the Web UI to the internet');
  });

  it('keeps the legacy spelling of the switch and stores the encryption modes as strings', async () => {
    const { user, last } = await renderTab();
    await user.click(byId('upnp'));
    expect(last()?.['upnp']).toBe('enabled');
    await pick(user, 'lan_encryption_mode', /Required for all clients/);
    expect(last()?.['lan_encryption_mode']).toBe('2');
    await pick(user, 'wan_encryption_mode', /Disabled/);
    expect(last()?.['wan_encryption_mode']).toBe('0');
  });
});
